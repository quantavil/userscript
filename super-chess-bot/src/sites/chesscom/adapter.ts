import { isBotOwnedNode } from '../../board/ownership.js';
import type { PositionHistory } from '../../chess/position.js';
import { canonicalFen, replaySanLine } from '../../chess/position.js';
import {
  type Color,
  type GameSnapshot,
  type MoveRequest,
  mutationElement,
  pageWindow,
  type SiteAdapter,
  type SiteRead,
} from '../types.js';
import { installChesscomControllerBridge, setCapturedChesscomController } from './bridge.js';
import {
  type ChessGame,
  CLOCK_SELECTOR,
  getBoard,
  getColorRemainingMs,
  getFen,
  getOrientation,
  getRemainingMs,
  getSideToMove,
  getStartingFen,
  isLegalChesscomMove,
  resetStuckPromotionWindow,
} from './snapshot.js';
import { observeBoard } from './watcher.js';

interface ChessBoard extends HTMLElement {
  game?: ChessGame | null;
}

const DEFAULT_BRIDGE_ERROR =
  'Chess.com board controller not captured. Enable synchronous page-context injection in your userscript manager, then reload.';

let nextGameId = 0;
const BOARD_SELECTOR = 'wc-chess-board, chess-board, .board';
const CLOCK_REGION_SELECTOR = '.clock-player-turn';
const RESULT_SELECTOR = '.game-over-modal-content';

function fingerprint(result: SiteRead): { identity: object | null; value: string } {
  if (result.kind !== 'game') return { identity: null, value: JSON.stringify([result.kind, result.reason]) };
  const snapshot = result.snapshot;
  return {
    identity: snapshot.identity,
    value: JSON.stringify([
      snapshot.gameId,
      snapshot.fen,
      snapshot.playerColor,
      snapshot.sideToMove,
      snapshot.orientation,
      snapshot.phase,
      snapshot.inputReady,
      snapshot.remainingMs,
      snapshot.result,
      snapshot.history?.startFen,
      snapshot.history?.moves,
      snapshot.confirmedFens,
      snapshot.confirmationSource,
    ]),
  };
}

function closestOrSelf(element: Element, selector: string): Element | null {
  return element.matches(selector) ? element : element.closest(selector);
}

function nodeContainsSelector(node: Node, selector: string): boolean {
  const element = mutationElement(node);
  return !!element && (element.matches(selector) || !!element.querySelector(selector));
}

function isRelevantMutation(records: MutationRecord[]): boolean {
  return records.some((record) => {
    const target = mutationElement(record.target);
    if (!target || isBotOwnedNode(target) || target.closest('[data-engine-layer], [data-scb-overlay]')) return false;
    const onBoard = !!closestOrSelf(target, BOARD_SELECTOR);
    const onClock = !!closestOrSelf(target, CLOCK_REGION_SELECTOR);
    const onResult = !!closestOrSelf(target, RESULT_SELECTOR);

    if (record.type === 'attributes') {
      if (record.attributeName === 'data-game-id') return onBoard;
      if (record.attributeName === 'class') return onBoard || onClock || onResult;
      return false;
    }
    if (record.type === 'characterData') return onClock || onResult;
    if (record.type !== 'childList') return false;
    if (onClock || onResult) return true;
    return [...Array.from(record.addedNodes), ...Array.from(record.removedNodes)].some(
      (node) =>
        nodeContainsSelector(node, BOARD_SELECTOR) ||
        nodeContainsSelector(node, CLOCK_SELECTOR) ||
        nodeContainsSelector(node, RESULT_SELECTOR),
    );
  });
}

let cachedStartingFen: string | null = null;
let cachedSansLength = -1;
let cachedLastSan: string | undefined;
let cachedHistoryResult: { history: PositionHistory; confirmedFens: readonly string[] } | undefined;

export function clearChesscomHistoryCache(): void {
  cachedStartingFen = null;
  cachedSansLength = -1;
  cachedLastSan = undefined;
  cachedHistoryResult = undefined;
}

export function readChesscomHistory(
  game: ChessGame,
): { history: PositionHistory; confirmedFens: readonly string[] } | undefined {
  const startingFen = getStartingFen(game);
  const sans = game.getHistorySANs?.();
  if (!startingFen || !Array.isArray(sans)) return undefined;

  const sansLength = sans.length;
  const lastSan = sansLength > 0 ? sans[sansLength - 1] : undefined;
  if (
    cachedHistoryResult !== undefined &&
    startingFen === cachedStartingFen &&
    sansLength === cachedSansLength &&
    lastSan === cachedLastSan
  ) {
    return cachedHistoryResult;
  }

  const line = sans.filter((san): san is string => typeof san === 'string' && san.trim().length > 0);
  const replay = replaySanLine(startingFen, line);
  if (!replay) {
    cachedStartingFen = null;
    cachedSansLength = -1;
    cachedLastSan = undefined;
    cachedHistoryResult = undefined;
    return undefined;
  }

  cachedStartingFen = startingFen;
  cachedSansLength = sansLength;
  cachedLastSan = lastSan;
  cachedHistoryResult = { history: replay.history, confirmedFens: replay.fens };
  return cachedHistoryResult;
}

function extractChesscomIncrement(game: ChessGame | null | undefined): number | null {
  try {
    const options = game?.getOptions?.() as Record<string, unknown> | undefined;
    if (!options) return null;
    if (typeof options.increment === 'number' && Number.isFinite(options.increment)) {
      return Math.round(options.increment >= 100 ? options.increment : options.increment * 1000);
    }
    const tc = options.timeControl ?? options.timeController;
    if (typeof tc === 'object' && tc !== null) {
      const inc = (tc as Record<string, unknown>).increment ?? (tc as Record<string, unknown>).inc;
      if (typeof inc === 'number' && Number.isFinite(inc)) {
        return Math.round(inc >= 100 ? inc : inc * 1000);
      }
    }
    if (typeof tc === 'string') {
      const match = /\+(\d+)$/.exec(tc);
      if (match) {
        return parseInt(match[1], 10) * 1000;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function extractChesscomResult(game: ChessGame | null | undefined, isFinished: boolean): string | null {
  if (!isFinished || !game) return null;
  try {
    if (typeof game.getResult === 'function') {
      const res = String(game.getResult()).trim();
      if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(res)) {
        return res;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/** Read Chess.com through its captured board controller and submit moves through it. */
export function createChesscomAdapter(page: () => Window = pageWindow): SiteAdapter {
  let currentBoard: ChessBoard | null = null;
  let currentGame: ChessGame | null = null;
  let currentIdentity: object | null = null;
  let currentGameId = '';
  let lastPlayerColor: Color | null = null;
  let controller: ChessGame | null = null;
  let bridgeInstalled = false;

  const read = (): SiteRead => {
    if (!ensureBridge()) return { kind: 'ineligible', reason: 'Chess.com controller hook is unavailable' };
    const doc = page().document;
    const board = getBoard(doc) as ChessBoard | null;
    if (!board) return { kind: 'waiting', reason: 'Waiting for board' };
    const liveGame = (board.game ?? null) as ChessGame | null;
    if (liveGame && typeof liveGame.getFEN === 'function' && liveGame !== controller) {
      controller = liveGame;
      setCapturedChesscomController(liveGame);
    }
    const game = controller ?? liveGame;
    if (!game || typeof game.getFEN !== 'function') return { kind: 'waiting', reason: DEFAULT_BRIDGE_ERROR };
    const fen = getFen(game);
    if (!fen) return { kind: 'ineligible', reason: 'Chess.com position is unavailable' };
    const sideToMove = getSideToMove(game);
    if (sideToMove !== 'w' && sideToMove !== 'b') {
      return { kind: 'ineligible', reason: 'Chess.com position is malformed' };
    }

    if (board !== currentBoard || game !== currentGame) {
      currentBoard = board;
      currentGame = game;
      currentIdentity = {};
      lastPlayerColor = null;
      clearChesscomHistoryCache();
      const declaredId = game.id ?? board.getAttribute('data-game-id');
      currentGameId = declaredId == null ? `chesscom-${++nextGameId}` : String(declaredId);
    }

    const isFinished = Boolean(
      game.isGameOver?.() ||
        (typeof game.getResult === 'function' && /^(1-0|0-1|1\/2-1\/2)$/.test(String(game.getResult()))) ||
        doc.querySelector('.game-over-modal-content'),
    );

    const playingAs = game.getPlayingAs?.();
    let playerColor: Color | null = null;
    if (playingAs === 1) {
      playerColor = 'w';
      lastPlayerColor = 'w';
    } else if (playingAs === 2) {
      playerColor = 'b';
      lastPlayerColor = 'b';
    } else if (isFinished) {
      const orientation = getOrientation(game);
      playerColor = lastPlayerColor ?? (orientation === 'black' ? 'b' : 'w');
    }

    if (!playerColor) {
      return { kind: 'ineligible', reason: 'Chess.com player color is unavailable' };
    }

    const orientation = getOrientation(game);
    const phase: GameSnapshot['phase'] = isFinished ? 'finished' : 'live';
    const controllerState = game.getState?.();
    const settled = controllerState === undefined || controllerState === 'Idle';
    const history = readChesscomHistory(game);
    const confirmedFens = history?.confirmedFens;
    const remainingMs = getRemainingMs(doc);
    const whiteRemainingMs = getColorRemainingMs(doc, 'w');
    const blackRemainingMs = getColorRemainingMs(doc, 'b');
    const hasActiveClock = remainingMs != null || whiteRemainingMs != null || blackRemainingMs != null;
    const incrementMs = hasActiveClock ? (extractChesscomIncrement(game) ?? 0) : null;
    const result = extractChesscomResult(game, isFinished);
    const snapshot: GameSnapshot = {
      identity: currentIdentity ?? {},
      gameId: currentGameId,
      board,
      fen,
      playerColor,
      sideToMove,
      orientation,
      phase,
      inputReady: phase === 'live' && sideToMove === playerColor && settled,
      remainingMs,
      // The controller mutates FEN, turn, and SAN synchronously inside move().
      // Replaying those SANs supplies indexed local observations, never a server receipt.
      confirmationSource: 'controller-local',
      ...(incrementMs != null ? { incrementMs } : {}),
      ...(result ? { result } : {}),
      ...(whiteRemainingMs != null ? { whiteRemainingMs } : {}),
      ...(blackRemainingMs != null ? { blackRemainingMs } : {}),
      ...(history ? { history: history.history } : {}),
      ...(confirmedFens ? { confirmedFens } : {}),
    };
    return { kind: 'game', snapshot };
  };

  const notify = () => {
    const next = read();
    const fp = fingerprint(next);
    if (next.kind === 'game' && lastNotifiedIdentity !== fp.identity) {
      lastNotifiedIdentity = fp.identity;
      previousFingerprint = '';
    }
    if (fp.value === previousFingerprint) return;
    previousFingerprint = fp.value;
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch (error) {
        console.error('Super Chess Bot: site listener failed.', error);
      }
    }
  };
  let lastNotifiedIdentity: object | null = null;
  let previousFingerprint = '';
  const listeners = new Set<() => void>();

  const instrumentController = (captured: unknown) => {
    if (!captured || typeof captured !== 'object') return;
    controller = captured as ChessGame;
    notify();
  };

  const ensureBridge = (): boolean => {
    if (bridgeInstalled) return true;
    try {
      bridgeInstalled = installChesscomControllerBridge(
        page() as Window & { customElements?: CustomElementRegistry | undefined },
        instrumentController,
      );
    } catch {
      bridgeInstalled = false;
    }
    return bridgeInstalled;
  };

  ensureBridge();

  return {
    id: 'chesscom',
    read: () => read(),
    subscribe(listener) {
      let stopObserving = () => {};
      let stopObservingBoard = () => {};
      let observedBoard: HTMLElement | null = null;
      let observedGame: ChessGame | null = null;
      let moveListener: (() => void) | null = null;
      let queued = false;
      let active = true;
      const initial = read();
      let previous = fingerprint(initial);
      previousFingerprint = previous.value;
      if (initial.kind === 'game') lastNotifiedIdentity = initial.snapshot.identity;
      const detachGame = () => {
        if (observedGame && moveListener) observedGame.off?.('Move', moveListener);
        observedGame = null;
        moveListener = null;
      };
      const detachBoard = () => {
        stopObservingBoard();
        stopObservingBoard = () => {};
        observedBoard = null;
      };
      const bind = (result: SiteRead) => {
        const board = result.kind === 'game' ? result.snapshot.board : null;
        if (board !== observedBoard) {
          detachBoard();
          observedBoard = board;
          if (board) stopObservingBoard = observeBoard(board, notifySubscribed);
        }
        const game = result.kind === 'game' ? currentGame : null;
        if (game === observedGame) return;
        detachGame();
        if (game && typeof game.on === 'function' && typeof game.off === 'function') {
          observedGame = game;
          moveListener = notifySubscribed;
          game.on('Move', moveListener);
        }
      };
      const notifySubscribed = () => {
        if (!active) return;
        const result = read();
        bind(result);
        const next = fingerprint(result);
        if (next.identity === previous.identity && next.value === previous.value) return;
        previous = next;
        try {
          listener();
        } catch (error) {
          console.error('Super Chess Bot: site listener failed.', error);
        }
      };
      listeners.add(notifySubscribed);
      bind(initial);
      const doc = page().document;
      const Observer = (page() as Window & { MutationObserver?: typeof MutationObserver }).MutationObserver;
      if (doc.body && Observer) {
        const observer = new Observer((records) => {
          if (!isRelevantMutation(records)) return;
          if (queued) return;
          queued = true;
          queueMicrotask(() => {
            queued = false;
            notifySubscribed();
          });
        });
        observer.observe(doc.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'data-game-id'],
          characterData: true,
        });
        stopObserving = () => observer.disconnect();
      }
      return () => {
        active = false;
        listeners.delete(notifySubscribed);
        stopObserving();
        detachBoard();
        detachGame();
      };
    },
    async submitMove(request: MoveRequest) {
      if (request.signal.aborted || !request.isCurrent()) return false;
      if (currentGame) resetStuckPromotionWindow(currentGame);
      const current = read();
      if (
        current.kind !== 'game' ||
        current.snapshot.identity !== request.identity ||
        canonicalFen(current.snapshot.fen) !== canonicalFen(request.fromFen) ||
        !current.snapshot.inputReady
      )
        return false;
      const game = currentGame;
      if (!game || typeof game.move !== 'function') return false;
      const uci = request.uci;
      if (typeof uci !== 'string' || uci.length < 4) return false;
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotionChar = uci.length > 4 ? uci[4].toLowerCase() : '';
      const promotion = /^[qrbn]$/.test(promotionChar) ? promotionChar : undefined;
      if (!isLegalChesscomMove(game, from, to, promotion)) return false;
      if (request.signal.aborted || !request.isCurrent() || currentGame !== game) return false;
      try {
        request.onDispatch?.();
        const result = game.move({
          from,
          to,
          ...(promotion ? { promotion } : {}),
          userGenerated: true,
        });
        return result?.type === 'Move';
      } catch {
        return false;
      }
    },
    cancelInput() {},
  };
}

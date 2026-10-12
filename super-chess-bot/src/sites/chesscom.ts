import { isBotOwnedNode } from '../board.js';
import { canonicalFen, readPositionHistory } from '../history.js';
import { installChesscomControllerBridge, setCapturedChesscomController } from './chesscom-bridge.js';
import {
  type ChessGame,
  CLOCK_SELECTOR,
  getBoard,
  getColorRemainingMs,
  getFen,
  getOrientation,
  getRemainingMs,
  getSideToMove,
  isLegalChesscomMove,
  resetStuckPromotionWindow,
} from './chesscom-state.js';
import {
  type Color,
  type GameSnapshot,
  type MoveRequest,
  mutationElement,
  pageWindow,
  type SiteAdapter,
  type SiteRead,
} from './types.js';

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
      snapshot.history?.startFen,
      snapshot.history?.moves,
      snapshot.confirmedFens,
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

/** Read Chess.com through its captured board controller and submit moves through it. */
export function createChesscomAdapter(page: () => Window = pageWindow): SiteAdapter {
  let currentBoard: ChessBoard | null = null;
  let currentGame: ChessGame | null = null;
  let currentIdentity: object | null = null;
  let currentGameId = '';
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
    const playingAs = game.getPlayingAs?.();
    if (playingAs !== 1 && playingAs !== 2)
      return { kind: 'ineligible', reason: 'Chess.com player color is unavailable' };
    const playerColor: Color = playingAs === 2 ? 'b' : 'w';

    if (board !== currentBoard || game !== currentGame) {
      currentBoard = board;
      currentGame = game;
      currentIdentity = {};
      const declaredId = game.id ?? board.getAttribute('data-game-id');
      currentGameId = declaredId == null ? `chesscom-${++nextGameId}` : String(declaredId);
    }

    const orientation = getOrientation(game);
    const phase = game.isGameOver?.() || doc.querySelector('.game-over-modal-content') ? 'finished' : 'live';
    const controllerState = game.getState?.();
    const settled = controllerState === undefined || controllerState === 'Idle';
    const history = readPositionHistory(game, fen);
    const confirmedFensRaw = game.getHistoryFENs?.();
    const confirmedFens = Array.isArray(confirmedFensRaw)
      ? confirmedFensRaw.filter((item): item is string => typeof item === 'string')
      : undefined;
    const remainingMs = getRemainingMs(doc);
    const whiteRemainingMs = getColorRemainingMs(doc, 'w');
    const blackRemainingMs = getColorRemainingMs(doc, 'b');
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
      ...(whiteRemainingMs != null ? { whiteRemainingMs } : {}),
      ...(blackRemainingMs != null ? { blackRemainingMs } : {}),
      ...(history ? { history } : {}),
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
    capabilities: { input: 'controller' },
    read: () => read(),
    subscribe(listener) {
      listeners.add(listener);
      let stopObserving = () => {};
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
      const bind = (result: SiteRead) => {
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
        listeners.delete(listener);
        stopObserving();
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
      if (!isLegalChesscomMove(game, from, to)) return false;
      if (request.signal.aborted || !request.isCurrent() || currentGame !== game) return false;
      try {
        const result = game.move({ from, to, ...(promotion ? { promotion } : {}) });
        return result?.type === 'Move';
      } catch {
        return false;
      }
    },
    cancelInput() {},
  };
}

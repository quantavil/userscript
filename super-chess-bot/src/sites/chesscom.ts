import { cancelPendingMove, executeMove } from '../board.js';
import { readPositionHistory } from '../history.js';
import { getBoard, getFen, getRemainingMs } from './chesscom-state.js';
import type { Color, GameSnapshot, MoveRequest, SiteAdapter, SiteRead } from './types.js';

interface ChessGame {
  id?: string | number;
  getFEN?: () => string;
  getPlayingAs?: () => number;
  isGameOver?: () => boolean;
  getHistoryFENs?: () => unknown;
  getHistorySANs?: () => unknown;
  on?: (event: string, listener: () => void) => void;
  off?: (event: string, listener: () => void) => void;
}

interface ChessBoard extends HTMLElement {
  game?: ChessGame | null;
}

let nextGameId = 0;
const BOARD_SELECTOR = 'wc-chess-board, chess-board, .board';
const CLOCK_REGION_SELECTOR = '.clock-player-turn';
const CLOCK_SELECTOR = '.clock-player-turn .clock-time-monospace, .clock-player-turn .clock-time';
const RESULT_SELECTOR = '.game-over-modal-content';

function readFingerprint(result: SiteRead): { identity: object | null; value: string } {
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

function mutationElement(target: Node): Element | null {
  return target.nodeType === 1
    ? (target as Element)
    : ((target as Node & { parentElement?: Element | null }).parentElement ?? null);
}

function nodeContainsSelector(node: Node, selector: string): boolean {
  const element = mutationElement(node);
  return !!element && (element.matches(selector) || !!element.querySelector(selector));
}

function isRelevantMutation(records: MutationRecord[]): boolean {
  return records.some((record) => {
    const target = mutationElement(record.target);
    if (!target || target.closest('[data-gabibot-overlay], #menuWrap')) return false;
    const onBoard = !!closestOrSelf(target, BOARD_SELECTOR);
    const onClock = !!closestOrSelf(target, CLOCK_REGION_SELECTOR);
    const onResult = !!closestOrSelf(target, RESULT_SELECTOR);

    if (record.type === 'attributes') {
      if (record.attributeName === 'orientation' || record.attributeName === 'data-game-id') return onBoard;
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

export function createChesscomAdapter(page: () => Window = defaultPage): SiteAdapter {
  let currentBoard: ChessBoard | null = null;
  let currentGame: ChessGame | null = null;
  let currentIdentity: object | null = null;
  let currentGameId = '';

  const read = (): SiteRead => {
    const doc = page().document;
    const board = getBoard(doc) as ChessBoard | null;
    if (!board) return { kind: 'waiting', reason: 'Waiting for board' };
    const game = board.game;
    if (!game || typeof game.getFEN !== 'function') return { kind: 'waiting', reason: 'Waiting for game state' };
    const fen = getFen(game);
    if (!fen) return { kind: 'ineligible', reason: 'Chess.com position is unavailable' };
    const fields = fen.split(' ');
    if (fields.length < 2 || (fields[1] !== 'w' && fields[1] !== 'b')) {
      return { kind: 'ineligible', reason: 'Chess.com position is malformed' };
    }
    const sideToMove = fields[1] as Color;
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

    const orientation =
      board.getAttribute('orientation') === 'black' || board.classList.contains('flipped') ? 'black' : 'white';
    const phase = game.isGameOver?.() || doc.querySelector('.game-over-modal-content') ? 'finished' : 'live';
    const history = readPositionHistory(game, fen);
    const confirmedFensRaw = game.getHistoryFENs?.();
    const confirmedFens = Array.isArray(confirmedFensRaw)
      ? confirmedFensRaw.filter((item): item is string => typeof item === 'string')
      : undefined;
    const snapshot: GameSnapshot = {
      identity: currentIdentity ?? {},
      gameId: currentGameId,
      board,
      fen,
      playerColor,
      sideToMove,
      orientation,
      phase,
      inputReady: phase === 'live' && sideToMove === playerColor,
      remainingMs: getRemainingMs(doc),
      ...(history ? { history } : {}),
      ...(confirmedFens ? { confirmedFens } : {}),
    };
    return { kind: 'game', snapshot };
  };

  return {
    id: 'chesscom',
    capabilities: { input: 'gestures' },
    read,
    subscribe(listener) {
      let stopObserving = () => {};
      let observedBoard: ChessBoard | null = null;
      let observedGame: ChessGame | null = null;
      let moveListener: (() => void) | null = null;
      let queued = false;
      let active = true;
      const initial = read();
      let previous = readFingerprint(initial);
      const detachGame = () => {
        if (observedGame && moveListener) observedGame.off?.('Move', moveListener);
        observedGame = null;
        moveListener = null;
      };
      const bind = (result: SiteRead) => {
        const board = result.kind === 'game' ? (result.snapshot.board as ChessBoard) : null;
        const game = board?.game ?? null;
        if (board === observedBoard && game === observedGame) return;
        detachGame();
        observedBoard = board;
        if (game && typeof game.on === 'function' && typeof game.off === 'function') {
          observedGame = game;
          moveListener = notify;
          game.on('Move', moveListener);
        }
      };
      const notify = () => {
        if (!active) return;
        const result = read();
        bind(result);
        const next = readFingerprint(result);
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
            notify();
          });
        });
        observer.observe(doc.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'orientation', 'data-game-id'],
          characterData: true,
        });
        stopObserving = () => observer.disconnect();
      }
      return () => {
        active = false;
        stopObserving();
        detachGame();
      };
    },
    async submitMove(request: MoveRequest) {
      if (request.signal.aborted || !request.isCurrent()) return false;
      return executeMove(
        request.uci.slice(0, 2),
        request.uci.slice(2, 4),
        request.fromFen,
        request.uci[4],
        undefined,
        undefined,
        request.expectedFen,
      );
    },
    cancelInput() {
      cancelPendingMove();
    },
  };
}

function defaultPage(): Window {
  return typeof unsafeWindow === 'undefined' ? window : unsafeWindow;
}

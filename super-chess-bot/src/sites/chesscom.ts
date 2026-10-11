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
    capabilities: { input: 'gestures', autoRematch: true },
    read,
    subscribe(listener) {
      let stopObserving = () => {};
      let observedBoard: ChessBoard | null = null;
      let observedGame: ChessGame | null = null;
      let moveListener: (() => void) | null = null;
      let queued = false;
      let active = true;
      const detachGame = () => {
        if (observedGame && moveListener) observedGame.off?.('Move', moveListener);
        observedGame = null;
        moveListener = null;
      };
      const bind = () => {
        const result = read();
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
        bind();
        try {
          listener();
        } catch (error) {
          console.error('Super Chess Bot: site listener failed.', error);
        }
      };
      bind();
      const doc = page().document;
      const Observer = (page() as Window & { MutationObserver?: typeof MutationObserver }).MutationObserver;
      if (doc.body && Observer) {
        const observer = new Observer(() => {
          if (queued) return;
          queued = true;
          queueMicrotask(() => {
            queued = false;
            notify();
          });
        });
        observer.observe(doc.body, { childList: true, subtree: true, attributes: true });
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
    requestRematch() {
      const button = page().document.querySelector<HTMLButtonElement>(
        '[data-cy="sidebar-game-over-rematch-button"], [data-cy="game-over-modal-rematch-button"]',
      );
      if (!button) return false;
      button.click();
      return true;
    },
  };
}

function defaultPage(): Window {
  return typeof unsafeWindow === 'undefined' ? window : unsafeWindow;
}

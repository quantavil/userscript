import {
  type PychessClockObservation,
  type PychessMove,
  type PychessObservation,
  parsePychessObservation,
} from './pychess-state.js';
import { pageWindow, type SiteAdapter, type SiteRead } from './types.js';

interface ChessgroundState {
  fen?: string;
  turnColor?: 'white' | 'black';
  orientation?: 'white' | 'black';
  movable?: { color?: 'white' | 'black' };
  dimensions?: { width?: number; height?: number };
  dom?: { elements?: { board?: HTMLElement } };
}

interface ChessgroundApi {
  state?: ChessgroundState;
  getFen?: () => string;
  selectSquare?: (square: string) => void;
}

interface PychessPage extends Window {
  cg?: ChessgroundApi;
  MutationObserver?: typeof MutationObserver;
}

interface Capture {
  read: SiteRead;
  fingerprint: string;
  identity: object;
}

function mutationElement(target: Node): Element | null {
  return target.nodeType === 1
    ? (target as Element)
    : ((target as Node & { parentElement?: Element | null }).parentElement ?? null);
}

function isRelevantMutation(records: MutationRecord[]): boolean {
  return records.some((record) => {
    const target = mutationElement(record.target);
    if (!target || target.closest('[data-gabibot-overlay], #menuWrap')) return false;
    if (target.closest('#mainboard, #movelist, .btn-controls')) return true;
    if (record.type === 'attributes' && record.attributeName === 'class' && target.matches('.clock')) return true;
    if (record.type !== 'childList') return false;
    return [...Array.from(record.addedNodes), ...Array.from(record.removedNodes)].some((node) => {
      const element = mutationElement(node);
      return (
        !!element && (element.matches('.round-app') || !!element.querySelector('.round-app, #mainboard, #movelist'))
      );
    });
  });
}

/** Read PyChess-owned DOM and the exposed Chessground state without wrapping site callbacks. */
export function createPychessAdapter(page: () => Window = pageWindow): SiteAdapter {
  let lastGameId: string | null = null;
  let lastBoard: HTMLElement | null = null;
  let lastCg: ChessgroundApi | null = null;
  let identity: object = {};

  const capture = (): Capture => {
    const currentPage = page() as PychessPage;
    const observation = collectPychessObservation(currentPage);
    const cg = currentPage.cg ?? null;
    if (observation.metadata.gameId !== lastGameId || observation.board.element !== lastBoard || cg !== lastCg) {
      lastGameId = observation.metadata.gameId;
      lastBoard = observation.board.element;
      lastCg = cg;
      identity = {};
    }
    const read = parsePychessObservation(observation, identity);
    const fingerprint =
      read.kind === 'game'
        ? JSON.stringify([
            read.snapshot.gameId,
            read.snapshot.fen,
            read.snapshot.playerColor,
            read.snapshot.orientation,
            read.snapshot.phase,
            read.snapshot.inputReady,
            read.snapshot.history?.moves,
            read.snapshot.confirmedFens,
            observation.result.text,
            observation.result.postgame,
            observation.clocks.clock0.connecting,
            observation.clocks.clock1.connecting,
          ])
        : JSON.stringify([read.kind, read.reason, observation.result.text, observation.result.postgame]);
    return { read, fingerprint, identity };
  };

  return {
    id: 'pychess',
    capabilities: { input: 'selection', autoRematch: false },
    read: () => capture().read,
    subscribe(listener) {
      const currentPage = page() as PychessPage;
      const body = currentPage.document.body;
      const Observer = currentPage.MutationObserver;
      if (!body || !Observer) return () => {};
      let active = true;
      let queued = false;
      let previous = capture();
      const observer = new Observer((records) => {
        if (!isRelevantMutation(records)) return;
        if (queued || !active) return;
        queued = true;
        queueMicrotask(() => {
          queued = false;
          if (!active) return;
          const next = capture();
          if (next.identity === previous.identity && next.fingerprint === previous.fingerprint) return;
          previous = next;
          try {
            listener();
          } catch (error) {
            console.error('Super Chess Bot: PyChess listener failed.', error);
          }
        });
      });
      observer.observe(body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'data-ply'],
        characterData: true,
      });
      return () => {
        active = false;
        observer.disconnect();
      };
    },
    async submitMove() {
      return false;
    },
    cancelInput() {},
    requestRematch() {
      return false;
    },
  };
}

function collectPychessObservation(page: PychessPage): PychessObservation {
  const doc = page.document;
  const body = doc.body as HTMLBodyElement;
  const cg = page.cg;
  const state = cg?.state;
  const board = doc.querySelector<HTMLElement>('.round-app #mainboard cg-board');
  const controllerBoard = state?.dom?.elements?.board ?? null;
  const dimensions = state?.dimensions;
  const directSquares = board?.querySelectorAll(':scope > square').length ?? 0;
  const width = Number.isInteger(dimensions?.width) ? (dimensions?.width as number) : directSquares === 64 ? 8 : 0;
  const height = Number.isInteger(dimensions?.height) ? (dimensions?.height as number) : directSquares === 64 ? 8 : 0;
  const style = board ? board.ownerDocument.defaultView?.getComputedStyle(board) : null;
  const rect = board?.getBoundingClientRect();
  const visible =
    !!board &&
    style?.display !== 'none' &&
    style?.visibility !== 'hidden' &&
    (board.getClientRects?.().length ?? 0) > 0 &&
    !!rect &&
    rect.width > 0 &&
    rect.height > 0;
  const moves = Array.from(doc.querySelectorAll<HTMLElement>('#movelist move[ply]')).flatMap((move): PychessMove[] => {
    const ply = Number(move.getAttribute('ply'));
    const san = move.querySelector('san')?.textContent?.trim() ?? '';
    if (!Number.isInteger(ply) || ply < 1 || !san) return [];
    return [{ ply, san, active: move.classList.contains('active') }];
  });
  const clock = (id: 0 | 1): PychessClockObservation => {
    const min = doc.querySelector(`#clock${id} .clock-time.min`)?.textContent?.trim() ?? null;
    const sec = doc.querySelector(`#clock${id} .clock-time.sec`)?.textContent?.trim() ?? null;
    const connecting = !!doc.querySelector(`#clock${id} .clock.connecting`);
    return { min, sec, connecting };
  };
  const renderedResult = doc.querySelector('#movelist .result')?.textContent?.trim() ?? null;
  const postgame = !!doc.querySelector('.btn-controls.after');
  const dataset = body.dataset;
  const orientation = state?.orientation ?? null;
  const turnColor = state?.turnColor ?? null;
  const movableColor = state?.movable?.color ?? null;
  const fen = state?.fen ?? null;
  const displayedPlacement = cg?.getFen?.() ?? (fen ? fen.split(' ')[0] : null);

  return {
    metadata: {
      isRoundView: dataset.view === 'round' && !!doc.querySelector('.round-app'),
      pathname: page.location.pathname,
      gameId: dataset.gameid || null,
      username: dataset.username || null,
      whitePlayer: dataset.wplayer || null,
      blackPlayer: dataset.bplayer || null,
      variant: dataset.variant || null,
      chess960: dataset.chess960 || null,
      correspondence: dataset.corr || null,
      level: dataset.level || null,
      initialFen: dataset.initialfen ?? null,
      status: dataset.status ?? null,
      initialResult: dataset.result ?? null,
    },
    board: {
      element: board,
      owned: !!board && board === controllerBoard,
      connected: !!board?.isConnected,
      visible,
      width,
      height,
    },
    state: {
      fen,
      displayedPlacement,
      turnColor,
      movableColor,
      orientation,
    },
    moves,
    result: {
      text: renderedResult,
      postgame,
    },
    clocks: { clock0: clock(0), clock1: clock(1) },
  };
}

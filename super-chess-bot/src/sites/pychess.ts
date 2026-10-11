import { Chess, normalizeMove } from 'chessops/chess';
import { makeFen, parseFen } from 'chessops/fen';
import { makeSquare, parseUci } from 'chessops/util';
import { activateElement } from '../board-input.js';
import { canonicalFen } from '../history.js';
import {
  type PychessClockObservation,
  type PychessMove,
  type PychessObservation,
  parsePychessObservation,
} from './pychess-state.js';
import { type MoveRequest, pageWindow, type SiteAdapter, type SiteRead } from './types.js';

interface ChessgroundState {
  fen?: string;
  turnColor?: 'white' | 'black';
  orientation?: 'white' | 'black';
  movable?: { color?: 'white' | 'black'; dests?: Map<string, Iterable<string>> };
  selectable?: { selected?: string };
  stats?: { ctrlKey?: boolean };
  dimensions?: { width?: number; height?: number };
  dom?: { elements?: { board?: HTMLElement } };
}

interface ChessgroundApi {
  state?: ChessgroundState;
  getFen?: () => string;
  selectSquare?: (square: string | null) => void;
  move?: (...args: unknown[]) => unknown;
}

interface PychessPage extends Window {
  cg?: ChessgroundApi;
  PointerEvent?: typeof PointerEvent;
  MutationObserver?: typeof MutationObserver;
}

interface Capture {
  read: SiteRead;
  fingerprint: string;
  identity: object;
}

interface PendingInput {
  request: MoveRequest;
  cg: ChessgroundApi;
  board: HTMLElement;
  from: string;
  playerColor: 'w' | 'b';
  userRevision: number;
  promotion: boolean;
  chooser: HTMLElement | null;
  cancelled: boolean;
  onAbort: () => void;
}

const PROMOTION_ROLE: Record<string, string> = {
  q: 'q-piece',
  r: 'r-piece',
  b: 'b-piece',
  n: 'n-piece',
};

const INPUT_TIMEOUT_MS = 1000;

function cleanFen(fen: string): string | null {
  return canonicalFen(fen);
}

function moveDetails(request: MoveRequest): { from: string; toCandidates: string[]; promotion: boolean } | null {
  const sourceFen = cleanFen(request.fromFen);
  const expectedFen = cleanFen(request.expectedFen);
  if (!sourceFen || !expectedFen) return null;
  const setup = parseFen(sourceFen);
  if (setup.isErr) return null;
  const position = Chess.fromSetup(setup.value);
  if (position.isErr) return null;
  const move = parseUci(request.uci);
  if (!move || !('from' in move) || !position.value.isLegal(move)) return null;
  const normalized = normalizeMove(position.value, move);
  const from = makeSquare(move.from);
  const candidates = [...new Set([makeSquare(move.to), makeSquare(normalized.to)])];
  position.value.play(move);
  const predictedFen = cleanFen(makeFen(position.value.toSetup()));
  if (predictedFen !== expectedFen) return null;
  return { from, toCandidates: candidates, promotion: !!move.promotion };
}

function roleMatches(piece: Element, role: string, color: 'white' | 'black'): boolean {
  const roleClass = PROMOTION_ROLE[role];
  if (!roleClass) return false;
  const classList = piece.classList;
  return classList.contains(roleClass) && classList.contains(color);
}

function visible(element: HTMLElement): boolean {
  if (!element.isConnected || element.getClientRects().length === 0) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  return style?.display !== 'none' && style?.visibility !== 'hidden';
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
    bindTrustedBoard(observation.board.element);
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

  let watchedBoard: HTMLElement | null = null;
  let trustedRevision = 0;
  let trustedEventNames: string[] = [];
  let pendingInput: PendingInput | null = null;

  const onTrustedInput = (event: Event) => {
    if (event.isTrusted) trustedRevision++;
  };
  const bindTrustedBoard = (board: HTMLElement | null) => {
    const mainboard =
      board && typeof board.closest === 'function' ? (board.closest('#mainboard') as HTMLElement | null) : null;
    const candidate = board ? (mainboard ?? board.parentElement ?? board) : null;
    const inputRegion =
      candidate &&
      typeof candidate.addEventListener === 'function' &&
      typeof candidate.removeEventListener === 'function'
        ? candidate
        : null;
    if (inputRegion === watchedBoard) return;
    if (watchedBoard) {
      for (const eventName of trustedEventNames) watchedBoard.removeEventListener(eventName, onTrustedInput, true);
    }
    watchedBoard = inputRegion;
    trustedEventNames = [];
    if (!watchedBoard) return;
    const currentPage = page() as PychessPage;
    trustedEventNames = currentPage.PointerEvent ? ['pointerdown'] : ['mousedown', 'touchstart'];
    for (const eventName of trustedEventNames) watchedBoard.addEventListener(eventName, onTrustedInput, true);
  };

  const releasePendingInput = (pending: PendingInput, cancelOwnedInput: boolean) => {
    if (pendingInput === pending) pendingInput = null;
    pending.request.signal.removeEventListener('abort', pending.onAbort);
    pending.cancelled = true;
    if (!cancelOwnedInput || pending.userRevision !== trustedRevision) return;
    const currentPage = page() as PychessPage;
    if (
      pending.promotion &&
      pending.chooser?.isConnected &&
      currentPage.document.querySelector('#extension_choice') === pending.chooser
    ) {
      pending.chooser.click();
      return;
    }
    if (pending.cg.state?.selectable?.selected === pending.from) pending.cg.selectSquare?.(null);
  };

  const isPendingCurrent = (pending: PendingInput, requireInputReady: boolean): boolean => {
    try {
      if (
        pending.cancelled ||
        pending.request.signal.aborted ||
        pending.userRevision !== trustedRevision ||
        (page() as PychessPage).cg !== pending.cg ||
        pending.request.isCurrent() !== true
      )
        return false;
      const current = capture().read;
      if (
        current.kind !== 'game' ||
        current.snapshot.identity !== pending.request.identity ||
        current.snapshot.board !== pending.board ||
        cleanFen(current.snapshot.fen) !== cleanFen(pending.request.fromFen)
      )
        return false;
      if (!requireInputReady) return true;
      const color = current.snapshot.playerColor === 'w' ? 'white' : 'black';
      return (
        current.snapshot.inputReady &&
        current.snapshot.sideToMove === current.snapshot.playerColor &&
        pending.cg.state?.turnColor === color &&
        pending.cg.state.movable?.color === color
      );
    } catch {
      return false;
    }
  };

  const isInputStillOwned = (pending: PendingInput): boolean => {
    try {
      if (
        pending.cancelled ||
        pending.request.signal.aborted ||
        pending.userRevision !== trustedRevision ||
        (page() as PychessPage).cg !== pending.cg
      )
        return false;
      const current = capture().read;
      return (
        current.kind === 'game' &&
        current.snapshot.identity === pending.request.identity &&
        current.snapshot.board === pending.board
      );
    } catch {
      return false;
    }
  };

  const cancelCurrentInput = () => {
    const pending = pendingInput;
    if (pending) releasePendingInput(pending, true);
  };

  const findPromotionChoice = (pending: PendingInput): HTMLElement | null => {
    const root = page().document.querySelector<HTMLElement>('#extension_choice');
    pending.chooser = root;
    if (!root?.isConnected || !visible(root)) return null;
    const requested = pending.request.uci.slice(-1).toLowerCase();
    const color = pending.playerColor === 'w' ? 'white' : 'black';
    for (const piece of Array.from(root.querySelectorAll('square > piece'))) {
      const square = piece.parentElement as HTMLElement | null;
      if (
        square &&
        square.closest('#extension_choice') === root &&
        roleMatches(piece, requested, color) &&
        visible(square) &&
        visible(piece as HTMLElement)
      )
        return square;
    }
    return null;
  };

  const waitForPromotionChoice = async (pending: PendingInput): Promise<boolean> => {
    let elapsed = 0;
    while (elapsed < INPUT_TIMEOUT_MS) {
      if (!isInputStillOwned(pending)) {
        releasePendingInput(pending, true);
        return false;
      }
      const choice = findPromotionChoice(pending);
      if (choice) {
        const activated = await activateElement(
          choice,
          (x, y) => page().document.elementFromPoint(x, y) ?? choice,
          () => isInputStillOwned(pending),
        );
        releasePendingInput(pending, !activated);
        return activated;
      }
      const delay = Math.min(16, INPUT_TIMEOUT_MS - elapsed);
      await new Promise((resolve) => setTimeout(resolve, delay));
      elapsed += delay;
    }
    releasePendingInput(pending, true);
    return false;
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
    async submitMove(request) {
      if (pendingInput) cancelCurrentInput();
      try {
        if (request.signal.aborted) return false;
        const initial = capture().read;
        const currentPage = page() as PychessPage;
        const cg = currentPage.cg;
        const state = cg?.state;
        const board = initial.kind === 'game' ? initial.snapshot.board : null;
        if (
          initial.kind !== 'game' ||
          !board ||
          initial.snapshot.identity !== request.identity ||
          cleanFen(initial.snapshot.fen) !== cleanFen(request.fromFen) ||
          !initial.snapshot.inputReady ||
          !cg ||
          !state ||
          !cg.selectSquare ||
          page().document.querySelector('.round-app #mainboard cg-board') !== board ||
          state.dom?.elements?.board !== board ||
          state.selectable?.selected
        )
          return false;
        const detail = moveDetails(request);
        if (!detail) return false;
        const destinations = state.movable?.dests?.get(detail.from);
        if (!destinations) return false;
        const legalDestinations = new Set(Array.from(destinations, String));
        const siteTargets = detail.toCandidates.filter((target) => legalDestinations.has(target));
        if (siteTargets.length !== 1 || !siteTargets[0]) return false;
        const to = siteTargets[0];
        if (detail.promotion && !state.stats) return false;

        const pending: PendingInput = {
          request,
          cg,
          board,
          from: detail.from,
          playerColor: initial.snapshot.playerColor,
          userRevision: trustedRevision,
          promotion: detail.promotion,
          chooser: null,
          cancelled: false,
          onAbort: () => {},
        };
        pending.onAbort = () => releasePendingInput(pending, true);
        pendingInput = pending;
        request.signal.addEventListener('abort', pending.onAbort, { once: true });
        if (!isPendingCurrent(pending, true)) {
          releasePendingInput(pending, true);
          return false;
        }
        cg.selectSquare(detail.from);
        if (state.selectable?.selected !== detail.from || !isPendingCurrent(pending, true)) {
          releasePendingInput(pending, true);
          return false;
        }

        const stats = state.stats;
        const hadCtrlKey = !!stats && Object.hasOwn(stats, 'ctrlKey');
        const previousCtrlKey = stats?.ctrlKey;
        if (detail.promotion && stats) stats.ctrlKey = true;
        try {
          if (!isPendingCurrent(pending, true)) {
            releasePendingInput(pending, true);
            return false;
          }
          cg.selectSquare(to);
        } finally {
          if (detail.promotion && stats) {
            if (hadCtrlKey) stats.ctrlKey = previousCtrlKey;
            else delete stats.ctrlKey;
          }
        }

        if (!isInputStillOwned(pending)) {
          releasePendingInput(pending, true);
          return false;
        }
        if (!detail.promotion) {
          const expectedPlacement = cleanFen(request.expectedFen)?.split(' ')[0];
          const displayedPlacement = cg.getFen?.().trim().split(/\s+/)[0];
          const submitted = !!expectedPlacement && displayedPlacement === expectedPlacement;
          releasePendingInput(pending, !submitted);
          return submitted;
        }
        return await waitForPromotionChoice(pending);
      } catch {
        if (pendingInput) releasePendingInput(pendingInput, true);
        return false;
      }
    },
    cancelInput() {
      cancelCurrentInput();
    },
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

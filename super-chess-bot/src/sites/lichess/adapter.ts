import { normalizeMove } from 'chessops/chess';
import { makeFen, parseFen } from 'chessops/fen';
import { makeSquare, parseUci } from 'chessops/util';
import { setupPosition } from 'chessops/variant';
import { canonicalFen, parseRules, replaySanLine } from '../../chess/position.js';
import { isVisibleBoard } from '../common.js';
import {
  type Color,
  type GameSnapshot,
  type MoveRequest,
  pageWindow,
  type SiteAdapter,
  type SiteRead,
} from '../types.js';
import { installLichessControllerBridge } from './bridge.js';

type LichessColor = 'white' | 'black';

interface LichessStep {
  ply: number;
  fen: string;
  san: string;
  uci: string;
}

interface RoundData {
  game?: {
    id?: string;
    variant?: { key?: string };
    status?: { id?: number; name?: string };
  };
  player?: { color?: LichessColor; spectator?: boolean };
  steps?: LichessStep[];
}

interface LichessDests {
  get?: (square: string) => Iterable<string> | undefined;
}

interface RoundController {
  data?: RoundData;
  ply?: number;
  chessground?: {
    state?: {
      turnColor?: LichessColor;
      orientation?: LichessColor;
      selected?: string;
      movable?: { color?: LichessColor; dests?: LichessDests };
    };
  };
  clock?: { millisOf?: (color: LichessColor) => number };
  socket?: { handlers?: Record<string, unknown> };
  loading?: boolean;
  redirecting?: boolean;
  toSubmit?: unknown;
  isPlaying?: () => boolean;
  canMove?: () => boolean;
  replaying?: () => boolean;
  lastPly?: () => number;
  stepAt?: (ply: number) => LichessStep;
  pluginMove?: (from: string, to: string, role?: string, preConfirmed?: boolean) => void;
  [key: string]: unknown;
}

interface MoveDetails {
  from: string;
  toCandidates: string[];
  promotionRole?: string;
}

const PROMOTION_ROLE: Record<string, string> = {
  queen: 'queen',
  rook: 'rook',
  bishop: 'bishop',
  knight: 'knight',
};
/** Supported Lichess variant keys. */
const LICHESS_SUPPORTED_VARIANTS = new Set(['standard', 'fromPosition', 'chess960']);
const DEFAULT_BRIDGE_ERROR =
  'Lichess round controller not captured. Enable synchronous page-context injection in your userscript manager, then reload.';

function lichessColor(color: Color): LichessColor {
  return color === 'w' ? 'white' : 'black';
}

function engineColor(color: unknown): Color | null {
  if (color === 'white') return 'w';
  if (color === 'black') return 'b';
  return null;
}

function stepFen(round: RoundController, phase: GameSnapshot['phase']): LichessStep | null {
  const lastPly = round.lastPly?.();
  const currentPly = phase === 'replay' && Number.isInteger(round.ply) ? round.ply : lastPly;
  if (Number.isInteger(currentPly) && round.stepAt) {
    try {
      const step = round.stepAt(currentPly as number);
      if (step && typeof step.fen === 'string') return step;
    } catch {
      return null;
    }
  }
  const steps = round.data?.steps;
  const step = steps?.[steps.length - 1];
  return step && typeof step.fen === 'string' ? step : null;
}

function matchesStepFen(storedFen: string | undefined, expectedFen: string): boolean {
  if (typeof storedFen !== 'string') return false;
  const trimmed = storedFen.trim();
  const fullFen = canonicalFen(trimmed);
  if (fullFen) return fullFen === expectedFen;
  return !/\s/.test(trimmed) && trimmed === expectedFen.split(' ')[0];
}

function buildHistoryFor(data: RoundData, selectedStep: LichessStep) {
  const steps = data.steps;
  if (!steps?.length || steps[0]?.ply !== 0) return undefined;
  const selectedIndex = steps.findIndex((step) => step.ply === selectedStep.ply);
  if (selectedIndex < 0) return undefined;
  const selectedSteps = steps.slice(0, selectedIndex + 1);
  if (selectedSteps.some((step, index) => step.ply !== index)) return undefined;
  const variant = data.game?.variant?.key ?? 'standard';
  const startFen = canonicalFen(selectedSteps[0]?.fen ?? '', variant);
  if (!startFen) return undefined;
  const replay = replaySanLine(
    startFen,
    selectedSteps.slice(1).map((step) => step.san),
    variant,
  );
  if (!replay) return undefined;
  if (replay.fens.some((position, index) => !matchesStepFen(selectedSteps[index]?.fen, position))) return undefined;
  const fen = replay.fens.at(-1);
  if (!fen || !matchesStepFen(selectedStep.fen, fen)) return undefined;
  return { fen, history: replay.history, confirmedFens: replay.fens };
}

export function createHistoryReader(): (
  data: RoundData,
  selectedStep: LichessStep,
) => ReturnType<typeof buildHistoryFor> {
  let cachedData: RoundData | null = null;
  let cachedSteps: LichessStep[] | undefined;
  let cachedPly: number | undefined;
  let cachedFen: string | undefined;
  let cachedSan: string | undefined;
  let cachedLength: number | undefined;
  let cachedResult: ReturnType<typeof buildHistoryFor>;

  return (data, selectedStep) => {
    const steps = data.steps;
    if (
      cachedResult !== undefined &&
      data === cachedData &&
      steps === cachedSteps &&
      selectedStep.ply === cachedPly &&
      selectedStep.fen === cachedFen &&
      selectedStep.san === cachedSan &&
      steps?.length === cachedLength
    ) {
      return cachedResult;
    }

    cachedData = data;
    cachedSteps = steps;
    cachedPly = selectedStep.ply;
    cachedFen = selectedStep.fen;
    cachedSan = selectedStep.san;
    cachedLength = steps?.length;
    cachedResult = buildHistoryFor(data, selectedStep);
    return cachedResult;
  };
}

function moveDetails(request: MoveRequest, variant = 'standard'): MoveDetails | null {
  const sourceFen = canonicalFen(request.fromFen, variant);
  const expectedFen = canonicalFen(request.expectedFen, variant);
  if (!sourceFen || !expectedFen) return null;
  const setup = parseFen(sourceFen);
  if (setup.isErr) return null;
  const rules = parseRules(variant);
  const position = rules ? setupPosition(rules, setup.value) : null;
  if (!position || position.isErr) {
    const match = /^([a-h][1-8])([a-h][1-8])([nbrq]?)$/.exec(request.uci);
    if (!match) return null;
    return {
      from: match[1],
      toCandidates: [match[2]],
      ...(match[3] ? { promotionRole: PROMOTION_ROLE[match[3]] } : {}),
    };
  }
  const move = parseUci(request.uci);
  if (!move || !('from' in move) || !position.value.isLegal(move)) return null;
  const normalized = normalizeMove(position.value, move);
  const from = makeSquare(move.from);
  const toCandidates = [...new Set([makeSquare(move.to), makeSquare(normalized.to)])];
  position.value.play(move);
  if (canonicalFen(makeFen(position.value.toSetup()), variant) !== expectedFen) return null;
  const promotionRole = move.promotion ? PROMOTION_ROLE[move.promotion] : undefined;
  if (move.promotion && !promotionRole) return null;
  return { from, toCandidates, ...(promotionRole ? { promotionRole } : {}) };
}

function wrapMethod(target: Record<string, unknown>, key: string, after: () => void): void {
  const original = target[key];
  if (typeof original !== 'function') return;
  try {
    target[key] = function (this: unknown, ...args: unknown[]) {
      const result = Reflect.apply(original, this, args);
      queueMicrotask(after);
      return result;
    };
  } catch {
    // Lichess may change or lock a private controller method in a future release.
  }
}

function extractLichessIncrement(round: RoundController, data: RoundData | undefined): number | null {
  try {
    const clockObj =
      (round.clock as Record<string, unknown> | undefined) ??
      ((data as Record<string, unknown> | undefined)?.clock as Record<string, unknown> | undefined);
    const inc = clockObj?.increment ?? clockObj?.inc;
    if (typeof inc === 'number' && Number.isFinite(inc) && inc >= 0) {
      return Math.round(inc >= 100 ? inc : inc * 1000);
    }
  } catch {
    // ignore
  }
  return null;
}

function extractLichessResult(data: RoundData | undefined, statusId: number): string | null {
  if (statusId < 25) return null;
  const winner = (data?.game as { winner?: string } | undefined)?.winner;
  if (winner === 'white') return '1-0';
  if (winner === 'black') return '0-1';
  return '1/2-1/2';
}

/** Read any standard Lichess player round and submit through its round controller. */
export function createLichessAdapter(page: () => Window = pageWindow): SiteAdapter {
  const currentPage = page();
  const listeners = new Set<() => void>();
  let round: RoundController | null = null;
  let lastRound: RoundController | null = null;
  let lastGameId: string | null = null;
  let lastBoard: HTMLElement | null = null;
  let identity: object = {};
  let previousFingerprint = '';
  const readHistory = createHistoryReader();

  const capture = (): SiteRead => {
    if (!round) return { kind: 'waiting', reason: DEFAULT_BRIDGE_ERROR };
    try {
      const data = round.data;
      const game = data?.game;
      const player = data?.player;
      if (!data || !game || !player) return { kind: 'waiting', reason: 'Waiting for Lichess game state' };
      if (typeof game.variant?.key !== 'string' || !LICHESS_SUPPORTED_VARIANTS.has(game.variant.key))
        return { kind: 'ineligible', reason: 'Lichess variant is not supported' };
      if (player.spectator === true) return { kind: 'ineligible', reason: 'Lichess player round is required' };
      if (typeof game.id !== 'string' || !game.id)
        return { kind: 'waiting', reason: 'Waiting for Lichess game identity' };
      const statusId = game.status?.id;
      if (typeof statusId !== 'number' || !Number.isFinite(statusId))
        return { kind: 'waiting', reason: 'Waiting for Lichess game status' };
      if (statusId < 20) return { kind: 'waiting', reason: 'Lichess game has not started' };

      const board = currentPage.document.querySelector<HTMLElement>(
        '.round__app .cg-wrap, .round__board .cg-wrap, .round .cg-wrap, .cg-wrap',
      );
      if (!board || !isVisibleBoard(board)) return { kind: 'waiting', reason: 'Waiting for Lichess chessboard' };
      const playerColor = engineColor(player.color);
      const orientation = round.chessground?.state?.orientation;
      if (!playerColor || (orientation !== 'white' && orientation !== 'black'))
        return { kind: 'ineligible', reason: 'Lichess player color or board orientation is unavailable' };

      const replaying = round.replaying?.() === true;
      const phase: GameSnapshot['phase'] = statusId >= 25 ? 'finished' : replaying ? 'replay' : 'live';
      if (phase === 'live' && round.isPlaying?.() !== true)
        return { kind: 'ineligible', reason: 'Lichess player round is required' };
      const selectedStep = stepFen(round, phase);
      if (!selectedStep) return { kind: 'ineligible', reason: 'Lichess accepted FEN is unavailable' };
      const variantKey = game.variant?.key ?? 'standard';
      const history = readHistory(data, selectedStep);
      const fen = canonicalFen(selectedStep.fen, variantKey) ?? history?.fen ?? null;
      if (!fen) return { kind: 'ineligible', reason: 'Lichess accepted FEN is unavailable' };
      const sideToMove = fen.split(' ')[1];
      if (sideToMove !== 'w' && sideToMove !== 'b')
        return { kind: 'ineligible', reason: 'Lichess side to move is unavailable' };

      const gameId = game.id;
      if (round !== lastRound || gameId !== lastGameId || board !== lastBoard) {
        lastRound = round;
        lastGameId = gameId;
        lastBoard = board;
        identity = {};
      }
      const cgState = round.chessground?.state;
      const canMove = round.canMove?.() === true;
      const inputReady =
        phase === 'live' &&
        sideToMove === playerColor &&
        canMove &&
        cgState?.turnColor === lichessColor(playerColor) &&
        cgState.movable?.color === lichessColor(playerColor) &&
        !cgState.selected &&
        !round.loading &&
        !round.redirecting &&
        !round.toSubmit;
      let remainingMs: number | null = null;
      let whiteRemainingMs: number | null = null;
      let blackRemainingMs: number | null = null;
      try {
        const clock = round.clock?.millisOf?.(lichessColor(playerColor));
        if (typeof clock === 'number' && Number.isFinite(clock) && clock >= 0) remainingMs = clock;
        const wClock = round.clock?.millisOf?.('white');
        if (typeof wClock === 'number' && Number.isFinite(wClock) && wClock >= 0) whiteRemainingMs = wClock;
        const bClock = round.clock?.millisOf?.('black');
        if (typeof bClock === 'number' && Number.isFinite(bClock) && bClock >= 0) blackRemainingMs = bClock;
      } catch {
        // A missing or changing site clock falls back to the configured search budget.
      }
      const hasActiveClock = remainingMs != null || whiteRemainingMs != null || blackRemainingMs != null;
      const incrementMs = hasActiveClock ? (extractLichessIncrement(round, data) ?? 0) : null;
      const result = extractLichessResult(data, statusId);
      const snapshot: GameSnapshot = {
        identity,
        gameId,
        board,
        fen,
        playerColor,
        sideToMove,
        orientation,
        phase,
        inputReady,
        remainingMs,
        // These positions come from validated site-owned round steps, not Chessground's
        // optimistic presentation. This describes the observed source, not socket telemetry.
        confirmationSource: 'site-accepted',
        ...(incrementMs != null ? { incrementMs } : {}),
        ...(result ? { result } : {}),
        ...(whiteRemainingMs != null ? { whiteRemainingMs } : {}),
        ...(blackRemainingMs != null ? { blackRemainingMs } : {}),
        ...(history ? { history: history.history, confirmedFens: history.confirmedFens } : {}),
        variant: variantKey,
      };
      return { kind: 'game', snapshot };
    } catch {
      return { kind: 'waiting', reason: 'Waiting for Lichess game state' };
    }
  };

  const fingerprint = (read: SiteRead): string =>
    read.kind === 'game'
      ? JSON.stringify([
          read.snapshot.gameId,
          read.snapshot.fen,
          read.snapshot.playerColor,
          read.snapshot.orientation,
          read.snapshot.phase,
          read.snapshot.result,
          read.snapshot.inputReady,
          read.snapshot.history?.moves,
        ])
      : JSON.stringify([read.kind, read.reason]);

  const notify = () => {
    const next = capture();
    const nextFingerprint = fingerprint(next);
    if (next.kind === 'game' && lastNotifiedIdentity !== next.snapshot.identity) {
      lastNotifiedIdentity = next.snapshot.identity;
      previousFingerprint = '';
    }
    if (nextFingerprint === previousFingerprint) return;
    previousFingerprint = nextFingerprint;
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch (error) {
        console.error('Super Chess Bot: Lichess listener failed.', error);
      }
    }
  };
  let lastNotifiedIdentity: object | null = null;

  const instrumentRound = (controller: unknown) => {
    if (!controller || typeof controller !== 'object') return;
    round = controller as RoundController;
    const target = round as Record<string, unknown>;
    for (const method of ['jump', 'flipNow', 'reload']) wrapMethod(target, method, notify);
    const handlers = round.socket?.handlers;
    if (handlers) for (const method of ['move', 'drop', 'endData', 'reload']) wrapMethod(handlers, method, notify);
    notify();
  };

  const bridgeInstalled = installLichessControllerBridge(currentPage, instrumentRound);

  return {
    id: 'lichess',
    read: () => (bridgeInstalled ? capture() : { kind: 'ineligible', reason: 'Lichess round hook is unavailable' }),
    subscribe(listener) {
      listeners.add(listener);
      const current = capture();
      previousFingerprint = fingerprint(current);
      if (current.kind === 'game') lastNotifiedIdentity = current.snapshot.identity;
      return () => listeners.delete(listener);
    },
    async submitMove(request: MoveRequest) {
      const current = capture();
      const variant = current.kind === 'game' ? current.snapshot.variant : 'standard';
      if (
        request.signal.aborted ||
        request.isCurrent() !== true ||
        current.kind !== 'game' ||
        current.snapshot.identity !== request.identity ||
        canonicalFen(current.snapshot.fen, variant) !== canonicalFen(request.fromFen, variant) ||
        !current.snapshot.inputReady
      )
        return false;
      const controller = round;
      const cgState = controller?.chessground?.state;
      const pluginMove = controller?.pluginMove;
      if (!controller || !cgState || typeof pluginMove !== 'function') return false;
      const detail = moveDetails(request, variant);
      if (!detail) return false;
      const destinations = cgState.movable?.dests?.get?.(detail.from);
      if (!destinations) return false;
      const legalDestinations = new Set(Array.from(destinations, String));
      const target = detail.toCandidates.find((candidate) => legalDestinations.has(candidate));
      if (!target) return false;
      if (request.signal.aborted || !request.isCurrent() || round !== controller) return false;
      try {
        request.onDispatch?.();
        pluginMove.call(controller, detail.from, target, detail.promotionRole, true);
        return true;
      } catch {
        return false;
      }
    },
    cancelInput() {},
  };
}

import { describe, expect, it, vi } from 'vite-plus/test';
import { createHistoryReader, createLichessAdapter } from '../../../src/sites/lichess/adapter.js';
import type { GameSnapshot, MoveRequest } from '../../../src/sites/types.js';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const AFTER_E4_PLACEMENT = AFTER_E4.split(' ')[0] ?? '';
const AFTER_E4_C5 = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const PROMOTION_FEN = '7k/P7/8/8/8/8/8/7K w - - 0 1';
const AFTER_UNDERPROMOTION = 'N6k/8/8/8/8/8/8/7K b - - 0 1';
const CASTLE_FEN = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
const AFTER_CASTLE = 'r3k2r/8/8/8/8/8/8/R4RK1 b kq - 1 1';
/** Black has just played d7-d5, so the e5 pawn can take d6 en passant. */
const EP_FEN = '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1';
const AFTER_EP = '4k3/8/3P4/8/8/8/8/4K3 b - - 0 1';

describe('Lichess player-round adapter', () => {
  it('explains the synchronous page injection requirement before the round controller is captured', () => {
    const fixture = makeFixture();
    expect(fixture.adapter.read()).toMatchObject({
      kind: 'waiting',
      reason: expect.stringContaining('synchronous page-context injection'),
    });
  });

  it('reads the accepted player-round position, clock, and move history', async () => {
    const fixture = makeFixture();
    await fixture.captureRound();

    const read = fixture.adapter.read();
    expect(read.kind).toBe('game');
    if (read.kind !== 'game') return;
    expect(read.snapshot).toMatchObject({
      gameId: 'game-id',
      fen: START_FEN,
      playerColor: 'w',
      sideToMove: 'w',
      orientation: 'white',
      phase: 'live',
      inputReady: true,
      remainingMs: 60_000,
      history: { startFen: START_FEN, moves: [] },
      confirmedFens: [START_FEN],
    });
  });

  it('rejects unsupported variants or spectator rounds', async () => {
    const variant = makeFixture({ variant: 'unsupportedVariant123' });
    await variant.captureRound();
    expect(variant.adapter.read()).toMatchObject({
      kind: 'ineligible',
      reason: expect.stringContaining('not supported'),
    });

    const fromPosition = makeFixture({ variant: 'fromPosition' });
    await fromPosition.captureRound();
    expect(fromPosition.adapter.read().kind).toBe('game');

    const spectator = makeFixture({ spectator: true });
    await spectator.captureRound();
    expect(spectator.adapter.read()).toMatchObject({
      kind: 'ineligible',
      reason: expect.stringContaining('player round'),
    });
  });

  it('uses a null clock when the round does not expose a timed clock', async () => {
    const fixture = makeFixture({ hasClock: false });
    await fixture.captureRound();
    expect(fixture.adapter.read()).toMatchObject({ kind: 'game', snapshot: { remainingMs: null } });

    const unavailable = makeFixture();
    await unavailable.captureRound();
    const clock = unavailable.round.clock;
    if (!clock) throw new Error('Expected a Lichess clock');
    clock.millisOf = () => {
      throw new Error('clock is unavailable');
    };
    expect(unavailable.adapter.read()).toMatchObject({
      kind: 'game',
      snapshot: { remainingMs: null },
    });
  });

  it('submits a legal move through the captured round controller and confirms explicit promotions', async () => {
    const normal = makeFixture();
    await normal.captureRound();
    const read = normal.adapter.read();
    if (read.kind !== 'game') throw new Error('Expected a Lichess game');
    await expect(normal.adapter.submitMove(makeRequest(read.snapshot, 'e2e4', AFTER_E4))).resolves.toBe(true);
    expect(normal.round.pluginMove).toHaveBeenCalledWith('e2', 'e4', undefined, true);

    const promotion = makeFixture({ fen: PROMOTION_FEN, promotionMove: true });
    await promotion.captureRound();
    const promotionRead = promotion.adapter.read();
    if (promotionRead.kind !== 'game') throw new Error('Expected a Lichess promotion position');
    await expect(
      promotion.adapter.submitMove(makeRequest(promotionRead.snapshot, 'a7a8n', AFTER_UNDERPROMOTION)),
    ).resolves.toBe(true);
    expect(promotion.round.pluginMove).toHaveBeenCalledWith('a7', 'a8', 'knight', true);
  });

  it('submits an en passant capture, which the round controller applies as a normal destination', async () => {
    // The adapter replays the move and compares position FENs before dispatching, so this also
    // proves the captured pawn is removed rather than left behind on its original square.
    const capture = makeFixture({ fen: EP_FEN, legalFrom: 'e5', legalTo: 'd6' });
    await capture.captureRound();
    const read = capture.adapter.read();
    if (read.kind !== 'game') throw new Error('Expected a Lichess en passant position');
    await expect(capture.adapter.submitMove(makeRequest(read.snapshot, 'e5d6', AFTER_EP))).resolves.toBe(true);
    expect(capture.round.pluginMove).toHaveBeenCalledWith('e5', 'd6', undefined, true);
  });

  it('refuses an en passant capture whose expected position keeps the captured pawn', async () => {
    // A plain diagonal move to an empty square would pass isLegal but produce the wrong
    // position, so the FEN comparison must reject it rather than dispatch a losing capture.
    const capture = makeFixture({ fen: EP_FEN, legalFrom: 'e5', legalTo: 'd6' });
    await capture.captureRound();
    const read = capture.adapter.read();
    if (read.kind !== 'game') throw new Error('Expected a Lichess en passant position');
    const wrongTarget = AFTER_EP.replace('/3P4/8/', '/4P3/8/');
    await expect(capture.adapter.submitMove(makeRequest(read.snapshot, 'e5d6', wrongTarget))).resolves.toBe(false);
    expect(capture.round.pluginMove).not.toHaveBeenCalled();
  });

  it('maps standard castling through the round controller legal-destination map', async () => {
    const castle = makeFixture({ fen: CASTLE_FEN, legalFrom: 'e1', legalTo: 'g1' });
    await castle.captureRound();
    const read = castle.adapter.read();
    if (read.kind !== 'game') throw new Error('Expected a Lichess castling position');
    await expect(castle.adapter.submitMove(makeRequest(read.snapshot, 'e1g1', AFTER_CASTLE))).resolves.toBe(true);
    expect(castle.round.pluginMove).toHaveBeenCalledWith('e1', 'g1', undefined, true);
  });

  it('submits standard castling when the round controller exposes both king destination and rook squares', async () => {
    const castle = makeFixture({ fen: CASTLE_FEN, legalFrom: 'e1', legalTo: ['g1', 'h1'] });
    await castle.captureRound();
    const read = castle.adapter.read();
    if (read.kind !== 'game') throw new Error('Expected a Lichess castling position');
    await expect(castle.adapter.submitMove(makeRequest(read.snapshot, 'e1g1', AFTER_CASTLE))).resolves.toBe(true);
    expect(castle.round.pluginMove).toHaveBeenCalledWith('e1', 'g1', undefined, true);
  });

  it('submits castling to the rook square when only the rook square is legal', async () => {
    const castle = makeFixture({ fen: CASTLE_FEN, legalFrom: 'e1', legalTo: 'h1' });
    await castle.captureRound();
    const read = castle.adapter.read();
    if (read.kind !== 'game') throw new Error('Expected a Lichess castling position');
    await expect(castle.adapter.submitMove(makeRequest(read.snapshot, 'e1g1', AFTER_CASTLE))).resolves.toBe(true);
    expect(castle.round.pluginMove).toHaveBeenCalledWith('e1', 'h1', undefined, true);
  });

  it('refuses stale positions and destinations absent from the round controller legal moves', async () => {
    const stale = makeFixture();
    await stale.captureRound();
    const read = stale.adapter.read();
    if (read.kind !== 'game') throw new Error('Expected a Lichess game');
    const staleRequest = makeRequest(read.snapshot, 'e2e4', AFTER_E4);
    staleRequest.isCurrent = () => false;
    await expect(stale.adapter.submitMove(staleRequest)).resolves.toBe(false);

    const illegal = makeRequest(read.snapshot, 'e2e5', AFTER_E4);
    await expect(stale.adapter.submitMove(illegal)).resolves.toBe(false);
    expect(stale.round.pluginMove).not.toHaveBeenCalled();

    const reconnecting = makeFixture();
    await reconnecting.captureRound();
    reconnecting.round.loading = true;
    expect(reconnecting.adapter.read()).toMatchObject({
      kind: 'game',
      snapshot: { inputReady: false },
    });
  });

  it('notifies from the accepted round event and reads the server FEN instead of optimistic board state', async () => {
    const fixture = makeFixture();
    await fixture.captureRound();
    const listener = vi.fn();
    fixture.adapter.subscribe(listener);

    fixture.handlers.move();
    await vi.waitFor(() => expect(listener).toHaveBeenCalledOnce());
    expect(fixture.adapter.read()).toMatchObject({
      kind: 'game',
      snapshot: {
        fen: AFTER_E4,
        sideToMove: 'b',
        inputReady: false,
        confirmedFens: [START_FEN, AFTER_E4],
      },
    });
  });

  it('reconstructs complete FENs from accepted SAN when later Lichess steps store only piece placement', async () => {
    const fixture = makeFixture();
    await fixture.captureRound();
    const listener = vi.fn();
    fixture.adapter.subscribe(listener);

    fixture.handlers.move();
    await vi.waitFor(() => expect(listener).toHaveBeenCalledOnce());
    fixture.handlers.move();
    await vi.waitFor(() => expect(listener).toHaveBeenCalledTimes(2));

    expect(fixture.adapter.read()).toMatchObject({
      kind: 'game',
      snapshot: {
        fen: AFTER_E4_C5,
        sideToMove: 'w',
        inputReady: true,
        history: { startFen: START_FEN, moves: ['e2e4', 'c7c5'] },
        confirmedFens: [START_FEN, AFTER_E4, AFTER_E4_C5],
      },
    });
  });

  it('retries history reconstruction when Lichess completes a step in place', async () => {
    const fixture = makeFixture();
    await fixture.captureRound();
    fixture.round.data.steps.push({ ply: 1, fen: AFTER_E4_PLACEMENT, san: '', uci: '' });

    expect(fixture.adapter.read()).toMatchObject({
      kind: 'ineligible',
      reason: 'Lichess accepted FEN is unavailable',
    });

    const acceptedStep = fixture.round.data.steps[1];
    if (!acceptedStep) throw new Error('Expected the pending Lichess step');
    acceptedStep.san = 'e4';
    acceptedStep.uci = 'e2e4';

    expect(fixture.adapter.read()).toMatchObject({ kind: 'game', snapshot: { fen: AFTER_E4 } });
  });

  it('waits for a started game and preserves finished player rounds', async () => {
    const pending = makeFixture();
    await pending.captureRound();
    pending.round.data.game.status.id = 10;
    expect(pending.adapter.read()).toMatchObject({
      kind: 'waiting',
      reason: expect.stringContaining('not started'),
    });

    pending.round.data.game.status.id = 30;
    expect(pending.adapter.read()).toMatchObject({
      kind: 'game',
      snapshot: { phase: 'finished', inputReady: false },
    });
  });

  it('memoizes history reader results when data, steps, ply, and fen are unchanged', () => {
    const reader = createHistoryReader();
    const steps = [
      { ply: 0, fen: START_FEN, san: '', uci: '' },
      { ply: 1, fen: AFTER_E4, san: 'e4', uci: 'e2e4' },
    ];
    const roundData = {
      game: { variant: { key: 'standard' } },
      steps,
    } as unknown as Parameters<typeof reader>[0];
    const selected = steps[1];

    const first = reader(roundData, selected);
    const second = reader(roundData, selected);
    expect(first).toBeDefined();
    expect(second).toBe(first);

    const nextSteps = [
      { ply: 0, fen: START_FEN, san: '', uci: '' },
      { ply: 1, fen: AFTER_E4, san: 'e4', uci: 'e2e4' },
      { ply: 2, fen: AFTER_E4_C5, san: 'c5', uci: 'c7c5' },
    ];
    const nextRoundData = {
      game: { variant: { key: 'standard' } },
      steps: nextSteps,
    } as unknown as Parameters<typeof reader>[0];
    const nextSelected = nextSteps[2];

    const third = reader(nextRoundData, nextSelected);
    expect(third).toBeDefined();
    expect(third).not.toBe(first);
    expect(third?.history.moves).toEqual(['e2e4', 'c7c5']);
  });
});

function makeRequest(snapshot: GameSnapshot, uci: string, expectedFen: string): MoveRequest {
  return {
    identity: snapshot.identity,
    fromFen: snapshot.fen,
    uci,
    expectedFen,
    expectedPly: null,
    signal: new AbortController().signal,
    isCurrent: () => true,
  };
}

function makeFixture(
  options: {
    variant?: string;
    spectator?: boolean;
    fen?: string;
    promotionMove?: boolean;
    hasClock?: boolean;
    legalFrom?: string;
    legalTo?: string | string[];
  } = {},
) {
  const fen = options.fen ?? START_FEN;
  const promotion = !!options.promotionMove;
  const board = {
    isConnected: true,
    getClientRects: () => [{}],
    getBoundingClientRect: () => ({ width: 512, height: 512 }),
    ownerDocument: {
      defaultView: { getComputedStyle: () => ({ display: 'block', visibility: 'visible' }) },
    },
  } as unknown as HTMLElement;
  const steps = [{ ply: 0, fen, san: '', uci: '' }];
  let sideToMove = fen.split(' ')[1] === 'w' ? 'white' : 'black';
  let canMove = true;
  const legalDestinations = Array.isArray(options.legalTo)
    ? options.legalTo
    : [options.legalTo ?? (promotion ? 'a8' : 'e4')];
  const state = {
    turnColor: sideToMove,
    orientation: 'white',
    movable: {
      color: 'white',
      dests: new Map([[options.legalFrom ?? (promotion ? 'a7' : 'e2'), legalDestinations]]),
    },
  };
  const handlers = {
    move: vi.fn(() => {
      if (steps.length === 1) {
        steps.push({ ply: 1, fen: AFTER_E4_PLACEMENT, san: 'e4', uci: 'e2e4' });
        sideToMove = 'black';
        canMove = false;
        state.turnColor = 'black';
        state.movable.color = 'black';
      } else {
        steps.push({ ply: 2, fen: AFTER_E4_C5.split(' ')[0] ?? '', san: 'c5', uci: 'c7c5' });
        sideToMove = 'white';
        canMove = true;
        state.turnColor = 'white';
        state.movable.color = 'white';
      }
    }),
  };
  const round = {
    data: {
      game: {
        id: 'game-id',
        variant: { key: options.variant ?? 'standard' },
        status: { id: 20 },
      },
      player: { color: 'white', spectator: options.spectator ?? false },
      steps,
    },
    chessground: { state },
    socket: { handlers },
    loading: false,
    redirecting: false,
    isPlaying: () => true,
    canMove: () => canMove,
    replaying: () => false,
    lastPly: () => steps.at(-1)?.ply ?? 0,
    stepAt: (ply: number) => steps.find((step) => step.ply === ply) ?? steps[0] ?? { ply: 0, fen, san: '', uci: '' },
    ...(options.hasClock === false ? {} : { clock: { millisOf: () => 60_000 } }),
    pluginMove: vi.fn(),
  };
  const page = {
    location: { pathname: '/game-id/white' },
    document: {
      body: {},
      getElementById: () => null,
      querySelector: (selector: string) => (selector.includes('.cg-wrap') ? board : null),
    },
  } as unknown as Window & { site?: Record<string, unknown> };
  const adapter = createLichessAdapter(() => page);
  const loadEsmPage = async () => undefined;
  const loadEsm = async () => round;
  const captureRound = async () => {
    page.site = {};
    page.site.asset = Object.freeze({ loadEsmPage, loadEsm });
    await (page.site.asset as { loadEsmPage: (name: string) => Promise<unknown> }).loadEsmPage('round');
  };
  return { adapter, round, page, captureRound, handlers };
}

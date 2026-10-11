import { describe, expect, it, vi } from 'vitest';
import { createLichessAdapter } from '../src/sites/lichess.js';
import type { GameSnapshot, MoveRequest } from '../src/sites/types.js';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const AFTER_E4_PLACEMENT = AFTER_E4.split(' ')[0] ?? '';
const AFTER_E4_C5 = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const PROMOTION_FEN = '7k/P7/8/8/8/8/8/7K w - - 0 1';
const AFTER_UNDERPROMOTION = 'N6k/8/8/8/8/8/8/7K b - - 0 1';
const CASTLE_FEN = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
const AFTER_CASTLE = 'r3k2r/8/8/8/8/8/8/R4RK1 b kq - 1 1';

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

  it('rejects only non-standard or spectator rounds', async () => {
    const variant = makeFixture({ variant: 'chess960' });
    await variant.captureRound();
    expect(variant.adapter.read()).toMatchObject({
      kind: 'ineligible',
      reason: expect.stringContaining('standard chess'),
    });

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
    expect(unavailable.adapter.read()).toMatchObject({ kind: 'game', snapshot: { remainingMs: null } });
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

  it('maps standard castling through the round controller legal-destination map', async () => {
    const castle = makeFixture({ fen: CASTLE_FEN, legalFrom: 'e1', legalTo: 'g1' });
    await castle.captureRound();
    const read = castle.adapter.read();
    if (read.kind !== 'game') throw new Error('Expected a Lichess castling position');
    await expect(castle.adapter.submitMove(makeRequest(read.snapshot, 'e1g1', AFTER_CASTLE))).resolves.toBe(true);
    expect(castle.round.pluginMove).toHaveBeenCalledWith('e1', 'g1', undefined, true);
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
    expect(reconnecting.adapter.read()).toMatchObject({ kind: 'game', snapshot: { inputReady: false } });
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
      snapshot: { fen: AFTER_E4, sideToMove: 'b', inputReady: false, confirmedFens: [START_FEN, AFTER_E4] },
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
    expect(pending.adapter.read()).toMatchObject({ kind: 'waiting', reason: expect.stringContaining('not started') });

    pending.round.data.game.status.id = 30;
    expect(pending.adapter.read()).toMatchObject({ kind: 'game', snapshot: { phase: 'finished', inputReady: false } });
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
    legalTo?: string;
  } = {},
) {
  const fen = options.fen ?? START_FEN;
  const promotion = !!options.promotionMove;
  const board = {
    isConnected: true,
    getClientRects: () => [{}],
    getBoundingClientRect: () => ({ width: 512, height: 512 }),
    ownerDocument: { defaultView: { getComputedStyle: () => ({ display: 'block', visibility: 'visible' }) } },
  } as unknown as HTMLElement;
  const steps = [{ ply: 0, fen, san: '', uci: '' }];
  let sideToMove = fen.split(' ')[1] === 'w' ? 'white' : 'black';
  let canMove = true;
  const state = {
    turnColor: sideToMove,
    orientation: 'white',
    movable: {
      color: 'white',
      dests: new Map([
        [options.legalFrom ?? (promotion ? 'a7' : 'e2'), [options.legalTo ?? (promotion ? 'a8' : 'e4')]],
      ]),
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
      querySelector: (selector: string) => (selector === '.round__app .cg-wrap' ? board : null),
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

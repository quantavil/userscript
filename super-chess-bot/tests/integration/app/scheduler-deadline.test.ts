import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { MoveConfirmation } from '../../../src/game/confirmation.js';
import type { MoveRequest } from '../../../src/sites/types.js';

const dependencies = vi.hoisted(() => {
  const snapshot = {
    identity: {},
    gameId: 'game-one',
    board: {} as HTMLElement,
    fen: 'start w - - 0 1',
    playerColor: 'w' as 'w' | 'b',
    sideToMove: 'w' as 'w' | 'b',
    orientation: 'white' as 'white' | 'black',
    phase: 'live' as 'live' | 'replay' | 'finished',
    inputReady: true,
    remainingMs: null as number | null,
    history: { startFen: 'start w - - 0 1', moves: [] as string[] },
    confirmedFens: ['start w - - 0 1'],
  };
  const siteRead: {
    kind: 'game' | 'waiting' | 'ineligible';
    snapshot: typeof snapshot;
    reason?: string;
  } = {
    kind: 'game',
    snapshot,
  };
  const site = {
    id: 'lichess' as const,
    read: () => siteRead,
    subscribe: vi.fn(() => () => {}),
    submitMove: vi.fn(async (_request: MoveRequest) => true),
    cancelInput: vi.fn(),
  };
  return {
    analyze: vi.fn(),
    tablebase: vi.fn(),
    tablebaseEligible: vi.fn(() => false),
    hasLegalMoves: vi.fn(() => true),
    confirmMove: vi.fn(
      async (): Promise<MoveConfirmation> => ({
        status: 'confirmed',
        source: 'site-accepted',
      }),
    ),
    ponderPosition: vi.fn(),
    cancelPonder: vi.fn(),
    cancelPending: vi.fn(),
    drawArrow: vi.fn(),
    clearArrows: vi.fn(),
    log: vi.fn(),
    update: vi.fn(),
    resetEngine: vi.fn(),
    parseBestLine: vi.fn(),
    predictFen: vi.fn(() => 'after'),
    site,
    siteRead,
    snapshot,
    state: {
      hackEnabled: true,
      autoMove: true,
      moveTime: 100,
      botPower: 20,
      ponderEnabled: false,
      premove: false,
      autoRetry: false,
      openingBook: true,
      openingStyle: 'balanced' as const,
      timingMode: 'dynamic' as 'dynamic' | 'fixed',
      currentEvaluation: '-',
      bestMove: '-',
      principalVariation: '-',
      statusInfo: 'Ready',
      recoveryAction: null as 'resume' | 'retry' | null,
    },
    score: { cp: 10 } as { cp?: number; mate?: number },
    pv: 'e2e4',
  };
});

vi.mock('../../../src/engine/tablebase.js', () => ({
  lookupTablebase: dependencies.tablebase,
  isTablebaseEligible: dependencies.tablebaseEligible,
}));
vi.mock('../../../src/app/state.js', () => ({
  BotState: dependencies.state,
  clearRecommendation: () => {
    dependencies.state.bestMove = '-';
    dependencies.state.currentEvaluation = '-';
    dependencies.state.principalVariation = '-';
  },
}));
vi.mock('../../../src/sites/registry.js', () => ({
  getSite: () => dependencies.site,
  readSite: () => dependencies.site.read(),
}));
vi.mock('../../../src/game/confirmation.js', () => ({ confirmSiteMove: dependencies.confirmMove }));
vi.mock('../../../src/board/input.js', () => ({
  cancelPendingMove: dependencies.cancelPending,
  getMoveRevision: () => 0,
}));
vi.mock('../../../src/board/overlays.js', () => ({
  clearArrows: dependencies.clearArrows,
  drawArrow: dependencies.drawArrow,
  drawMultiPvArrows: dependencies.drawArrow,
  cancelPendingMove: dependencies.cancelPending,
  getMoveRevision: () => 0,
}));
vi.mock('../../../src/ui/mount.js', () => ({
  ui: { log: dependencies.log, updateDisplay: dependencies.update },
}));
vi.mock('../../../src/chess/position.js', async (original) => ({
  ...(await original<typeof import('../../../src/chess/position.js')>()),
  hasLegalMoves: dependencies.hasLegalMoves,
  countLegalMoves: vi.fn(() => 20),
  predictFen: dependencies.predictFen,
}));
vi.mock('../../../src/engine/service.js', () => ({
  getAnalysis: dependencies.analyze,
  hasLegalMoves: dependencies.hasLegalMoves,
  countLegalMoves: vi.fn(() => 20),
  predictFen: dependencies.predictFen,
  resetEngine: dependencies.resetEngine,
  cancelPonder: dependencies.cancelPonder,
  ponderPosition: dependencies.ponderPosition,
  parseBestLine: dependencies.parseBestLine,
}));

import { cancelAnalysis, scheduleAnalysis } from '../../../src/app/scheduler.js';
import { UciClient, type UciWorkerLike } from '../../../src/engine/uci-client.js';

class SchedulerUciWorker implements UciWorkerLike {
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  commands: string[] = [];

  postMessage(command: string): void {
    this.commands.push(command);
    if (command === 'uci') queueMicrotask(() => this.emit('uciok'));
    if (command === 'isready') queueMicrotask(() => this.emit('readyok'));
  }

  terminate(): void {}

  emit(line: string): void {
    this.onmessage?.({ data: line } as MessageEvent<string>);
  }
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error('Condition was not reached');
}

function setPosition(changes: Partial<typeof dependencies.snapshot>): void {
  Object.assign(dependencies.snapshot, changes);
  dependencies.siteRead.kind = 'game';
}

function validBestMove() {
  dependencies.analyze.mockResolvedValue({ success: true, bestmove: 'e2e4', depth: 10 });
  dependencies.hasLegalMoves.mockReturnValue(true);
  dependencies.parseBestLine.mockReturnValue({
    uci: 'e2e4',
    pv: dependencies.pv,
    score: dependencies.score,
  });
}

beforeEach(() => {
  cancelAnalysis();
  vi.clearAllMocks();
  Object.assign(dependencies.snapshot, {
    identity: {},
    gameId: 'game-one',
    fen: 'start w - - 0 1',
    playerColor: 'w',
    sideToMove: 'w',
    orientation: 'white',
    phase: 'live',
    inputReady: true,
    remainingMs: null,
    history: { startFen: 'start w - - 0 1', moves: [] },
    confirmedFens: ['start w - - 0 1'],
  });
  dependencies.siteRead.kind = 'game';
  Object.assign(dependencies.state, {
    hackEnabled: 1,
    autoMove: 1,
    moveTime: 100,
    botPower: 20,
    ponderEnabled: 0,
    premove: false,
    openingBook: 1,
    openingStyle: 'balanced',
    timingMode: 'dynamic',
    currentEvaluation: '-',
    bestMove: '-',
    principalVariation: '-',
    statusInfo: 'Ready',
    recoveryAction: null,
  });
  dependencies.hasLegalMoves.mockReturnValue(true);
  dependencies.tablebaseEligible.mockReturnValue(false);
  dependencies.tablebase.mockResolvedValue(null);
  dependencies.state.autoRetry = false;
  dependencies.score = { cp: 10 };
  dependencies.pv = 'e2e4';
  dependencies.site.submitMove.mockResolvedValue(true);
  dependencies.confirmMove.mockResolvedValue({ status: 'confirmed', source: 'site-accepted' });
  dependencies.parseBestLine.mockReturnValue({ uci: 'e2e4', pv: 'e2e4', score: { cp: 10 } });
  dependencies.predictFen.mockReturnValue('after');
});

describe('site-backed search and execution', () => {
  it('submits a current result with stable identity, accepted history, and exact expected ply', async () => {
    dependencies.snapshot.history = { startFen: 'root', moves: ['d2d4', 'd7d5'] };
    dependencies.snapshot.confirmedFens = ['root', 'one', 'two'];
    validBestMove();

    await scheduleAnalysis('main', dependencies.snapshot.fen);

    expect(dependencies.analyze).toHaveBeenCalledWith(
      dependencies.snapshot.fen,
      20,
      100,
      expect.any(AbortSignal),
      {
        startFen: 'root',
        moves: ['d2d4', 'd7d5'],
      },
      undefined,
      undefined,
    );
    expect(dependencies.confirmMove.mock.invocationCallOrder[0]).toBeLessThan(
      dependencies.site.submitMove.mock.invocationCallOrder[0],
    );
    const request = dependencies.site.submitMove.mock.calls[0]?.[0];
    expect(request).toMatchObject({
      identity: dependencies.snapshot.identity,
      fromFen: dependencies.snapshot.fen,
      uci: 'e2e4',
      expectedFen: 'after',
      expectedPly: 3,
    });
    expect(dependencies.confirmMove).toHaveBeenCalledWith(request, dependencies.site);
  });

  it('converts centipawn scores to White perspective when Black is to move', async () => {
    setPosition({ fen: 'start b - - 0 1', playerColor: 'b', sideToMove: 'b' });
    dependencies.score = { cp: 42 };
    validBestMove();

    await scheduleAnalysis('main', dependencies.snapshot.fen);

    expect(dependencies.state.currentEvaluation).toBe('-0.42');
  });

  it('converts mate scores to White perspective when Black is to move', async () => {
    setPosition({ fen: 'start b - - 0 1', playerColor: 'b', sideToMove: 'b' });
    dependencies.score = { mate: 4 };
    validBestMove();

    await scheduleAnalysis('main', dependencies.snapshot.fen);

    expect(dependencies.state.currentEvaluation).toBe('-M4');
  });

  it('rejects a delayed result when accepted FEN or stable identity changes', async () => {
    let complete: (result: unknown) => void = () => {};
    dependencies.analyze.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    validBestMove();
    const running = scheduleAnalysis('main', dependencies.snapshot.fen);
    setPosition({ fen: 'different w - - 0 1' });
    complete({ success: true, bestmove: 'e2e4', depth: 10 });
    await running;
    expect(dependencies.site.submitMove).not.toHaveBeenCalled();

    setPosition({ fen: 'start w - - 0 1', identity: {} });
    dependencies.site.submitMove.mockClear();
    dependencies.analyze.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const second = scheduleAnalysis('main', dependencies.snapshot.fen);
    setPosition({ identity: {} });
    complete({ success: true, bestmove: 'e2e4', depth: 10 });
    await second;
    expect(dependencies.site.submitMove).not.toHaveBeenCalled();
  });

  it('rejects an already-started result after cancellation', async () => {
    let complete: (result: unknown) => void = () => {};
    dependencies.analyze.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const running = scheduleAnalysis('main', dependencies.snapshot.fen);
    cancelAnalysis();
    complete({ success: true, bestmove: 'e2e4', depth: 10 });
    await running;
    expect(dependencies.site.submitMove).not.toHaveBeenCalled();
  });

  it('exposes a retry action when Stockfish fails and clears stale analysis', async () => {
    dependencies.state.bestMove = 'e2e4';
    dependencies.state.principalVariation = 'e2e4 e7e5';
    dependencies.analyze.mockRejectedValue(new Error('Stockfish worker crashed'));

    await scheduleAnalysis('main', dependencies.snapshot.fen);

    expect(dependencies.state.statusInfo).toBe('Stockfish worker crashed');
    expect(dependencies.state.recoveryAction).toBe('retry');
    expect(dependencies.state.bestMove).toBe('-');
    expect(dependencies.state.principalVariation).toBe('-');
  });

  it('offers retry when the adapter cannot initiate the move', async () => {
    validBestMove();
    dependencies.site.submitMove.mockResolvedValue(false);
    dependencies.confirmMove.mockResolvedValue({ status: 'failed' });

    await scheduleAnalysis('main', dependencies.snapshot.fen);

    expect(dependencies.state.statusInfo).toBe('Move input failed');
    expect(dependencies.state.recoveryAction).toBe('retry');
    expect(dependencies.state.bestMove).toBe('-');
  });

  it('uses accepted SAN history for search and ponder prediction', async () => {
    dependencies.state.ponderEnabled = true;
    dependencies.snapshot.history = { startFen: 'root', moves: ['d2d4'] };
    dependencies.pv = 'e2e4 e7e5';
    dependencies.ponderPosition.mockReturnValue(true);
    validBestMove();

    await scheduleAnalysis('main', dependencies.snapshot.fen);
    dependencies.analyze.mockClear();
    setPosition({ fen: 'after', playerColor: 'w', sideToMove: 'b', inputReady: false });
    await scheduleAnalysis('ponder', 'after');

    expect(dependencies.analyze).not.toHaveBeenCalled();
    expect(dependencies.ponderPosition).toHaveBeenCalledWith('after', 20, {
      startFen: 'root',
      moves: ['d2d4', 'e2e4', 'e7e5'],
    });
  });

  it('continues an exact anticipated ponder without another forecast search', async () => {
    dependencies.state.ponderEnabled = true;
    dependencies.ponderPosition.mockReturnValue(true);
    dependencies.pv = 'e2e4 e7e5';
    dependencies.snapshot.history = { startFen: 'root', moves: ['d2d4'] };
    validBestMove();

    await scheduleAnalysis('main', dependencies.snapshot.fen);
    dependencies.analyze.mockClear();
    setPosition({ fen: 'after', playerColor: 'w', sideToMove: 'b' });

    await scheduleAnalysis('ponder', 'after');

    expect(dependencies.analyze).not.toHaveBeenCalled();
    expect(dependencies.ponderPosition).toHaveBeenCalledWith('after', 20, {
      startFen: 'root',
      moves: ['d2d4', 'e2e4', 'e7e5'],
    });
  });

  it('cancels speculative work when pondering is disabled', async () => {
    dependencies.state.ponderEnabled = false;
    setPosition({ fen: 'start b - - 0 1', playerColor: 'w', sideToMove: 'b', inputReady: false });

    await scheduleAnalysis('ponder', dependencies.snapshot.fen);

    expect(dependencies.analyze).not.toHaveBeenCalled();
    expect(dependencies.cancelPonder).toHaveBeenCalledWith();
  });

  it('uses the adapter clock budget and supports decimal clocks', async () => {
    validBestMove();
    setPosition({ remainingMs: 2400 });

    await scheduleAnalysis('main', dependencies.snapshot.fen);

    expect(dependencies.analyze.mock.calls[0]?.[2]).toBe(48);
    expect(dependencies.analyze.mock.calls[0]?.[5]).toBe(200);
  });

  it('uses the configured budget when the adapter clock is unavailable', async () => {
    validBestMove();
    setPosition({ remainingMs: null });

    await scheduleAnalysis('main', dependencies.snapshot.fen);

    expect(dependencies.analyze.mock.calls[0]?.[2]).toBe(100);
    expect(dependencies.analyze.mock.calls[0]?.[5]).toBeUndefined();
  });

  it('reserves time according to the configured and remaining player clocks', async () => {
    validBestMove();
    setPosition({ remainingMs: 60_000 });

    await scheduleAnalysis('main', dependencies.snapshot.fen);

    expect(dependencies.analyze.mock.calls[0]?.[2]).toBe(88);
    expect(dependencies.analyze.mock.calls[0]?.[5]).toBe(3000);
  });

  it('does not ponder a replay or finished snapshot', async () => {
    setPosition({ phase: 'replay', playerColor: 'w', sideToMove: 'b' });
    dependencies.state.ponderEnabled = true;

    await scheduleAnalysis('ponder', dependencies.snapshot.fen);

    expect(dependencies.analyze).not.toHaveBeenCalled();
    expect(dependencies.site.submitMove).not.toHaveBeenCalled();
  });

  it('does not start a main search until the adapter reports ready input', async () => {
    setPosition({ inputReady: false });

    await scheduleAnalysis('main', dependencies.snapshot.fen);

    expect(dependencies.analyze).not.toHaveBeenCalled();
    expect(dependencies.site.submitMove).not.toHaveBeenCalled();
  });

  it('drops an anticipated line when the accepted opponent position does not match', async () => {
    dependencies.state.ponderEnabled = true;
    dependencies.pv = 'e2e4 e7e5';
    dependencies.snapshot.history = { startFen: 'root', moves: ['d2d4'] };
    dependencies.ponderPosition.mockReturnValue(true);
    validBestMove();
    await scheduleAnalysis('main', dependencies.snapshot.fen);
    dependencies.ponderPosition.mockClear();
    dependencies.analyze.mockClear();
    setPosition({ fen: 'different', sideToMove: 'b', inputReady: false });
    dependencies.ponderPosition.mockReturnValue(false);

    await scheduleAnalysis('ponder', 'different');

    expect(dependencies.ponderPosition).toHaveBeenCalledWith('after', 20, {
      startFen: 'root',
      moves: ['d2d4', 'e2e4'],
    });
    expect(dependencies.ponderPosition).not.toHaveBeenCalledWith('after', 20, {
      startFen: 'root',
      moves: ['d2d4', 'e2e4', 'e7e5'],
    });
  });

  it('passes a UCI bestmove none response through to a verified terminal position', async () => {
    const mateFen = '7k/6Q1/6K1/8/8/8/8/8 b - - 0 1';
    const worker = new SchedulerUciWorker();
    const client = new UciClient(() => worker);
    setPosition({
      fen: mateFen,
      playerColor: 'b',
      sideToMove: 'b',
      inputReady: true,
    });
    dependencies.hasLegalMoves.mockReturnValue(false);
    dependencies.analyze.mockImplementation((fen, depth, budget, signal, history) =>
      client.analyze(fen, depth, budget, signal, history),
    );
    dependencies.parseBestLine.mockReturnValue(null);

    const running = scheduleAnalysis('main', dependencies.snapshot.fen);
    await waitFor(() => worker.commands.some((command) => command.startsWith('go ')));
    worker.emit('bestmove (none)');
    await running;

    expect(dependencies.state.statusInfo).toBe('Terminal position');
    expect(dependencies.state.recoveryAction).toBeNull();
    expect(dependencies.site.submitMove).not.toHaveBeenCalled();
  });

  it('reports bestmove none as an engine error when the position still has legal moves', async () => {
    dependencies.analyze.mockResolvedValue({ success: false, bestmove: '(none)', depth: 10 });
    dependencies.parseBestLine.mockReturnValue(null);
    dependencies.hasLegalMoves.mockReturnValue(true);

    await scheduleAnalysis('main', dependencies.snapshot.fen);

    expect(dependencies.state.statusInfo).toBe('Engine returned no legal move');
    expect(dependencies.state.recoveryAction).toBe('retry');
    expect(dependencies.site.submitMove).not.toHaveBeenCalled();
  });

  it('instantly resolves opening book moves without invoking the engine worker', async () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    setPosition({
      fen: startFen,
      playerColor: 'w',
      sideToMove: 'w',
      inputReady: true,
      remainingMs: 60000,
    });
    dependencies.state.openingBook = true;

    await scheduleAnalysis('main', startFen);

    expect(dependencies.analyze).not.toHaveBeenCalled();
    expect(dependencies.state.statusInfo).toMatch(/^Ready · Book · \d+ ms$/);
    expect(dependencies.state.currentEvaluation).toBe('Book');
    expect(dependencies.site.submitMove).toHaveBeenCalled();
  });
});

afterEach(() => {
  cancelAnalysis();
  vi.useRealTimers();
});

describe('endgame race and bounded recovery', () => {
  it('submits immediately when analysis wins without waiting for tablebase grace', async () => {
    vi.useFakeTimers();
    validBestMove();
    dependencies.state.timingMode = 'fixed';
    dependencies.tablebaseEligible.mockReturnValue(true);
    dependencies.tablebase.mockImplementation(() => new Promise(() => {}));
    const running = scheduleAnalysis('main', dependencies.snapshot.fen);
    try {
      await vi.advanceTimersByTimeAsync(0);
      expect(dependencies.site.submitMove).toHaveBeenCalledOnce();
    } finally {
      cancelAnalysis();
      await running;
    }
  });

  it('limits automatic retries for an unchanged failed position', async () => {
    vi.useFakeTimers();
    dependencies.state.autoRetry = true;
    dependencies.analyze.mockRejectedValue(new Error('worker down'));
    await scheduleAnalysis('main', dependencies.snapshot.fen);
    await vi.advanceTimersByTimeAsync(5000);
    expect(dependencies.analyze).toHaveBeenCalledTimes(3);
    expect(dependencies.state.recoveryAction).toBe('retry');
    expect(dependencies.state.statusInfo).toContain('automatic retries exhausted');
  });

  it('cancels a retry timer when the session is interrupted', async () => {
    vi.useFakeTimers();
    dependencies.state.autoRetry = true;
    dependencies.analyze.mockRejectedValue(new Error('worker down'));
    await scheduleAnalysis('main', dependencies.snapshot.fen);
    cancelAnalysis();
    await vi.advanceTimersByTimeAsync(1000);
    expect(dependencies.analyze).toHaveBeenCalledOnce();
  });
});

it('does not retry an ambiguous transport failure after dispatch was attempted', async () => {
  vi.useFakeTimers();
  dependencies.state.timingMode = 'fixed';
  dependencies.state.autoRetry = true;
  validBestMove();
  dependencies.site.submitMove.mockImplementation(async (request: MoveRequest) => {
    request.onDispatch?.();
    return false;
  });
  await scheduleAnalysis('main', dependencies.snapshot.fen);
  await vi.advanceTimersByTimeAsync(2000);
  expect(dependencies.analyze).toHaveBeenCalledOnce();
  expect(dependencies.state.recoveryAction).toBe('retry');
});

it.each(['failed', 'rejected'])('uses tablebase when local analysis is %s before lookup finishes', async (failure) => {
  vi.useFakeTimers();
  dependencies.state.timingMode = 'fixed';
  dependencies.tablebaseEligible.mockReturnValue(true);
  dependencies.parseBestLine.mockImplementation((result) =>
    result.success ? { uci: 'e2e4', pv: 'e2e4', score: { cp: 0 } } : null,
  );
  if (failure === 'failed') dependencies.analyze.mockResolvedValue({ success: false, bestmove: '', evaluation: {} });
  else dependencies.analyze.mockRejectedValue(new Error('search failed'));
  dependencies.tablebase.mockImplementation(
    () =>
      new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              success: true,
              bestMove: 'e2e4',
              pv: 'e2e4',
              evaluation: {},
              displayEval: 'Tablebase win',
            }),
          10,
        ),
      ),
  );
  const running = scheduleAnalysis('main', dependencies.snapshot.fen);
  await vi.advanceTimersByTimeAsync(20);
  await running;
  expect(dependencies.site.submitMove).toHaveBeenCalledOnce();
  expect(dependencies.state.currentEvaluation).toBe('Tablebase win');
});

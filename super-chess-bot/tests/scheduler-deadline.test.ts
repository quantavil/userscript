import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  const siteRead: { kind: 'game' | 'waiting' | 'ineligible'; snapshot: typeof snapshot; reason?: string } = {
    kind: 'game',
    snapshot,
  };
  const site = {
    id: 'pychess' as const,
    capabilities: { input: 'selection' as const, autoRematch: false },
    read: () => siteRead,
    subscribe: vi.fn(() => () => {}),
    submitMove: vi.fn(async (_request: unknown) => true),
    cancelInput: vi.fn(),
    requestRematch: vi.fn(() => false),
  };
  return {
    analyze: vi.fn(),
    confirmMove: vi.fn(async () => true),
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
      hackEnabled: 1,
      autoMove: 1,
      moveTime: 100,
      botPower: 20,
      ponderEnabled: 0,
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

vi.mock('../src/state.js', () => ({ BotState: dependencies.state, pa: () => 1 }));
vi.mock('../src/sites/index.js', () => ({
  getSite: () => dependencies.site,
  readSite: () => dependencies.site.read(),
}));
vi.mock('../src/history.js', () => ({ readPositionHistory: vi.fn() }));
vi.mock('../src/board.js', () => ({
  confirmSiteMove: dependencies.confirmMove,
  clearArrows: dependencies.clearArrows,
  drawArrow: dependencies.drawArrow,
  cancelPendingMove: dependencies.cancelPending,
  getMoveRevision: () => 0,
}));
vi.mock('../src/ui.js', () => ({ ui: { log: dependencies.log, updateDisplay: dependencies.update } }));
vi.mock('../src/engine/analysis.js', () => ({
  getAnalysis: dependencies.analyze,
  predictFen: dependencies.predictFen,
  resetEngine: dependencies.resetEngine,
  cancelPonder: dependencies.cancelPonder,
  ponderPosition: dependencies.ponderPosition,
  parseBestLine: dependencies.parseBestLine,
}));

import { cancelAnalysis, scheduleAnalysis } from '../src/engine/scheduler.js';

function setPosition(changes: Partial<typeof dependencies.snapshot>): void {
  Object.assign(dependencies.snapshot, changes);
  dependencies.siteRead.kind = 'game';
}

function validBestMove() {
  dependencies.analyze.mockResolvedValue({ success: true, bestmove: 'e2e4', depth: 10 });
  dependencies.parseBestLine.mockReturnValue({ uci: 'e2e4', pv: dependencies.pv, score: dependencies.score });
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
    currentEvaluation: '-',
    bestMove: '-',
    principalVariation: '-',
    statusInfo: 'Ready',
    recoveryAction: null,
  });
  dependencies.score = { cp: 10 };
  dependencies.pv = 'e2e4';
  dependencies.site.submitMove.mockResolvedValue(true);
  dependencies.confirmMove.mockResolvedValue(true);
  dependencies.parseBestLine.mockReturnValue({ uci: 'e2e4', pv: 'e2e4', score: { cp: 10 } });
  dependencies.predictFen.mockReturnValue('after');
});

describe('site-backed search and execution', () => {
  it('submits a current result with stable identity, accepted history, and exact expected ply', async () => {
    dependencies.snapshot.history = { startFen: 'root', moves: ['d2d4', 'd7d5'] };
    dependencies.snapshot.confirmedFens = ['root', 'one', 'two'];
    validBestMove();

    await scheduleAnalysis('main', dependencies.snapshot.fen);

    expect(dependencies.analyze).toHaveBeenCalledWith(dependencies.snapshot.fen, 20, 100, expect.any(AbortSignal), {
      startFen: 'root',
      moves: ['d2d4', 'd7d5'],
    });
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

    expect(dependencies.state.currentEvaluation).toBe('M-4');
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
    dependencies.confirmMove.mockResolvedValue(false);

    await scheduleAnalysis('main', dependencies.snapshot.fen);

    expect(dependencies.state.statusInfo).toBe('Move input failed');
    expect(dependencies.state.recoveryAction).toBe('retry');
    expect(dependencies.state.bestMove).toBe('-');
  });

  it('uses accepted SAN history for search and ponder prediction', async () => {
    dependencies.state.ponderEnabled = 1;
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
    dependencies.state.ponderEnabled = 1;
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
    dependencies.state.ponderEnabled = 0;
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
  });

  it('uses the configured budget when the adapter clock is unavailable', async () => {
    validBestMove();
    setPosition({ remainingMs: null });

    await scheduleAnalysis('main', dependencies.snapshot.fen);

    expect(dependencies.analyze.mock.calls[0]?.[2]).toBe(100);
  });

  it('reserves time according to the configured and remaining player clocks', async () => {
    validBestMove();
    setPosition({ remainingMs: 60_000 });

    await scheduleAnalysis('main', dependencies.snapshot.fen);

    expect(dependencies.analyze.mock.calls[0]?.[2]).toBe(88);
  });

  it('does not ponder a replay or finished snapshot', async () => {
    setPosition({ phase: 'replay', playerColor: 'w', sideToMove: 'b' });
    dependencies.state.ponderEnabled = 1;

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
    dependencies.state.ponderEnabled = 1;
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

  it('handles terminal checkmate/stalemate positions without a retry error', async () => {
    setPosition({ inputReady: true });
    dependencies.analyze.mockResolvedValue({ success: false, bestmove: '(none)', depth: 10 });
    dependencies.parseBestLine.mockReturnValue(null);

    await scheduleAnalysis('main', dependencies.snapshot.fen);

    expect(dependencies.state.statusInfo).toBe('Terminal position');
    expect(dependencies.state.recoveryAction).toBeNull();
    expect(dependencies.site.submitMove).not.toHaveBeenCalled();
  });
});

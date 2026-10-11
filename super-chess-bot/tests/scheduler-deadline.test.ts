import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  analyze: vi.fn(),
  readHistory: vi.fn(),
  ponderPosition: vi.fn(),
  cancelPonder: vi.fn(),
  execute: vi.fn(),
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
  game: { getFEN: (): string => 'start w - - 0 1', getPlayingAs: (): number => 1 },
}));
vi.mock('../src/state.js', () => ({
  BotState: dependencies.state,
  getGame: () => dependencies.game,
  getFen: (g: typeof dependencies.game) => g.getFEN(),
  getPlayerColor: (g: typeof dependencies.game) => (g.getPlayingAs() === 2 ? 'b' : 'w'),
  getSideToMove: () => 'w',
  pa: () => 1,
  invalidateGameCache: () => {},
}));
vi.mock('../src/history.js', () => ({ readPositionHistory: dependencies.readHistory }));
vi.mock('../src/board.js', () => ({
  executeMove: dependencies.execute,
  clearArrows: () => {},
  drawArrow: () => {},
  cancelPendingMove: () => {},
  getMoveRevision: () => 0,
}));
vi.mock('../src/ui.js', () => ({ ui: { log: () => {}, updateDisplay: () => {} } }));
vi.mock('../src/engine/analysis.js', () => ({
  getAnalysis: dependencies.analyze,
  predictFen: () => 'after',
  resetEngine: () => {},
  cancelPonder: dependencies.cancelPonder,
  ponderPosition: dependencies.ponderPosition,
  parseBestLine: (res: any) =>
    res?.bestmove === '(none)' || res?.success === false
      ? null
      : { uci: 'e2e4', pv: dependencies.pv, score: dependencies.score },
}));

import { cancelAnalysis, scheduleAnalysis } from '../src/engine/scheduler.js';

beforeEach(() => {
  vi.stubGlobal('document', { querySelector: () => null });
  cancelAnalysis();
  vi.clearAllMocks();
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
  dependencies.game.getFEN = () => 'start w - - 0 1';
  dependencies.game.getPlayingAs = () => 1;
  dependencies.score = { cp: 10 };
  dependencies.pv = 'e2e4';
  dependencies.execute.mockResolvedValue(true);
  dependencies.readHistory.mockReturnValue(undefined);
});
describe('search and execution ownership', () => {
  it('executes a current result without scheduling another thinking delay', async () => {
    dependencies.analyze.mockResolvedValue({ success: true, bestmove: 'e2e4', depth: 10 });
    await scheduleAnalysis('main', 'start w - - 0 1');
    expect(dependencies.execute).toHaveBeenCalledOnce();
    expect(dependencies.analyze.mock.calls[0][2]).toBeLessThanOrEqual(100);
    expect(dependencies.state.currentEvaluation).toBe('0.10');
  });
  it('converts centipawn scores to White perspective when Black is to move', async () => {
    dependencies.game.getFEN = () => 'start b - - 0 1';
    dependencies.game.getPlayingAs = () => 2;
    dependencies.score = { cp: 42 };
    dependencies.analyze.mockResolvedValue({ success: true, bestmove: 'e2e4', depth: 10 });

    await scheduleAnalysis('main', 'start b - - 0 1');

    expect(dependencies.state.currentEvaluation).toBe('-0.42');
  });
  it('converts mate scores to White perspective when Black is to move', async () => {
    dependencies.game.getFEN = () => 'start b - - 0 1';
    dependencies.game.getPlayingAs = () => 2;
    dependencies.score = { mate: 4 };
    dependencies.analyze.mockResolvedValue({ success: true, bestmove: 'e2e4', depth: 10 });

    await scheduleAnalysis('main', 'start b - - 0 1');

    expect(dependencies.state.currentEvaluation).toBe('M-4');
  });
  it('rejects a result when the board position changed during search', async () => {
    dependencies.analyze.mockImplementation(async () => {
      dependencies.game.getFEN = () => 'different';
      return { success: true, bestmove: 'e2e4', depth: 10 };
    });
    await scheduleAnalysis('main', 'start w - - 0 1');
    expect(dependencies.execute).not.toHaveBeenCalled();
  });
  it('rejects an already-started result after cancellation', async () => {
    let complete: (result: unknown) => void = () => {};
    dependencies.analyze.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const running = scheduleAnalysis('main', 'start w - - 0 1');
    cancelAnalysis();
    complete({ success: true, bestmove: 'e2e4', depth: 10 });
    await running;
    expect(dependencies.execute).not.toHaveBeenCalled();
  });

  it('exposes a retry action when Stockfish fails and clears stale analysis', async () => {
    dependencies.state.bestMove = 'e2e4';
    dependencies.state.principalVariation = 'e2e4 e7e5';
    dependencies.analyze.mockRejectedValue(new Error('Stockfish worker crashed'));

    await scheduleAnalysis('main', 'start w - - 0 1');

    expect(dependencies.state.statusInfo).toBe('Stockfish worker crashed');
    expect(dependencies.state.recoveryAction).toBe('retry');
    expect(dependencies.state.bestMove).toBe('-');
    expect(dependencies.state.principalVariation).toBe('-');
  });

  it('offers a retry when the simulated move was not accepted', async () => {
    dependencies.analyze.mockResolvedValue({ success: true, bestmove: 'e2e4', depth: 10 });
    dependencies.execute.mockResolvedValue(false);

    await scheduleAnalysis('main', 'start w - - 0 1');

    expect(dependencies.state.statusInfo).toBe('Move was not confirmed');
    expect(dependencies.state.recoveryAction).toBe('retry');
    expect(dependencies.state.bestMove).toBe('-');
    expect(dependencies.state.currentEvaluation).toBe('-');
  });

  it('starts a ponder search for the predicted reply with its full game history', async () => {
    dependencies.state.ponderEnabled = 1;
    dependencies.readHistory.mockReturnValue({ startFen: 'startpos', moves: ['d2d4'] });
    dependencies.analyze.mockResolvedValue({ success: true, bestmove: 'e7e5', depth: 10 });

    await scheduleAnalysis('ponder', 'start w - - 0 1');

    expect(dependencies.ponderPosition).toHaveBeenCalledWith('after', 20, {
      startFen: 'startpos',
      moves: ['d2d4', 'e2e4'],
    });
  });

  it('starts pondering the predicted opponent reply without a second forecast search', async () => {
    dependencies.state.ponderEnabled = 1;
    dependencies.ponderPosition.mockReturnValue(true);
    dependencies.pv = 'e2e4 e7e5';
    dependencies.readHistory.mockReturnValue({ startFen: 'startpos', moves: ['d2d4'] });
    dependencies.analyze.mockResolvedValue({ success: true, bestmove: 'e2e4', depth: 14 });

    await scheduleAnalysis('main', 'start w - - 0 1');
    dependencies.game.getFEN = () => 'after';
    dependencies.analyze.mockClear();

    await scheduleAnalysis('ponder', 'after');

    expect(dependencies.analyze).not.toHaveBeenCalled();
    expect(dependencies.ponderPosition).toHaveBeenCalledWith('after', 20, {
      startFen: 'startpos',
      moves: ['d2d4', 'e2e4', 'e7e5'],
    });
  });

  it('cancels speculative work when pondering is disabled', async () => {
    dependencies.state.ponderEnabled = 0;

    await scheduleAnalysis('ponder', 'start w - - 0 1');

    expect(dependencies.analyze).not.toHaveBeenCalled();
    expect(dependencies.cancelPonder).toHaveBeenCalledWith();
  });

  it('allocates reduced budget when clock is formatted as sub-minute decimal seconds', async () => {
    // 2.4 seconds remaining on clock (no minute colon)
    vi.stubGlobal('document', {
      querySelector: () => ({ textContent: '2.4' }),
    });
    dependencies.analyze.mockResolvedValue({ success: true, bestmove: 'e2e4', depth: 10 });

    await scheduleAnalysis('main', 'start w - - 0 1');

    expect(dependencies.analyze).toHaveBeenCalledOnce();
    // 2.4s = 2400ms. 2400 / 40 = 60. 60 - 12 = 48ms.
    // Without sub-minute parsing, remaining stays Infinity and budget is 88ms.
    expect(dependencies.analyze.mock.calls[0][2]).toBe(48);
  });

  it('handles terminal checkmate/stalemate position without throwing retry error', async () => {
    dependencies.analyze.mockResolvedValue({ success: false, bestmove: '(none)', depth: 10 });

    await scheduleAnalysis('main', 'start w - - 0 1');

    expect(dependencies.state.statusInfo).toBe('Terminal position');
    expect(dependencies.state.recoveryAction).toBeNull();
    expect(dependencies.execute).not.toHaveBeenCalled();
  });
});



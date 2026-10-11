import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({
  warm: vi.fn(),
  schedule: vi.fn(),
  cancel: vi.fn(),
  update: vi.fn(),
  clearArrows: vi.fn(),
  cancelPending: vi.fn(),
  resetEngine: vi.fn(),
  clearConsole: vi.fn(),
  boardInput: new Set<() => void>(),
}));

vi.mock('../src/engine/analysis.js', () => ({ warmEngine: deps.warm, resetEngine: deps.resetEngine }));
vi.mock('../src/engine/scheduler.js', () => ({ scheduleAnalysis: deps.schedule, cancelAnalysis: deps.cancel }));
vi.mock('../src/board.js', () => ({
  clearArrows: deps.clearArrows,
  cancelPendingMove: deps.cancelPending,
  startDomBoardWatcher: () => {},
  startMoveWatcher: () => {},
  stopMoveWatcher: () => {},
  onBoardMutation: () => () => true,
  onBoardInput: (listener: () => void) => {
    deps.boardInput.add(listener);
    return () => deps.boardInput.delete(listener);
  },
}));
vi.mock('../src/ui.js', () => ({ ui: { updateDisplay: deps.update, clearConsole: deps.clearConsole } }));

import { controller } from '../src/controller.js';
import { BotState } from '../src/state.js';

let fen = 'position w - - 0 1';
const game = {
  getFEN: () => fen,
  getPlayingAs: () => 1,
  isGameOver: () => false,
};
const board: { game: typeof game | null } = { game };

async function startReadyController(): Promise<void> {
  deps.warm.mockResolvedValue(undefined);
  await controller.start();
}

function clearActionMocks(): void {
  deps.cancel.mockClear();
  deps.cancelPending.mockClear();
  deps.clearArrows.mockClear();
  deps.update.mockClear();
}

function setStaleAnalysis(): void {
  BotState.bestMove = 'e2e4';
  BotState.currentEvaluation = '+0.6';
  BotState.principalVariation = 'e2e4 e7e5';
}

function interruptWithBoardInput(): void {
  for (const listener of deps.boardInput) listener();
}

function expectAnalysisCleared(): void {
  expect(BotState.bestMove).toBe('-');
  expect(BotState.currentEvaluation).toBe('-');
  expect(BotState.principalVariation).toBe('-');
}

beforeEach(() => {
  fen = 'position w - - 0 1';
  board.game = game;
  vi.stubGlobal('document', {
    querySelector: (selector: string) => (selector.includes('board') ? board : null),
  });
  controller.stop();
  vi.clearAllMocks();
  deps.warm.mockResolvedValue(undefined);
  deps.cancel.mockImplementation(() => deps.cancelPending());
  BotState.hackEnabled = 1;
  BotState.autoRematch = 0;
  BotState.bestMove = '-';
  BotState.currentEvaluation = '-';
  BotState.principalVariation = '-';
});

afterEach(() => {
  controller.stop();
  vi.unstubAllGlobals();
});

describe('controller lifecycle', () => {
  it('retries rematch when the button renders after game over', async () => {
    await startReadyController();
    const click = vi.fn();
    let buttonVisible = false;
    BotState.autoRematch = 1;
    vi.stubGlobal('document', {
      querySelector: (selector: string) => {
        if (selector.includes('board')) return board;
        if (selector === '.game-over-modal-content') return {};
        return buttonVisible ? { click } : null;
      },
    });
    controller.tick();
    expect(click).not.toHaveBeenCalled();
    buttonVisible = true;
    controller.tick();
    controller.tick();
    expect(click).toHaveBeenCalledOnce();
  });
  it('does not start searching before warmup completes', async () => {
    let ready: () => void = () => {};
    deps.warm.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          ready = resolve;
        }),
    );
    const starting = controller.start();
    controller.tick();
    expect(deps.schedule).not.toHaveBeenCalled();
    controller.stop();
    ready();
    await starting;
    expect(deps.schedule).not.toHaveBeenCalled();
    expect(controller.isActive).toBe(false);
  });

  it('disables the bot and reports initialization failure', async () => {
    deps.warm.mockRejectedValue(new Error('WASM unavailable'));
    await controller.start();
    expect(BotState.hackEnabled).toBe(0);
    expect(BotState.statusInfo).toBe('WASM unavailable');
    expect(BotState.recoveryAction).toBe('retry');
    expect(deps.schedule).not.toHaveBeenCalled();
  });

  it('cancels pending work and clears the analysis when the game disappears', async () => {
    await startReadyController();
    setStaleAnalysis();
    clearActionMocks();
    board.game = null;

    controller.tick();

    expect(deps.cancel).toHaveBeenCalledTimes(1);
    expect(deps.cancelPending).toHaveBeenCalledTimes(1);
    expect(deps.clearArrows).toHaveBeenCalledTimes(1);
    expectAnalysisCleared();
    expect(BotState.statusInfo).toBe('Waiting for board');
    expect(deps.update).toHaveBeenCalledTimes(1);
  });

  it('does not repeat cancellation while the game remains absent', async () => {
    await startReadyController();
    board.game = null;
    clearActionMocks();

    controller.tick();
    controller.tick();

    expect(deps.cancel).toHaveBeenCalledTimes(1);
    expect(deps.cancelPending).toHaveBeenCalledTimes(1);
    expect(deps.clearArrows).toHaveBeenCalledTimes(1);
    expect(deps.update).toHaveBeenCalledTimes(1);
  });

  it('clears the previous move and evaluation when the position changes', async () => {
    await startReadyController();
    setStaleAnalysis();
    clearActionMocks();
    fen = 'position b - - 0 1';

    controller.tick();

    expectAnalysisCleared();
    expect(deps.cancel).toHaveBeenCalledWith(fen);
    expect(deps.cancelPending).toHaveBeenCalledTimes(1);
    expect(deps.clearArrows).toHaveBeenCalledTimes(1);
    expect(deps.update).toHaveBeenCalledTimes(1);
    expect(deps.schedule).toHaveBeenLastCalledWith('ponder', fen);
    expect(BotState.statusInfo).toBe('Waiting for opponent');
  });

  it('clears the previous move and evaluation when stopped', async () => {
    await startReadyController();
    setStaleAnalysis();
    clearActionMocks();

    controller.stop();

    expectAnalysisCleared();
    expect(deps.cancel).toHaveBeenCalledTimes(1);
    expect(deps.cancelPending).toHaveBeenCalledTimes(1);
    expect(deps.clearArrows).toHaveBeenCalledTimes(1);
    expect(BotState.statusInfo).toBe('Bot disabled');
  });

  it('pauses after a human board interruption and explicitly recovers on the same position', async () => {
    await startReadyController();
    const searchesBeforeInterrupt = deps.schedule.mock.calls.length;

    interruptWithBoardInput();
    controller.tick();

    expect(deps.cancel).toHaveBeenCalled();
    expect(BotState.statusInfo).toBe('Paused after board interaction');
    expect(BotState.recoveryAction).toBe('resume');
    expect(deps.schedule).toHaveBeenCalledTimes(searchesBeforeInterrupt);

    controller.recover();

    expect(BotState.recoveryAction).toBeNull();
    expect(deps.schedule).toHaveBeenCalledTimes(searchesBeforeInterrupt + 1);
    expect(deps.schedule).toHaveBeenLastCalledWith('main', fen);
  });

  it('automatically resumes after the human changes the board position', async () => {
    await startReadyController();
    interruptWithBoardInput();
    fen = 'position w - - 0 2';

    controller.tick();

    expect(BotState.recoveryAction).toBeNull();
    expect(deps.schedule).toHaveBeenLastCalledWith('main', fen);
    expect(BotState.statusInfo).toBe('Analyzing...');
  });

  it('reinitializes Stockfish before retrying an engine failure', async () => {
    await startReadyController();
    BotState.recoveryAction = 'retry';
    deps.resetEngine.mockClear();
    const searchesBeforeRetry = deps.schedule.mock.calls.length;

    controller.recover();

    expect(deps.resetEngine).toHaveBeenCalledOnce();
    expect(BotState.recoveryAction).toBeNull();
    expect(deps.schedule).toHaveBeenCalledTimes(searchesBeforeRetry + 1);
  });
});

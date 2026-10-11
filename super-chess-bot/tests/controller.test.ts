import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => {
  const board = { boardId: 'board-one' } as unknown as HTMLElement;
  const snapshot = {
    identity: {},
    gameId: 'game-one',
    board,
    fen: 'start w - - 0 1',
    playerColor: 'w' as 'w' | 'b',
    sideToMove: 'w' as 'w' | 'b',
    orientation: 'white' as 'white' | 'black',
    phase: 'live' as 'live' | 'replay' | 'finished',
    inputReady: true,
    remainingMs: 60_000,
    history: { startFen: 'start w - - 0 1', moves: [] as string[] },
    confirmedFens: ['start w - - 0 1'],
  };
  const siteRead: { kind: 'game' | 'waiting' | 'ineligible'; snapshot: typeof snapshot; reason?: string } = {
    kind: 'game',
    snapshot,
  };
  const listeners = new Set<() => void>();
  const site = {
    id: 'pychess' as const,
    capabilities: { input: 'selection' as 'selection' | 'gestures' },
    read: () => siteRead,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    submitMove: vi.fn(async () => true),
    cancelInput: vi.fn(),
  };
  return {
    warm: vi.fn(),
    schedule: vi.fn(),
    cancel: vi.fn(),
    update: vi.fn(),
    clearArrows: vi.fn(),
    cancelPending: vi.fn(),
    attachToBoard: vi.fn(),
    setBoardOrientation: vi.fn(),
    resetEngine: vi.fn(),
    clearConsole: vi.fn(),
    boardInput: new Set<() => void>(),
    confirmationListeners: new Set<() => void>(),
    pendingIdentity: null as object | null,
    snapshot,
    siteRead,
    listeners,
    site,
    state: {
      hackEnabled: 1,
      botPower: 20,
      moveTime: 100,
      autoMove: 1,
      ponderEnabled: 1,
      moveMethod: 'click' as const,
      bestMove: '-',
      currentEvaluation: '-',
      principalVariation: '-',
      statusInfo: 'Ready',
      recoveryAction: null as 'resume' | 'retry' | null,
    },
  };
});

vi.mock('../src/engine/analysis.js', () => ({ warmEngine: deps.warm, resetEngine: deps.resetEngine }));
vi.mock('../src/engine/scheduler.js', () => ({
  scheduleAnalysis: deps.schedule,
  cancelAnalysis: deps.cancel,
  isMoveConfirmationPending: (identity: object) => deps.pendingIdentity === identity,
  onMoveConfirmationSettled: (listener: () => void) => {
    deps.confirmationListeners.add(listener);
    return () => deps.confirmationListeners.delete(listener);
  },
}));
vi.mock('../src/sites/index.js', () => ({ getSite: () => deps.site, readSite: () => deps.site.read() }));
vi.mock('../src/state.js', () => ({
  BotState: deps.state,
  pa: () => 1,
  Settings: { save: vi.fn() },
}));
vi.mock('../src/board.js', () => ({
  attachToBoard: deps.attachToBoard,
  setBoardOrientation: deps.setBoardOrientation,
  clearArrows: deps.clearArrows,
  cancelPendingMove: deps.cancelPending,
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

async function startReadyController(): Promise<void> {
  deps.warm.mockResolvedValue(undefined);
  await controller.start();
}

function clearActionMocks(): void {
  deps.cancel.mockClear();
  deps.site.cancelInput.mockClear();
  deps.cancelPending.mockClear();
  deps.clearArrows.mockClear();
  deps.update.mockClear();
  deps.attachToBoard.mockClear();
  deps.resetEngine.mockClear();
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

function setRead(changes: Partial<typeof deps.snapshot>): void {
  Object.assign(deps.snapshot, changes);
}

beforeEach(() => {
  Object.assign(deps.snapshot, {
    identity: {},
    gameId: 'game-one',
    board: { boardId: 'board-one' } as unknown as HTMLElement,
    fen: 'start w - - 0 1',
    playerColor: 'w',
    sideToMove: 'w',
    orientation: 'white',
    phase: 'live',
    inputReady: true,
    remainingMs: 60_000,
    history: { startFen: 'start w - - 0 1', moves: [] },
    confirmedFens: ['start w - - 0 1'],
  });
  deps.siteRead.snapshot = deps.snapshot;
  deps.siteRead.kind = 'game';
  deps.pendingIdentity = null;
  deps.confirmationListeners.clear();
  controller.stop();
  vi.clearAllMocks();
  deps.warm.mockResolvedValue(undefined);
  deps.cancel.mockImplementation(() => deps.cancelPending());
  BotState.hackEnabled = 1;
  BotState.autoMove = 1;
  BotState.ponderEnabled = 1;
  BotState.bestMove = '-';
  BotState.currentEvaluation = '-';
  BotState.principalVariation = '-';
  deps.site.capabilities = { input: 'selection' };
});

afterEach(() => {
  controller.stop();
  vi.unstubAllGlobals();
});

describe('controller lifecycle', () => {
  it('mounts the overlay on the adapter snapshot board and prewarms while disabled', async () => {
    BotState.hackEnabled = 0;
    await controller.start();

    expect(deps.attachToBoard).toHaveBeenCalledWith(deps.snapshot.board);
    expect(deps.state.hackEnabled).toBe(0);
    expect(deps.schedule).not.toHaveBeenCalled();
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

  it('cancels old work and reports a waiting state', async () => {
    await startReadyController();
    setStaleAnalysis();
    clearActionMocks();
    deps.siteRead.kind = 'waiting';
    Object.assign(deps.siteRead, { reason: 'Waiting for PyChess game' });

    controller.tick();

    expect(deps.cancel).toHaveBeenCalledOnce();
    expect(deps.site.cancelInput).toHaveBeenCalledOnce();
    expect(deps.clearArrows).toHaveBeenCalledOnce();
    expectAnalysisCleared();
    expect(BotState.statusInfo).toBe('Waiting for PyChess game');
    expect(deps.attachToBoard).toHaveBeenLastCalledWith(null);
  });

  it('does not repeat cancellation while the adapter remains waiting', async () => {
    await startReadyController();
    deps.siteRead.kind = 'ineligible';
    Object.assign(deps.siteRead, { reason: 'Waiting for game' });
    clearActionMocks();

    controller.tick();
    controller.tick();

    expect(deps.cancel).toHaveBeenCalledOnce();
    expect(deps.clearArrows).toHaveBeenCalledOnce();
  });

  it.each(['replay', 'finished'] as const)('cancels when the unchanged position enters %s', async (phase) => {
    await startReadyController();
    clearActionMocks();
    setRead({ phase });

    controller.tick();

    expect(deps.cancel).toHaveBeenCalledOnce();
    expect(deps.site.cancelInput).toHaveBeenCalledOnce();
    expect(BotState.statusInfo).toBe(phase === 'replay' ? 'Replay mode' : 'Game finished');
    expect(deps.schedule).toHaveBeenCalledTimes(1);
  });

  it('does not reset the engine when the adapter allocates a new snapshot object', async () => {
    await startReadyController();
    const before = deps.resetEngine.mock.calls.length;
    clearActionMocks();
    deps.siteRead.snapshot = { ...deps.siteRead.snapshot };

    controller.tick();

    expect(deps.resetEngine).toHaveBeenCalledTimes(before);
    expect(deps.cancel).not.toHaveBeenCalled();
  });

  it('resets the engine when game or board identity changes', async () => {
    await startReadyController();
    const identity = {};
    const nextBoard = { boardId: 'board-two' } as unknown as HTMLElement;
    deps.siteRead.snapshot = { ...deps.siteRead.snapshot, identity, board: nextBoard, gameId: 'game-two' };

    controller.tick();

    expect(deps.resetEngine).toHaveBeenCalledOnce();
    expect(deps.attachToBoard).toHaveBeenLastCalledWith(nextBoard);
    expect(deps.cancel).toHaveBeenCalled();
  });

  it('schedules ponder from the accepted opponent-to-move position', async () => {
    await startReadyController();
    clearActionMocks();
    setRead({ fen: 'start b - - 0 1', sideToMove: 'b', inputReady: false });

    controller.tick();

    expect(deps.schedule).toHaveBeenLastCalledWith('ponder', 'start b - - 0 1');
    expect(BotState.statusInfo).toBe('Waiting for opponent');
  });

  it('does not cancel a pending same-position search when input readiness temporarily drops', async () => {
    await startReadyController();
    const scheduled = deps.schedule.mock.calls.length;
    clearActionMocks();
    setRead({ inputReady: false });

    controller.tick();

    expect(deps.cancel).not.toHaveBeenCalled();
    expect(deps.site.cancelInput).not.toHaveBeenCalled();
    expect(deps.schedule).toHaveBeenCalledTimes(scheduled);
  });

  it('waits for pending move confirmation before reconciling the accepted next position', async () => {
    await startReadyController();
    deps.schedule.mockClear();
    clearActionMocks();
    deps.pendingIdentity = deps.snapshot.identity;
    setRead({ fen: 'after b - - 0 1', sideToMove: 'b', inputReady: false });

    controller.tick();

    expect(deps.cancel).not.toHaveBeenCalled();
    expect(deps.schedule).not.toHaveBeenCalled();

    deps.pendingIdentity = null;
    for (const listener of deps.confirmationListeners) listener();

    expect(deps.cancel).toHaveBeenCalledOnce();
    expect(deps.schedule).toHaveBeenLastCalledWith('ponder', 'after b - - 0 1');
  });

  it('cancels pending work and clears the analysis when stopped', async () => {
    await startReadyController();
    setStaleAnalysis();
    clearActionMocks();

    controller.stop();

    expectAnalysisCleared();
    expect(deps.cancel).toHaveBeenCalledOnce();
    expect(deps.site.cancelInput).toHaveBeenCalledOnce();
    expect(BotState.statusInfo).toBe('Bot disabled');
  });

  it('pauses after trusted board input and explicitly resumes on the same position', async () => {
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
    expect(deps.schedule).toHaveBeenLastCalledWith('main', 'start w - - 0 1');
  });

  it('automatically resumes after a human move changes the accepted FEN', async () => {
    await startReadyController();
    interruptWithBoardInput();
    setRead({ fen: 'start w - - 0 2', sideToMove: 'w', inputReady: true });

    controller.tick();

    expect(BotState.recoveryAction).toBeNull();
    expect(deps.schedule).toHaveBeenLastCalledWith('main', 'start w - - 0 2');
    expect(BotState.statusInfo).toBe('Analyzing...');
  });
});

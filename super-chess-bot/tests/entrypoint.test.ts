import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  warm: vi.fn(),
  buildUI: vi.fn(),
  updateDisplay: vi.fn(),
  attachToBoard: vi.fn(),
  controllerInit: vi.fn(),
  waitForElement: vi.fn(),
  board: { nodeType: 1 },
  state: {
    hackEnabled: 0,
    statusInfo: 'Bot disabled',
    onUpdateDisplay: undefined as ((playingAs: number) => void) | undefined,
  },
}));

vi.mock('../src/board.js', () => ({ attachToBoard: dependencies.attachToBoard }));
vi.mock('../src/controller.js', () => ({ controller: { init: dependencies.controllerInit } }));
vi.mock('../src/engine/analysis.js', () => ({ warmEngine: dependencies.warm }));
vi.mock('../src/state.js', () => ({ BotState: dependencies.state, pa: () => 1 }));
vi.mock('../src/sites/index.js', () => ({
  getSite: () => ({ id: 'chesscom' }),
  readSite: () => ({ kind: 'game', snapshot: { board: dependencies.board } }),
}));
vi.mock('../src/ui.js', () => ({ buildUI: dependencies.buildUI, ui: { updateDisplay: dependencies.updateDisplay } }));
vi.mock('../src/utils.js', () => ({ waitForElement: dependencies.waitForElement }));

describe('userscript startup', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('window', { __GABIBOT_RUNNING__: false });
    dependencies.warm.mockReset().mockResolvedValue(undefined);
    dependencies.buildUI.mockReset().mockResolvedValue(undefined);
    dependencies.updateDisplay.mockReset();
    dependencies.attachToBoard.mockReset();
    dependencies.controllerInit.mockReset();
    dependencies.waitForElement.mockReset().mockResolvedValue({ nodeType: 1 });
    Object.assign(dependencies.state, { hackEnabled: 0, statusInfo: 'Bot disabled', onUpdateDisplay: undefined });
  });

  it('warms Stockfish after mounting the panel, before the user enables automation', async () => {
    await import('../src/index.js');

    await vi.waitFor(() => expect(dependencies.warm).toHaveBeenCalledOnce());
    expect(dependencies.buildUI).toHaveBeenCalledBefore(dependencies.warm);
    expect(dependencies.state.hackEnabled).toBe(0);
    await vi.waitFor(() => expect(dependencies.state.statusInfo).toBe('Ready'));
    await vi.waitFor(() => expect(dependencies.controllerInit).toHaveBeenCalledOnce());
    expect(dependencies.attachToBoard).toHaveBeenCalledWith(dependencies.board);
  });
});

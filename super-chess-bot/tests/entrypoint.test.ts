import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  warm: vi.fn(),
  buildUI: vi.fn(),
  updateDisplay: vi.fn(),
  controllerInit: vi.fn(),
  site: { id: 'pychess', capabilities: { input: 'selection' } },
  state: {
    hackEnabled: 0,
    statusInfo: 'Bot disabled',
    onUpdateDisplay: undefined as ((playingAs: number) => void) | undefined,
  },
}));

vi.mock('../src/controller.js', () => ({ controller: { init: dependencies.controllerInit } }));
vi.mock('../src/engine/analysis.js', () => ({ warmEngine: dependencies.warm }));
vi.mock('../src/state.js', () => ({ BotState: dependencies.state, pa: () => 1 }));
vi.mock('../src/sites/index.js', () => ({
  getSite: () => dependencies.site,
}));
vi.mock('../src/ui.js', () => ({ buildUI: dependencies.buildUI, ui: { updateDisplay: dependencies.updateDisplay } }));

describe('userscript startup', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('window', { __SCB_ACTIVE__: false });
    dependencies.warm.mockReset().mockResolvedValue(undefined);
    dependencies.buildUI.mockReset().mockResolvedValue(undefined);
    dependencies.updateDisplay.mockReset();
    dependencies.controllerInit.mockReset();
    Object.assign(dependencies.state, { hackEnabled: 0, statusInfo: 'Bot disabled', onUpdateDisplay: undefined });
  });

  it('mounts on the PyChess lobby, prewarms the engine, and never waits for a Chess.com board selector', async () => {
    await import('../src/index.js');

    await vi.waitFor(() => expect(dependencies.warm).toHaveBeenCalledOnce());
    expect(dependencies.buildUI).toHaveBeenCalledBefore(dependencies.warm);
    expect(dependencies.buildUI).toHaveBeenCalledWith(expect.any(Object), dependencies.site.capabilities);
    expect(dependencies.state.hackEnabled).toBe(0);
    await vi.waitFor(() => expect(dependencies.state.statusInfo).toBe('Ready'));
    await vi.waitFor(() => expect(dependencies.controllerInit).toHaveBeenCalledOnce());
  });

  it('waits for the document body when the userscript starts at document-start', async () => {
    let ready: (() => void) | undefined;
    vi.stubGlobal('document', {
      body: null,
      readyState: 'loading',
      addEventListener: (_event: string, callback: () => void) => {
        ready = callback;
      },
    });

    await import('../src/index.js');
    expect(dependencies.buildUI).not.toHaveBeenCalled();
    expect(dependencies.warm).not.toHaveBeenCalled();

    ready?.();
    await vi.waitFor(() => expect(dependencies.buildUI).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(dependencies.warm).toHaveBeenCalledOnce());
  });
});

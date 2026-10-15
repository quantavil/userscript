import { describe, expect, it, vi } from 'vite-plus/test';
import { installLichessControllerBridge } from '../../../src/sites/lichess/bridge.js';

describe('Lichess round controller bridge', () => {
  it('wraps only the round page initializer and captures its returned controller', async () => {
    const controller = { marker: 'round-controller' };
    const loadEsm = vi.fn(async (name: string, options: { init?: unknown }) => {
      expect(name).toBe('round');
      expect(options.init).toEqual({ game: 'round-init' });
      return controller;
    });
    const loadEsmPage = vi.fn(async () => 'original-loader');
    const roundData = { innerHTML: JSON.stringify({ game: 'round-init' }), remove: vi.fn() };
    const page = {
      document: {
        getElementById: (id: string) => (id === 'page-init-data' ? roundData : null),
      },
    } as unknown as Window & { site?: Record<string, unknown> };
    const captured = vi.fn();

    expect(installLichessControllerBridge(page, captured)).toBe(true);
    page.site = {};
    page.site.asset = Object.freeze({ loadEsm, loadEsmPage, marker: 'preserved' });

    const asset = page.site.asset as {
      loadEsmPage: (name: string) => Promise<unknown>;
      marker: string;
    };
    expect(asset.marker).toBe('preserved');
    await asset.loadEsmPage('round');

    expect(loadEsm).toHaveBeenCalledOnce();
    expect(loadEsmPage).not.toHaveBeenCalled();
    expect(roundData.remove).toHaveBeenCalledOnce();
    expect(captured).toHaveBeenCalledWith(controller);
  });

  it('leaves non-round page modules on Lichess original loader', async () => {
    const originalResult = { name: 'analysis' };
    const loadEsm = vi.fn();
    const loadEsmPage = vi.fn(async () => originalResult);
    const page = {
      document: { getElementById: () => null },
    } as unknown as Window & { site?: Record<string, unknown> };
    const captured = vi.fn();

    installLichessControllerBridge(page, captured);
    page.site = {};
    page.site.asset = Object.freeze({ loadEsm, loadEsmPage });

    await expect(
      (page.site.asset as { loadEsmPage: (name: string) => Promise<unknown> }).loadEsmPage('analyse'),
    ).resolves.toBe(originalResult);
    expect(loadEsmPage).toHaveBeenCalledWith('analyse');
    expect(loadEsm).not.toHaveBeenCalled();
    expect(captured).not.toHaveBeenCalled();
  });

  it('captures the controller when Lichess invokes loadEsm directly', async () => {
    const controller = { marker: 'direct-round-controller' };
    const loadEsm = vi.fn(async () => controller);
    const page = {
      document: { getElementById: () => null },
    } as unknown as Window & { site?: Record<string, unknown> };
    const captured = vi.fn();

    installLichessControllerBridge(page, captured);
    page.site = {};
    page.site.asset = Object.freeze({ loadEsm, loadEsmPage: vi.fn() });

    await (page.site.asset as { loadEsm: (name: string, options: unknown) => Promise<unknown> }).loadEsm('round', {
      init: {},
    });
    expect(loadEsm).toHaveBeenCalledOnce();
    expect(captured).toHaveBeenCalledWith(controller);
  });

  it('falls back to original loadEsmPage if page-init-data parsing throws', async () => {
    const originalResult = { fallback: 'round-original' };
    const loadEsm = vi.fn();
    const loadEsmPage = vi.fn(async () => originalResult);
    const brokenData = { innerHTML: '{invalid json', remove: vi.fn() };
    const page = {
      document: {
        getElementById: (id: string) => (id === 'page-init-data' ? brokenData : null),
      },
    } as unknown as Window & { site?: Record<string, unknown> };
    const captured = vi.fn();

    installLichessControllerBridge(page, captured);
    page.site = {};
    page.site.asset = Object.freeze({ loadEsm, loadEsmPage });

    const asset = page.site.asset as { loadEsmPage: (name: string) => Promise<unknown> };
    await expect(asset.loadEsmPage('round')).resolves.toBe(originalResult);
    expect(loadEsmPage).toHaveBeenCalledWith('round');
    expect(captured).not.toHaveBeenCalled();
  });
});

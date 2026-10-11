import { describe, expect, it, beforeEach } from 'bun:test';

beforeEach(() => {
  const store: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
  (global as any).localStorage._store = store;
});

describe('grid size persistence', () => {
  it('clamps to min/max and defaults', async () => {
    const { getGridSize, GRID_MIN, GRID_MAX, GRID_DEFAULT } = await import('../src/controls');
    expect(getGridSize()).toBe(GRID_DEFAULT);
    localStorage.setItem('whGridSize', '100');
    expect(getGridSize()).toBe(GRID_MIN);
    localStorage.setItem('whGridSize', '9999');
    expect(getGridSize()).toBe(GRID_MAX);
    localStorage.setItem('whGridSize', '360');
    expect(getGridSize()).toBe(360);
  });

  it('thumbId reads data-wallpaper-id', async () => {
    const { thumbId } = await import('../src/thumbs');
    expect(thumbId({ getAttribute: () => 'abc123' } as any)).toBe('abc123');
    expect(thumbId({ getAttribute: () => null } as any)).toBe('');
  });
});

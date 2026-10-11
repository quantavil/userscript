import { describe, expect, test } from 'bun:test';
import { type BootServices, boot } from '../src/boot';

describe('boot', () => {
  test('does nothing on ineligible URLs', async () => {
    const calls: string[] = [];
    const services = fakeServices(calls);
    await boot('http://localhost:3000/', services);
    expect(calls).toEqual([]);
  });

  test('records the visit, starts collection, registers menu commands, and handles shortcuts', async () => {
    const calls: string[] = [];
    const services = fakeServices(calls);
    await boot('https://news.bbc.co.uk/story', services);
    expect(calls).toEqual([
      'touch:bbc.co.uk',
      'collect:bbc.co.uk',
      'menu:Show SiteOrbit (Ctrl+Alt+S)',
      'menu:Clear SiteOrbit Cache',
    ]);

    await services.triggerMenu?.('Show SiteOrbit (Ctrl+Alt+S)');
    expect(calls.at(-1)).toBe('toggle:bbc.co.uk');

    await services.triggerMenu?.('Clear SiteOrbit Cache');
    expect(calls.at(-1)).toBe('clearCache');

    // Alt+S alone must no longer trigger; Ctrl+Alt+S must.
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', altKey: true }));
    expect(calls.at(-1)).toBe('clearCache');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', altKey: true, ctrlKey: true }));
    expect(calls.at(-1)).toBe('toggle:bbc.co.uk');
  });
});

function fakeServices(
  calls: string[],
): BootServices & { triggerMenu?: (label: string) => void | Promise<void> } {
  const menuCallbacks = new Map<string, () => void | Promise<void>>();
  const services: BootServices & { triggerMenu?: (label: string) => void | Promise<void> } = {
    touch: async (domain) => {
      calls.push(`touch:${domain}`);
    },
    collect: (domain) => {
      calls.push(`collect:${domain}`);
      return Promise.resolve();
    },
    registerMenu: (label, callback) => {
      calls.push(`menu:${label}`);
      menuCallbacks.set(label, callback);
    },
    openPanel: async (domain) => {
      calls.push(`open:${domain}`);
    },
    togglePanel: (domain) => {
      calls.push(`toggle:${domain}`);
    },
    clearCache: async () => {
      calls.push('clearCache');
    },
    triggerMenu: (label) => {
      return menuCallbacks.get(label)?.();
    },
  };
  return services;
}

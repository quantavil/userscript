import { isObject } from '../common.js';

type LichessWindow = Window & { site?: unknown };

type RoundInitializer = (name: string, options?: unknown) => Promise<unknown>;
type PageInitializer = (name: string, ...args: unknown[]) => unknown;

/** Capture the controller returned by Lichess's own round page initializer. */
export function installLichessControllerBridge(
  page: LichessWindow,
  onController: (controller: unknown) => void,
): boolean {
  const hookedSites = new WeakSet<object>();
  const hookedAssets = new WeakMap<object, object>();

  const wrapAsset = (asset: unknown): unknown => {
    if (!isObject(asset)) return asset;
    const cached = hookedAssets.get(asset);
    if (cached) return cached;

    const originalPageInitializer = Reflect.get(asset, 'loadEsmPage') as PageInitializer | undefined;
    const roundInitializer = Reflect.get(asset, 'loadEsm') as RoundInitializer | undefined;
    if (typeof originalPageInitializer !== 'function' || typeof roundInitializer !== 'function') return asset;

    const wrappedAsset = Object.create(asset) as Record<PropertyKey, unknown>;
    const wrappedRoundInitializer = (name: string, ...args: unknown[]) => {
      const result = Reflect.apply(roundInitializer, asset, [name, ...args]);
      const options = args[0];
      const usesNpmModule = isObject(options) && Reflect.get(options, 'npm') === true;
      if (name !== 'round' || usesNpmModule) return result;
      return Promise.resolve(result).then((controller) => {
        try {
          onController(controller);
        } catch {
          // Controller capture must not interrupt Lichess round initialization.
        }
        return controller;
      });
    };
    Object.defineProperty(wrappedAsset, 'loadEsm', {
      configurable: true,
      enumerable: true,
      value: wrappedRoundInitializer,
    });
    Object.defineProperty(wrappedAsset, 'loadEsmPage', {
      configurable: true,
      enumerable: true,
      value(name: string, ...args: unknown[]) {
        if (name !== 'round') return Reflect.apply(originalPageInitializer, asset, [name, ...args]);

        const initElement = page.document.getElementById('page-init-data');
        if (initElement) {
          try {
            const initOptions = JSON.parse(initElement.innerHTML);
            initElement.remove();
            return Reflect.apply(wrappedRoundInitializer, wrappedAsset, [name, { init: initOptions }]);
          } catch (error) {
            console.warn(
              'Super Chess Bot: Failed to parse Lichess page-init-data, delegating to original loader',
              error,
            );
            return Reflect.apply(originalPageInitializer, asset, [name, ...args]);
          }
        }

        return Reflect.apply(wrappedRoundInitializer, wrappedAsset, [name, ...args]);
      },
    });
    hookedAssets.set(asset, wrappedAsset);
    return wrappedAsset;
  };

  const hookSite = (site: unknown): boolean => {
    if (!isObject(site)) return false;
    if (hookedSites.has(site)) return true;

    let asset = wrapAsset(Reflect.get(site, 'asset'));
    const descriptor = Object.getOwnPropertyDescriptor(site, 'asset');
    if (descriptor?.configurable === false) {
      if (!descriptor.writable || !Reflect.set(site, 'asset', asset)) return false;
      hookedSites.add(site);
      return true;
    }

    try {
      Object.defineProperty(site, 'asset', {
        configurable: true,
        enumerable: descriptor?.enumerable ?? true,
        get: () => asset,
        set: (next: unknown) => {
          asset = wrapAsset(next);
        },
      });
      hookedSites.add(site);
      return true;
    } catch {
      return false;
    }
  };

  let currentSite: unknown;
  try {
    currentSite = Reflect.get(page, 'site');
    const descriptor = Object.getOwnPropertyDescriptor(page, 'site');
    if (descriptor?.configurable === false) return hookSite(currentSite);
    Object.defineProperty(page, 'site', {
      configurable: true,
      enumerable: descriptor?.enumerable ?? true,
      get: () => currentSite,
      set: (next: unknown) => {
        currentSite = next;
        hookSite(next);
      },
    });
  } catch {
    return hookSite(currentSite);
  }

  if (currentSite !== undefined) hookSite(currentSite);
  return true;
}

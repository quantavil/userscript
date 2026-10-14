import { isObject } from '../common.js';

type ChesscomWindow = Window & { customElements?: CustomElementRegistry | undefined };

type BoardElement = HTMLElement & { game?: unknown };

type BoardMethod = (this: BoardElement, ...args: unknown[]) => unknown;

/** Stable module reference to the last captured Chess.com game controller. */
let capturedController: unknown = null;

const wrappedPrototypes = new WeakSet<object>();
const hookedRegistries = new WeakSet<object>();

/** Read the captured Chess.com game controller, if one has been intercepted. */
export function getCapturedChesscomController<T = unknown>(): T | null {
  return (capturedController ?? null) as T | null;
}

/** Replace the captured controller, adopting a live board replacement. */
export function setCapturedChesscomController(controller: unknown): void {
  if (!isObject(controller)) return;
  capturedController = controller;
}

/** Clear the captured controller. Primarily for tests. */
export function resetCapturedChesscomController(): void {
  capturedController = null;
}

/** Capture the controller returned by Chess.com's own board initializer. */
export function installChesscomControllerBridge(
  page: ChesscomWindow,
  onController: (controller: unknown) => void,
): boolean {
  const notify = (controller: unknown): void => {
    if (!isObject(controller)) return;
    capturedController = controller;
    try {
      onController(controller);
    } catch {
      // Controller capture must not interrupt Chess.com board initialization.
    }
  };

  const controllerFrom = (owner: BoardElement | null | undefined, result: unknown): unknown => {
    if (isObject(result)) {
      const nested = Reflect.get(result, 'game');
      if (isObject(nested)) return nested;
      // `wc-chess-board` init returns the game controller itself.
      if (typeof Reflect.get(result, 'getFEN') === 'function') return result;
    }
    return owner?.game ?? result;
  };

  const wrapPrototype = (proto: object): void => {
    if (!isObject(proto) || wrappedPrototypes.has(proto)) return;
    wrappedPrototypes.add(proto);

    const originalInit = Reflect.get(proto, 'init');
    if (typeof originalInit === 'function') {
      const init = originalInit as BoardMethod;
      try {
        Object.defineProperty(proto, 'init', {
          configurable: true,
          writable: true,
          value(this: BoardElement, ...args: unknown[]) {
            const result = Reflect.apply(init, this, args);
            try {
              notify(controllerFrom(this, result));
            } catch {
              // Capture must not break board setup.
            }
            return result;
          },
        });
      } catch {
        // A locked prototype keeps its original initializer.
      }
    }

    const originalCreateGame = Reflect.get(proto, 'createGame');
    if (typeof originalCreateGame === 'function') {
      const createGame = originalCreateGame as BoardMethod;
      try {
        Object.defineProperty(proto, 'createGame', {
          configurable: true,
          writable: true,
          value(this: BoardElement, ...args: unknown[]) {
            const result = Reflect.apply(createGame, this, args);
            try {
              notify(controllerFrom(this, result));
            } catch {
              // Capture must not break board setup.
            }
            return result;
          },
        });
      } catch {
        // A locked prototype keeps its original factory.
      }
    }
  };

  const wrapConstructor = (candidate: unknown): void => {
    if (!isObject(candidate)) return;
    const prototype = Reflect.get(candidate, 'prototype');
    if (isObject(prototype)) wrapPrototype(prototype);
  };

  try {
    const registry = page.customElements;
    if (registry && typeof registry.define === 'function' && !hookedRegistries.has(registry)) {
      hookedRegistries.add(registry);
      const originalDefine = registry.define.bind(registry);
      try {
        registry.define = ((name: string, ctor: CustomElementConstructor, options?: ElementDefinitionOptions) => {
          try {
            if (name === 'wc-chess-board') wrapConstructor(ctor);
          } catch {
            // A board definition failure must not block registration.
          }
          return originalDefine(name, ctor, options);
        }) as CustomElementRegistry['define'];
      } catch {
        // A locked registry keeps its original define.
      }
    }
  } catch {
    // Custom element interception is best-effort before hydration.
  }

  try {
    wrapConstructor(page.customElements?.get?.('wc-chess-board'));
  } catch {
    // The board element may not be defined yet; the define hook covers it.
  }

  // Late installs still capture an already-hydrated board.
  try {
    const boards = page.document?.querySelectorAll?.('wc-chess-board');
    if (boards) {
      for (const board of Array.from(boards) as BoardElement[]) {
        try {
          if (isObject(board?.game)) notify(board.game);
        } catch {
          // One unreadable board must not block the sweep.
        }
      }
    }
  } catch {
    // The document may not exist yet at document-start.
  }

  return true;
}

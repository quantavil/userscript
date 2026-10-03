import { createStore, gmKV } from './config/store.ts';
import { providers } from './providers/index.ts';
import { createController } from './solver/controller.ts';

/** Process-wide singletons wired to the real GM_* storage and network. */
export const store = createStore(gmKV);
export const controller = createController({ store, registry: providers });
export { providers };

import { store } from '../app.ts';
import { main } from '../main.ts';

// gm-shim.js ran first (manifest order) and is loading storage into memory.
const ready = (globalThis as unknown as { __ucsReady?: Promise<void> }).__ucsReady;

void (ready ?? Promise.reject(new Error('[ucs] gm-shim.js did not load'))).then(() => {
  store.reload(); // the store was created before storage finished loading
  main();
});

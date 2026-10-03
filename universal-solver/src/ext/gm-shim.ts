import {
  ext,
  fromWire,
  HTTP_PORT,
  MENU_MESSAGE,
  type Port,
  toWire,
  type WireBody,
  type WireRequest,
  type WireResponse,
} from './api.ts';

/**
 * Loaded as its own content script, before content.js. Provides the GM_* functions the userscript build gets from its manager, on top of the extension
 * APIs, so the solver itself is identical in both builds.
 *
 * - Storage: GM_getValue is synchronous, extension storage is not. Everything is read into memory
 *   once (`ready`) before the solver starts; writes update memory at once and persist in the
 *   background; `storage.onChanged` keeps other tabs and frames in sync.
 * - Network: content scripts are bound by the page's CORS rules, so requests go through the
 *   background script, which holds the host permission.
 * - Menu: commands are run by the toolbar popup, in the top frame only.
 */

type Listener = (name: string, oldValue: unknown, newValue: unknown, remote: boolean) => void;

const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<Listener>>();
const commands = new Map<string, () => void>();
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

ext.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
    // Our own writes echo back here; they are already in the cache.
    if (same(newValue, cache.get(key))) continue;
    if (newValue === undefined) cache.delete(key);
    else cache.set(key, newValue);
    for (const fn of listeners.get(key) ?? []) fn(key, oldValue, newValue, true);
  }
});

const ready: Promise<void> = ext.storage.local.get(null).then((all) => {
  for (const [k, value] of Object.entries(all)) if (!cache.has(k)) cache.set(k, value);
});

async function wireBody(body: unknown): Promise<WireBody | undefined> {
  if (body === undefined || body === null) return undefined;
  if (!(body instanceof FormData)) return { kind: 'text', text: String(body) };
  const parts: Extract<WireBody, { kind: 'form' }>['parts'] = [];
  for (const [name, value] of body.entries()) {
    const v = value as string | Blob;
    if (typeof v === 'string') parts.push({ name, text: v });
    else parts.push({ name, file: await toWire(v, v instanceof File ? v.name : undefined) });
  }
  return { kind: 'form', parts };
}

type GmDetails = {
  method?: string;
  url: string;
  headers?: Record<string, string>;
  data?: unknown;
  responseType?: string;
  timeout?: number;
  onload?: (r: { status: number; responseText: string; response?: Blob; responseHeaders: string }) => void;
  onerror?: (r: unknown) => void;
  ontimeout?: (r: unknown) => void;
  onabort?: (r: unknown) => void;
};

function xhr(d: GmDetails): { abort(): void } {
  let port: Port | null = null;
  let done = false;
  const settle = () => {
    done = true;
    port?.disconnect();
  };
  void (async () => {
    const req: WireRequest = {
      method: d.method ?? 'GET',
      url: d.url,
      headers: d.headers,
      body: await wireBody(d.data),
      blob: d.responseType === 'blob',
      timeout: d.timeout ?? 15_000,
    };
    if (done) return; // aborted while the body was being encoded
    port = ext.runtime.connect({ name: HTTP_PORT });
    port.onMessage.addListener((res: WireResponse) => {
      if (done) return;
      settle();
      if (res.ok) {
        d.onload?.({
          status: res.status,
          responseText: res.text,
          response: res.blob ? fromWire(res.blob) : undefined,
          responseHeaders: res.headers,
        });
      } else if (res.error === 'timeout') d.ontimeout?.(res);
      else d.onerror?.(res);
    });
    port.onDisconnect.addListener(() => {
      if (done) return;
      done = true;
      d.onerror?.({ error: 'disconnected' });
    });
    port.postMessage(req);
  })().catch((e) => {
    if (done) return;
    done = true;
    d.onerror?.({ error: String(e) });
  });
  return {
    abort() {
      if (done) return;
      settle();
      d.onabort?.({});
    },
  };
}

const g = globalThis as unknown as Record<string, unknown>;
g.GM_getValue = (key: string, fallback: unknown) => (cache.has(key) ? structuredClone(cache.get(key)) : fallback);
g.GM_setValue = (key: string, value: unknown) => {
  const plain = value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  cache.set(key, plain);
  void ext.storage.local.set({ [key]: plain });
};
g.GM_listValues = () => [...cache.keys()];
g.GM_addValueChangeListener = (key: string, fn: Listener) => {
  const set = listeners.get(key) ?? new Set();
  set.add(fn);
  listeners.set(key, set);
  return 0;
};
g.GM_registerMenuCommand = (name: string, fn: () => void, accessKey?: string) => {
  commands.set(accessKey ?? name, fn);
  return accessKey ?? name;
};
g.GM_xmlhttpRequest = xhr;
/** Read by content.js, which the manifest loads right after this file in the same scope. */
g.__ucsReady = ready;

ext.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const m = msg as { type?: string; cmd?: string } | null;
  if (m?.type !== MENU_MESSAGE) return undefined;
  const fn = m.cmd ? commands.get(m.cmd) : undefined;
  sendResponse({ ok: Boolean(fn) });
  fn?.();
  return undefined;
});

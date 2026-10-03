import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { WireRequest, WireResponse } from '../src/ext/api.ts';

/** The Firefox build's GM_* shim, against a fake `browser` API. */
const g = globalThis as unknown as Record<string, unknown>;
const GM_NAMES = [
  'GM_getValue',
  'GM_setValue',
  'GM_listValues',
  'GM_addValueChangeListener',
  'GM_registerMenuCommand',
  'GM_xmlhttpRequest',
];
const saved = Object.fromEntries(GM_NAMES.map((k) => [k, g[k]]));

type Changes = Record<string, { oldValue?: unknown; newValue?: unknown }>;
const disk: Record<string, unknown> = { 'ucs:v2:settings': { provider: 'groq' } };
const changeFns: ((c: Changes, area: string) => void)[] = [];
let onMenu: (msg: unknown, sender: unknown, reply: (r: unknown) => void) => unknown = () => undefined;
const sent: WireRequest[] = [];
let respond: (req: WireRequest) => WireResponse | null = () => ({ ok: true, status: 200, text: 'hi', headers: '' });
let disconnected = 0;

function writeDisk(items: Record<string, unknown>) {
  const changes: Changes = {};
  for (const [k, v] of Object.entries(items)) {
    changes[k] = { oldValue: disk[k], newValue: v };
    disk[k] = v;
  }
  queueMicrotask(() => {
    for (const fn of changeFns) fn(changes, 'local');
  });
}

function fakePort() {
  const fns: ((m: unknown) => void)[] = [];
  return {
    name: 'ucs-http',
    postMessage(req: WireRequest) {
      sent.push(req);
      const res = respond(req);
      if (res)
        queueMicrotask(() => {
          for (const f of fns) f(res);
        });
    },
    disconnect: () => void disconnected++,
    onMessage: { addListener: (f: (m: unknown) => void) => fns.push(f) },
    onDisconnect: { addListener() {} },
  };
}

const tick = () => new Promise((r) => setTimeout(r, 5));
const gm = <T>(name: string) => g[name] as T;

describe('extension GM shim', () => {
  beforeAll(async () => {
    g.browser = {
      storage: {
        local: { get: async () => ({ ...disk }), set: async (items: Record<string, unknown>) => writeDisk(items) },
        onChanged: { addListener: (f: (c: Changes, a: string) => void) => changeFns.push(f) },
      },
      runtime: {
        connect: fakePort,
        onMessage: { addListener: (f: typeof onMenu) => (onMenu = f) },
        onConnect: { addListener() {} },
      },
    };
    await import('../src/ext/gm-shim.ts');
    await (g.__ucsReady as Promise<void>);
  });
  afterAll(() => {
    for (const k of GM_NAMES) g[k] = saved[k];
    delete g.browser;
    delete g.__ucsReady;
  });

  test('storage is loaded before the solver starts and read synchronously', () => {
    expect(gm<(k: string, d: unknown) => unknown>('GM_getValue')('ucs:v2:settings', null)).toEqual({
      provider: 'groq',
    });
    expect(gm<(k: string, d: unknown) => unknown>('GM_getValue')('missing', 7)).toBe(7);
  });

  test('writes are visible at once, persisted, and do not echo back as remote changes', async () => {
    const heard: unknown[] = [];
    gm<(k: string, fn: (...a: unknown[]) => void) => void>('GM_addValueChangeListener')('ucs:v2:sites', (...a) =>
      heard.push(a),
    );
    gm<(k: string, v: unknown) => void>('GM_setValue')('ucs:v2:sites', { a: 1 });
    expect(gm<(k: string, d: unknown) => unknown>('GM_getValue')('ucs:v2:sites', null)).toEqual({ a: 1 });
    await tick();
    expect(disk['ucs:v2:sites']).toEqual({ a: 1 });
    expect(heard).toEqual([]);

    writeDisk({ 'ucs:v2:sites': { b: 2 } }); // another tab or frame
    await tick();
    expect(heard).toEqual([['ucs:v2:sites', { a: 1 }, { b: 2 }, true]]);
    expect(gm<(k: string, d: unknown) => unknown>('GM_getValue')('ucs:v2:sites', null)).toEqual({ b: 2 });
  });

  test('requests go through the background, multipart files included', async () => {
    const form = new FormData();
    form.append('model', 'whisper');
    form.append('file', new File(['abc'], 'clip.mp3', { type: 'audio/mpeg' }));
    const res = await new Promise<{ status: number; responseText: string }>((onload, onerror) =>
      gm<(d: unknown) => void>('GM_xmlhttpRequest')({
        method: 'POST',
        url: 'https://x/v1',
        data: form,
        onload,
        onerror,
      }),
    );
    expect(res).toMatchObject({ status: 200, responseText: 'hi' });
    const body = sent.at(-1)?.body;
    expect(body?.kind).toBe('form');
    const parts = body?.kind === 'form' ? body.parts : [];
    expect(parts[0]).toEqual({ name: 'model', text: 'whisper' });
    expect(parts[1]?.file).toEqual({ b64: btoa('abc'), type: 'audio/mpeg', name: 'clip.mp3' });
  });

  test('blob responses come back as Blobs; timeouts map to ontimeout', async () => {
    respond = () => ({ ok: true, status: 200, text: '', headers: '', blob: { b64: btoa('PNG'), type: 'image/png' } });
    const r = await new Promise<{ response?: Blob }>((onload) =>
      gm<(d: unknown) => void>('GM_xmlhttpRequest')({ url: 'https://x/img', responseType: 'blob', onload }),
    );
    expect(await r.response?.text()).toBe('PNG');

    respond = () => ({ ok: false, error: 'timeout', message: 'aborted' });
    await new Promise((ontimeout) => gm<(d: unknown) => void>('GM_xmlhttpRequest')({ url: 'https://x', ontimeout }));
  });

  test('abort disconnects the port and reports onabort', async () => {
    respond = () => null; // never answers
    let aborted = false;
    const before = disconnected;
    const h = gm<(d: unknown) => { abort(): void }>('GM_xmlhttpRequest')({
      url: 'https://x',
      onabort: () => (aborted = true),
    });
    await tick();
    h.abort();
    expect(aborted).toBe(true);
    expect(disconnected).toBe(before + 1);
  });

  test('toolbar popup commands run the registered menu entry', () => {
    let ran = 0;
    gm<(n: string, fn: () => void, k: string) => void>('GM_registerMenuCommand')('Solve', () => ran++, 'r');
    const replies: unknown[] = [];
    onMenu({ type: 'ucs-menu', cmd: 'r' }, {}, (r) => replies.push(r));
    onMenu({ type: 'ucs-menu', cmd: 'zz' }, {}, (r) => replies.push(r));
    expect(ran).toBe(1);
    expect(replies).toEqual([{ ok: true }, { ok: false }]);
  });
});

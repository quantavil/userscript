import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';

/**
 * Loads the *built* userscript (not the sources) into a DOM with mocked GM_* APIs,
 * so bundling problems (CSS import, tree-shaking, IIFE wrapping) fail here, not in a user's browser.
 * Run `bun run build` first; skipped when dist/ is absent.
 */
const DIST = 'dist/universal-solver.user.js';
const g = globalThis as Record<string, unknown>;

type Req = {
  method: string;
  url: string;
  headers?: Record<string, string>;
  data?: string;
  onload: (r: unknown) => void;
};
const requests: Req[] = [];
let reply: () => { status: number; body: string } = () => ({ status: 200, body: '{}' });
const storage = new Map<string, unknown>();

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const shadow = () => document.querySelector('ucs-root')?.shadowRoot ?? null;
const input = () => document.querySelector<HTMLInputElement>('#answer');

function boot() {
  g.GM_getValue = (k: string, d: unknown) => (storage.has(k) ? storage.get(k) : d);
  g.GM_setValue = (k: string, v: unknown) => void storage.set(k, structuredClone(v));
  g.GM_listValues = () => [...storage.keys()];
  g.GM_registerMenuCommand = () => 0;
  g.GM_addValueChangeListener = () => 0;
  g.GM_xmlhttpRequest = (req: Req) => {
    requests.push(req);
    const r = reply();
    queueMicrotask(() => req.onload({ status: r.status, responseText: r.body, responseHeaders: '' }));
    return { abort() {} };
  };
  // happy-dom has no 2D canvas; a tiny stub is enough to exercise the capture path.
  HTMLCanvasElement.prototype.getContext = (() => ({ fillStyle: '', fillRect() {}, drawImage() {} })) as never;
  HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,AAAA';
  const img = document.querySelector('img');
  if (img) {
    Object.defineProperty(img, 'complete', { value: true });
    Object.defineProperty(img, 'naturalWidth', { value: 120 });
    Object.defineProperty(img, 'naturalHeight', { value: 40 });
  }
  // Runs the IIFE bundle exactly as a userscript manager would: as a plain script in global scope.
  new Function(readFileSync(DIST, 'utf8'))();
}

describe.skipIf(!existsSync(DIST))('built userscript (e2e)', () => {
  beforeAll(() => {
    document.body.innerHTML =
      '<img id="cap" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><input id="answer"><button id="go">Go</button>';
    storage.set('ucs:v2:settings', { provider: 'gemini', keys: { gemini: 'KEY-G', groq: 'KEY-Q' }, autoSolve: false });
    storage.set('ucs:v2:sites', { 'example.com': { captcha: '#cap', input: '#answer', submit: '#go' } });
    document.querySelector('#go')?.addEventListener('click', () => document.body.setAttribute('data-submitted', '1'));
    boot();
  });
  afterAll(() => {
    document.body.innerHTML = '';
  });

  test('mounts a shadow-root widget only because a rule matches', async () => {
    await tick(200);
    const root = shadow();
    expect(root).not.toBeNull();
    expect(root?.querySelector('.widget')).not.toBeNull();
  });

  test('runs inside iframes: image-grid challenges live in one', () => {
    const header = readFileSync(DIST, 'utf8').split('// ==/UserScript==')[0] ?? '';
    expect(header).not.toContain('@noframes');
    expect(header).toContain('@match        *://*/*');
  });

  test('page CSS cannot reach the UI: styles live inside the shadow root', () => {
    expect(document.head.querySelector('style')).toBeNull();
  });

  test('Solve (Gemini): key in header not URL, answer filled, submit clicked', async () => {
    reply = () => ({
      status: 200,
      body: JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ab-12' }] } }] }),
    });
    shadow()?.querySelector<HTMLButtonElement>('.btn.primary')?.click();
    await tick(250);
    const req = requests.at(-1);
    expect(req?.url).toContain('generativelanguage.googleapis.com');
    expect(req?.url).not.toContain('KEY-G');
    expect(req?.headers?.['x-goog-api-key']).toBe('KEY-G');
    expect(input()?.value).toBe('ab12');
    expect(document.body.getAttribute('data-submitted')).toBe('1');
    expect(shadow()?.querySelector('.status.answer')?.textContent).toContain('ab12');
  });

  test('switching to Groq sends an OpenAI-style vision request to api.groq.com', async () => {
    storage.set('ucs:v2:settings', {
      provider: 'groq',
      keys: { gemini: 'KEY-G', groq: 'KEY-Q' },
      models: {},
      autoSolve: false,
    });
    reply = () => ({ status: 200, body: JSON.stringify({ choices: [{ message: { content: 'QX7Z' } }] }) });
    // The bundle reads settings at boot; remount it against the switched provider.
    document.querySelector('ucs-root')?.remove();
    input()?.setAttribute('value', '');
    boot();
    await tick(200);
    shadow()?.querySelector<HTMLButtonElement>('.btn.primary')?.click();
    await tick(250);
    const req = requests.at(-1);
    expect(req?.url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(req?.headers?.authorization).toBe('Bearer KEY-Q');
    const body = JSON.parse(req?.data ?? '{}');
    expect(body.model).toBe('qwen/qwen3.8-27b');
    expect(body.messages[0].content[1].image_url.url).toStartWith('data:image/');
    expect(input()?.value).toBe('QX7Z');
  });

  test('a 401 surfaces an actionable message in the widget', async () => {
    reply = () => ({ status: 401, body: JSON.stringify({ error: { message: 'Invalid API Key' } }) });
    shadow()?.querySelector<HTMLButtonElement>('.btn.primary')?.click();
    await tick(250);
    expect(shadow()?.querySelector('.status')?.textContent).toMatch(/API key rejected/);
  });
});

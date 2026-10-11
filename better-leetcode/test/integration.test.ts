/**
 * Boots the real entry point against a LeetCode-shaped DOM. GM_* and the network are stubbed, so this
 * proves the wiring (injection, copy flow, submit hook, modal), not that LeetCode's live markup still matches.
 */
import { beforeAll, describe, expect, mock, test } from 'bun:test';
import { TWO_SUM } from './fixtures';

const gm = new Map<string, unknown>();
let clipboard = '';
const graphql: { calls: string[] } = { calls: [] };

mock.module('$', () => ({
  GM_getValue: (k: string, d: unknown) => (gm.has(k) ? gm.get(k) : d),
  GM_setValue: (k: string, v: unknown) => void gm.set(k, v),
  GM_deleteValue: (k: string) => void gm.delete(k),
  GM_setClipboard: (t: string) => {
    clipboard = t;
  },
  GM_registerMenuCommand: () => {},
  unsafeWindow: window,
}));

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

const question = {
  questionId: '1',
  questionFrontendId: '1',
  title: 'Two Sum',
  titleSlug: 'two-sum',
  content: TWO_SUM,
  difficulty: 'Easy',
  hints: ['Try a hash map.'],
  isPaidOnly: false,
  topicTags: [{ name: 'Array' }],
  codeSnippets: [{ lang: 'Python3', langSlug: 'python3', code: 'class Solution:\n    pass' }],
};

const fakeFetch = async (input: RequestInfo | URL): Promise<Response> => {
  const url = String(input instanceof Request ? input.url : input);
  graphql.calls.push(url);
  if (url.includes('/graphql/')) return json({ data: { question } });
  if (url.includes('/check/')) {
    return json({
      state: 'SUCCESS',
      status_msg: 'Wrong Answer',
      last_testcase: '[3,3]\n6',
      expected_output: '[0,1]',
      code_output: '[]',
      total_correct: 1,
      total_testcases: 2,
    });
  }
  return new Response('', { status: 404 });
};

const tick = (ms = 10) => new Promise((r) => setTimeout(r, ms));
async function until(cond: () => boolean, ms = 1500) {
  const end = Date.now() + ms;
  while (!cond() && Date.now() < end) await tick();
  expect(cond()).toBe(true);
}

const shadow = () => document.getElementById('better-leetcode-host')?.shadowRoot ?? null;

beforeAll(async () => {
  document.body.innerHTML = `
    <div class="text-title-large"><a href="/problems/two-sum/">1. Two Sum</a></div>
    <div class="flexlayout__tab">
      <div data-track-load="description_content"></div>
      <div class="footer"><button class="help-btn"><svg class="fa-circle-question"></svg></button></div>
    </div>
    <div id="editor"><button aria-haspopup="dialog">Python3</button></div>`;
  Object.assign(window, { fetch: fakeFetch, monaco: undefined });
  Object.assign(globalThis, { fetch: fakeFetch });
  await import('../src/main');
});

describe('integration', () => {
  test('injects the copy button after the title link and a gear next to the help button', async () => {
    await until(() => !!document.querySelector('[class~="bl-copy"]'));
    expect(document.querySelector('.text-title-large a + .bl-copy')).not.toBeNull();
    const gear = document.querySelector('.help-btn + button');
    expect(gear?.getAttribute('aria-label')).toBe('Better LeetCode settings');
    expect(gear?.className).toBe('help-btn'); // inherits LeetCode's own button styling
  });

  test('does not duplicate buttons on repeated DOM mutations', async () => {
    for (let i = 0; i < 5; i++) document.body.append(document.createElement('i'));
    await tick(50);
    expect(document.querySelectorAll('.bl-copy').length).toBe(1);
    expect(document.querySelectorAll('.help-btn + button').length).toBe(1);
  });

  test('re-injects after the title is re-rendered', async () => {
    const title = document.querySelector('.text-title-large');
    if (!title) throw new Error('missing title');
    title.innerHTML = '<a href="/problems/two-sum/">1. Two Sum</a>';
    await until(() => !!document.querySelector('.text-title-large a + .bl-copy'));
    expect(document.querySelectorAll('.bl-copy').length).toBe(1);
  });

  test('copy puts Markdown on the clipboard and shows a toast', async () => {
    (window as unknown as { monaco: unknown }).monaco = {
      editor: {
        getEditors: () => [
          {
            getContainerDomNode: () => document.getElementById('editor'),
            getModel: () => ({ getValue: () => 'print("hi")', getLanguageId: () => 'python' }),
          },
        ],
      },
    };
    document.querySelector<HTMLButtonElement>('.bl-copy')?.click();
    await until(() => clipboard !== '');
    expect(clipboard).toContain('# 1. Two Sum');
    expect(clipboard).toContain('## Constraints');
    expect(clipboard).toContain('## My Current Code (Python3)');
    expect(clipboard).toContain('```python\nprint("hi")\n```');
    expect(clipboard).not.toContain('Last Failed Submission');
    await until(() => !!shadow()?.querySelector('.toast.ok'));
    expect(shadow()?.querySelector('.toast')?.textContent).toMatch(/Copied \(~\d+ tokens\)/);
  });

  test('a failing Submit is captured by the hook and included next time', async () => {
    await window.fetch('/submissions/detail/987654321/check/');
    await until(() => [...gm.keys()].includes('bl_fail_two-sum'));
    clipboard = '';
    document.querySelector<HTMLButtonElement>('.bl-copy')?.click();
    await until(() => clipboard !== '');
    expect(clipboard).toContain('## Last Failed Submission (Wrong Answer, 1 / 2 passed, just now)');
    expect(clipboard).toContain('**Expected**');
  });

  test('an Accepted result clears the stored failure', async () => {
    const accepted = async () => json({ state: 'SUCCESS', status_msg: 'Accepted' });
    Object.assign(window, { fetch: accepted });
    // re-install the hook on top of the new fetch
    (window as unknown as { __blCapture?: boolean }).__blCapture = false;
    const { installCapture } = await import('../src/capture');
    installCapture();
    await window.fetch('/submissions/detail/987654322/check/');
    await until(() => !gm.has('bl_fail_two-sum'));
  });

  test('settings modal opens as a labelled dialog and saves toggles (debounced)', async () => {
    document.querySelector<HTMLButtonElement>('.help-btn + button')?.click();
    await until(() => !!shadow()?.querySelector('dialog.modal'));
    const dlg = shadow()?.querySelector('dialog.modal');
    expect(dlg?.getAttribute('aria-labelledby')).toBe('bl-title');
    expect(shadow()?.querySelectorAll('input.switch').length).toBe(10);

    const hints = shadow()?.querySelectorAll<HTMLInputElement>('input.switch')[4];
    if (!hints) throw new Error('hints switch missing');
    hints.checked = false;
    hints.dispatchEvent(new Event('change', { bubbles: true }));
    await until(() => (gm.get('bl_settings') as { hints?: boolean } | undefined)?.hints === false, 1500);
  });
});

describe('integration: closing', () => {
  test('Done unmounts the dialog and flushes pending settings immediately', async () => {
    // The previous test left the dialog open.
    const prompt = shadow()?.querySelector<HTMLTextAreaElement>('textarea');
    if (!prompt) throw new Error('dialog not open');
    prompt.value = 'Explain {{title}}';
    prompt.dispatchEvent(new Event('input', { bubbles: true }));
    const done = [...(shadow()?.querySelectorAll<HTMLButtonElement>('.foot .btn') ?? [])].find(
      (b) => b.textContent === 'Done',
    );
    done?.click();
    await until(() => !shadow()?.querySelector('dialog'));
    // well inside the 300 ms debounce window: only a flush-on-close could have written this
    expect((gm.get('bl_settings') as { prompt?: string }).prompt).toBe('Explain {{title}}');
  });
});

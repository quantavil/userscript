import { tables } from '@joplin/turndown-plugin-gfm';
import TurndownService from 'turndown';
import type { CodeSnippet, CommentItem, FailRecord, QuestionData, Settings } from './types';

/* ---------- small helpers ---------- */

export function fence(code: string, lang = ''): string {
  const runs = code.match(/`+/g) ?? [];
  const len = Math.max(3, ...runs.map((r) => r.length + 1));
  const f = '`'.repeat(len);
  return `${f}${lang}\n${code.trimEnd()}\n${f}`;
}

const clean = (s: string | null | undefined): string => (s ?? '').replace(/\u00a0/g, ' ').trim();

const script = (mark: '^' | '_', s: string): string => (/^\w+$/.test(s) ? `${mark}${s}` : `${mark}(${s})`);

export function timeAgo(then: number, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - then) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`;
}

/** Rough size hint for the toast. ~4 chars per token is close enough for English + code. */
export function formatTokens(text: string): string {
  const n = Math.ceil(text.length / 4);
  return n < 1000 ? `~${n} tokens` : `~${(n / 1000).toFixed(1)}k tokens`;
}

/* ---------- HTML -> Markdown ---------- */

/** Text of a <pre>, keeping <sup>/<sub> (10<sup>9</sup> -> 10^9) and <br> that textContent would lose. */
function preText(pre: Node): string {
  const copy = pre.cloneNode(true) as Element;
  for (const br of copy.querySelectorAll('br')) br.replaceWith('\n');
  for (const el of copy.querySelectorAll('sup')) el.replaceWith(script('^', clean(el.textContent)));
  for (const el of copy.querySelectorAll('sub')) el.replaceWith(script('_', clean(el.textContent)));
  return (copy.textContent ?? '').replace(/\u00a0/g, ' ');
}

function createTurndown(): TurndownService {
  const t = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
  });
  // The output is read by an LLM, not rendered: backslash-escaping `[`, `_`, `*` only adds noise
  // (e.g. nums = \[2,7\]) and costs tokens.
  t.escape = (s) => s;
  t.use(tables);

  t.addRule('sup', { filter: 'sup', replacement: (c) => script('^', c) });
  t.addRule('sub', { filter: 'sub', replacement: (c) => script('_', c) });

  // LeetCode examples are <pre><strong>Input:</strong> ...</pre> without <code>.
  t.addRule('pre', {
    filter: 'pre',
    replacement: (_c, node) => `\n\n${fence(preText(node).replace(/^\n+/, ''))}\n\n`,
  });

  // Default turndown emits "-   item" / "1.  item"; use the normal single-space form.
  t.addRule('listItem', {
    filter: 'li',
    replacement(content, node) {
      const parent = node.parentNode as HTMLElement;
      let prefix = '- ';
      if (parent.nodeName === 'OL') {
        const startAttr = parent.getAttribute('start');
        const start = startAttr === null ? 1 : Number(startAttr);
        prefix = `${start + Array.prototype.indexOf.call(parent.children, node)}. `;
      }
      const body = content
        .replace(/^\n+/, '')
        .replace(/\n+$/, '')
        .replace(/\n/g, `\n${' '.repeat(prefix.length)}`);
      return prefix + body + (node.nextSibling ? '\n' : '');
    },
  });
  return t;
}

let td: TurndownService | undefined;

const BLANK_WRAPPERS = 'font,span,strong,em,b,i,u';

/**
 * Turndown drops whitespace-only inline wrappers (`<code>x</code><font>&nbsp;</font>time` -> "`x`time"),
 * swallowing the only space between two words. Replace them with a literal space first.
 */
function prepare(input: string | HTMLElement): HTMLElement {
  const root = typeof input === 'string' ? new DOMParser().parseFromString(input, 'text/html').body : input;
  for (const el of root.querySelectorAll(BLANK_WRAPPERS)) {
    if (!el.textContent?.trim() && !el.querySelector('img,br')) el.replaceWith(' ');
  }
  const walker = root.ownerDocument.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeValue?.includes('\u00a0')) n.nodeValue = n.nodeValue.replace(/\u00a0/g, ' ');
  }
  return root;
}

export function htmlToMarkdown(input: string | HTMLElement): string {
  td ??= createTurndown();
  return td.turndown(prepare(input)).trim();
}

const EXAMPLE_RE = /^examples?\s*\d*\s*:?$/i;
const CONSTRAINTS_RE = /^constraints?\s*:?$/i;
const MEDIA = 'img,table,hr,svg';
const SPACER = new Set(['P', 'DIV', 'BR']);

const isHeading = (el: Element, re: RegExp): boolean =>
  el.tagName === 'P' &&
  el.children.length === 1 &&
  (el.firstElementChild?.tagName === 'STRONG' || el.firstElementChild?.tagName === 'B') &&
  re.test(clean(el.textContent));

/** Split problem HTML into statement / examples / constraints. Works on DOM nodes, never on re-serialised HTML. */
export function splitContent(html: string): { statement: string; examples: string; constraints: string } {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const buckets = {
    statement: doc.createElement('div'),
    examples: doc.createElement('div'),
    constraints: doc.createElement('div'),
  };
  let cur: keyof typeof buckets = 'statement';

  for (const node of Array.from(doc.body.childNodes)) {
    if (node.nodeType === 1) {
      const el = node as Element;
      // &nbsp; spacer blocks are noise, but an image-only paragraph is content, and a blank inline
      // wrapper may be the only space between two words.
      if (SPACER.has(el.tagName) && !clean(el.textContent) && !el.matches(MEDIA) && !el.querySelector(MEDIA)) continue;
      if (isHeading(el, EXAMPLE_RE) && cur !== 'constraints') cur = 'examples';
      else if (isHeading(el, CONSTRAINTS_RE)) cur = 'constraints';
    } else if (node.nodeType !== 3) {
      continue; // comments etc.
    }
    buckets[cur].append(node);
  }

  return {
    statement: htmlToMarkdown(buckets.statement),
    examples: htmlToMarkdown(buckets.examples),
    constraints: htmlToMarkdown(buckets.constraints),
  };
}

/* ---------- code snippets ---------- */

/** LeetCode langSlug -> Markdown fence language (only where they differ). */
const FENCE_LANG: Record<string, string> = {
  python3: 'python',
  pythondata: 'python',
  golang: 'go',
  mysql: 'sql',
  mssql: 'sql',
  oraclesql: 'sql',
  postgresql: 'sql',
  racket: 'scheme',
};
export const fenceLang = (slug: string): string => FENCE_LANG[slug] ?? slug;

/** Monaco language id -> LeetCode langSlug (only where they differ). */
const MONACO_TO_SLUG: Record<string, string> = { python: 'python3', go: 'golang', shell: 'bash' };

export function pickSnippet(q: QuestionData, label: string | null, monacoLang: string | null): CodeSnippet | null {
  const snippets = q.codeSnippets;
  if (!snippets.length) return null;
  const l = label?.toLowerCase();
  const slug = monacoLang ? (MONACO_TO_SLUG[monacoLang] ?? monacoLang) : null;
  return (
    (l && snippets.find((s) => s.lang.toLowerCase() === l || s.langSlug.toLowerCase() === l)) ||
    (slug && snippets.find((s) => s.langSlug === slug)) ||
    snippets[0] ||
    null
  );
}

/* ---------- final document ---------- */

export interface Extras {
  comments: CommentItem[];
  editor: { code: string; label: string; langSlug: string; partial: boolean } | null;
  template: CodeSnippet | null;
  fail: FailRecord | null;
  now?: number;
}

const PROMPT_VARS = /\{\{\s*(title|id|difficulty|language)\s*\}\}/gi;

function applyVars(prompt: string, q: QuestionData, language: string): string {
  const vars: Record<string, string> = { title: q.title, id: q.frontendId, difficulty: q.difficulty, language };
  return prompt.replace(PROMPT_VARS, (_m, name: string) => vars[name.toLowerCase()] ?? '');
}

const norm = (code: string): string => code.replace(/\r\n/g, '\n').trim();

function failureSection(f: FailRecord, now: number): string {
  const head = [f.status, f.passed && `${f.passed} passed`, timeAgo(f.time, now)].filter(Boolean).join(', ');
  const parts = [`## Last Failed Submission (${head})`];
  if (f.input) parts.push(`**Input**\n\n${fence(f.input)}`);
  if (f.expected) parts.push(`**Expected**\n\n${fence(f.expected)}`);
  if (f.output) parts.push(`**Actual**\n\n${fence(f.output)}`);
  if (f.stdout) parts.push(`**Stdout**\n\n${fence(f.stdout)}`);
  if (f.error) parts.push(`**Error**\n\n${fence(f.error)}`);
  return parts.join('\n\n');
}

export function buildMarkdown(q: QuestionData, s: Settings, x: Extras): string {
  const out: string[] = [];
  const language = x.editor?.label || x.template?.lang || '';

  if (s.prompt.trim()) out.push(applyVars(s.prompt.trim(), q, language));

  if (s.title) {
    const meta = [`**Difficulty:** ${q.difficulty}`, `**Link:** https://leetcode.com/problems/${q.titleSlug}/`];
    if (s.tags && q.topicTags.length) meta.push(`**Topics:** ${q.topicTags.map((t) => t.name).join(', ')}`);
    out.push(`# ${q.frontendId}. ${q.title}\n\n${meta.join('  \n')}`);
  }

  if (s.statement || s.examples || s.constraints) {
    const parts = splitContent(q.content ?? '');
    if (s.statement && parts.statement) out.push(`## Problem\n\n${parts.statement}`);
    if (s.examples && parts.examples) out.push(`## Examples\n\n${parts.examples}`);
    if (s.constraints && parts.constraints) {
      out.push(`## Constraints\n\n${parts.constraints.replace(/^\*\*Constraints?:?\*\*\s*/i, '')}`);
    }
  }

  if (s.hints && q.hints.length) {
    const items = q.hints.map((h, i) => {
      const n = `${i + 1}. `;
      return n + htmlToMarkdown(h).replace(/\n/g, `\n${' '.repeat(n.length)}`);
    });
    out.push(`## Hints\n\n${items.join('\n')}`);
  }

  // If the editor still holds the untouched template, say so once instead of pasting it twice.
  const untouched = !!(x.template && x.editor && norm(x.template.code) === norm(x.editor.code));

  if (s.codeTemplate && x.template) {
    const note =
      untouched && s.currentCode ? '\n\n_My editor still contains only this template (nothing written yet)._' : '';
    out.push(
      `## Code Template (${x.template.lang})\n\n${fence(x.template.code, fenceLang(x.template.langSlug))}${note}`,
    );
  }

  if (s.currentCode && x.editor?.code.trim() && !(untouched && s.codeTemplate)) {
    const note = x.editor.partial
      ? '_Partial: only the lines currently rendered in the editor could be read._\n\n'
      : '';
    out.push(`## My Current Code (${x.editor.label})\n\n${note}${fence(x.editor.code, fenceLang(x.editor.langSlug))}`);
  }

  if (s.failingTest && x.fail) out.push(failureSection(x.fail, x.now ?? Date.now()));

  if (s.comments && x.comments.length) {
    const body = x.comments
      .map((c, i) => {
        const text = c.content.length > 2000 ? `${c.content.slice(0, 2000)}...` : c.content;
        return `### ${i + 1}. @${c.author} (${c.votes} votes)\n\n${text}`;
      })
      .join('\n\n');
    out.push(`## Top Comments\n\n${body}`);
  }

  return `${out.join('\n\n')}\n`;
}

/**
 * Copies a text post's rendered markdown into a fresh, allow-listed tree.
 * Only formatting survives: no attributes except checked link hrefs, no
 * scripts, styles, event handlers, or images (images would load late and
 * shift layout inside the snap track).
 */

import { isSafeUrl } from '../utils';

const KEEP = new Set([
  'P',
  'BR',
  'STRONG',
  'B',
  'EM',
  'I',
  'DEL',
  'S',
  'SUP',
  'SUB',
  'CODE',
  'PRE',
  'BLOCKQUOTE',
  'UL',
  'OL',
  'LI',
  'HR',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
]);
const HEADINGS: Record<string, string> = {
  H1: 'H3',
  H2: 'H3',
  H3: 'H4',
  H4: 'H4',
  H5: 'H5',
  H6: 'H5',
};
const MAX_NODES = 4000;

function copy(src: Node, out: Node, budget: { n: number }): void {
  for (const child of Array.from(src.childNodes)) {
    if (--budget.n < 0) return;
    if (child.nodeType === Node.TEXT_NODE) {
      out.appendChild(document.createTextNode(child.textContent || ''));
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const el = child as HTMLElement;
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEMPLATE' || tag === 'SVG' || tag === 'svg') continue;

    if (tag === 'A') {
      const raw = el.getAttribute('href') || '';
      let href = '';
      try {
        href = new URL(raw, 'https://www.reddit.com').href;
      } catch {}
      if (href && isSafeUrl(href)) {
        const a = document.createElement('a');
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        copy(el, a, budget);
        out.appendChild(a);
      } else {
        copy(el, out, budget);
      }
      continue;
    }
    if (tag === 'IMG') {
      const src = el.getAttribute('src') || '';
      if (src && isSafeUrl(src)) {
        const a = document.createElement('a');
        a.href = src;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = '[image]';
        out.appendChild(a);
      }
      continue;
    }
    // Reddit spoilers: tap to reveal.
    if (el.classList.contains('md-spoiler-text') || tag === 'SPOILER-TEXT') {
      const s = document.createElement('span');
      s.className = 'spoiler';
      copy(el, s, budget);
      out.appendChild(s);
      continue;
    }
    if (KEEP.has(tag)) {
      const node = document.createElement(HEADINGS[tag] || tag);
      copy(el, node, budget);
      out.appendChild(node);
      continue;
    }
    // Wrappers (div, span, custom elements): keep the content, drop the element.
    copy(el, out, budget);
  }
}

export function sanitizeMarkdownHtml(root: Element): string {
  const box = document.createElement('div');
  copy(root, box, { n: MAX_NODES });
  return box.innerHTML.trim();
}

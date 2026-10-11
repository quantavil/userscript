import { LEGACY_ROW, NAV_EVENTS, PARAM, RESULTS_LIST, SEARCH_PATH } from './config';
import { buildHideMatcher } from './query';

/** Prefer the React list's own children; the legacy selectors match unrelated
 *  `.Box-row` elements elsewhere on the page. */
const resultRows = (): HTMLElement[] => {
  const list = document.querySelector(RESULTS_LIST);
  return list
    ? (Array.from(list.children) as HTMLElement[])
    : Array.from(document.querySelectorAll<HTMLElement>(LEGACY_ROW));
};

/**
 * Row text with element boundaries preserved.
 *
 * `textContent` concatenates adjacent nodes with nothing between them, so a row of
 * `<a>acme/repo</a><p>wontfix…</p>` reads as "repowontfix" and a whole-word match on
 * "wontfix" fails. Walking text nodes and joining with a space costs no layout, unlike
 * `innerText`, which would reflow on every pass.
 */
function rowText(row: Element): string {
  const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
  let text = '';
  while (walker.nextNode()) text += `${walker.currentNode.nodeValue} `;
  return text;
}

/**
 * Hide result rows mentioning any of the words carried in the URL.
 *
 * Deliberately stateless and re-run from scratch on every pass. GitHub hydrates the
 * results list with React, which rewrites `className` from its own state and would
 * strip the class off again; recomputing is both simpler than tracking rows and
 * immune to that. It cannot loop either — the MutationObserver below watches
 * `childList` only, and re-adding a class that is already present changes nothing.
 */
export function scanResults() {
  if (location.pathname !== SEARCH_PATH) return;

  const matcher = buildHideMatcher(new URLSearchParams(location.search).get(PARAM.hide) ?? '');
  if (!matcher) return;

  for (const row of resultRows()) {
    if (matcher.test(rowText(row))) row.classList.add('ghf-hidden');
  }
}

export function watchResults() {
  scanResults();

  let debounce: ReturnType<typeof setTimeout>;
  // ponytail: one body-wide observer with a cheap path guard. Scope it to the
  // results container if GitHub ever settles on a stable one.
  new MutationObserver(() => {
    if (location.pathname !== SEARCH_PATH) return;
    clearTimeout(debounce);
    debounce = setTimeout(scanResults, 150);
  }).observe(document.body, { childList: true, subtree: true });

  for (const event of NAV_EVENTS) document.addEventListener(event, () => scanResults());
}

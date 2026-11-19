import { LEGACY_ROW, NAV_EVENTS, PARAM, RESULTS_LIST, SEARCH_PATH } from './config';
import { buildHideMatcher } from './query';

/** Prefer React results list; fall back to legacy selectors if missing. */
const resultRows = (): HTMLElement[] => {
  const list = document.querySelector(RESULTS_LIST);
  return list
    ? (Array.from(list.children) as HTMLElement[])
    : Array.from(document.querySelectorAll<HTMLElement>(LEGACY_ROW));
};

/** Row text walking text nodes to avoid layout reflows while preserving boundaries. */
function rowText(row: Element): string {
  const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
  let text = '';
  while (walker.nextNode()) text += `${walker.currentNode.nodeValue} `;
  return text;
}

/**
 * Filter result rows matching client-side hide words.
 * Toggles the .ghf-hidden class so clearing the hide parameter unhides rows.
 */
export function scanResults() {
  if (location.pathname !== SEARCH_PATH) return;

  const hideParam = new URLSearchParams(location.search).get(PARAM.hide) ?? '';
  const matcher = buildHideMatcher(hideParam);

  for (const row of resultRows()) {
    const shouldHide = Boolean(matcher?.test(rowText(row)));
    row.classList.toggle('ghf-hidden', shouldHide);
  }
}

export function watchResults() {
  scanResults();

  if (!document.body) return;

  let debounce: ReturnType<typeof setTimeout>;
  new MutationObserver(() => {
    if (location.pathname !== SEARCH_PATH) return;
    clearTimeout(debounce);
    debounce = setTimeout(scanResults, 150);
  }).observe(document.body, { childList: true, subtree: true });

  for (const event of NAV_EVENTS) document.addEventListener(event, () => scanResults());
}

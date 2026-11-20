import { IDS, isSearchPath, LEGACY_ROW, NAV_EVENTS, PARAM, RESULTS_LIST } from './config';
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
  if (!isSearchPath(location.pathname)) return;

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
  let navTimers: ReturnType<typeof setTimeout>[] = [];
  /** Turbo renders before it writes the new URL, so scan again after it settles. */
  const rescanSoon = () => {
    for (const timer of navTimers) clearTimeout(timer);
    navTimers = [150, 700].map(ms => setTimeout(scanResults, ms));
  };
  // Observe the document element, not body: Turbo replaces body content on
  // navigation and a body-scoped observer would silently stop seeing results.
  new MutationObserver(mutations => {
    if (!isSearchPath(location.pathname)) return;
    // Typing in the panel or moving its launcher must not force a results rescan.
    const onlyPanel = mutations.every(mutation => {
      const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
      return Boolean(target?.closest(`#${IDS.panel}, #${IDS.fab}, #ghf-root`));
    });
    if (onlyPanel) return;
    clearTimeout(debounce);
    debounce = setTimeout(scanResults, 150);
  }).observe(document.documentElement, { childList: true, subtree: true });

  for (const event of NAV_EVENTS) document.addEventListener(event, rescanSoon);
  window.addEventListener('popstate', rescanSoon);
  window.addEventListener('pageshow', rescanSoon);
}

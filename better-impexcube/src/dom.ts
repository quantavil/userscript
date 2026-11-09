/** Run `scan` now and again whenever nodes matching `selector` enter or leave the page. */
export function watchDom(selector: string, scan: () => void): void {
  scan();
  new MutationObserver((mutations) => {
    const relevant = (node: Node) =>
      node instanceof Element &&
      (node.matches(selector) || node.querySelector(selector));
    if (
      mutations.some((m) => [...m.addedNodes, ...m.removedNodes].some(relevant))
    )
      scan();
  }).observe(document.body, { childList: true, subtree: true });
}

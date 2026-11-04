import { selectors } from '../selectors';

const own = '.bgm-copy-notice, .bgm-address-line, .bgm-reveal';

export function observeUpdates(
  updateRow: (row: HTMLElement) => void,
  updateConversation: (body: HTMLElement) => void = () => {},
): () => void {
  const rows = new Set<HTMLElement>();
  const bodies = new Set<HTMLElement>();
  let frame: number | undefined;
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      const target =
        mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
      if (!target || target.closest(own)) continue;
      if (mutation.type === 'childList') {
        const changed = [...mutation.addedNodes, ...mutation.removedNodes];
        if (changed.length && changed.every((node) => node instanceof Element && node.matches(own)))
          continue;
      }
      const row = target.closest<HTMLElement>(selectors.row);
      if (row) {
        // Gmail updates this selection announcement for every selected row.
        if (target.closest('.afn')) continue;
        rows.add(row);
        continue;
      }
      const body = target.closest<HTMLElement>(selectors.messageBody);
      if (body) bodies.add(body);
      if (mutation.type !== 'childList') continue;
      for (const node of [...mutation.addedNodes, ...mutation.removedNodes]) {
        if (!(node instanceof Element) || node.matches(own)) continue;
        if (node.matches(selectors.messageBody) && node.isConnected)
          bodies.add(node as HTMLElement);
        for (const addedBody of node.querySelectorAll<HTMLElement>(selectors.messageBody)) {
          if (addedBody.isConnected) bodies.add(addedBody);
        }
        if (node.matches(selectors.row) && node.isConnected) rows.add(node as HTMLElement);
        for (const addedRow of node.querySelectorAll<HTMLElement>(selectors.row)) {
          if (addedRow.isConnected) rows.add(addedRow);
        }
      }
    }
    if (frame !== undefined || (!rows.size && !bodies.size)) return;
    frame = requestAnimationFrame(() => {
      frame = undefined;
      for (const row of rows) if (row.isConnected) updateRow(row);
      rows.clear();
      for (const body of bodies) if (body.isConnected) updateConversation(body);
      bodies.clear();
    });
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['email'],
  });
  return () => {
    observer.disconnect();
    if (frame !== undefined) cancelAnimationFrame(frame);
  };
}

import { isBotOwnedMutation } from '../../board/ownership.js';

/** Observe Chess.com board rendering changes that can settle controller input. */
export function observeBoard(board: HTMLElement, listener: () => void): () => void {
  const Observer = board.ownerDocument?.defaultView?.MutationObserver;
  if (!Observer) return () => {};

  let active = true;
  let queued = false;
  const observer = new Observer((records) => {
    if (!active || !records.some((record) => !isBotOwnedMutation(record)) || queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (active) listener();
    });
  });
  observer.observe(board, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'data-piece'],
  });

  return () => {
    active = false;
    observer.disconnect();
  };
}

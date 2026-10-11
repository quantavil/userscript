/**
 * Better InvestorGain — Entry point
 */

import { injectStyles } from './styles';
import {
  initFeatures,
  attachTabListeners,
  isSorting,
} from './features';

const REORDER_DEBOUNCE_MS = 100;

// 1. Instant CSS blocking at document-start
injectStyles();

// 2. Centralized debounced reorder controller
let sortDebounce: ReturnType<typeof setTimeout> | null = null;
function debouncedReorder(): void {
  if (sortDebounce) clearTimeout(sortDebounce);
  sortDebounce = setTimeout(() => {
    initFeatures();
  }, REORDER_DEBOUNCE_MS);
}

const isDivider = (n: Node): boolean =>
  n instanceof HTMLElement &&
  (n.classList.contains('big-section-divider') || n.classList.contains('big-grid-divider'));

function observeDynamicContent(): void {
  const target = document.body ?? document.documentElement;
  if (!target) return;

  const observer = new MutationObserver((mutations) => {
    if (isSorting) return;

    for (const m of mutations) {
      if (m.type !== 'childList') continue;

      const hasExternalChanges =
        Array.from(m.addedNodes).some((n) => !isDivider(n)) ||
        Array.from(m.removedNodes).some((n) => !isDivider(n));

      if (hasExternalChanges) {
        debouncedReorder();
        break;
      }
    }
  });

  observer.observe(target, { childList: true, subtree: true });
}

function startFeatures(): void {
  initFeatures();
  attachTabListeners(debouncedReorder);
  observeDynamicContent();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startFeatures, { once: true });
} else {
  startFeatures();
}

import { GM_registerMenuCommand } from 'vite-plugin-monkey/dist/client';
import { injectCSS } from './dom';
import { applyFiltersToDOM, createScanner } from './filter';
import { loadFilters } from './storage';
import { STYLES } from './styles';
import { createUI } from './ui';

/**
 * Never run inside iframes or embedded players (e.g. youtube.com/embed/* on third-party pages).
 */
const isEmbedded = (): boolean => {
  try {
    if (window.top !== window.self) return true;
  } catch {
    return true; // cross-origin access to window.top throws: we are framed
  }
  return location.pathname.startsWith('/embed/');
};

/** Pages where the filter panel would sit on top of the player: watch and Shorts. */
const syncPageUI = (): void => {
  const p = location.pathname;
  const onPlayerPage = p === '/watch' || p.startsWith('/shorts/') || p.startsWith('/live/');
  document.documentElement.toggleAttribute('data-ytf-hide-ui', onPlayerPage);
};

const init = (): void => {
  if (isEmbedded()) return;
  syncPageUI();
  window.addEventListener('yt-navigate-finish', syncPageUI, true);
  window.addEventListener('popstate', syncPageUI, true);

  // Inject scoped styles (Trusted Types safe)
  injectCSS(STYLES);

  // Load persisted filters
  const filters = loadFilters();

  let ui: ReturnType<typeof createUI>;

  const apply = () => {
    if (ui) {
      ui.syncUI();
    }
    const stats = applyFiltersToDOM(filters);
    if (ui) {
      ui.updateStats(stats.visible, stats.total, stats.dimmed);
    }
  };

  // Mount UI and bind listeners
  ui = createUI(filters, apply);

  // Register Violentmonkey/Tampermonkey menu command
  if (typeof GM_registerMenuCommand === 'function') {
    try {
      GM_registerMenuCommand('Toggle Filter Panel', () => {
        ui.togglePanel();
      });
    } catch {
      /* ignore */
    }
  }

  // Start DOM mutation scanner & navigation listener
  const scanner = createScanner(apply);

  // Initial delayed pass to catch initial render
  setTimeout(() => {
    scanner.schedule();
  }, 400);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

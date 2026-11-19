import { NAV_EVENTS } from './config';
import { watchResults } from './scanner';
import { migrateLegacyStorage } from './storage';
import { injectStyles } from './styles';
import { openPanel, syncLauncher } from './ui';

const safe = (step: () => void) => {
  try {
    step();
  } catch {
    /* userscript steps must never disrupt native page execution */
  }
};

const init = () => {
  safe(migrateLegacyStorage);
  safe(injectStyles);
  safe(syncLauncher);
  safe(watchResults);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

const recheck = () => requestAnimationFrame(() => safe(syncLauncher));
for (const event of NAV_EVENTS) document.addEventListener(event, recheck);
window.addEventListener('popstate', recheck);
window.addEventListener('pageshow', recheck);

// Global keyboard shortcut: Alt+F (or Cmd+Shift+F / Ctrl+Shift+F)
window.addEventListener('keydown', event => {
  if (
    (event.altKey && event.code === 'KeyF') ||
    ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'KeyF')
  ) {
    event.preventDefault();
    openPanel();
  }
});

GM_registerMenuCommand('GitHub Filter', openPanel);

import { NAME, NAV_EVENTS } from './config';
import { syncLauncher } from './launcher';
import { watchResults } from './scanner';
import { migrateLegacyStorage } from './storage';
import { injectStyles } from './styles';
import { openPanel } from './ui';

const safe = (step: () => void) => {
  try {
    step();
  } catch {
    /* userscript steps must never disrupt native page execution */
  }
};

const refreshLauncher = () => safe(() => syncLauncher(openPanel));

const init = () => {
  safe(migrateLegacyStorage);
  safe(injectStyles);
  refreshLauncher();
  safe(watchResults);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

const recheck = () => requestAnimationFrame(refreshLauncher);
for (const event of NAV_EVENTS) document.addEventListener(event, recheck);
window.addEventListener('popstate', recheck);
window.addEventListener('pageshow', recheck);

if (typeof GM_registerMenuCommand === 'function') {
  GM_registerMenuCommand(NAME, openPanel);
}

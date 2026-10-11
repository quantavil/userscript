import { NAV_EVENTS } from './config';
import { watchResults } from './scanner';
import { migrateLegacyStorage } from './storage';
import { injectStyles } from './styles';
import { openPanel, syncLauncher } from './ui';

/** Each step is isolated so a failure (e.g. blocked storage) never takes down the rest. */
const safe = (step: () => void) => {
  try {
    step();
  } catch {
    /* userscript conveniences must not break the page */
  }
};

safe(migrateLegacyStorage);
safe(injectStyles);
safe(syncLauncher);
safe(watchResults);

// Turbo swaps the page without a document load, so the launcher has to re-check.
// The rAF defers past the body swap when an event fires before the new body lands.
const recheck = () => requestAnimationFrame(() => safe(syncLauncher));
for (const event of NAV_EVENTS) document.addEventListener(event, recheck);
// Back/forward cache restores and hash navigations don't always emit Turbo events.
window.addEventListener('popstate', recheck);
window.addEventListener('pageshow', recheck);
// In case the script ran before <body> existed.
if (!document.body) document.addEventListener('DOMContentLoaded', () => safe(syncLauncher), { once: true });

GM_registerMenuCommand('Advanced search', openPanel);

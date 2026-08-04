import { NAV_EVENTS } from './config';
import { watchResults } from './scanner';
import { migrateLegacyStorage } from './storage';
import { injectStyles } from './styles';
import { openPanel, syncLauncher } from './ui';

migrateLegacyStorage();
injectStyles();
syncLauncher();
watchResults();

// Turbo swaps the page without a document load, so the launcher has to re-check.
for (const event of NAV_EVENTS) document.addEventListener(event, syncLauncher);

GM_registerMenuCommand('Advanced search', openPanel);

import { effect } from '@preact/signals';
import { controller, store } from './app.ts';
import { migrateOpenRouter, migrateV1 } from './config/migrate.ts';
import { gmKV, KEYS } from './config/store.ts';
import { IN_FRAME } from './dom/frame.ts';
import { configureCurrentPage, configureGridPage } from './flows/setup.ts';
import { mountUI } from './ui/mount.tsx';
import { settingsTab, toast } from './ui/state.ts';

/** Manual solve, with a reason instead of silence when there is nothing to solve here. */
function solveNow(): void {
  const m = controller.match.value;
  if (!m) toast('No captcha rule for this site yet. Use “Configure this page” first', 'error');
  else if (!m.rule.enabled) toast('The solver is turned off for this site. Enable it in Settings → Sites', 'error');
  else void controller.solve('manual');
}

/** Boots the solver. Callers provide the GM_* APIs: a userscript manager, or the extension shim. */
export function main(): void {
  const migrated = migrateV1(gmKV);
  const movedToOpenRouter = migrateOpenRouter(gmKV);
  if (migrated.sites || migrated.apiKey || movedToOpenRouter) store.reload();

  const open = (fn: () => void) => () => {
    mountUI();
    fn();
  };
  // The script also runs in iframes (grid challenges live in one). Menu entries from every ad
  // frame would flood the manager's menu, so frames get keyboard shortcuts only.
  if (!IN_FRAME) {
    GM_registerMenuCommand(
      '⚙ Settings',
      open(() => (settingsTab.value = 'provider')),
      's',
    );
    GM_registerMenuCommand(
      '🎯 Configure captcha on this page',
      open(() => void configureCurrentPage()),
      'c',
    );
    GM_registerMenuCommand(
      '🧩 Configure image-grid captcha on this page',
      open(() => void configureGridPage()),
      'g',
    );
    GM_registerMenuCommand('▶ Solve now', open(solveNow), 'r');
  }

  // Keep every open tab in sync when settings or rules change elsewhere.
  for (const key of [KEYS.settings, KEYS.sites, KEYS.stats]) {
    GM_addValueChangeListener(key, (_name, _old, _new, remote) => remote && store.reload());
  }

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return;
    if (e.code === 'KeyS') open(solveNow)();
    else if (e.code === 'KeyC') open(() => void configureCurrentPage())();
    else if (e.code === 'KeyG') open(() => void configureGridPage())();
    else return;
    e.preventDefault();
  });

  // Zero UI cost on pages without a rule: mount only when one matches. In a frame, also wait for
  // the captcha itself, so a rule for e.g. google.com/recaptcha/* doesn't cover the checkbox frame.
  effect(() => {
    if (controller.match.value && (!IN_FRAME || controller.present.value)) mountUI();
  });
  controller.start();

  if (migrated.sites || migrated.apiKey) {
    mountUI();
    toast(`Upgraded from v1: imported ${migrated.sites} site rule(s). Pick a model in Settings.`);
  }
}

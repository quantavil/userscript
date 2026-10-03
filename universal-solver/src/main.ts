import { effect } from '@preact/signals';
import { controller, store } from './app.ts';
import { migrateV1 } from './config/migrate.ts';
import { gmKV, KEYS } from './config/store.ts';
import { configureCurrentPage } from './flows/setup.ts';
import { mountUI } from './ui/mount.tsx';
import { settingsTab, toast } from './ui/state.ts';

function main(): void {
  const migrated = migrateV1(gmKV);
  if (migrated.sites || migrated.apiKey) store.reload();

  const open = (fn: () => void) => () => {
    mountUI();
    fn();
  };
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
    '▶ Solve now',
    open(() => void controller.solve('manual')),
    'r',
  );

  // Keep every open tab in sync when settings or rules change elsewhere.
  for (const key of [KEYS.settings, KEYS.sites]) {
    GM_addValueChangeListener(key, (_name, _old, _new, remote) => remote && store.reload());
  }

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return;
    if (e.code === 'KeyS') open(() => void controller.solve('manual'))();
    else if (e.code === 'KeyC') open(() => void configureCurrentPage())();
    else return;
    e.preventDefault();
  });

  // Zero UI cost on pages without a rule: mount only when one matches.
  effect(() => {
    if (controller.match.value) mountUI();
  });
  controller.start();

  if (migrated.sites || migrated.apiKey) {
    mountUI();
    toast(`Upgraded from v1: imported ${migrated.sites} site rule(s). Pick a model in Settings.`);
  }
}

main();

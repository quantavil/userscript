import { ext, MENU_MESSAGE } from './api.ts';

const ALL = { origins: ['<all_urls>'] };
const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

function say(text: string) {
  $('#msg').textContent = text;
}

async function run(cmd: string) {
  const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return say('No active tab.');
  try {
    const res = (await ext.tabs.sendMessage(tab.id, { type: MENU_MESSAGE, cmd }, { frameId: 0 })) as { ok?: boolean };
    if (res?.ok) window.close();
    else say('Not ready on this page yet. Reload the tab and try again.');
  } catch {
    say('Can’t run here. Browser pages (about:, add-on store) and tabs opened before install need a reload.');
  }
}

for (const btn of document.querySelectorAll<HTMLButtonElement>('button[data-cmd]')) {
  btn.addEventListener('click', () => void run(btn.dataset.cmd ?? ''));
}

// Firefox lets users withdraw "access your data for all websites" at any time; without it the
// solver never loads, so say so here rather than fail silently.
const grant = $<HTMLButtonElement>('#grant');
grant.addEventListener('click', () => {
  void ext.permissions.request(ALL).then((ok) => {
    if (ok) {
      grant.hidden = true;
      say('Access granted. Reload the tab.');
    }
  });
});
void ext.permissions.contains(ALL).then((ok) => {
  if (!ok) {
    grant.hidden = false;
    say('The solver needs access to websites to see captchas.');
  }
});

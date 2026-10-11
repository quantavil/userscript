import { iconAlert, iconCheck, iconCopy, iconSettings } from './ui/icons';
import { PAGE_CSS } from './ui/styles';

const TITLE_LINK = '.text-title-large a[href^="/problems/"]';
const HELP_ICON = 'svg.fa-circle-question';

export type CopyState = 'idle' | 'busy' | 'done' | 'error';

const timers = new WeakMap<HTMLElement, number>();

export function setCopyState(btn: HTMLElement, state: CopyState): void {
  btn.dataset.state = state;
  btn.setAttribute('aria-busy', String(state === 'busy'));
  btn.innerHTML = state === 'done' ? iconCheck(18) : state === 'error' ? iconAlert(18) : iconCopy(18);
  window.clearTimeout(timers.get(btn));
  if (state === 'done' || state === 'error') {
    timers.set(
      btn,
      window.setTimeout(() => btn.isConnected && setCopyState(btn, 'idle'), 1800),
    );
  }
}

function ensureStyle(): void {
  if (document.getElementById('bl-page-style')) return;
  const style = document.createElement('style');
  style.id = 'bl-page-style';
  style.textContent = PAGE_CSS;
  (document.head ?? document.documentElement).append(style);
}

function makeButton(className: string, label: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.title = label;
  btn.setAttribute('aria-label', label);
  return btn;
}

function createCopyButton(onCopy: (btn: HTMLElement) => void): HTMLButtonElement {
  const btn = makeButton('bl-copy', 'Copy problem as Markdown');
  setCopyState(btn, 'idle');
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (btn.dataset.state !== 'busy') onCopy(btn);
  });
  return btn;
}

function createGearButton(onSettings: () => void, className: string): HTMLButtonElement {
  const btn = makeButton(className, 'Better LeetCode settings');
  btn.innerHTML = `<span class="bl-gear">${iconSettings(16)}</span>`;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    onSettings();
  });
  return btn;
}

export function startInjection(onCopy: (btn: HTMLElement) => void, onSettings: () => void): void {
  let copyBtn: HTMLButtonElement | null = null;
  let gearBtn: HTMLButtonElement | null = null;
  let queued = false;

  const run = () => {
    queued = false;
    if (!location.pathname.startsWith('/problems/')) return;
    // Hot path: LeetCode mutates the DOM constantly (Monaco, timers). Do nothing once both buttons are live.
    if (copyBtn?.isConnected && gearBtn?.isConnected) return;
    ensureStyle();

    if (!copyBtn?.isConnected) {
      const anchor = document.querySelector<HTMLElement>(TITLE_LINK);
      if (anchor) {
        copyBtn = createCopyButton(onCopy);
        anchor.after(copyBtn);
      }
    }

    if (!gearBtn?.isConnected) {
      // Preferred spot: next to the "?" button in the description footer, styled like it.
      const tab = document.querySelector('[data-track-load="description_content"]')?.closest('.flexlayout__tab');
      const help = tab?.querySelector(HELP_ICON)?.closest('button');
      if (help) {
        gearBtn = createGearButton(onSettings, help.className);
        help.after(gearBtn);
      } else if (copyBtn?.isConnected) {
        // Selector drift fallback: keep settings reachable next to the copy icon.
        gearBtn = createGearButton(onSettings, 'bl-copy');
        copyBtn.after(gearBtn);
      }
    }
  };

  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(run);
  }).observe(document.documentElement, { childList: true, subtree: true });
  run();
}

import { render } from 'preact';
import { loadSettings, saveSettings } from '../store';
import type { Settings } from '../types';
import { iconAlert, iconCheck } from './icons';
import { SettingsModal } from './SettingsModal';
import { CSS } from './styles';

let wrap: HTMLDivElement | undefined;
let modalMount: HTMLDivElement;
let toastMount: HTMLDivElement;

/** Follow LeetCode's own theme; if it exposes no marker, judge by what the page actually paints. */
function isDark(): boolean {
  const h = document.documentElement;
  if (h.classList.contains('dark') || h.dataset.theme === 'dark') return true;
  if (h.classList.contains('light') || h.dataset.theme === 'light') return false;
  const rgba = getComputedStyle(document.body ?? h)
    .backgroundColor.match(/[\d.]+/g)
    ?.map(Number);
  if (rgba && rgba.length >= 3 && rgba[3] !== 0) {
    const [r = 0, g = 0, b = 0] = rgba;
    return 0.299 * r + 0.587 * g + 0.114 * b < 128;
  }
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

function ensureHost(): void {
  if (wrap) return;
  const host = document.createElement('div');
  host.id = 'better-leetcode-host';
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = CSS;

  const el = document.createElement('div');
  el.className = 'wrap';
  modalMount = document.createElement('div');
  toastMount = document.createElement('div');
  toastMount.setAttribute('role', 'status'); // live region must exist before its content changes
  toastMount.setAttribute('aria-live', 'polite');
  el.append(modalMount, toastMount);
  root.append(style, el);
  (document.body ?? document.documentElement).append(host);
  wrap = el;

  const apply = () => el.setAttribute('data-theme', isDark() ? 'dark' : 'light');
  apply();
  new MutationObserver(apply).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme'],
  });
}

/* Settings are written at most once per 300 ms while typing, and always on close / page hide. */
let pending: Settings | null = null;
let saveTimer: number | undefined;

function flushSave(): void {
  window.clearTimeout(saveTimer);
  if (pending) saveSettings(pending);
  pending = null;
}

function queueSave(s: Settings): void {
  pending = s;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(flushSave, 300);
}

export function openSettings(): void {
  ensureHost();
  window.addEventListener('pagehide', flushSave, { once: true });
  render(
    <SettingsModal
      initial={loadSettings()}
      onChange={queueSave}
      onClose={() => {
        flushSave();
        render(null, modalMount);
      }}
    />,
    modalMount,
  );
}

export type ToastKind = 'ok' | 'warn' | 'error';
let toastTimer: number | undefined;

export function toast(message: string, kind: ToastKind = 'ok'): void {
  ensureHost();
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = kind === 'ok' ? iconCheck(16) : iconAlert(16);
  const span = document.createElement('span');
  span.textContent = message;
  el.append(span);
  toastMount.replaceChildren(el);
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.remove(), kind === 'error' ? 4500 : kind === 'warn' ? 3500 : 2400);
}

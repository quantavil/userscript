import { FileObj } from './types';
import { TOAST_DURATION, TOAST_FADE_MS } from './constants';

export const state = {
  allFiles: [] as FileObj[],
  openFolders: new Set<string>(),
  searchQ: '',
  shadowRoot: null as ShadowRoot | null,
};

export function $<T extends HTMLElement = HTMLElement>(id: string): T | null {
  if (!state.shadowRoot) return null;
  return state.shadowRoot.getElementById(id) as T | null;
}

const DOM_PROPS = new Set(['id', 'title', 'type', 'placeholder', 'autocomplete', 'rows', 'spellcheck']);

export function el(tag: string, props: Record<string, any> = {}, children: (Node | null)[] = []): HTMLElement {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'cls') e.className = v;
    else if (k === 'txt') e.textContent = v;
    else if (DOM_PROPS.has(k)) (e as any)[k] = v;
    else e.setAttribute(k, v);
  }
  for (const c of children) if (c) e.appendChild(c);
  return e;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

export function showToast(msg: string, type: 'success' | 'error' | 'info' = 'success') {
  if (!state.shadowRoot) return;
  const existing = state.shadowRoot.getElementById('cu-toast');
  if (existing) existing.remove();
  const toast = el('div', { id: 'cu-toast', txt: msg });
  toast.classList.add(type);
  state.shadowRoot.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), TOAST_FADE_MS);
  }, TOAST_DURATION);
}

import { FileObj } from './types';

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

export function el(tag: string, props: Record<string, any> = {}, children: (Node | null)[] = []): HTMLElement {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'cls') e.className = v;
    else if (k === 'txt') e.textContent = v;
    else if (k === 'id' || k === 'title') (e as any)[k] = v;
    else if (k === 'type' || k === 'placeholder' || k === 'autocomplete' || k === 'rows') (e as any)[k] = v;
    else if (k === 'spellcheck') (e as any).spellcheck = v;
    else e.setAttribute(k, v);
  }
  for (const c of children) if (c) e.appendChild(c);
  return e;
}

export function showToast(msg: string) {
  if (!state.shadowRoot) return;
  const existing = state.shadowRoot.getElementById('cu-toast');
  if (existing) existing.remove();
  const toast = el('div', { id: 'cu-toast', txt: msg });
  state.shadowRoot.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

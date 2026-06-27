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
    else if (k === 'type' || k === 'placeholder' || k === 'autocomplete') (e as HTMLInputElement)[k] = v;
    else if (k === 'spellcheck') (e as any).spellcheck = v;
    else e.setAttribute(k, v); // Handles role, aria-modal, etc.
  }
  for (const c of children) if (c) e.appendChild(c);
  return e;
}

export function showToast(msg: string) {
  if (!state.shadowRoot) return;
  const toast = el('div', { id: 'cu-toast', txt: msg });
  state.shadowRoot.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

export function showConfirm(msg: string, onConfirm: () => void, onCancel?: () => void) {
  if (!state.shadowRoot) {
    if (confirm(msg)) onConfirm();
    else if (onCancel) onCancel();
    return;
  }
  const overlay = el('div', { id: 'cu-confirm-overlay' });
  const box = el('div', { id: 'cu-confirm-box' }, [
    el('div', { id: 'cu-confirm-msg', txt: msg }),
    el('div', { id: 'cu-confirm-btns' }, [
      el('button', { cls: 'cu-btn cu-btn-sm', txt: 'Cancel', id: 'cu-confirm-cancel' }),
      el('button', { cls: 'cu-btn cu-btn-sm cu-btn-primary', txt: 'OK', id: 'cu-confirm-ok' })
    ])
  ]);
  overlay.appendChild(box);
  state.shadowRoot.appendChild(overlay);

  const close = () => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 250);
  };

  overlay.querySelector('#cu-confirm-cancel')?.addEventListener('click', () => {
    close();
    if (onCancel) onCancel();
  });
  overlay.querySelector('#cu-confirm-ok')?.addEventListener('click', () => {
    close();
    onConfirm();
  });

  setTimeout(() => overlay.classList.add('show'), 10);
}



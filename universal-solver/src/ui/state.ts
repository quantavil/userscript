import { signal } from '@preact/signals';
import type { SiteRuleInput } from '../config/schema.ts';

export type Tab = 'provider' | 'sites' | 'data';
export const settingsTab = signal<Tab | null>(null);

export interface EditorState {
  /** Pattern being edited; undefined when creating. */
  original?: string;
  pattern: string;
  rule: SiteRuleInput;
  fromSettings?: boolean;
}
export const editor = signal<EditorState | null>(null);

export interface Toast {
  id: number;
  text: string;
  kind: 'ok' | 'error';
  action?: { label: string; run: () => void };
}
export const toasts = signal<Toast[]>([]);

let nextId = 0;
export function toast(text: string, kind: Toast['kind'] = 'ok', action?: Toast['action']): void {
  const id = ++nextId;
  toasts.value = [...toasts.value, { id, text, kind, action }];
  setTimeout(() => dismissToast(id), kind === 'error' ? 6000 : action ? 6000 : 2800);
}
export const dismissToast = (id: number) => {
  toasts.value = toasts.value.filter((t) => t.id !== id);
};

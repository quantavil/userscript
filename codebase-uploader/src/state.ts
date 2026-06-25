import { FileObj } from './types';

export let allFiles: FileObj[] = [];
export const openFolders = new Set<string>();
export let searchQ = '';
export let shadowRoot: ShadowRoot | null = null;

export function setShadowRoot(root: ShadowRoot): void {
  shadowRoot = root;
}

export function $<T extends HTMLElement = HTMLElement>(id: string): T {
  if (!shadowRoot) {
    throw new Error('Shadow root not initialized');
  }
  const el = shadowRoot.getElementById(id) || shadowRoot.querySelector(id);
  if (!el) {
    throw new Error(`Element not found in shadow DOM: ${id}`);
  }
  return el as T;
}

export function setAllFiles(files: FileObj[]): void {
  allFiles = files;
}

export function clearAllFiles(): void {
  allFiles = [];
}

export function setSearchQ(q: string): void {
  searchQ = q;
}

export function addOpenFolder(path: string): void {
  openFolders.add(path);
}

export function removeOpenFolder(path: string): void {
  openFolders.delete(path);
}

export function clearOpenFolders(): void {
  openFolders.clear();
}

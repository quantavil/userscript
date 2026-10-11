import { mock } from 'bun:test';
import { Window } from 'happy-dom';

const window = new Window({ url: 'https://www.babepedia.com' });
(globalThis as any).window = window;
(globalThis as any).document = window.document;
(globalThis as any).DOMParser = window.DOMParser;
(globalThis as any).HTMLElement = window.HTMLElement;
(globalThis as any).HTMLAnchorElement = window.HTMLAnchorElement;
(globalThis as any).Node = window.Node;

const mockGmStorage = new Map<string, any>();

mock.module('$', () => ({
  GM_getValue: (key: string, defaultValue?: any) => mockGmStorage.has(key) ? mockGmStorage.get(key) : defaultValue,
  GM_setValue: (key: string, value: any) => mockGmStorage.set(key, value),
  GM_deleteValue: (key: string) => mockGmStorage.delete(key),
  GM_listValues: () => Array.from(mockGmStorage.keys()),
  GM_xmlhttpRequest: () => {},
  GM_addStyle: () => {}
}));

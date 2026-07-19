import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();

// Mock Userscript/GreaseMonkey APIs for tests
const store: Record<string, any> = {};

(globalThis as any).GM_getValue = <T>(key: string, defaultValue?: T): T => {
  return key in store ? store[key] : defaultValue;
};

(globalThis as any).GM_setValue = <T>(key: string, value: T): void => {
  store[key] = value;
};

(globalThis as any).GM_deleteValue = (key: string): void => {
  delete store[key];
};

(globalThis as any).GM_registerMenuCommand = () => {};
(globalThis as any).GM_xmlhttpRequest = () => {};

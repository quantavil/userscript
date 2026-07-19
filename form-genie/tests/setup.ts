import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();

// Mock Userscript/GreaseMonkey APIs for tests
const store: Record<string, any> = {};

(globalThis as any).GM_getValue = <T>(key: string, defaultValue?: T): T => {
  return (key in store ? store[key] : defaultValue) as T;
};

(globalThis as any).GM_setValue = <T>(key: string, value: T): void => {
  store[key] = value;
};

(globalThis as any).GM_deleteValue = (key: string): void => {
  delete store[key];
};

(globalThis as any).GM_registerMenuCommand = () => {};
(globalThis as any).GM_xmlhttpRequest = () => {};

// A Polling MutationObserver shim for happy-dom because its native MutationObserver
// does not reliably fire on innerHTML / dynamic select option modifications.
class PollingMutationObserver {
  private callback: any;
  private interval: any = null;
  private target: any = null;
  private lastOptionsCount = 0;
  private lastDisabled = false;

  constructor(callback: any) {
    this.callback = callback;
  }

  observe(target: any, options: any) {
    this.target = target;
    this.lastOptionsCount = target.options ? target.options.length : 0;
    this.lastDisabled = target.disabled;
    this.interval = setInterval(() => {
      const currentCount = target.options ? target.options.length : 0;
      const currentDisabled = target.disabled;
      if (currentCount !== this.lastOptionsCount || currentDisabled !== this.lastDisabled) {
        this.lastOptionsCount = currentCount;
        this.lastDisabled = currentDisabled;
        this.callback([], this);
      }
    }, 10);
  }

  disconnect() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

(globalThis as any).MutationObserver = PollingMutationObserver;


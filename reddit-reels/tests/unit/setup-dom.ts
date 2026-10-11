import { GlobalWindow } from 'happy-dom';

/** Installs a happy-dom window as the global DOM for a test file. */
export function installDom(url = 'https://www.reddit.com/r/oddlysatisfying/'): GlobalWindow {
  const window = new GlobalWindow({ url });
  const g = globalThis as any;
  for (const key of [
    'window',
    'document',
    'location',
    'history',
    'Node',
    'HTMLElement',
    'HTMLVideoElement',
    'HTMLImageElement',
    'DOMParser',
    'MutationObserver',
    'sessionStorage',
    'localStorage',
    'Blob',
    'URL',
  ]) {
    if (key === 'window') g.window = window;
    else if (key === 'URL' || key === 'Blob') continue;
    else g[key] = (window as any)[key];
  }
  return window;
}

export function uninstallDom(): void {
  const g = globalThis as any;
  for (const key of [
    'window',
    'document',
    'location',
    'history',
    'Node',
    'HTMLElement',
    'HTMLVideoElement',
    'HTMLImageElement',
    'DOMParser',
    'MutationObserver',
    'sessionStorage',
    'localStorage',
  ]) {
    delete g[key];
  }
}

import { domainFromUrl } from './domain';

export const SHORTCUT_LABEL = 'Ctrl+Alt+S';

export interface BootServices {
  touch(domain: string): Promise<void>;
  collect(domain: string): Promise<unknown>;
  registerMenu(label: string, callback: () => void | Promise<void>): void;
  openPanel(domain: string): Promise<void>;
  togglePanel(domain: string): void;
  clearCache(): Promise<void>;
}

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export async function boot(url: string, services: BootServices): Promise<void> {
  const domain = domainFromUrl(url);
  if (!domain) return;

  await services.touch(domain);
  void services.collect(domain);
  services.registerMenu(`Show SiteOrbit (${SHORTCUT_LABEL})`, () => services.togglePanel(domain));
  services.registerMenu('Clear SiteOrbit Cache', () => services.clearCache());

  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;

  window.addEventListener('keydown', (event: KeyboardEvent) => {
    // `code` survives non-Latin layouts; `key` covers synthetic events that omit it.
    const isS = event.code === 'KeyS' || event.key?.toLowerCase() === 's';
    if (!isS || !event.ctrlKey || !event.altKey || event.metaKey || event.repeat) return;
    if (isTextEntry(event.target)) return;
    event.preventDefault();
    services.togglePanel(domain);
  });
}

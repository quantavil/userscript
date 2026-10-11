import { boot } from './boot';
import { Collector } from './collector';
import { domainFromUrl } from './domain';
import { downloadJson, extensionHttp, extensionStorage } from './extension-runtime';
import { createServices } from './services';
import { SiteRepository } from './store';

interface ExtensionApi {
  runtime?: {
    onMessage?: { addListener(callback: (message: { type?: string }) => void): void };
  };
}

const api =
  (globalThis as unknown as { browser?: ExtensionApi; chrome?: ExtensionApi }).browser ??
  (globalThis as unknown as { chrome?: ExtensionApi }).chrome;

const repository = new SiteRepository(extensionStorage);
const collector = new Collector(repository, extensionHttp, () => crypto.randomUUID());

if (window.top === window.self) {
  const services = createServices(repository, collector, downloadJson, () => {});

  void boot(location.href, services).catch((error: unknown) => {
    console.warn('[SiteOrbit Extension] startup failed', error);
  });

  api?.runtime?.onMessage?.addListener((message) => {
    // Must match boot()'s registrable domain, not the raw hostname, or the panel keys a different record.
    const domain = domainFromUrl(location.href);
    if (message?.type === 'site-orbit:toggle' && domain) services.togglePanel(domain);
  });
}

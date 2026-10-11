import type { BootServices } from './boot';
import type { Collector } from './collector';
import type { SiteRepository } from './store';
import { closePanel, mountPanel, togglePanel } from './ui/mount';

/** Shared BootServices wiring for both the userscript and the extension content script. */
export function createServices(
  repository: SiteRepository,
  collector: Collector,
  download: (name: string, content: string) => void,
  registerMenu: BootServices['registerMenu'],
): BootServices {
  return {
    touch: async (domain) => {
      await repository.touch(domain);
    },
    collect: (domain) => collector.collect(domain),
    registerMenu,
    openPanel: (domain) => mountPanel(domain, repository, collector, download),
    togglePanel: (domain) => togglePanel(domain, repository, collector, download),
    clearCache: async () => {
      if (confirm('Clear every SiteOrbit record from local cache?')) {
        await repository.clear();
        closePanel();
      }
    },
  };
}

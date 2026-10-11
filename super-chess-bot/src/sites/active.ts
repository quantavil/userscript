import type { SiteAdapter } from './types.js';

let activeSite: SiteAdapter | null = null;

export function setActiveSite(site: SiteAdapter | null): void {
  activeSite = site;
}

export function getActiveSite(): SiteAdapter | null {
  return activeSite;
}

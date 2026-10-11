import { PUBLIC_SUFFIXES } from './suffixes';

export function domainFromUrl(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

    const hostname = url.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.local') ||
      (hostname.startsWith('[') && hostname.endsWith(']')) ||
      /^[\d.]+$/.test(hostname) ||
      !hostname.includes('.')
    ) {
      return null;
    }

    const parts = hostname.split('.');
    if (parts.length < 2) return null;

    let domain = parts.slice(-2).join('.');
    for (let len = Math.min(4, parts.length - 1); len >= 2; len--) {
      const candidate = parts.slice(-len).join('.');
      if (PUBLIC_SUFFIXES.has(candidate)) {
        domain = parts.slice(-(len + 1)).join('.');
        break;
      }
    }

    // A bare public suffix (e.g. visiting `co.uk`) is not a registrable domain.
    if (PUBLIC_SUFFIXES.has(domain) || domain === 'tranco-list.eu') return null;
    return domain;
  } catch {
    return null;
  }
}

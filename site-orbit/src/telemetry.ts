import type { PerformanceMetrics } from './types';

export function extractPerformanceMetrics(win: Window = window): PerformanceMetrics | null {
  try {
    if (typeof win.performance === 'undefined' || typeof win.performance.getEntriesByType !== 'function') {
      return null;
    }

    const navEntries = win.performance.getEntriesByType('navigation');
    const nav = navEntries[0] as PerformanceNavigationTiming | undefined;
    const resources = win.performance.getEntriesByType('resource');

    if (!nav) {
      return {
        ttfbMs: null,
        loadTimeMs: null,
        transferBytes: null,
        protocol: null,
        resourceCount: resources.length + 1,
      };
    }

    const ttfb =
      nav.responseStart > 0 && nav.requestStart > 0
        ? Math.max(0, Math.round(nav.responseStart - nav.requestStart))
        : null;

    const loadTime =
      nav.loadEventEnd > 0 && nav.startTime >= 0
        ? Math.max(0, Math.round(nav.loadEventEnd - nav.startTime))
        : nav.duration > 0
          ? Math.round(nav.duration)
          : null;

    let protocol: string | null = null;
    if (nav.nextHopProtocol) {
      const p = nav.nextHopProtocol.toLowerCase();
      if (p.startsWith('h3') || p.includes('quic')) protocol = 'HTTP/3';
      else if (p.startsWith('h2')) protocol = 'HTTP/2';
      else if (p === 'http/1.1' || p === 'http/1.0') protocol = p.toUpperCase();
      else protocol = nav.nextHopProtocol;
    }

    return {
      ttfbMs: ttfb,
      loadTimeMs: loadTime,
      transferBytes: nav.transferSize > 0 ? nav.transferSize : null,
      protocol,
      resourceCount: resources.length + 1,
    };
  } catch {
    return null;
  }
}

/** Shared favicon source: Google's S2 service renders a 64px icon for any domain. */
export function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

export function extractSiteMeta(
  domain: string,
  doc: Document = document,
): { description: string | null; faviconUrl: string } {
  let description: string | null = null;
  try {
    const metaDesc =
      doc.querySelector('meta[property="og:description"]') ||
      doc.querySelector('meta[name="twitter:description"]') ||
      doc.querySelector('meta[name="description"]');
    if (metaDesc instanceof HTMLMetaElement && metaDesc.content) {
      description = metaDesc.content.trim().slice(0, 180);
    }
  } catch {
    // Ignore DOM extraction errors
  }

  return { description, faviconUrl: faviconUrl(domain) };
}

import { describe, expect, test } from 'bun:test';
import { extractPerformanceMetrics, extractSiteMeta } from '../src/telemetry';

describe('telemetry & metadata', () => {
  test('extractSiteMeta retrieves description and creates high-res favicon URL', () => {
    const doc = document.implementation.createHTMLDocument('Meta Test');
    const meta = doc.createElement('meta');
    meta.setAttribute('property', 'og:description');
    meta.setAttribute('content', 'Explore world-class projects on GitHub.');
    doc.head.appendChild(meta);

    const result = extractSiteMeta('github.com', doc);
    expect(result.description).toBe('Explore world-class projects on GitHub.');
    expect(result.faviconUrl).toContain('github.com');
  });

  test('extractPerformanceMetrics handles navigation timing cleanly', () => {
    const fakeWin = {
      performance: {
        getEntriesByType: (type: string) => {
          if (type === 'navigation') {
            return [
              {
                requestStart: 100,
                responseStart: 180,
                startTime: 0,
                loadEventEnd: 850,
                transferSize: 450_000,
                nextHopProtocol: 'h3',
              },
            ];
          }
          if (type === 'resource') {
            return [{}, {}, {}];
          }
          return [];
        },
      },
    } as unknown as Window;

    const perf = extractPerformanceMetrics(fakeWin);
    expect(perf).not.toBeNull();
    expect(perf?.ttfbMs).toBe(80);
    expect(perf?.loadTimeMs).toBe(850);
    expect(perf?.protocol).toBe('HTTP/3');
    expect(perf?.transferBytes).toBe(450_000);
    expect(perf?.resourceCount).toBe(4);
  });
});

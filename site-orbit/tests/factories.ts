import type { SiteStats } from '../src/types';

export function makeStats(
  domain = 'example.com',
  globalRank: number | null = 100,
  options: Partial<SiteStats> = {},
): SiteStats {
  return {
    domain,
    globalRank,
    globalRankChange: globalRank !== null ? 2 : null,
    rankHistory:
      globalRank !== null
        ? [
            { date: '2026-08-31', rank: globalRank },
            { date: '2026-08-30', rank: globalRank + 1 },
            { date: '2026-08-01', rank: globalRank + 2 },
          ]
        : [],
    capturedAt: 1_000,
    dns: options.dns ?? {
      nameservers: ['ns-1029.awsdns-00.org'],
      nameserverProvider: 'AWS Route 53',
      mailServers: ['aspmx.l.google.com'],
      mailProvider: 'Google Workspace',
      hasIpv6: true,
    },
    tech: options.tech ?? [
      { name: 'React', category: 'framework' },
      { name: 'Next.js', category: 'framework' },
      { name: 'Tailwind CSS', category: 'ui' },
    ],
    performance: options.performance ?? {
      ttfbMs: 120,
      loadTimeMs: 980,
      transferBytes: 1_048_576,
      protocol: 'HTTP/3',
      resourceCount: 24,
    },
    description: options.description ?? 'A testing sample domain',
    faviconUrl: options.faviconUrl ?? 'https://www.google.com/s2/favicons?domain=example.com&sz=64',
    ...options,
  };
}

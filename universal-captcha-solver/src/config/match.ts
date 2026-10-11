import type { SiteRule } from './schema.ts';

interface ParsedPattern {
  host: string;
  subdomains: boolean;
  path: string | null; // null = any path
  mode: 'exact' | 'prefix' | 'any';
}

/**
 * Pattern grammar (scheme optional, case-insensitive host):
 *   example.com            any path on example.com
 *   *.example.com          example.com and every subdomain
 *   example.com/login      that exact path
 *   example.com/app/*      /app and everything below it
 */
export function parsePattern(raw: string): ParsedPattern | null {
  const s = raw
    .trim()
    .replace(/^(\*|https?):\/\//i, '')
    .replace(/\?.*$/, '');
  if (!s) return null;
  const slash = s.indexOf('/');
  const hostPart = (slash === -1 ? s : s.slice(0, slash)).toLowerCase();
  const pathPart = slash === -1 ? '' : s.slice(slash);
  const subdomains = hostPart.startsWith('*.');
  const host = subdomains ? hostPart.slice(2) : hostPart;
  if (!host || host.includes('*')) return null;

  if (!pathPart || pathPart === '/*') return { host, subdomains, path: null, mode: 'any' };
  if (pathPart.endsWith('/*')) return { host, subdomains, path: pathPart.slice(0, -2), mode: 'prefix' };
  return { host, subdomains, path: trimSlash(pathPart), mode: 'exact' };
}

const trimSlash = (p: string) => (p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p);

export interface LocationLike {
  hostname: string;
  host: string;
  pathname: string;
}

/** Higher = more specific. null = no match. */
export function scorePattern(pattern: string, loc: LocationLike): number | null {
  const p = parsePattern(pattern);
  if (!p) return null;
  const hosts = [loc.hostname.toLowerCase(), loc.host.toLowerCase()];
  const exactHost = hosts.includes(p.host);
  const subHost = p.subdomains && hosts.some((h) => h.endsWith(`.${p.host}`));
  if (!exactHost && !subHost) return null;
  const hostScore = p.subdomains ? 1 : 2;

  const path = trimSlash(loc.pathname || '/');
  let pathScore: number;
  if (p.mode === 'any') pathScore = 0;
  else if (p.mode === 'exact') {
    if (path !== p.path) return null;
    pathScore = 100;
  } else {
    const base = p.path ?? '';
    if (!(path === base || path.startsWith(`${base}/`))) return null;
    pathScore = 1 + base.split('/').filter(Boolean).length;
  }
  return hostScore * 1000 + pathScore;
}

export interface RuleMatch {
  pattern: string;
  rule: SiteRule;
}

export function findBestRule(sites: Record<string, SiteRule>, loc: LocationLike): RuleMatch | null {
  let best: (RuleMatch & { score: number }) | null = null;
  for (const [pattern, rule] of Object.entries(sites)) {
    const score = scorePattern(pattern, loc);
    if (score !== null && (!best || score > best.score)) best = { pattern, rule, score };
  }
  return best ? { pattern: best.pattern, rule: best.rule } : null;
}

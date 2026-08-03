import { extractLinks, type AppLink, type LinkType } from './parse';

const CACHE_PREFIX = 'bat:links:';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CONCURRENT = 4;

interface CacheEntry {
  t: number;
  l: AppLink[];
}

function readCache(slug: string): AppLink[] | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + slug);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() - entry.t > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + slug);
      return null;
    }
    return entry.l;
  } catch {
    return null;
  }
}

function writeCache(slug: string, links: AppLink[]): void {
  try {
    localStorage.setItem(CACHE_PREFIX + slug, JSON.stringify({ t: Date.now(), l: links }));
  } catch {
    // Quota full or storage blocked — the fetch still worked, just not cached.
  }
}

const inflight = new Map<string, Promise<AppLink[]>>();
const queue: Array<() => void> = [];
let running = 0;

function pump(): void {
  while (running < MAX_CONCURRENT && queue.length) {
    running++;
    queue.shift()!();
  }
}

async function fetchLinks(slug: string): Promise<AppLink[]> {
  const res = await fetch(`/software/${slug}/about/`, {
    headers: { RSC: '1' },
    credentials: 'same-origin',
  });
  if (!res.ok) throw new Error(`${res.status} for ${slug}`);
  return extractLinks(await res.text());
}

/** Cached, deduplicated, concurrency-capped. Never rejects — failures resolve to []. */
export function getLinks(slug: string): Promise<AppLink[]> {
  const cached = readCache(slug);
  if (cached) return Promise.resolve(cached);

  const existing = inflight.get(slug);
  if (existing) return existing;

  const promise = new Promise<AppLink[]>((resolve) => {
    queue.push(() => {
      fetchLinks(slug)
        .then((links) => {
          writeCache(slug, links);
          resolve(links);
        })
        .catch(() => resolve([]))
        .finally(() => {
          running--;
          inflight.delete(slug);
          pump();
        });
    });
    pump();
  });

  inflight.set(slug, promise);
  return promise;
}

const TYPE_ORDER: LinkType[] = ['Official', 'Source', 'Appstore', 'Social'];

/** "iPhone App Store" -> "iPhone", "Official Website" -> "Website". Chips stay narrow. */
function shortLabel(link: AppLink): string {
  if (link.type === 'Official') return 'Website';
  return link.name
    .replace(/\s*(App\s*)?Store\b/i, '')
    .replace(/\s*Repository\b/i, '')
    .replace(/\s*Platform\b/i, '')
    .trim() || link.name;
}

export function renderLinkRow(links: AppLink[]): HTMLElement {
  const row = document.createElement('div');
  row.className = 'bat-links';

  if (!links.length) {
    row.classList.add('bat-links-empty');
    row.textContent = 'No external links listed';
    return row;
  }

  const sorted = [...links].sort(
    (a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type),
  );

  for (const link of sorted) {
    const a = document.createElement('a');
    a.className = `bat-chip bat-chip-${link.type.toLowerCase()}`;
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'nofollow noopener noreferrer';
    a.title = `${link.name} — ${link.url}`;
    a.textContent = shortLabel(link);
    row.append(a);
  }
  return row;
}

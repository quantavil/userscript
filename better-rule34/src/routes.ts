/**
 * Shared route helpers for Rule34Video (KVS CMS) listing URLs.
 *
 * Single source of truth for entity/catalog route shapes so autopager and
 * archive logic cannot drift apart. All functions are pure and unit-tested.
 */

/** Listing namespaces that address an entity: /tags/:id/, /categories/:slug/, ... */
const ENTITY_SEGMENTS = ['tags', 'categories', 'models', 'channels', 'playlists'] as const;

/** Watch pages are never listings and never carry a page segment. */
const NON_LISTING_SEGMENTS = [...ENTITY_SEGMENTS, 'video'] as const;

function isNonListingSegment(segment: string): boolean {
  return (NON_LISTING_SEGMENTS as readonly string[]).includes(segment);
}

/**
 * True for pagination/offset query keys (`from`, `from_videos`,
 * `from_videos from_albums` (space-decoded `+`), `from_albums`, `page`, `p`).
 * Filter keys such as `post_date_from` or `duration_from` do NOT match —
 * they never start with `from`.
 */
export function isPaginationKey(key: string): boolean {
  return /^from/i.test(key) || /^page$/i.test(key) || /^p$/i.test(key);
}

/**
 * Strips a trailing numeric page segment from a listing pathname.
 * `/tags/futa/2/` -> `/tags/futa/`, `/latest-updates/32/` -> `/latest-updates/`.
 * Paths without a page segment (`/tags/5568/`, `/latest-updates/`) pass through.
 * Root normalizes to `/`.
 */
export function stripPageSegment(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  const entityMatch = /^\/(?:tags|categories|models|channels|playlists)\/[^/]+\/\d+\/?$/.exec(pathname);
  if (entityMatch) return pathname.replace(/\/\d+\/?$/, '/');
  const catalogMatch = /^\/([^/]+)\/\d+\/?$/.exec(pathname);
  if (catalogMatch && !isNonListingSegment(catalogMatch[1])) return `/${catalogMatch[1]}/`;
  return pathname;
}

/**
 * Extracts a trailing numeric page segment from entity/catalog pathnames.
 * Returns null when the path carries no page number (page 1 or query paging).
 */
export function pageNumberFromPath(pathname: string): number | null {
  const entityMatch = /^\/(?:tags|categories|models|channels|playlists)\/[^/]+\/(\d+)\/?$/.exec(pathname);
  if (entityMatch) {
    const p = parseInt(entityMatch[1], 10);
    if (!isNaN(p) && p > 0) return p;
  }
  const catalogMatch = /^\/([^/]+)\/(\d+)\/?$/.exec(pathname);
  if (catalogMatch && !isNonListingSegment(catalogMatch[1])) {
    const p = parseInt(catalogMatch[2], 10);
    if (!isNaN(p) && p > 0) return p;
  }
  return null;
}

/**
 * Builds a listing pathname for page `n`, preserving the listing base.
 * Root (`/` or ``) normalizes to `/latest-updates/` — the homepage catalog
 * does not support sort/page params directly.
 */
export function appendPageToPath(pathname: string, pageNum: number): string {
  if (!pathname || pathname === '/') return `/latest-updates/${pageNum}/`;

  const entityMatch = /^(\/(?:tags|categories|models|channels|playlists)\/[^/]+)(?:\/\d+)?\/?$/.exec(pathname);
  if (entityMatch) return `${entityMatch[1]}/${pageNum}/`;

  const catalogMatch = /^(\/[^/]+)(?:\/\d+)?\/?$/.exec(pathname);
  if (catalogMatch && !isNonListingSegment(catalogMatch[1].slice(1))) {
    return `${catalogMatch[1]}/${pageNum}/`;
  }

  if (/\/\d+\/?$/.test(pathname)) return pathname.replace(/\/\d+\/?$/, `/${pageNum}/`);
  if (pathname.endsWith('/')) return `${pathname}${pageNum}/`;
  return `${pathname}/${pageNum}/`;
}


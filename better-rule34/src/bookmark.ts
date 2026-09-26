/**
 * EROS Archive & Bookmarking Engine.
 * Supports multiple sector checkpoints (page depths per listing/tag/search)
 * and saved video cards (watch later), with v1 migration and JSON export/import.
 */
import { isPaginationKey, stripPageSegment } from './routes';

export interface SectorBookmark {
  id: string;
  listKey: string;
  title: string;
  url: string;
  page: number;
  sortBy?: string | null;
  createdAt: number;
}

export interface VideoBookmark {
  id: string; // numeric video ID
  title: string;
  url: string;
  thumbUrl: string;
  durationFormatted: string;
  ratingPercent: number;
  viewsFormatted: string;
  createdAt: number;
}

export interface BookmarkArchiveData {
  version: 2;
  sectors: SectorBookmark[];
  videos: VideoBookmark[];
}

export interface BookmarkStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const BOOKMARK_ARCHIVE_KEY = 'better_rule34_bookmarks_v2';
export const LEGACY_BOOKMARK_KEY = 'better_rule34_bookmarks_v1';

/**
 * Canonical key for a listing URL: pathname + sorted search minus page
 * params, minus trailing page-number path segments ("/2/").
 * Pure and unit-tested.
 */
export function canonicalListKey(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    for (const k of [...url.searchParams.keys()]) {
      if (isPaginationKey(k)) {
        url.searchParams.delete(k);
      }
    }

    let pathname = url.pathname;
    // Normalize root to /latest-updates/ as they represent the same catalog
    if (!pathname || pathname === '/') {
      pathname = '/latest-updates/';
    } else {
      // Strip trailing page-number path segments ("/2/") via shared helper.
      pathname = stripPageSegment(pathname);
    }

    if (pathname.length > 1 && !pathname.endsWith('/')) {
      pathname += '/';
    }

    const params = [...url.searchParams.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const qs = params.map(([k, v]) => `${k}=${v}`).join('&');
    return qs ? `${pathname}?${qs}` : pathname;
  } catch {
    return urlStr;
  }
}

/** Formats a human-readable Cyberpunk badge title from a listing URL. */
export function formatSectorTitleFromUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    const parts = url.pathname.split('/').filter(Boolean);
    const sortBy = url.searchParams.get('sort_by');
    const sortSuffix = sortBy ? ` [${sortBy.toUpperCase()}]` : '';

    if (parts.length === 0 || (parts.length === 1 && parts[0] === 'latest-updates')) {
      return `FEED // LATEST${sortSuffix}`;
    }

    if (parts[0] === 'search') {
      const q = parts[1] || url.searchParams.get('q') || 'ALL';
      return `SEARCH // ${decodeURIComponent(q).toUpperCase()}${sortSuffix}`;
    }

    if (parts[0] === 'tags' && parts[1]) {
      return `TAG // ${decodeURIComponent(parts[1]).replace(/-/g, ' ').toUpperCase()}${sortSuffix}`;
    }

    if (parts[0] === 'categories' && parts[1]) {
      return `CATEGORY // ${decodeURIComponent(parts[1]).replace(/-/g, ' ').toUpperCase()}${sortSuffix}`;
    }

    if (parts[0] === 'models' && parts[1]) {
      return `MODEL // ${decodeURIComponent(parts[1]).replace(/-/g, ' ').toUpperCase()}${sortSuffix}`;
    }

    if (parts[0] === 'channels' && parts[1]) {
      return `CHANNEL // ${decodeURIComponent(parts[1]).replace(/-/g, ' ').toUpperCase()}${sortSuffix}`;
    }

    if (parts[0] === 'playlists' && parts[1]) {
      return `PLAYLIST // ${decodeURIComponent(parts[1]).replace(/-/g, ' ').toUpperCase()}${sortSuffix}`;
    }

    return `SECTOR // ${parts.slice(0, 2).join(' / ').toUpperCase()}${sortSuffix}`;
  } catch {
    return 'SECTOR // ARCHIVE';
  }
}

function resolveStore(store?: BookmarkStore): BookmarkStore | null {
  if (store) return store;
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // Ignore (no storage available)
  }
  return null;
}

/** Reads entire archive, auto-migrating v1 data if present. */
export function readArchive(store?: BookmarkStore): BookmarkArchiveData {
  const s = resolveStore(store);
  if (!s) return { version: 2, sectors: [], videos: [] };

  try {
    const rawV2 = s.getItem(BOOKMARK_ARCHIVE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as BookmarkArchiveData;
      if (parsed && parsed.version === 2 && Array.isArray(parsed.sectors) && Array.isArray(parsed.videos)) {
        return parsed;
      }
    }

    // Auto-migrate legacy v1 format
    const rawV1 = s.getItem(LEGACY_BOOKMARK_KEY);
    if (rawV1) {
      const legacy = JSON.parse(rawV1) as Record<string, { page: number; url: string }>;
      if (legacy && typeof legacy === 'object') {
        const sectors: SectorBookmark[] = [];
        let i = 0;
        for (const [key, val] of Object.entries(legacy)) {
          if (val && typeof val.page === 'number' && typeof val.url === 'string') {
            sectors.push({
              id: `sec_legacy_${Date.now()}_${i++}`,
              listKey: key,
              title: formatSectorTitleFromUrl(val.url),
              url: val.url,
              page: val.page,
              createdAt: Date.now(),
            });
          }
        }
        const data: BookmarkArchiveData = { version: 2, sectors, videos: [] };
        s.setItem(BOOKMARK_ARCHIVE_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch {
    // Fallback on parse failure
  }

  return { version: 2, sectors: [], videos: [] };
}

export function writeArchive(data: BookmarkArchiveData, store?: BookmarkStore): void {
  const s = resolveStore(store);
  if (!s) return;
  try {
    s.setItem(BOOKMARK_ARCHIVE_KEY, JSON.stringify(data));
  } catch {
    // Ignore
  }
}

/* ==========================================================================
   Sectors API (Multiple Bookmarks per Listing)
   ========================================================================== */

export function getSectors(store?: BookmarkStore): SectorBookmark[] {
  return readArchive(store).sectors;
}

export function findSector(listKey: string, page: number, store?: BookmarkStore): SectorBookmark | null {
  if (!listKey) return null;
  const sectors = getSectors(store);
  return sectors.find((s) => s.listKey === listKey && s.page === page) || null;
}

export function saveSector(
  bm: Omit<SectorBookmark, 'id' | 'createdAt'>,
  store?: BookmarkStore,
): SectorBookmark {
  const archive = readArchive(store);
  // If identical sector bookmark exists, update timestamp and URL
  const existingIdx = archive.sectors.findIndex((s) => s.listKey === bm.listKey && s.page === bm.page);
  const now = Date.now();
  if (existingIdx !== -1) {
    archive.sectors[existingIdx] = {
      ...archive.sectors[existingIdx],
      ...bm,
      createdAt: now,
    };
    writeArchive(archive, store);
    return archive.sectors[existingIdx];
  }

  const created: SectorBookmark = {
    ...bm,
    id: `sec_${now}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now,
  };
  archive.sectors.unshift(created);
  writeArchive(archive, store);
  return created;
}

export function deleteSector(id: string, store?: BookmarkStore): void {
  if (!id) return;
  const archive = readArchive(store);
  archive.sectors = archive.sectors.filter((s) => s.id !== id);
  writeArchive(archive, store);
}

export function clearAllSectors(store?: BookmarkStore): void {
  const archive = readArchive(store);
  archive.sectors = [];
  writeArchive(archive, store);
}

/* ==========================================================================
   Saved Videos API (Watch Later)
   ========================================================================== */

export function getVideos(store?: BookmarkStore): VideoBookmark[] {
  return readArchive(store).videos;
}

export function isVideoSaved(id: string, store?: BookmarkStore): boolean {
  if (!id) return false;
  return getVideos(store).some((v) => v.id === id);
}

export function saveVideo(
  video: Omit<VideoBookmark, 'createdAt'>,
  store?: BookmarkStore,
): VideoBookmark {
  const archive = readArchive(store);
  const existingIdx = archive.videos.findIndex((v) => v.id === video.id);
  const now = Date.now();
  if (existingIdx !== -1) {
    archive.videos[existingIdx] = {
      ...archive.videos[existingIdx],
      ...video,
      createdAt: now,
    };
    writeArchive(archive, store);
    return archive.videos[existingIdx];
  }

  const created: VideoBookmark = {
    ...video,
    createdAt: now,
  };
  archive.videos.unshift(created);
  writeArchive(archive, store);
  return created;
}

export function deleteVideo(id: string, store?: BookmarkStore): void {
  if (!id) return;
  const archive = readArchive(store);
  archive.videos = archive.videos.filter((v) => v.id !== id);
  writeArchive(archive, store);
}

export function clearAllVideos(store?: BookmarkStore): void {
  const archive = readArchive(store);
  archive.videos = [];
  writeArchive(archive, store);
}

export function getTotalBookmarkCount(store?: BookmarkStore): number {
  const archive = readArchive(store);
  return archive.sectors.length + archive.videos.length;
}

/* ==========================================================================
   JSON Export / Import
   ========================================================================== */

export function exportArchiveJson(store?: BookmarkStore): string {
  const archive = readArchive(store);
  return JSON.stringify(archive, null, 2);
}

export function importArchiveJson(
  jsonStr: string,
  store?: BookmarkStore,
): { success: boolean; sectorsAdded: number; videosAdded: number } {
  try {
    const parsed = JSON.parse(jsonStr) as Partial<BookmarkArchiveData>;
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, sectorsAdded: 0, videosAdded: 0 };
    }

    const archive = readArchive(store);
    let sectorsAdded = 0;
    let videosAdded = 0;

    if (Array.isArray(parsed.sectors)) {
      for (const s of parsed.sectors) {
        if (s && typeof s.listKey === 'string' && typeof s.page === 'number' && typeof s.url === 'string') {
          const exists = archive.sectors.some((item) => item.listKey === s.listKey && item.page === s.page);
          if (!exists) {
            archive.sectors.push({
              id: s.id || `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              listKey: s.listKey,
              title: s.title || formatSectorTitleFromUrl(s.url),
              url: s.url,
              page: s.page,
              sortBy: s.sortBy || null,
              createdAt: s.createdAt || Date.now(),
            });
            sectorsAdded++;
          }
        }
      }
    }

    if (Array.isArray(parsed.videos)) {
      for (const v of parsed.videos) {
        if (v && typeof v.id === 'string' && typeof v.url === 'string') {
          const exists = archive.videos.some((item) => item.id === v.id);
          if (!exists) {
            archive.videos.push({
              id: v.id,
              title: v.title || 'Untitled Video',
              url: v.url,
              thumbUrl: v.thumbUrl || '',
              durationFormatted: v.durationFormatted || '',
              ratingPercent: v.ratingPercent || 0,
              viewsFormatted: v.viewsFormatted || '',
              createdAt: v.createdAt || Date.now(),
            });
            videosAdded++;
          }
        }
      }
    }

    writeArchive(archive, store);
    return { success: true, sectorsAdded, videosAdded };
  } catch {
    return { success: false, sectorsAdded: 0, videosAdded: 0 };
  }
}

/* ==========================================================================
   Backward Compatibility API (Legacy single-bookmark per key)
   ========================================================================== */

export interface Bookmark {
  page: number;
  url: string;
}

export function getBookmark(key: string, store?: BookmarkStore): Bookmark | null {
  if (!key) return null;
  const sectors = getSectors(store);
  const found = sectors.find((s) => s.listKey === key);
  if (!found || found.page < 1 || !found.url) return null;
  return { page: found.page, url: found.url };
}

export function setBookmark(key: string, bm: Bookmark, store?: BookmarkStore): void {
  if (!key || !bm.url || bm.page < 1) return;
  saveSector(
    {
      listKey: key,
      title: formatSectorTitleFromUrl(bm.url),
      url: bm.url,
      page: bm.page,
    },
    store,
  );
}

export function clearBookmark(key: string, store?: BookmarkStore): void {
  if (!key) return;
  const archive = readArchive(store);
  archive.sectors = archive.sectors.filter((s) => s.listKey !== key);
  writeArchive(archive, store);
}

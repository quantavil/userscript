/**
 * Watch history. A video is "watched" once about 85% of it has played, or when the user marks
 * it. Stored as { [videoId]: { at, manual } } in localStorage, newest MAX_RECORDS kept.
 */

const WATCH_KEY = 'better_rule34_watch_v2';
export const MAX_RECORDS = 5000;
const VALID_ID = /^\d{1,12}$/;

interface WatchRecord {
  at: number;
  manual: boolean;
}

type WatchMap = Record<string, WatchRecord>;

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function parseWatchMap(raw: string | null): WatchMap {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const out: WatchMap = {};
  for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!VALID_ID.test(id) || !value || typeof value !== 'object') continue;
    const { at, manual } = value as { at?: unknown; manual?: unknown };
    if (typeof at !== 'number' || !Number.isFinite(at)) continue;
    out[id] = { at, manual: manual === true };
  }
  return out;
}

export function pruneWatchMap(map: WatchMap, max = MAX_RECORDS): WatchMap {
  const entries = Object.entries(map);
  if (entries.length <= max) return map;
  entries.sort((a, b) => b[1].at - a[1].at);
  return Object.fromEntries(entries.slice(0, max));
}

function defaultStore(): KeyValueStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

let store: KeyValueStore | null = defaultStore();
let cache: WatchMap | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const fn of listeners) fn();
}

function read(): WatchMap {
  if (!cache) {
    let raw: string | null = null;
    try {
      raw = store?.getItem(WATCH_KEY) ?? null;
    } catch {
      raw = null;
    }
    cache = parseWatchMap(raw);
  }
  return cache;
}

function write(map: WatchMap): void {
  cache = map;
  try {
    store?.setItem(WATCH_KEY, JSON.stringify(map));
  } catch {
    // Quota or private mode: the in-memory copy still works for this page.
  }
  notify();
}

export function isWatched(id: string): boolean {
  return VALID_ID.test(id) && Object.prototype.hasOwnProperty.call(read(), id);
}

export function markWatched(id: string, manual = false, now = Date.now()): void {
  if (!VALID_ID.test(id)) return;
  write(pruneWatchMap({ ...read(), [id]: { at: now, manual } }));
}

export function unmarkWatched(id: string): void {
  if (!isWatched(id)) return;
  const next = { ...read() };
  delete next[id];
  write(next);
}

/** Flips the watched state and returns the new state. */
export function toggleWatched(id: string): boolean {
  if (isWatched(id)) {
    unmarkWatched(id);
    return false;
  }
  markWatched(id, true);
  return true;
}

export function onWatchChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Test hook: replace the backing store and drop the cache. */
export function setWatchStoreForTests(next: KeyValueStore | null): void {
  store = next;
  cache = null;
}

if (typeof window !== 'undefined') {
  // Keep other open tabs in sync.
  window.addEventListener('storage', (e) => {
    if (e.key === WATCH_KEY) {
      cache = null;
      notify();
    }
  });
}

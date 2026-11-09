import { DEFAULT_FILTERS, DEFAULT_PROFILES, PROFILES_STORAGE_KEY, STORAGE_KEY } from './config';
import type { FilterProfile, FilterState, RawFilterState, WatchedMode } from './types';

/**
 * Returns a new object with default filter settings.
 */
export const getDefaultFilters = (): FilterState => ({
  ...DEFAULT_FILTERS,
  keywordBlacklist: [...DEFAULT_FILTERS.keywordBlacklist],
  channelBlacklist: [...DEFAULT_FILTERS.channelBlacklist],
  channelWhitelist: [...DEFAULT_FILTERS.channelWhitelist]
});

/**
 * Saves current filter state into localStorage with Infinity converted to null.
 */
export const saveFilters = (filters: FilterState): void => {
  const raw: RawFilterState = {
    minViews: filters.minViews || 0,
    maxViews: Number.isFinite(filters.maxViews) ? filters.maxViews : null,
    minDays: filters.minDays || 0,
    maxDays: Number.isFinite(filters.maxDays) ? filters.maxDays : null,
    minDuration: filters.minDuration || 0,
    maxDuration: Number.isFinite(filters.maxDuration) ? filters.maxDuration : null,
    keywordBlacklist: Array.isArray(filters.keywordBlacklist) ? filters.keywordBlacklist : [],
    channelBlacklist: Array.isArray(filters.channelBlacklist) ? filters.channelBlacklist : [],
    channelWhitelist: Array.isArray(filters.channelWhitelist) ? filters.channelWhitelist : [],
    watchedMode: filters.watchedMode || 'dim',
    hideShorts: Boolean(filters.hideShorts),
    hidePosts: Boolean(filters.hidePosts),
    enabled: Boolean(filters.enabled),
    activeProfile: filters.activeProfile || 'Default'
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
  } catch (err) {
    console.warn('[youtube-filter] Failed to save filters to localStorage', err);
  }
};

/**
 * Loads filter state from localStorage, restoring null values back to Infinity.
 */
export const loadFilters = (): FilterState => {
  try {
    const rawStr = localStorage.getItem(STORAGE_KEY);
    if (!rawStr) return getDefaultFilters();

    const d: RawFilterState = JSON.parse(rawStr);
    const validWatchedModes: WatchedMode[] = ['dim', 'hide', 'off'];
    const watchedMode: WatchedMode =
      d.watchedMode && validWatchedModes.includes(d.watchedMode) ? d.watchedMode : 'dim';

    return {
      minViews: Math.max(0, d.minViews ?? 0),
      maxViews: d.maxViews != null && Number.isFinite(d.maxViews) ? d.maxViews : Infinity,
      minDays: Math.max(0, d.minDays ?? 0),
      maxDays: d.maxDays != null && Number.isFinite(d.maxDays) ? d.maxDays : Infinity,
      minDuration: Math.max(0, d.minDuration ?? 0),
      maxDuration: d.maxDuration != null && Number.isFinite(d.maxDuration) ? d.maxDuration : Infinity,
      keywordBlacklist: Array.isArray(d.keywordBlacklist) ? d.keywordBlacklist : [],
      channelBlacklist: Array.isArray(d.channelBlacklist) ? d.channelBlacklist : [],
      channelWhitelist: Array.isArray(d.channelWhitelist) ? d.channelWhitelist : [],
      watchedMode,
      hideShorts: Boolean(d.hideShorts),
      hidePosts: Boolean(d.hidePosts),
      enabled: Boolean(d.enabled),
      activeProfile: d.activeProfile || 'Default'
    };
  } catch (err) {
    console.warn('[youtube-filter] Failed to load filters from localStorage, using defaults', err);
    return getDefaultFilters();
  }
};

/**
 * Restores a profile read from JSON: JSON.stringify turns Infinity into null,
 * which would otherwise make every video fail the max-bound comparisons.
 */
const normalizeProfile = (p: Partial<FilterProfile>): FilterProfile => {
  const bound = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : Infinity);
  const floor = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0);
  const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  return {
    name: p.name as string,
    minViews: floor(p.minViews),
    maxViews: bound(p.maxViews),
    minDays: floor(p.minDays),
    maxDays: bound(p.maxDays),
    minDuration: floor(p.minDuration),
    maxDuration: bound(p.maxDuration),
    keywordBlacklist: list(p.keywordBlacklist),
    channelBlacklist: list(p.channelBlacklist),
    channelWhitelist: list(p.channelWhitelist),
    watchedMode: p.watchedMode === 'hide' || p.watchedMode === 'off' ? p.watchedMode : 'dim',
    hideShorts: Boolean(p.hideShorts),
    hidePosts: Boolean(p.hidePosts)
  };
};

/**
 * Loads saved profiles list from localStorage, merged with defaults.
 */
export const loadProfiles = (): FilterProfile[] => {
  try {
    const rawStr = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (!rawStr) return [...DEFAULT_PROFILES];

    const saved: unknown = JSON.parse(rawStr);
    if (!Array.isArray(saved) || saved.length === 0) {
      return [...DEFAULT_PROFILES];
    }
    const profiles = saved
      .filter((p): p is Partial<FilterProfile> => Boolean(p) && typeof p === 'object' && typeof p.name === 'string' && p.name !== '')
      .map(normalizeProfile);
    return profiles.length > 0 ? profiles : [...DEFAULT_PROFILES];
  } catch (err) {
    console.warn('[youtube-filter] Failed to load profiles from localStorage', err);
    return [...DEFAULT_PROFILES];
  }
};

/**
 * Saves custom profiles list into localStorage.
 */
export const saveProfiles = (profiles: FilterProfile[]): void => {
  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  } catch (err) {
    console.warn('[youtube-filter] Failed to save profiles to localStorage', err);
  }
};

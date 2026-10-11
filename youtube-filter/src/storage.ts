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
 * Loads saved profiles list from localStorage, merged with defaults.
 */
export const loadProfiles = (): FilterProfile[] => {
  try {
    const rawStr = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (!rawStr) return [...DEFAULT_PROFILES];

    const saved: FilterProfile[] = JSON.parse(rawStr);
    if (!Array.isArray(saved) || saved.length === 0) {
      return [...DEFAULT_PROFILES];
    }
    return saved;
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

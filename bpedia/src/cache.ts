import { GM_getValue, GM_setValue, GM_deleteValue, GM_listValues } from '$';
import { PerformerProfile, BadgeSettings, FilterSettings } from './types';

const PROFILE_PREFIX = 'bprof_';
const BADGE_SETTINGS_KEY = 'badge_settings';
const FILTER_SETTINGS_KEY = 'filter_settings';
let filterSettingsTimeout: ReturnType<typeof setTimeout> | null = null;
let inMemoryFilterSettings: FilterSettings | null = null;
const dbCache = new Map<string, PerformerProfile>();

const DEFAULT_BADGE_SETTINGS: BadgeSettings = {
  showAge: true,
  showCupBoobs: true,
  showCountry: true
};

const DEFAULT_FILTER_SETTINGS: FilterSettings = {
  minAge: 18,
  maxAge: 50,
  minHeight: 130,
  maxHeight: 220,
  minRating: 0,
  minFavorites: 0,
  boobs: 'all',
  professionFilter: 'all',
  ethnicities: [],
  hairColors: [],
  eyeColors: [],
  cupSizes: [],
  performances: [],
  searchQuery: ''
};

const safeParse = <T>(json: string | null, fallback: T): T => {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
};

export const Cache = {
  initDbCache(): void {
    dbCache.clear();
    const allKeys = GM_listValues();
    allKeys.forEach((key: string) => {
      if (key.startsWith(PROFILE_PREFIX)) {
        const clean = key.substring(PROFILE_PREFIX.length);
        const val = GM_getValue<string | null>(key, null);
        const parsed = safeParse<PerformerProfile | null>(val, null);
        if (parsed) {
          dbCache.set(clean, parsed);
        }
      }
    });
  },

  getProfile(url: string): PerformerProfile | null {
    const clean = cleanUrl(url);
    return dbCache.get(clean) || null;
  },

  setProfile(url: string, profile: PerformerProfile): void {
    const clean = cleanUrl(url);
    dbCache.set(clean, profile);
    const key = PROFILE_PREFIX + clean;
    GM_setValue(key, JSON.stringify(profile));
  },

  getBadgeSettings(): BadgeSettings {
    const stored = GM_getValue<string | null>(BADGE_SETTINGS_KEY, null);
    return { ...DEFAULT_BADGE_SETTINGS, ...safeParse<Partial<BadgeSettings>>(stored, {}) };
  },

  setBadgeSettings(settings: BadgeSettings): void {
    GM_setValue(BADGE_SETTINGS_KEY, JSON.stringify(settings));
  },

  getFilterSettings(): FilterSettings {
    if (inMemoryFilterSettings) return inMemoryFilterSettings;
    const stored = GM_getValue<string | null>(FILTER_SETTINGS_KEY, null);
    inMemoryFilterSettings = { ...DEFAULT_FILTER_SETTINGS, ...safeParse<Partial<FilterSettings>>(stored, {}) };
    return inMemoryFilterSettings;
  },

  setFilterSettings(settings: FilterSettings, debounce = false): void {
    inMemoryFilterSettings = settings;
    if (filterSettingsTimeout) clearTimeout(filterSettingsTimeout);
    if (debounce) {
      filterSettingsTimeout = setTimeout(() => {
        GM_setValue(FILTER_SETTINGS_KEY, JSON.stringify(settings));
        filterSettingsTimeout = null;
      }, 300);
    } else {
      GM_setValue(FILTER_SETTINGS_KEY, JSON.stringify(settings));
    }
  },

  flushFilterSettings(): void {
    if (filterSettingsTimeout) {
      clearTimeout(filterSettingsTimeout);
      filterSettingsTimeout = null;
      if (inMemoryFilterSettings) {
        GM_setValue(FILTER_SETTINGS_KEY, JSON.stringify(inMemoryFilterSettings));
      }
    }
  },

  clearAllProfiles(): void {
    dbCache.clear();
    const allKeys = GM_listValues();
    let count = 0;
    allKeys.forEach((key: string) => {
      if (key.startsWith(PROFILE_PREFIX)) {
        GM_deleteValue(key);
        count++;
      }
    });
    console.log(`[BP Filter] Cleared ${count} cached profiles`);
  },

  clearEverything(): void {
    dbCache.clear();
    inMemoryFilterSettings = null;
    if (filterSettingsTimeout) {
      clearTimeout(filterSettingsTimeout);
      filterSettingsTimeout = null;
    }
    const allKeys = GM_listValues();
    allKeys.forEach((key: string) => {
      GM_deleteValue(key);
    });
    console.log('[BP Filter] Cleared all storage');
  },

  exportData(): string {
    const allKeys = GM_listValues();
    const data: {
      version: string;
      exportedAt: number;
      settings: Record<string, any>;
      profiles: Record<string, any>;
    } = {
      version: '1.1.3',
      exportedAt: Date.now(),
      settings: {},
      profiles: {}
    };

    allKeys.forEach((key: string) => {
      if (key.startsWith(PROFILE_PREFIX)) {
        const clean = key.substring(PROFILE_PREFIX.length);
        const val = GM_getValue<string | null>(key, null);
        const parsed = safeParse<any>(val, null);
        if (parsed) {
          data.profiles[clean] = parsed;
        }
      } else if (key === BADGE_SETTINGS_KEY || key === FILTER_SETTINGS_KEY) {
        const val = GM_getValue<string | null>(key, null);
        const parsed = safeParse<any>(val, null);
        if (parsed) {
          data.settings[key] = parsed;
        }
      }
    });

    return JSON.stringify(data, null, 2);
  },

  importData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') return false;

      // Import profiles
      if (data.profiles && typeof data.profiles === 'object') {
        Object.entries(data.profiles).forEach(([cleanUrl, profile]) => {
          const key = PROFILE_PREFIX + cleanUrl;
          if (profile && typeof profile === 'object') {
            GM_setValue(key, JSON.stringify(profile));
            const parsed = safeParse<PerformerProfile | null>(JSON.stringify(profile), null);
            if (parsed) {
              dbCache.set(cleanUrl, parsed);
            }
          }
        });
      }

      // Import settings
      if (data.settings && typeof data.settings === 'object') {
        Object.entries(data.settings).forEach(([key, val]) => {
          if (key === BADGE_SETTINGS_KEY || key === FILTER_SETTINGS_KEY) {
            if (key === FILTER_SETTINGS_KEY) {
              const validated = validateFilterSettings(val);
              GM_setValue(key, JSON.stringify(validated));
              inMemoryFilterSettings = validated;
            } else {
              GM_setValue(key, JSON.stringify(val));
            }
          }
        });
      }

      return true;
    } catch (e) {
      console.error('[BP Cache] Import failed:', e);
      return false;
    }
  }
};

function validateFilterSettings(input: any): FilterSettings {
  const res = { ...DEFAULT_FILTER_SETTINGS };
  if (!input || typeof input !== 'object') return res;

  if (typeof input.searchQuery === 'string') res.searchQuery = input.searchQuery;
  if (typeof input.minAge === 'number') res.minAge = input.minAge;
  if (typeof input.maxAge === 'number') res.maxAge = input.maxAge;
  if (typeof input.minHeight === 'number') res.minHeight = input.minHeight;
  if (typeof input.maxHeight === 'number') res.maxHeight = input.maxHeight;
  if (typeof input.minRating === 'number') res.minRating = input.minRating;
  if (typeof input.minFavorites === 'number') res.minFavorites = input.minFavorites;
  if (['all', 'natural', 'implants'].includes(input.boobs)) res.boobs = input.boobs;
  if (['all', 'pornstar', 'non-pornstar'].includes(input.professionFilter)) res.professionFilter = input.professionFilter;
  if (Array.isArray(input.ethnicities)) res.ethnicities = input.ethnicities.filter((x: any) => typeof x === 'string');
  if (Array.isArray(input.hairColors)) res.hairColors = input.hairColors.filter((x: any) => typeof x === 'string');
  if (Array.isArray(input.eyeColors)) res.eyeColors = input.eyeColors.filter((x: any) => typeof x === 'string');
  if (Array.isArray(input.cupSizes)) res.cupSizes = input.cupSizes.filter((x: any) => typeof x === 'string');
  if (Array.isArray(input.performances)) res.performances = input.performances.filter((x: any) => typeof x === 'string');

  return res;
}


function cleanUrl(url: string): string {
  return url.replace(/^\/babe\//, '').replace(/\/$/, '');
}

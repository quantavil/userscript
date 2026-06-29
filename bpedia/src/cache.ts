import { GM_getValue, GM_setValue, GM_deleteValue, GM_listValues } from '$';
import { PerformerProfile, BadgeSettings, FilterSettings } from './types';

const PROFILE_PREFIX = 'bprof_';
const BADGE_SETTINGS_KEY = 'badge_settings';
const FILTER_SETTINGS_KEY = 'filter_settings';
let filterSettingsTimeout: ReturnType<typeof setTimeout> | null = null;

const DEFAULT_BADGE_SETTINGS: BadgeSettings = {
  showAge: true,
  showCupBoobs: true,
  showCountry: true
};

const DEFAULT_FILTER_SETTINGS: FilterSettings = {
  minAge: 18,
  maxAge: 70,
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

export const Cache = {
  getProfile(url: string): PerformerProfile | null {
    const key = PROFILE_PREFIX + cleanUrl(url);
    const stored = GM_getValue<string | null>(key, null);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as PerformerProfile;
    } catch {
      return null;
    }
  },

  setProfile(url: string, profile: PerformerProfile): void {
    const key = PROFILE_PREFIX + cleanUrl(url);
    GM_setValue(key, JSON.stringify(profile));
  },

  getBadgeSettings(): BadgeSettings {
    const stored = GM_getValue<string | null>(BADGE_SETTINGS_KEY, null);
    if (!stored) return DEFAULT_BADGE_SETTINGS;
    try {
      return { ...DEFAULT_BADGE_SETTINGS, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_BADGE_SETTINGS;
    }
  },

  setBadgeSettings(settings: BadgeSettings): void {
    GM_setValue(BADGE_SETTINGS_KEY, JSON.stringify(settings));
  },

  getFilterSettings(): FilterSettings {
    const stored = GM_getValue<string | null>(FILTER_SETTINGS_KEY, null);
    if (!stored) return DEFAULT_FILTER_SETTINGS;
    try {
      return { ...DEFAULT_FILTER_SETTINGS, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_FILTER_SETTINGS;
    }
  },

  setFilterSettings(settings: FilterSettings, debounce = false): void {
    if (filterSettingsTimeout) clearTimeout(filterSettingsTimeout);
    if (debounce) {
      filterSettingsTimeout = setTimeout(() => {
        GM_setValue(FILTER_SETTINGS_KEY, JSON.stringify(settings));
      }, 300);
    } else {
      GM_setValue(FILTER_SETTINGS_KEY, JSON.stringify(settings));
    }
  },

  clearAllProfiles(): void {
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
      version: '1.0.0',
      exportedAt: Date.now(),
      settings: {},
      profiles: {}
    };

    allKeys.forEach((key: string) => {
      if (key.startsWith(PROFILE_PREFIX)) {
        const clean = key.substring(PROFILE_PREFIX.length);
        const val = GM_getValue<string | null>(key, null);
        if (val) {
          try {
            data.profiles[clean] = JSON.parse(val);
          } catch {}
        }
      } else if (key === BADGE_SETTINGS_KEY || key === FILTER_SETTINGS_KEY) {
        const val = GM_getValue<string | null>(key, null);
        if (val) {
          try {
            data.settings[key] = JSON.parse(val);
          } catch {}
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
          GM_setValue(key, JSON.stringify(profile));
        });
      }

      // Import settings
      if (data.settings && typeof data.settings === 'object') {
        Object.entries(data.settings).forEach(([key, val]) => {
          if (key === BADGE_SETTINGS_KEY || key === FILTER_SETTINGS_KEY) {
            GM_setValue(key, JSON.stringify(val));
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

function cleanUrl(url: string): string {
  return url.replace(/^\/babe\//, '').replace(/\/$/, '');
}

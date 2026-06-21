export interface AppSettings {
  model: string;
  apiKey: string;
  baseUrl: string;
  theme: 'light';
  accentColor: string;
  autocrawl: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  model: 'gemini-3.1-flash-lite',
  apiKey: '',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  theme: 'light',
  accentColor: '#dc2626',
  autocrawl: true,
};

const SETTINGS_KEY = 'priceStdz_settings';

export function getSettings(): AppSettings {
  try {
    const stored = GM_getValue(SETTINGS_KEY, null);
    if (stored) {
      // Merge with default settings to handle future additions gracefully
      return { ...DEFAULT_SETTINGS, ...(stored as Partial<AppSettings>) };
    }
  } catch (e) {
    console.error('Failed to read settings from GM storage:', e);
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: AppSettings): void {
  try {
    GM_setValue(SETTINGS_KEY, settings);
    window.dispatchEvent(new CustomEvent('settings-updated', { detail: settings }));
  } catch (e) {
    console.error('Failed to save settings to GM storage:', e);
  }
}

export interface AppSettings {
  model: string;
  apiKey: string;
  baseUrl: string;
  accentColor: string;
  autocrawl: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  model: 'gemini-2.0-flash',
  apiKey: '',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  accentColor: '#dc2626',
  autocrawl: true,
};

export function isGeminiUrl(baseUrl: string): boolean {
  return baseUrl.includes('googleapis.com');
}

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

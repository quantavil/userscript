import { BotState } from '../app/state.js';
import type { PanelPosition, SettingsData } from '../chess/types.js';
import { debounce } from '../shared/utils.js';
import { type PersistedSettingKey, persistedSettingKeys, settingsModel } from './model.js';
import { DEFAULT_SETTINGS, loadSettings } from './schema.js';

const STORAGE_KEY = 'scb_settings';

let menuPositionGetter: (() => PanelPosition | null) | null = null;

export function setMenuPositionGetter(getter: () => PanelPosition | null): void {
  menuPositionGetter = getter;
}

function readSetting<K extends PersistedSettingKey>(key: K): SettingsData[K] {
  return settingsModel[key] as SettingsData[K];
}

/** Write only keys that have a live accessor, so panel chrome is not grafted onto `BotState`. */
function applySettings(settings: SettingsData): void {
  for (const key of persistedSettingKeys()) {
    settingsModel[key] = settings[key] as never;
  }
  BotState.hackEnabled = false;
}

export const Settings = {
  save: debounce(() => {
    try {
      const preferences = Object.fromEntries(persistedSettingKeys().map((key) => [key, readSetting(key)])) as Record<
        PersistedSettingKey,
        SettingsData[PersistedSettingKey]
      >;
      const settings: SettingsData = {
        ...(preferences as unknown as Omit<SettingsData, 'hackEnabled' | 'menuPosition'>),
        hackEnabled: false,
        menuPosition: menuPositionGetter?.() ?? null,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }, 200),
  load(): SettingsData | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        BotState.hackEnabled = false;
        return null;
      }
      const settings = loadSettings(saved);
      applySettings(settings);
      return settings;
    } catch {
      const settings = { ...DEFAULT_SETTINGS };
      applySettings(settings);
      return settings;
    }
  },
};

/** Flush the debounced write on unload, or a change in the last 200 ms is lost. */
export function flushSettingsOnUnload(): void {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  window.addEventListener('pagehide', () => Settings.save.flush());
  window.addEventListener('beforeunload', () => Settings.save.flush());
}

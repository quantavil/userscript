import type { PreferenceKey, SettingsData } from '../chess/types.js';
import { DEFAULT_SETTINGS, SETTING_SPECS } from './schema.js';

/** Preferences with a live value. `hackEnabled` and `menuPosition` have none. */
export type PersistedSettingKey = Exclude<PreferenceKey, 'hackEnabled' | 'menuPosition'>;

const PERSISTED_KEYS = SETTING_SPECS.filter((spec) => spec.persisted).map((spec) => spec.key) as PersistedSettingKey[];

if (PERSISTED_KEYS.length !== SETTING_SPECS.length - 1) {
  throw new Error('settings table must mark exactly one non-persisted field: hackEnabled');
}

/** The live preference store, shared by `BotState`, the scheduler and persistence. */
export const settingsModel = Object.fromEntries(PERSISTED_KEYS.map((key) => [key, DEFAULT_SETTINGS[key]])) as Record<
  PersistedSettingKey,
  SettingsData[PersistedSettingKey]
>;

export function persistedSettingKeys(): readonly PersistedSettingKey[] {
  return PERSISTED_KEYS;
}

export function resetSettingsModel(): void {
  for (const key of PERSISTED_KEYS) {
    settingsModel[key] = DEFAULT_SETTINGS[key] as never;
  }
}

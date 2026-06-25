import { Settings } from './types';
import { DEFAULT_SETTINGS } from './constants';

export let settings: Settings = { ...DEFAULT_SETTINGS };

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('cu-settings');
    if (raw) {
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } else {
      settings = { ...DEFAULT_SETTINGS };
    }
  } catch (_) {
    settings = { ...DEFAULT_SETTINGS };
  }
  return settings;
}

export function saveSettings(): void {
  try {
    localStorage.setItem('cu-settings', JSON.stringify(settings));
  } catch (_) {}
}

export function resetSettings(): void {
  settings = { ...DEFAULT_SETTINGS };
  saveSettings();
}

export function updateSettings(newSettings: Partial<Settings>): void {
  settings = { ...settings, ...newSettings };
  saveSettings();
}

export function getIgnoreFolders(): Set<string> {
  return new Set(settings.ignoreFolders.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
}

export function getIgnoreExts(): Set<string> {
  return new Set(settings.ignoreExts.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
}

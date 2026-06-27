import { Settings } from './types';
import { DEFAULT_SETTINGS } from './constants';

export let settings: Settings = { ...DEFAULT_SETTINGS };

export let ignoreFoldersSet = new Set<string>();
export let ignoreExtsSet = new Set<string>();

export function updateCachedSettings(): void {
  ignoreFoldersSet = new Set(settings.ignoreFolders.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
  ignoreExtsSet = new Set(settings.ignoreExts.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('cu-settings');
    if (raw) {
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } else {
      settings = { ...DEFAULT_SETTINGS };
    }
  } catch (e) {
    console.warn('[Codebase Uploader] Failed to load settings:', e);
    settings = { ...DEFAULT_SETTINGS };
  }
  updateCachedSettings();
  return settings;
}

export function saveSettings(): void {
  try {
    localStorage.setItem('cu-settings', JSON.stringify(settings));
  } catch (e) {
    console.warn('[Codebase Uploader] Failed to save settings:', e);
  }
  updateCachedSettings();
}

export function resetSettings(): void {
  settings = { ...DEFAULT_SETTINGS };
  saveSettings();
}

export function getIgnoreFolders(): Set<string> {
  return ignoreFoldersSet;
}

export function getIgnoreExts(): Set<string> {
  return ignoreExtsSet;
}

loadSettings();

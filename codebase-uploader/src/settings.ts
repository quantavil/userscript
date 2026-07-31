import { Settings } from './types';
import { DEFAULT_SETTINGS } from './constants';

export let settings: Settings = { ...DEFAULT_SETTINGS };

export let ignoreFoldersSet = new Set<string>();
export let ignoreExtsSet = new Set<string>();

function updateCachedSettings(): void {
  ignoreFoldersSet = new Set(settings.ignoreFolders.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
  ignoreExtsSet = new Set(settings.ignoreExts.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
}

function loadSettings(): void {
  try {
    const raw = localStorage.getItem('cu-settings');
    if (raw) settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('[Codebase Uploader] Failed to load settings:', e);
  }
  updateCachedSettings();
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

loadSettings();

import { describe, it, expect, beforeEach } from 'vitest';
import { settings, loadSettings, saveSettings, resetSettings, ignoreFoldersSet, ignoreExtsSet } from '../src/settings';
import { DEFAULT_SETTINGS } from '../src/constants';

describe('settings module', () => {
  beforeEach(() => {
    resetSettings();
  });

  it('initializes with default settings', () => {
    expect(settings.maxChunks).toBe(DEFAULT_SETTINGS.maxChunks);
    expect(settings.maxFileBytes).toBe(DEFAULT_SETTINGS.maxFileBytes);
    expect(settings.maxChunkChars).toBe(DEFAULT_SETTINGS.maxChunkChars);
    expect(settings.shortcutKey).toBe('u');
    expect(settings.skipHidden).toBe(true);
    expect(settings.includeBinary).toBe(false);
  });

  it('updates sets when ignore string settings change', () => {
    settings.ignoreFolders = 'node_modules, custom_dir';
    settings.ignoreExts = '.png, .custom_ext';
    saveSettings();

    expect(ignoreFoldersSet.has('node_modules')).toBe(true);
    expect(ignoreFoldersSet.has('custom_dir')).toBe(true);
    expect(ignoreExtsSet.has('.png')).toBe(true);
    expect(ignoreExtsSet.has('.custom_ext')).toBe(true);
  });

  it('persists and loads settings from localStorage', () => {
    settings.maxChunks = 25;
    settings.shortcutKey = 'k';
    saveSettings();

    // Reset settings in memory and reload from storage
    loadSettings();

    expect(settings.maxChunks).toBe(25);
    expect(settings.shortcutKey).toBe('k');
  });

  it('resets settings back to default values', () => {
    settings.maxChunks = 99;
    settings.shortcutKey = 'z';
    saveSettings();

    resetSettings();

    expect(settings.maxChunks).toBe(DEFAULT_SETTINGS.maxChunks);
    expect(settings.shortcutKey).toBe(DEFAULT_SETTINGS.shortcutKey);
  });
});

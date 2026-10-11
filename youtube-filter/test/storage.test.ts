import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY } from '../src/config';
import { getDefaultFilters, loadFilters, loadProfiles, saveFilters, saveProfiles } from '../src/storage';
import type { FilterProfile, FilterState } from '../src/types';

describe('storage.ts', () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    const storageMock = {
      getItem: (key: string) => mockStore[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStore[key] = String(value);
      },
      removeItem: (key: string) => {
        delete mockStore[key];
      },
      clear: () => {
        mockStore = {};
      }
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: storageMock,
      writable: true,
      configurable: true
    });
  });

  it('returns default filters when storage is empty', () => {
    const filters = loadFilters();
    expect(filters).toEqual(getDefaultFilters());
    expect(filters.maxViews).toBe(Infinity);
    expect(filters.maxDays).toBe(Infinity);
    expect(filters.maxDuration).toBe(Infinity);
    expect(filters.watchedMode).toBe('dim');
    expect(filters.enabled).toBe(false);
  });

  it('serializes Infinity to null and deserializes back to Infinity', () => {
    const sample: FilterState = {
      minViews: 500,
      maxViews: Infinity,
      minDays: 0,
      maxDays: Infinity,
      minDuration: 10,
      maxDuration: Infinity,
      keywordBlacklist: ['prank', 'reaction'],
      channelBlacklist: ['SpamChannel'],
      channelWhitelist: ['FavoriteCreator'],
      watchedMode: 'dim',
      hideShorts: true,
      hidePosts: true,
      activeProfile: 'Default',
      enabled: true
    };

    saveFilters(sample);

    const rawInStorage = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(rawInStorage.maxViews).toBeNull();
    expect(rawInStorage.maxDays).toBeNull();
    expect(rawInStorage.maxDuration).toBeNull();
    expect(rawInStorage.minViews).toBe(500);
    expect(rawInStorage.minDuration).toBe(10);
    expect(rawInStorage.keywordBlacklist).toEqual(['prank', 'reaction']);
    expect(rawInStorage.channelBlacklist).toEqual(['SpamChannel']);
    expect(rawInStorage.channelWhitelist).toEqual(['FavoriteCreator']);
    expect(rawInStorage.watchedMode).toBe('dim');
    expect(rawInStorage.hideShorts).toBe(true);
    expect(rawInStorage.hidePosts).toBe(true);
    expect(rawInStorage.enabled).toBe(true);

    const loaded = loadFilters();
    expect(loaded.maxViews).toBe(Infinity);
    expect(loaded.maxDays).toBe(Infinity);
    expect(loaded.maxDuration).toBe(Infinity);
    expect(loaded.minViews).toBe(500);
    expect(loaded.minDuration).toBe(10);
    expect(loaded.keywordBlacklist).toEqual(['prank', 'reaction']);
    expect(loaded.channelBlacklist).toEqual(['SpamChannel']);
    expect(loaded.channelWhitelist).toEqual(['FavoriteCreator']);
    expect(loaded.watchedMode).toBe('dim');
    expect(loaded.hideShorts).toBe(true);
    expect(loaded.hidePosts).toBe(true);
    expect(loaded.enabled).toBe(true);
  });

  it('safely recovers defaults when storage contains malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{invalid json');
    const loaded = loadFilters();
    expect(loaded).toEqual(getDefaultFilters());
  });

  it('loads and saves custom profiles', () => {
    const defaultProfiles = loadProfiles();
    expect(defaultProfiles.length).toBeGreaterThan(0);

    const customProfile: FilterProfile = {
      name: 'My Custom Profile',
      minViews: 10000,
      maxViews: Infinity,
      minDays: 0,
      maxDays: 30,
      minDuration: 5,
      maxDuration: 60,
      keywordBlacklist: ['shorts'],
      channelBlacklist: [],
      channelWhitelist: ['Fireship'],
      watchedMode: 'dim',
      hideShorts: true,
      hidePosts: false
    };

    saveProfiles([...defaultProfiles, customProfile]);

    const reloaded = loadProfiles();
    expect(reloaded.some((p) => p.name === 'My Custom Profile')).toBe(true);
    const found = reloaded.find((p) => p.name === 'My Custom Profile');
    expect(found?.hideShorts).toBe(true);
    expect(found?.hidePosts).toBe(false);
  });
});

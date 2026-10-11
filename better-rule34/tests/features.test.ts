import { beforeEach, describe, expect, it } from 'bun:test';
import { pickTop } from '../src/autoplay';
import { shouldNewTabClick } from '../src/newtab';
import { videoIdFromHref } from '../src/parse';
import {
  loadFilter,
  nearestPreset,
  RATING_PRESETS,
  ratingLabel,
  VIEWS_PRESETS,
  viewsLabel,
} from '../src/sheetfilter';
import { createCoverageTracker, watchIdFromPath } from '../src/watchtrack';
import {
  isWatched,
  markWatched,
  MAX_RECORDS,
  parseWatchMap,
  pruneWatchMap,
  setWatchStoreForTests,
  toggleWatched,
  unmarkWatched,
  type KeyValueStore,
} from '../src/watchstore';

function memStore(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  };
}

describe('new tab clicks', () => {
  const plain = { button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false };

  it('intercepts only plain left clicks', () => {
    expect(shouldNewTabClick(plain)).toBe(true);
    expect(shouldNewTabClick({ ...plain, button: 1 })).toBe(false);
    expect(shouldNewTabClick({ ...plain, ctrlKey: true })).toBe(false);
  });
});

describe('video ids', () => {
  it('reads ids from card hrefs and watch paths', () => {
    expect(videoIdFromHref('/video/4655090/built-for-bbc-pmv-hmv/')).toBe('4655090');
    expect(videoIdFromHref('/videos/4655090/built-for-bbc-pmv-hmv/')).toBe('4655090');
    expect(watchIdFromPath('/video/4490089/original-character-luo-liuyuan/')).toBe('4490089');
    expect(watchIdFromPath('/videos/4490089/original-character-luo-liuyuan/')).toBe('4490089');
    expect(watchIdFromPath('/')).toBeNull();
    expect(watchIdFromPath('/tags/12/')).toBeNull();
  });
});

describe('autoplay selection', () => {
  it('takes the most visible items above the threshold, capped', () => {
    const items = [
      { item: 'a', ratio: 0.2 },
      { item: 'b', ratio: 0.9 },
      { item: 'c', ratio: 0.7 },
      { item: 'd', ratio: 0.65 },
      { item: 'e', ratio: 1 },
    ];
    expect(pickTop(items, 2, 0.6)).toEqual(['e', 'b']);
    expect(pickTop(items, 10, 0.6)).toEqual(['e', 'b', 'c', 'd']);
    expect(pickTop(items, 0, 0.6)).toEqual([]);
  });
});

describe('sheet filter choices', () => {
  it('loads saved choices and falls back to Any when unreadable', () => {
    expect(loadFilter(null)).toEqual({ minRating: 0, minViews: 0 });
    expect(loadFilter('not json')).toEqual({ minRating: 0, minViews: 0 });
    expect(loadFilter(JSON.stringify({ minRating: 'x', minViews: null }))).toEqual({ minRating: 0, minViews: 0 });
  });

  it('snaps saved values to the nearest choice and clamps out-of-range ones', () => {
    expect(loadFilter(JSON.stringify({ minRating: 78, minViews: 4000 }))).toEqual({ minRating: 80, minViews: 5000 });
    expect(loadFilter(JSON.stringify({ minRating: 500, minViews: -5 }))).toEqual({ minRating: 95, minViews: 0 });
    expect(nearestPreset(999999, VIEWS_PRESETS)).toBe(500000);
    expect(nearestPreset(72000, VIEWS_PRESETS)).toBe(75000);
    expect(nearestPreset(300, VIEWS_PRESETS)).toBe(0);
    expect(RATING_PRESETS).toEqual([0, 50, 60, 70, 75, 80, 85, 90, 95]);
    expect(VIEWS_PRESETS).toEqual([0, 1000, 5000, 10000, 25000, 50000, 75000, 100000, 250000, 500000]);
  });

  it('ignores the removed sound and autoplay settings', () => {
    expect(loadFilter(JSON.stringify({ minRating: 70, soundOnly: true, autoplay: false }))).toEqual({
      minRating: 70,
      minViews: 0,
    });
  });

  it('labels choices', () => {
    expect(ratingLabel(0)).toBe('Any');
    expect(ratingLabel(80)).toBe('80%+');
    expect(viewsLabel(0)).toBe('Any');
    expect(viewsLabel(5000)).toBe('5K+');
    expect(viewsLabel(1_000_000)).toBe('1M+');
  });
});

describe('coverage tracker', () => {
  it('reaches 85% of the duration during continuous playback', () => {
    const tracker = createCoverageTracker(100);
    const results: boolean[] = [];
    for (let s = 0; s <= 90; s++) results.push(tracker.update(s, true));
    expect(results.indexOf(true)).toBe(84);
    expect(results.filter(Boolean).length).toBe(1);
  });

  it('does not count seeks or paused time', () => {
    const tracker = createCoverageTracker(100);
    tracker.update(0, true);
    tracker.update(1, true);
    expect(tracker.update(90, true)).toBe(false);
    expect(tracker.covered).toBe(3);
    expect(tracker.update(0, false)).toBe(false);
  });
});

describe('watch store', () => {
  beforeEach(() => {
    setWatchStoreForTests(memStore());
  });

  it('marks, unmarks, and toggles', () => {
    expect(isWatched('123')).toBe(false);
    markWatched('123');
    expect(isWatched('123')).toBe(true);
    unmarkWatched('123');
    expect(isWatched('123')).toBe(false);
    expect(toggleWatched('123')).toBe(true);
    expect(toggleWatched('123')).toBe(false);
  });

  it('ignores ids that are not numeric', () => {
    markWatched('../evil');
    expect(isWatched('../evil')).toBe(false);
  });

  it('treats bad storage as empty and keeps only valid records', () => {
    expect(parseWatchMap('not json')).toEqual({});
    expect(parseWatchMap('[1,2]')).toEqual({});
    expect(
      parseWatchMap(JSON.stringify({ '1': { at: 5, manual: true }, x: { at: 1 }, '2': { at: 'no' } })),
    ).toEqual({ '1': { at: 5, manual: true } });
  });

  it('prunes to the newest records', () => {
    const map = {
      '1': { at: 1, manual: false },
      '2': { at: 3, manual: false },
      '3': { at: 2, manual: false },
    };
    expect(Object.keys(pruneWatchMap(map, 2)).sort()).toEqual(['2', '3']);
    expect(MAX_RECORDS).toBeGreaterThan(0);
  });
});

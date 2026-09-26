import { describe, expect, it } from 'bun:test';
import {
  canonicalListKey,
  clearBookmark,
  deleteSector,
  deleteVideo,
  exportArchiveJson,
  findSector,
  formatSectorTitleFromUrl,
  getBookmark,
  getSectors,
  getTotalBookmarkCount,
  getVideos,
  importArchiveJson,
  isVideoSaved,
  saveSector,
  saveVideo,
  setBookmark,
  type BookmarkStore,
} from '../src/bookmark';
import { shouldNewTabClick } from '../src/newtab';
import { videoIdFromHref, viewsToNearestStep } from '../src/parse';

function memStore(): BookmarkStore {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

const origin = 'https://rule34video.com';

describe('videoIdFromHref', () => {
  it('extracts numeric ids and rejects non-video hrefs', () => {
    expect(videoIdFromHref('/video/12345/slug/')).toBe('12345');
    expect(videoIdFromHref(`${origin}/video/987/`)).toBe('987');
    expect(videoIdFromHref('/latest-updates/2/')).toBe('');
    expect(videoIdFromHref('')).toBe('');
  });
});

describe('viewsToNearestStep', () => {
  const steps = [0, 1000, 5000, 10000, 25000, 50000, 100000];
  it('snaps exact, near, and migrated values to the closest step', () => {
    expect(viewsToNearestStep(5000, steps)).toBe(2);
    expect(viewsToNearestStep(90000, steps)).toBe(6);
    expect(viewsToNearestStep(1000000, steps)).toBe(6);
    expect(viewsToNearestStep(0, steps)).toBe(0);
  });
});

describe('shouldNewTabClick', () => {
  it('intercepts only plain left-clicks', () => {
    const plain = { button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false };
    expect(shouldNewTabClick(plain)).toBe(true);
    expect(shouldNewTabClick({ ...plain, button: 1 })).toBe(false);
    expect(shouldNewTabClick({ ...plain, ctrlKey: true })).toBe(false);
    expect(shouldNewTabClick({ ...plain, metaKey: true })).toBe(false);
    expect(shouldNewTabClick({ ...plain, shiftKey: true })).toBe(false);
  });
});

describe('canonicalListKey', () => {
  it('strips page params and trailing page segments, sorts the rest', () => {
    expect(canonicalListKey(`${origin}`)).toBe('/latest-updates/');
    expect(canonicalListKey(`${origin}/`)).toBe('/latest-updates/');
    expect(canonicalListKey(`${origin}/latest-updates/`)).toBe('/latest-updates/');
    expect(canonicalListKey(`${origin}/latest-updates/3/?from_videos=3`)).toBe('/latest-updates/');
    expect(canonicalListKey(`${origin}/latest-updates/32/`)).toBe('/latest-updates/');
    expect(canonicalListKey(`${origin}/search/?q=a&from_videos=48&q=a`)).toBe('/search/?q=a&q=a');
    expect(canonicalListKey(`${origin}/search/?q=overwatch&from_videos+from_albums=32`)).toBe('/search/?q=overwatch');
    expect(canonicalListKey(`${origin}/tags/futa/2/`)).toBe('/tags/futa/');
    // Preserves tag ID while stripping page number
    expect(canonicalListKey(`${origin}/tags/5568/`)).toBe('/tags/5568/');
    expect(canonicalListKey(`${origin}/tags/5568/2/`)).toBe('/tags/5568/');
    expect(canonicalListKey(`${origin}/tags/5568/32/`)).toBe('/tags/5568/');
    // Preserves category slug while stripping page number
    expect(canonicalListKey(`${origin}/categories/ben-10/`)).toBe('/categories/ben-10/');
    expect(canonicalListKey(`${origin}/categories/ben-10/2/`)).toBe('/categories/ben-10/');
  });
});

describe('bookmark store', () => {
  it('round-trips one bookmark per listing key', () => {
    const store = memStore();
    expect(getBookmark('/latest-updates/', store)).toBeNull();
    setBookmark('/latest-updates/', { page: 4, url: `${origin}/latest-updates/4/` }, store);
    expect(getBookmark('/latest-updates/', store)).toEqual({
      page: 4,
      url: `${origin}/latest-updates/4/`,
    });
    // Other listings are independent
    expect(getBookmark('/search/?q=a', store)).toBeNull();
    clearBookmark('/latest-updates/', store);
    expect(getBookmark('/latest-updates/', store)).toBeNull();
  });

  it('rejects invalid bookmarks', () => {
    const store = memStore();
    setBookmark('/x/', { page: 0, url: `${origin}/x/` }, store);
    setBookmark('/x/', { page: 2, url: '' }, store);
    setBookmark('', { page: 2, url: `${origin}/x/` }, store);
    expect(getBookmark('/x/', store)).toBeNull();
  });
});

describe('multi-sector bookmarks', () => {
  it('supports multiple page bookmarks per listing and across listings', () => {
    const store = memStore();
    saveSector(
      {
        listKey: '/tags/futa/',
        title: 'TAG // FUTA',
        url: `${origin}/tags/futa/4/`,
        page: 4,
      },
      store,
    );
    saveSector(
      {
        listKey: '/tags/futa/',
        title: 'TAG // FUTA',
        url: `${origin}/tags/futa/18/`,
        page: 18,
      },
      store,
    );
    saveSector(
      {
        listKey: '/search/?q=overwatch',
        title: 'SEARCH // OVERWATCH [POST_DATE]',
        url: `${origin}/search/overwatch/?sort_by=post_date&from_videos=2`,
        page: 2,
        sortBy: 'post_date',
      },
      store,
    );

    const sectors = getSectors(store);
    expect(sectors.length).toBe(3);
    expect(findSector('/tags/futa/', 4, store)).not.toBeNull();
    expect(findSector('/tags/futa/', 18, store)).not.toBeNull();
    expect(findSector('/tags/futa/', 99, store)).toBeNull();

    const targetId = findSector('/tags/futa/', 4, store)!.id;
    deleteSector(targetId, store);
    expect(getSectors(store).length).toBe(2);
    expect(findSector('/tags/futa/', 4, store)).toBeNull();
  });
});

describe('video bookmarks (watch later)', () => {
  it('saves, checks, deletes, and counts video bookmarks', () => {
    const store = memStore();
    expect(isVideoSaved('12345', store)).toBe(false);

    saveVideo(
      {
        id: '12345',
        title: 'Overwatch SFM Animation',
        url: `${origin}/video/12345/overwatch/`,
        thumbUrl: 'https://thumb.jpg',
        durationFormatted: '5:30',
        ratingPercent: 96,
        viewsFormatted: '25K',
      },
      store,
    );

    expect(isVideoSaved('12345', store)).toBe(true);
    expect(getVideos(store).length).toBe(1);
    expect(getTotalBookmarkCount(store)).toBe(1);

    deleteVideo('12345', store);
    expect(isVideoSaved('12345', store)).toBe(false);
    expect(getVideos(store).length).toBe(0);
    expect(getTotalBookmarkCount(store)).toBe(0);
  });
});

describe('formatSectorTitleFromUrl', () => {
  it('formats human-readable cyber badges', () => {
    expect(formatSectorTitleFromUrl(`${origin}/`)).toBe('FEED // LATEST');
    expect(formatSectorTitleFromUrl(`${origin}/latest-updates/`)).toBe('FEED // LATEST');
    expect(formatSectorTitleFromUrl(`${origin}/tags/futa/`)).toBe('TAG // FUTA');
    expect(formatSectorTitleFromUrl(`${origin}/categories/3d/`)).toBe('CATEGORY // 3D');
    expect(formatSectorTitleFromUrl(`${origin}/search/overwatch/?sort_by=post_date`)).toBe(
      'SEARCH // OVERWATCH [POST_DATE]',
    );
  });
});

describe('archive export and import', () => {
  it('exports and imports archive JSON without duplicate ids', () => {
    const store = memStore();
    saveSector(
      {
        listKey: '/tags/futa/',
        title: 'TAG // FUTA',
        url: `${origin}/tags/futa/2/`,
        page: 2,
      },
      store,
    );
    saveVideo(
      {
        id: '999',
        title: 'Test Video',
        url: `${origin}/video/999/test/`,
        thumbUrl: '',
        durationFormatted: '1:00',
        ratingPercent: 90,
        viewsFormatted: '1K',
      },
      store,
    );

    const exported = exportArchiveJson(store);
    const store2 = memStore();
    const result = importArchiveJson(exported, store2);
    expect(result.success).toBe(true);
    expect(result.sectorsAdded).toBe(1);
    expect(result.videosAdded).toBe(1);
    expect(getSectors(store2).length).toBe(1);
    expect(getVideos(store2).length).toBe(1);

    // Importing again skips duplicates
    const result2 = importArchiveJson(exported, store2);
    expect(result2.sectorsAdded).toBe(0);
    expect(result2.videosAdded).toBe(0);
  });
});

import { describe, expect, it } from 'bun:test';
import {
  appendPageToPath,
  isPaginationKey,
  pageNumberFromPath,
  stripPageSegment,
} from '../src/routes';
import { resolveNextPageUrl } from '../src/parse';
import { computeNextPageUrl } from '../src/autopager';

describe('isPaginationKey', () => {
  it('matches offset/page keys but never filter keys', () => {
    for (const k of ['from', 'from_videos', 'from_albums', 'from_videos from_albums', 'page', 'p']) {
      expect(isPaginationKey(k)).toBe(true);
    }
    for (const k of ['post_date_from', 'duration_from', 'q', 'sort_by', 'duration_to']) {
      expect(isPaginationKey(k)).toBe(false);
    }
  });
});

describe('stripPageSegment', () => {
  it('strips trailing page numbers, keeps entity ids and plain paths', () => {
    expect(stripPageSegment('/latest-updates/32/')).toBe('/latest-updates/');
    expect(stripPageSegment('/latest-updates/')).toBe('/latest-updates/');
    expect(stripPageSegment('/tags/futa/2/')).toBe('/tags/futa/');
    expect(stripPageSegment('/tags/5568/')).toBe('/tags/5568/');
    expect(stripPageSegment('/categories/ben-10/2/')).toBe('/categories/ben-10/');
    expect(stripPageSegment('/video/123/slug/')).toBe('/video/123/slug/');
    expect(stripPageSegment('/')).toBe('/');
  });
});

describe('pageNumberFromPath', () => {
  it('reads trailing page numbers from listing paths only', () => {
    expect(pageNumberFromPath('/latest-updates/2/')).toBe(2);
    expect(pageNumberFromPath('/tags/futa/2/')).toBe(2);
    expect(pageNumberFromPath('/latest-updates/')).toBeNull();
    expect(pageNumberFromPath('/tags/5568/')).toBeNull();
    expect(pageNumberFromPath('/video/123/')).toBeNull();
  });
});

describe('appendPageToPath', () => {
  it('builds the next page path preserving the listing base', () => {
    expect(appendPageToPath('/', 2)).toBe('/latest-updates/2/');
    expect(appendPageToPath('/latest-updates/', 3)).toBe('/latest-updates/3/');
    expect(appendPageToPath('/latest-updates/32/', 3)).toBe('/latest-updates/3/');
    expect(appendPageToPath('/tags/futa/', 5)).toBe('/tags/futa/5/');
    expect(appendPageToPath('/tags/futa/2/', 5)).toBe('/tags/futa/5/');
  });
});

describe('resolveNextPageUrl pagination hygiene', () => {
  it('drops stale offsets but keeps active filters', () => {
    expect(resolveNextPageUrl('https://rule34video.com/latest-updates/?from_videos=32', '/latest-updates/3/')).toBe(
      'https://rule34video.com/latest-updates/3/',
    );
    expect(
      resolveNextPageUrl(
        'https://rule34video.com/latest-updates/?post_date_from=2026-01-01&from_videos=32',
        '/latest-updates/2/',
      ),
    ).toBe('https://rule34video.com/latest-updates/2/?post_date_from=2026-01-01');
  });
});

describe('computeNextPageUrl', () => {
  it('injects sort_by and page correctly for search and entity routes', () => {
    expect(computeNextPageUrl('https://rule34video.com/search/overwatch/', 2, 'post_date')).toBe(
      'https://rule34video.com/search/overwatch/?sort_by=post_date&from_videos=2',
    );
    expect(computeNextPageUrl('https://rule34video.com/tags/futa/', 3, 'video_viewed')).toBe(
      'https://rule34video.com/tags/futa/3/?sort_by=video_viewed',
    );
    expect(computeNextPageUrl('https://rule34video.com/latest-updates/?sort_by=post_date', 4, '')).toBe(
      'https://rule34video.com/latest-updates/4/',
    );
  });
});

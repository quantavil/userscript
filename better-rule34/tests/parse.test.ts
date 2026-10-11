import { describe, expect, it } from 'bun:test';
import { parseNextLink } from '../src/autopager';
import {
  DEFAULT_FILTER,
  isAdCard,
  matchesClientFilter,
  parseKvsParameters,
  parseRatingPercent,
  parseViews,
  resolveNextPageUrl,
} from '../src/parse';
import type { CardData } from '../src/types';

describe('parsers', () => {
  it('parses views and ratings, and returns null for unreadable text', () => {
    expect(parseViews('4.9K')).toBe(4900);
    expect(parseViews('1.5M')).toBe(1500000);
    expect(parseViews('1,234')).toBe(1234);
    expect(parseViews('')).toBeNull();
    expect(parseViews('n/a')).toBeNull();
    expect(parseRatingPercent('81% (666)')).toBe(81);
    expect(parseRatingPercent('100%')).toBe(100);
    expect(parseRatingPercent('')).toBeNull();
    expect(parseRatingPercent('no votes')).toBeNull();
  });

  it('reads the page offset but never mistakes a date filter for one', () => {
    expect(parseKvsParameters('sort_by:video_viewed;from:2')).toEqual({ fromParam: 2, sortBy: 'video_viewed' });
    expect(parseKvsParameters('q:x;from_videos+from_albums:33')).toEqual({ fromParam: 33, sortBy: null });
    expect(parseKvsParameters('post_date_from:2026-01-01;sort_by:post_date')).toEqual({
      fromParam: null,
      sortBy: 'post_date',
    });
    expect(parseKvsParameters('')).toEqual({ fromParam: null, sortBy: null });
  });

  it('preserves query parameters on next page URL resolution', () => {
    const current = 'https://rule34video.com/latest-updates/?post_date_from=2026-01-01';
    expect(resolveNextPageUrl(current, '/latest-updates/2/')).toBe(
      'https://rule34video.com/latest-updates/2/?post_date_from=2026-01-01',
    );
  });

  it('parses next link from DOM or data-parameters with various from prefixes and preserves sort_by', () => {
    const el1 = {
      querySelector: () => ({
        getAttribute: (attr: string) => (attr === 'data-parameters' ? 'q:overwatch;sort_by:;from_videos+from_albums:33' : '#search'),
      }),
    } as unknown as Element;
    expect(parseNextLink(el1, 'https://rule34video.com/search/overwatch/')).toEqual({
      url: 'https://rule34video.com/search/overwatch/?from_videos=33',
      fromParam: 33,
      sortBy: null,
    });

    const elSort = {
      querySelector: () => ({
        getAttribute: (attr: string) => (attr === 'data-parameters' ? 'q:overwatch;sort_by:post_date;from_videos+from_albums:2' : '#search'),
      }),
    } as unknown as Element;
    expect(parseNextLink(elSort, 'https://rule34video.com/search/overwatch/')).toEqual({
      url: 'https://rule34video.com/search/overwatch/?sort_by=post_date&from_videos=2',
      fromParam: 2,
      sortBy: 'post_date',
    });

    const elTag = {
      querySelector: () => ({
        getAttribute: (attr: string) => (attr === 'data-parameters' ? 'sort_by:video_viewed;from:2' : '#videos'),
      }),
    } as unknown as Element;
    expect(parseNextLink(elTag, 'https://rule34video.com/tags/overwatch/')).toEqual({
      url: 'https://rule34video.com/tags/overwatch/2/?sort_by=video_viewed',
      fromParam: 2,
      sortBy: 'video_viewed',
    });

    const el2 = {
      querySelector: () => ({
        getAttribute: (attr: string) => (attr === 'href' ? '/latest-updates/33/' : null),
      }),
    } as unknown as Element;
    expect(parseNextLink(el2, 'https://rule34video.com/latest-updates/32/')).toEqual({
      url: 'https://rule34video.com/latest-updates/33/',
      fromParam: null,
      sortBy: null,
    });
  });
});

describe('matchesClientFilter', () => {
  const card: CardData = { id: '1', ratingPercent: 95, viewsCount: 5000 };

  it('applies the rating and views minimums', () => {
    expect(matchesClientFilter(card, DEFAULT_FILTER)).toBe(true);
    expect(matchesClientFilter(card, { ...DEFAULT_FILTER, minRating: 98 })).toBe(false);
    expect(matchesClientFilter(card, { ...DEFAULT_FILTER, minViews: 10000 })).toBe(false);
    expect(matchesClientFilter(card, { minViews: 1000, minRating: 90 })).toBe(true);
  });

  it('never hides a card whose rating or views could not be read', () => {
    const unreadable: CardData = { id: '2', ratingPercent: null, viewsCount: null };
    expect(matchesClientFilter(unreadable, { minRating: 90, minViews: 50000 })).toBe(true);
  });
});

describe('isAdCard', () => {
  interface MockElOptions {
    classes?: string[];
    closestSpots?: boolean;
    iframe?: boolean;
    headerText?: string;
    href?: string;
    dataset?: Record<string, string>;
  }

  function makeMockCard(opts: MockElOptions): HTMLElement {
    return {
      classList: {
        contains: (c: string) => opts.classes?.includes(c) ?? false,
      },
      closest: (sel: string) => (sel === '.spots' && opts.closestSpots ? ({} as HTMLElement) : null),
      querySelector: (sel: string) => {
        if (sel === 'iframe') return opts.iframe ? ({} as HTMLIFrameElement) : null;
        if (sel === 'header') return opts.headerText !== undefined ? ({ textContent: opts.headerText } as HTMLElement) : null;
        if (sel.includes('a')) {
          return opts.href !== undefined
            ? ({ getAttribute: (attr: string) => (attr === 'href' ? opts.href : null) } as unknown as HTMLAnchorElement)
            : null;
        }
        return null;
      },
      dataset: opts.dataset ?? {},
    } as unknown as HTMLElement;
  }

  it('detects sponsored/ad cards', () => {
    expect(isAdCard(makeMockCard({ classes: ['spot-thumb'] }))).toBe(true);
    expect(isAdCard(makeMockCard({ closestSpots: true }))).toBe(true);
    expect(isAdCard(makeMockCard({ headerText: 'AD' }))).toBe(true);
    expect(isAdCard(makeMockCard({ headerText: 'SPONSOR' }))).toBe(true);
    expect(isAdCard(makeMockCard({ iframe: true }))).toBe(true);
    expect(isAdCard(makeMockCard({ href: 'https://engine.sadbaguette.com/click' }))).toBe(true);
    expect(isAdCard(makeMockCard({ href: '/v1/d.php?z=123' }))).toBe(true);
    expect(isAdCard(makeMockCard({ href: 'https://s.ku34bh9la09.com/traffic' }))).toBe(true);
    expect(isAdCard(makeMockCard({ href: 'https://external-adnetwork.com/click' }))).toBe(true);
  });

  it('never falsely flags legitimate non-video or album cards as ads', () => {
    // Album cards
    expect(isAdCard(makeMockCard({ href: '/album/123/my-album/' }))).toBe(false);
    expect(isAdCard(makeMockCard({ href: 'https://rule34video.com/album/123/my-album/' }))).toBe(false);
    // Playlist cards
    expect(isAdCard(makeMockCard({ href: '/playlist/456/best-clips/' }))).toBe(false);
    // Regular video cards
    expect(isAdCard(makeMockCard({ dataset: { videoCardId: '123' }, href: '/video/123/clip/' }))).toBe(false);
    expect(isAdCard(makeMockCard({ href: '/video/123/clip/' }))).toBe(false);
    expect(isAdCard(makeMockCard({ href: 'https://rule34video.com/video/123/clip/' }))).toBe(false);
  });
});

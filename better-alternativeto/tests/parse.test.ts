import { describe, expect, test } from 'bun:test';
import {
  EMPTY_FILTER,
  activeFacets,
  extractLinks,
  isFilterActive,
  matchesFilter,
  parseLikes,
  slugFromHref,
  urlWithoutFacet,
  type CardData,
} from '../src/parse';

/** Verbatim shape of the RSC flight payload, taken from a live response. */
const RSC_SAMPLE =
  'a:{"pageType":"AppAbout"},"mainItem":{"pricingInfoHtml":"","categories":[{"name":"Development"}],' +
  '"features":[],"properties":[],' +
  '"externalLinks":[{"name":"Official Website","url":"https://sencho.io","type":"Official"},' +
  '{"name":"X","url":"https://x.com/Sencho_docker","type":"Social"},' +
  '{"name":"GitHub","url":"https://github.com/Studio-Saelix/sencho","type":"Source"}],' +
  '"platformsWithNote":[],"codeLanguageItem":{"id":"30418"}}';

describe('extractLinks', () => {
  test('pulls the array out of a flight payload', () => {
    const links = extractLinks(RSC_SAMPLE);
    expect(links).toHaveLength(3);
    expect(links[0]).toEqual({ name: 'Official Website', url: 'https://sencho.io', type: 'Official' });
    expect(links.map((l) => l.type)).toEqual(['Official', 'Social', 'Source']);
  });

  test('keeps extra fields such as linkImage', () => {
    const [link] = extractLinks(
      '"externalLinks":[{"name":"Google Play Store","url":"https://play.google.com/x","linkImage":"android-store.svg","type":"Appstore"}]',
    );
    expect(link.url).toBe('https://play.google.com/x');
    expect(link.type).toBe('Appstore');
  });

  test('a 404 page (no such key) yields no links instead of throwing', () => {
    expect(extractLinks('1:"$Sreact.fragment"\n3:I[477813,["/_next/static/chunks/x.js"]]')).toEqual([]);
  });

  test('malformed JSON yields no links instead of throwing', () => {
    expect(extractLinks('"externalLinks":[{"name":]')).toEqual([]);
  });

  test('entries without a url are dropped', () => {
    expect(extractLinks('"externalLinks":[{"name":"Broken","type":"Official"}]')).toEqual([]);
  });
});

describe('slugFromHref', () => {
  test.each([
    ['/software/sencho/about/', 'sencho'],
    ['/software/arcane--docker-management-ui/about/', 'arcane--docker-management-ui'],
    ['/software/vlc-media-player/', 'vlc-media-player'],
    ['/browse/all/?category=ai-tools', null],
    [null, null],
  ])('%s -> %s', (href, expected) => {
    expect(slugFromHref(href)).toBe(expected);
  });
});

describe('parseLikes', () => {
  test.each([
    ['486 likes', 486],
    ['1 like', 1],
    ['1,204 likes', 1204],
    ['Like Sencho', 0],
    [null, 0],
  ])('%s -> %s', (text, expected) => {
    expect(parseLikes(text)).toBe(expected);
  });
});

describe('matchesFilter', () => {
  const card: CardData = {
    title: 'Sencho',
    description: 'Self-hosted Docker Compose management platform.',
    likes: 6,
    links: [{ name: 'GitHub', url: 'https://github.com/x', type: 'Source' }],
  };

  test('an empty filter keeps everything', () => {
    expect(matchesFilter(card, EMPTY_FILTER)).toBe(true);
    expect(isFilterActive(EMPTY_FILTER)).toBe(false);
  });

  test('every search term must match, case-insensitively', () => {
    expect(matchesFilter(card, { ...EMPTY_FILTER, query: 'docker sencho' })).toBe(true);
    expect(matchesFilter(card, { ...EMPTY_FILTER, query: 'docker kubernetes' })).toBe(false);
  });

  test('likes bounds are inclusive and an empty max means unbounded', () => {
    expect(matchesFilter(card, { ...EMPTY_FILTER, minLikes: 6 })).toBe(true);
    expect(matchesFilter(card, { ...EMPTY_FILTER, minLikes: 7 })).toBe(false);
    expect(matchesFilter(card, { ...EMPTY_FILTER, maxLikes: 6 })).toBe(true);
    expect(matchesFilter(card, { ...EMPTY_FILTER, maxLikes: 5 })).toBe(false);
    expect(matchesFilter({ ...card, likes: 99999 }, { ...EMPTY_FILTER, maxLikes: NaN })).toBe(true);
  });

  test('link toggles read the fetched links', () => {
    expect(matchesFilter(card, { ...EMPTY_FILTER, needsSource: true })).toBe(true);
    expect(matchesFilter(card, { ...EMPTY_FILTER, needsOfficial: true })).toBe(false);
  });

  test('cards whose links have not loaded yet stay visible', () => {
    const pending: CardData = { ...card, links: undefined };
    expect(matchesFilter(pending, { ...EMPTY_FILTER, needsOfficial: true })).toBe(true);
  });

  test('a card with no links at all fails the link toggles', () => {
    expect(matchesFilter({ ...card, links: [] }, { ...EMPTY_FILTER, needsSource: true })).toBe(false);
  });
});

describe('facet chips', () => {
  test('lists the facets in the URL and skips pagination', () => {
    expect(activeFacets('?category=ai-tools&platform=mac&sort=likes&p=3')).toEqual([
      { key: 'category', value: 'ai-tools', label: 'Category' },
      { key: 'platform', value: 'mac', label: 'Platform' },
      { key: 'sort', value: 'likes', label: 'Sort' },
    ]);
  });

  test('unknown facets fall back to their raw key rather than being hidden', () => {
    expect(activeFacets('?somethingNew=x')).toEqual([
      { key: 'somethingNew', value: 'x', label: 'somethingNew' },
    ]);
  });

  test('removing a facet keeps the others and resets the page', () => {
    const url = 'https://alternativeto.net/browse/all/?category=ai-tools&platform=mac&p=4';
    expect(urlWithoutFacet(url, 'platform', 'mac')).toBe(
      'https://alternativeto.net/browse/all/?category=ai-tools',
    );
  });

  test('removing one value of a repeated facet keeps the other', () => {
    const url = 'https://alternativeto.net/browse/all/?platform=mac&platform=linux';
    expect(urlWithoutFacet(url, 'platform', 'mac')).toBe(
      'https://alternativeto.net/browse/all/?platform=linux',
    );
  });
});

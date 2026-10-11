import { describe, expect, it } from 'vitest';
import { buildHideMatcher, buildUrl, emptyState, parseUrl } from './query';

const q = (url: string) => new URL(url).searchParams.get('q');

describe('buildUrl', () => {
  it('compiles AND terms, an OR group and qualifiers', () => {
    const url = buildUrl({ ...emptyState(), and: 'rust async', or: 'react, vue', q: { lang: 'python' } });
    expect(q(url)).toBe('rust async (react OR vue) language:python');
  });

  it('does not wrap a single OR term in parentheses', () => {
    expect(q(buildUrl({ ...emptyState(), or: 'react' }))).toBe('react');
  });

  it('treats a bare number on a numeric qualifier as a minimum', () => {
    expect(q(buildUrl({ ...emptyState(), q: { stars: '500' } }))).toBe('stars:>=500');
  });

  it('leaves explicit operators and ranges alone', () => {
    expect(q(buildUrl({ ...emptyState(), q: { stars: '>500 <1000', size: '100..500' } }))).toBe(
      'stars:>500 stars:<1000 size:100..500'
    );
  });

  it('never prefixes >= onto a non-numeric qualifier', () => {
    expect(q(buildUrl({ ...emptyState(), q: { created: '2023' } }))).toBe('created:2023');
  });

  it('carries the negation prefix onto the qualifier, not the value', () => {
    expect(q(buildUrl({ ...emptyState(), q: { lang: 'python, -html' } }))).toBe('language:python -language:html');
  });

  it('keeps quoted phrases whole, including negated ones', () => {
    expect(q(buildUrl({ ...emptyState(), and: '"machine learning" -"neural net"' }))).toBe(
      '"machine learning" -"neural net"'
    );
  });

  it('only emits sort params when a sort is chosen', () => {
    expect(buildUrl(emptyState())).not.toContain('&s=');
    expect(buildUrl({ ...emptyState(), sort: 'stars' })).toContain('s=stars&o=desc');
  });
});

describe('parseUrl', () => {
  it('round-trips a built URL', () => {
    const state = {
      ...emptyState(),
      and: 'rust',
      or: 'react, vue',
      sort: 'stars',
      hide: 'spam, bot',
      q: { lang: 'python, -html', stars: '500' }
    };
    const parsed = parseUrl(new URL(buildUrl(state)).search);
    expect(parsed.and).toBe('rust');
    expect(parsed.or).toBe('react, vue');
    expect(parsed.sort).toBe('stars');
    expect(parsed.hide).toBe('spam, bot');
    expect(parsed.q.lang).toBe('python, -html');
    expect(parsed.q.stars).toBe('500');
  });

  it('reads shorthand qualifiers without eating the longhand', () => {
    expect(parseUrl('?q=lang%3Ajs+ext%3Amd').q).toMatchObject({ lang: 'js', ext: 'md' });
    expect(parseUrl('?q=language%3Ajavascript').q.lang).toBe('javascript');
  });

  it('leaves plain text that merely contains parentheses in the AND field', () => {
    expect(parseUrl('?q=parser+(experimental)').or).toBe('');
    expect(parseUrl('?q=parser+(experimental)').and).toBe('parser (experimental)');
  });

  it('defaults the type when absent', () => {
    expect(parseUrl('?q=test').type).toBe('repositories');
  });
});

describe('buildHideMatcher', () => {
  it('matches whole words only', () => {
    const re = buildHideMatcher('bot')!;
    expect(re.test('a telegram bot')).toBe(true);
    expect(re.test('robotics toolkit')).toBe(false);
  });

  it('is case insensitive and escapes regex metacharacters', () => {
    expect(buildHideMatcher('c++')!.test('written in C++')).toBe(true);
    expect(buildHideMatcher('node.js')!.test('nodeXjs')).toBe(false);
  });

  it('returns null for empty input so callers can skip filtering', () => {
    expect(buildHideMatcher('   ,  ')).toBeNull();
  });
});

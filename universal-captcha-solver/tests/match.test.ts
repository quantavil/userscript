import { describe, expect, test } from 'bun:test';
import * as v from 'valibot';
import { findBestRule, parsePattern, scorePattern } from '../src/config/match.ts';
import { SiteRuleSchema } from '../src/config/schema.ts';

const loc = (url: string) => {
  const u = new URL(url);
  return { hostname: u.hostname, host: u.host, pathname: u.pathname };
};
const rule = v.parse(SiteRuleSchema, { captcha: 'img', input: 'input' });

describe('pattern matching', () => {
  test('host only matches any path', () => {
    expect(scorePattern('example.com', loc('https://example.com/a/b'))).not.toBeNull();
    expect(scorePattern('example.com', loc('https://other.com/'))).toBeNull();
  });
  test('exact host does not match subdomains', () => {
    expect(scorePattern('example.com', loc('https://www.example.com/'))).toBeNull();
  });
  test('*. matches apex and subdomains, not lookalikes', () => {
    expect(scorePattern('*.example.com', loc('https://example.com/'))).not.toBeNull();
    expect(scorePattern('*.example.com', loc('https://a.b.example.com/'))).not.toBeNull();
    expect(scorePattern('*.example.com', loc('https://notexample.com/'))).toBeNull();
  });
  test('exact path ignores trailing slash', () => {
    expect(scorePattern('example.com/login', loc('https://example.com/login/'))).not.toBeNull();
    expect(scorePattern('example.com/login', loc('https://example.com/login/x'))).toBeNull();
  });
  test('prefix wildcard matches the base and descendants only', () => {
    expect(scorePattern('example.com/app/*', loc('https://example.com/app'))).not.toBeNull();
    expect(scorePattern('example.com/app/*', loc('https://example.com/app/x/y'))).not.toBeNull();
    expect(scorePattern('example.com/app/*', loc('https://example.com/apple'))).toBeNull();
  });
  test('ports are matched via host', () => {
    expect(scorePattern('localhost:3000', loc('http://localhost:3000/x'))).not.toBeNull();
    expect(scorePattern('localhost', loc('http://localhost:3000/x'))).not.toBeNull();
  });
  test('scheme prefix in pattern is tolerated; garbage is rejected', () => {
    expect(parsePattern('https://example.com/login')?.host).toBe('example.com');
    expect(parsePattern('')).toBeNull();
    expect(parsePattern('ex*mple.com')).toBeNull();
  });
});

describe('specificity (v1 let a deep wildcard outrank an exact match)', () => {
  const sites = {
    'example.com': { ...rule, captcha: '#host' },
    '*.example.com': { ...rule, captcha: '#sub' },
    'example.com/a/b/c/*': { ...rule, captcha: '#deep-prefix' },
    'example.com/a/b/c/d': { ...rule, captcha: '#exact' },
    'example.com/a/*': { ...rule, captcha: '#shallow-prefix' },
  };
  const pick = (url: string) => findBestRule(sites, loc(url))?.rule.captcha;

  test('exact path beats any prefix, however deep', () => {
    expect(pick('https://example.com/a/b/c/d')).toBe('#exact');
  });
  test('deeper prefix beats shallower prefix', () => {
    expect(pick('https://example.com/a/b/c/z')).toBe('#deep-prefix');
    expect(pick('https://example.com/a/x')).toBe('#shallow-prefix');
  });
  test('exact host beats wildcard host', () => {
    expect(pick('https://example.com/zzz')).toBe('#host');
    expect(pick('https://www.example.com/zzz')).toBe('#sub');
  });
  test('no match returns null', () => {
    expect(pick('https://nope.org/')).toBeUndefined();
  });
});

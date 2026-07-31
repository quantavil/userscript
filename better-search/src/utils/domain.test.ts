import { describe, it, expect } from 'vitest';
import { normalizeDomain, buildDomainMatcher, wildcardRulesCovering, getRegisterableDomain } from './domain';

describe('normalizeDomain', () => {
    it('strips protocol, www and paths', () => {
        expect(normalizeDomain('https://www.github.com/foo?bar=1')).toBe('github.com');
        expect(normalizeDomain('http://example.com/')).toBe('example.com');
        expect(normalizeDomain('GitHub.COM')).toBe('github.com');
    });

    it('keeps wildcard prefixes', () => {
        expect(normalizeDomain('*.github.com')).toBe('*.github.com');
        expect(normalizeDomain('*.www.github.com')).toBe('*.github.com');
    });

    it('returns empty string for garbage', () => {
        expect(normalizeDomain('')).toBe('');
        expect(normalizeDomain('   ')).toBe('');
        expect(normalizeDomain('http://')).toBe('');
    });
});

describe('buildDomainMatcher', () => {
    it('matches exact rules', () => {
        const match = buildDomainMatcher(['github.com'], ['spam.com']);
        expect(match('github.com')).toBe('liked');
        expect(match('spam.com')).toBe('disliked');
        expect(match('other.com')).toBe('normal');
    });

    it('matches wildcard rules against subdomains and the root', () => {
        const match = buildDomainMatcher(['*.github.com'], []);
        expect(match('gist.github.com')).toBe('liked');
        expect(match('github.com')).toBe('liked');
        expect(match('notgithub.com')).toBe('normal');
        expect(match('github.com.evil.com')).toBe('normal');
    });

    it('gives exact rules precedence over wildcard rules across lists', () => {
        // explicit dislike of a subdomain overrides a covering liked wildcard
        const match = buildDomainMatcher(['*.github.com'], ['gist.github.com']);
        expect(match('gist.github.com')).toBe('disliked');
        expect(match('docs.github.com')).toBe('liked');
    });

    it('is case-insensitive on input', () => {
        const match = buildDomainMatcher(['github.com'], []);
        expect(match('GitHub.Com')).toBe('liked');
    });
});

describe('wildcardRulesCovering', () => {
    it('finds covering wildcard rules only', () => {
        const rules = ['github.com', '*.github.com', '*.example.com'];
        expect(wildcardRulesCovering(rules, 'gist.github.com')).toEqual(['*.github.com']);
        expect(wildcardRulesCovering(rules, 'github.com')).toEqual(['*.github.com']);
        expect(wildcardRulesCovering(rules, 'other.com')).toEqual([]);
    });
});

describe('getRegisterableDomain', () => {
    it('handles plain domains and subdomains', () => {
        expect(getRegisterableDomain('github.com')).toBe('github.com');
        expect(getRegisterableDomain('gist.github.com')).toBe('github.com');
        expect(getRegisterableDomain('*.gist.github.com')).toBe('github.com');
    });

    it('handles multi-part ccTLD suffixes', () => {
        expect(getRegisterableDomain('www.bbc.co.uk')).toBe('bbc.co.uk');
        expect(getRegisterableDomain('foo.gov.in')).toBe('foo.gov.in');
    });

    it('treats known hosting suffixes as public', () => {
        expect(getRegisterableDomain('user.github.io')).toBe('user.github.io');
        expect(getRegisterableDomain('deep.user.github.io')).toBe('user.github.io');
    });

    it('returns IPs unchanged', () => {
        expect(getRegisterableDomain('192.168.1.1')).toBe('192.168.1.1');
    });
});

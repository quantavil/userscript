// src/utils/domain.ts
//
// All domain parsing and rule-matching logic lives here so the Store,
// Scanner, and Panel share one implementation.

import type { DomainMatch } from '../types';

/** Strip protocol, www, trailing slash; return bare domain or empty string on failure. Supports wildcards. */
export function normalizeDomain(input: string): string {
    let s = input.trim().toLowerCase();
    if (!s) return '';
    const hasWildcard = s.startsWith('*.');
    if (hasWildcard) {
        s = s.slice(2);
    }
    try {
        if (!s.includes('://')) {
            s = 'http://' + s;
        }
        s = new URL(s).hostname;
    } catch {
        return '';
    }

    s = s.startsWith('www.') ? s.slice(4) : s;
    return hasWildcard ? '*.' + s : s;
}

/** All wildcard rules in `rules` that cover `domain` (e.g. `*.github.com` covers `gist.github.com`). */
export function wildcardRulesCovering(rules: readonly string[], domain: string): string[] {
    const d = domain.toLowerCase();
    return rules.filter(rule => {
        if (!rule.startsWith('*.')) return false;
        const r = rule.slice(2);
        return d === r || d.endsWith('.' + r);
    });
}

/**
 * Compile the two rule lists into a fast matcher: exact rules go in Sets,
 * wildcard rules in suffix arrays.
 *
 * Precedence: exact rules beat wildcard rules, so an explicit entry in one
 * list overrides a covering `*.` rule in the other (e.g. adding
 * `gist.github.com` to disliked wins over a `*.github.com` liked rule).
 */
export function buildDomainMatcher(
    liked: readonly string[],
    disliked: readonly string[]
): (domain: string) => DomainMatch {
    const exactLiked = new Set<string>();
    const exactDisliked = new Set<string>();
    const wildLiked: string[] = [];
    const wildDisliked: string[] = [];

    for (const rule of liked) {
        if (rule.startsWith('*.')) wildLiked.push(rule.slice(2));
        else exactLiked.add(rule);
    }
    for (const rule of disliked) {
        if (rule.startsWith('*.')) wildDisliked.push(rule.slice(2));
        else exactDisliked.add(rule);
    }

    const wildHit = (suffixes: string[], d: string) =>
        suffixes.some(r => d === r || d.endsWith('.' + r));

    return (domain: string): DomainMatch => {
        const d = domain.toLowerCase();
        if (exactLiked.has(d)) return 'liked';
        if (exactDisliked.has(d)) return 'disliked';
        if (wildHit(wildLiked, d)) return 'liked';
        if (wildHit(wildDisliked, d)) return 'disliked';
        return 'normal';
    };
}

/**
 * Returns the registerable (root) domain, handling multi-part suffixes like co.uk.
 *
 * NOTE: this is a rough approximation of the Public Suffix List (two-letter
 * ccTLD + common SLD heuristic plus a short hardcoded list). It only powers
 * the wildcard-merge *suggestion* in the panel, where an occasional false
 * grouping is harmless — don't use it for anything security-relevant.
 */
export function getRegisterableDomain(domain: string): string {
    let clean = domain.toLowerCase().trim();
    if (clean.startsWith('*.')) {
        clean = clean.slice(2);
    }
    if (/^\d+\.\d+\.\d+\.\d+$/.test(clean)) {
        return clean;
    }
    const parts = clean.split('.');
    if (parts.length <= 2) return clean;

    const tld = parts[parts.length - 1]!;
    const sld = parts[parts.length - 2]!;

    const isCcTld = tld.length === 2;
    const isCommonSld = /^(co|com|org|net|gov|edu|ac|or|ne|ltd|plc|sch|asn)$/.test(sld);

    const lastTwo = parts.slice(-2).join('.');
    const KNOWN_PUBLIC_SUFFIXES = new Set([
        'github.io',
        'gitlab.io',
        'pages.dev',
        'vercel.app',
        'herokuapp.com',
        'githubusercontent.com',
        'workers.dev',
        'js.org'
    ]);

    if ((isCcTld && isCommonSld || KNOWN_PUBLIC_SUFFIXES.has(lastTwo)) && parts.length >= 3) {
        return parts.slice(-3).join('.');
    }
    return parts.slice(-2).join('.');
}

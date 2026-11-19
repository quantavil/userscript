import { NUMERIC, PARAM, QUALIFIERS } from './config';

export interface FormState {
  type: string;
  sort: string;
  and: string;
  or: string;
  hide: string;
  /** Qualifier field id -> raw user input (comma or space separated, `-` prefix negates). */
  q: Record<string, string>;
}

export const emptyState = (): FormState => ({
  type: 'repositories',
  sort: '',
  and: '',
  or: '',
  hide: '',
  q: {}
});

/** Split user input on commas/whitespace, keeping quoted phrases (and `-"negated phrases"`) intact. */
export const tokenize = (input: string): string[] => input.match(/-?"[^"]*"|[^\s,]+/g) ?? [];

const splitNegation = (token: string) =>
  token.startsWith('-') ? ([token.slice(1), '-'] as const) : ([token, ''] as const);

export interface QueryPart {
  text: string;
  /** `qualifier` parts render as `key:value`; everything else is free text. */
  kind: 'term' | 'qualifier';
}

/**
 * The exact terms GitHub will receive, as discrete parts. `buildQuery` joins
 * them for copying and searching; the panel renders them one by one.
 */
export function queryParts(state: FormState): QueryPart[] {
  const parts: QueryPart[] = tokenize(state.and).map(text => ({ text, kind: 'term' }));

  const anyOf = tokenize(state.or);
  if (anyOf.length) {
    parts.push({ text: anyOf.length === 1 ? anyOf[0]! : `(${anyOf.join(' OR ')})`, kind: 'term' });
  }

  for (const field of QUALIFIERS) {
    for (const token of tokenize(state.q[field.id] ?? '')) {
      const [bare, negate] = splitNegation(token);
      if (!bare) continue;
      // A lone number reads as "at least this many" — GitHub would treat it as exactly.
      const value = NUMERIC.has(field.qualifier) && /^\d+$/.test(bare) ? `>=${bare}` : bare;
      parts.push({ text: `${negate}${field.qualifier}:${value}`, kind: 'qualifier' });
    }
  }

  return parts;
}

export const buildQuery = (state: FormState): string => queryParts(state).map(part => part.text).join(' ');

export function buildUrl(state: FormState): string {
  const url = new URL('https://github.com/search');
  url.searchParams.set('q', buildQuery(state));
  url.searchParams.set('type', state.type);
  if (state.sort) {
    url.searchParams.set('s', state.sort);
    url.searchParams.set('o', 'desc');
  }
  if (state.hide.trim()) url.searchParams.set(PARAM.hide, state.hide.trim());
  return url.toString();
}

/** Rebuild form state from a search URL's query string, so the panel opens pre-filled. */
export function parseUrl(search: string): FormState {
  const params = new URLSearchParams(search);
  const state = emptyState();
  state.type = (params.get('type') || 'repositories').toLowerCase();
  state.sort = params.get('s') ?? '';
  state.hide = params.get(PARAM.hide) ?? '';

  let q = params.get('q') ?? '';

  for (const field of QUALIFIERS) {
    // Longest key first so `language:` never half-matches the `lang` alias.
    const keys = [field.qualifier, ...(field.aliases ?? [])].sort((a, b) => b.length - a.length).join('|');
    const found: string[] = [];
    q = q.replace(new RegExp(`(^|\\s)(-?)(?:${keys}):("[^"]*"|\\S+)`, 'gi'), (_m, _sp, negate: string, raw: string) => {
      let value = raw.replace(/^"|"$/g, '');
      // Undo the `>=` we add on build so the field round-trips to what the user typed.
      if (NUMERIC.has(field.qualifier) && /^>=\d+$/.test(value)) value = value.slice(2);
      found.push(negate + value);
      return ' ';
    });
    if (found.length) state.q[field.id] = found.join(', ');
  }

  const group = q.match(/\(([^()]+)\)/);
  if (group?.[1]?.includes(' OR ')) {
    state.or = group[1].split(' OR ').map(s => s.trim()).filter(Boolean).join(', ');
    q = q.replace(group[0], ' ');
  }

  state.and = q.replace(/\s+/g, ' ').trim();
  return state;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Match any of `words` as a whole word. Substring matching made "bot" hide "robotics";
 * lookaround on letters/digits keeps "node.js" and "c++" matchable, unlike `\b`.
 */
export function buildHideMatcher(input: string): RegExp | null {
  const words = tokenize(input)
    .map(w => w.replace(/^-?"|"$/g, '').trim())
    .filter(Boolean);
  if (!words.length) return null;
  const alt = words.sort((a, b) => b.length - a.length).map(escapeRe).join('|');
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alt})(?![\\p{L}\\p{N}])`, 'iu');
}

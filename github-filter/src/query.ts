import { PARAM, QUALIFIERS, SEARCH_TYPE } from './config';

export interface NumberRange {
  /** 0 means "no lower bound". */
  min: number;
  /** 0 means "no upper bound". */
  max: number;
}

export interface DateRange {
  /** `YYYY-MM-DD`, or empty for unbounded. */
  from: string;
  to: string;
}

export interface FormState {
  /** Free text that must all appear. */
  and: string;
  /** Free text, any of which may appear (compiled to an `OR` group). */
  or: string;
  /** Words whose results are hidden locally after the search runs. */
  hide: string;
  sort: string;
  repo: string;
  lang: string;
  stars: NumberRange;
  forks: NumberRange;
  created: DateRange;
  pushed: DateRange;
}

export const emptyState = (): FormState => ({
  and: '',
  or: '',
  hide: '',
  sort: '',
  repo: '',
  lang: '',
  stars: { min: 0, max: 0 },
  forks: { min: 0, max: 0 },
  created: { from: '', to: '' },
  pushed: { from: '', to: '' }
});

/** Split user input on commas or whitespace, keeping quoted phrases intact. */
export const tokenize = (input: string): string[] => input.match(/-?"[^"]*"|[^\s,]+/g) ?? [];

/**
 * Split query terms from full GitHub query string, keeping quoted values attached
 * to qualifiers (e.g. language:"Jupyter Notebook" or -repo:"foo bar").
 */
export const splitTerms = (input: string): string[] =>
  input.match(/-?(?:[\w-]+:)?(?:"[^"]*"|\S+)/g) ?? [];

const splitNegation = (token: string) =>
  token.startsWith('-') ? ([token.slice(1), '-'] as const) : ([token, ''] as const);

/* -------------------------------- compiling ------------------------------- */

/** Compiles numeric range to GitHub filter: `500..1000`, `>=500`, `<=1000`, or null. */
function numberRange(range: NumberRange): string | null {
  if (range.min > 0 && range.max > 0) {
    const min = Math.min(range.min, range.max);
    const max = Math.max(range.min, range.max);
    return `${min}..${max}`;
  }
  if (range.min > 0) return `>=${range.min}`;
  if (range.max > 0) return `<=${range.max}`;
  return null;
}

/** GitHub date bounds are whole days, inclusive on both ends. */
function dateRange(range: DateRange): string | null {
  if (range.from && range.to) {
    if (range.from === range.to) return range.from;
    const [from, to] = range.from <= range.to ? [range.from, range.to] : [range.to, range.from];
    return `${from}..${to}`;
  }
  if (range.from) return `>=${range.from}`;
  if (range.to) return `<=${range.to}`;
  return null;
}

export interface QueryPart {
  text: string;
  kind: 'term' | 'qualifier';
  fieldId?: keyof FormState;
  token?: string;
}

/** Discrete query parts for rendering interactive chips and assembling the final search string. */
export function queryParts(state: FormState): QueryPart[] {
  const parts: QueryPart[] = tokenize(state.and).map(token => ({
    text: token,
    kind: 'term',
    fieldId: 'and',
    token
  }));

  const anyOf = tokenize(state.or);
  if (anyOf.length) {
    parts.push({
      text: anyOf.length === 1 ? anyOf[0]! : `(${anyOf.join(' OR ')})`,
      kind: 'term',
      fieldId: 'or'
    });
  }

  for (const field of QUALIFIERS) {
    if (field.kind === 'text') {
      for (const token of tokenize(state[field.id])) {
        const [bare, negate] = splitNegation(token);
        if (!bare) continue;
        parts.push({
          text: `${negate}${field.qualifier}:${bare}`,
          kind: 'qualifier',
          fieldId: field.id,
          token
        });
      }
      continue;
    }

    const value = field.kind === 'number' ? numberRange(state[field.id]) : dateRange(state[field.id]);
    if (value) {
      parts.push({
        text: `${field.qualifier}:${value}`,
        kind: 'qualifier',
        fieldId: field.id
      });
    }
  }

  return parts;
}

export const buildQuery = (state: FormState): string => queryParts(state).map(part => part.text).join(' ');

export function buildUrl(state: FormState): string {
  const url = new URL('https://github.com/search');
  const query = buildQuery(state);
  if (query) url.searchParams.set('q', query);
  url.searchParams.set('type', SEARCH_TYPE);
  if (state.sort) {
    url.searchParams.set('s', state.sort);
    url.searchParams.set('o', 'desc');
  }
  if (state.hide.trim()) url.searchParams.set(PARAM.hide, state.hide.trim());
  return url.toString();
}

/** Removes a specific part from the form state (for 1-click chip removal). */
export function removeQueryPart(state: FormState, part: QueryPart): FormState {
  if (!part.fieldId) return state;
  const next = { ...state };
  if (part.fieldId === 'stars' || part.fieldId === 'forks') {
    next[part.fieldId] = { min: 0, max: 0 };
  } else if (part.fieldId === 'created' || part.fieldId === 'pushed') {
    next[part.fieldId] = { from: '', to: '' };
  } else if (part.fieldId === 'or') {
    next.or = '';
  } else if (part.token && (part.fieldId === 'and' || part.fieldId === 'repo' || part.fieldId === 'lang')) {
    const current = tokenize(state[part.fieldId]);
    const filtered = current.filter(t => t !== part.token);
    next[part.fieldId] = filtered.join(part.fieldId === 'and' ? ' ' : ', ');
  }
  return next;
}

export function countActiveFilters(state: FormState): number {
  let count = 0;
  if (state.and.trim()) count += 1;
  if (state.or.trim()) count += 1;
  if (state.hide.trim()) count += 1;
  if (state.sort) count += 1;
  if (state.repo.trim()) count += 1;
  if (state.lang.trim()) count += 1;
  if (state.stars.min > 0 || state.stars.max > 0) count += 1;
  if (state.forks.min > 0 || state.forks.max > 0) count += 1;
  if (state.created.from || state.created.to) count += 1;
  if (state.pushed.from || state.pushed.to) count += 1;
  return count;
}

/* -------------------------------- parsing --------------------------------- */

const NUMBER = /^(>=|<=|>|<)?(\d+)(?:\.\.(\d+))?$/;
const DATE = /^(>=|<=|>|<)?(\d{4}-\d{2}-\d{2})(?:\.\.(\d{4}-\d{2}-\d{2}))?$/;

/**
 * A bare number reads as "at least", matching a single left thumb;
 * strict operators are converted so parsed values round-trip exactly.
 */
function parseNumberRange(value: string): NumberRange | null {
  const match = value.match(NUMBER);
  if (!match) return null;
  const [, operator = '', lower = '', upper] = match;
  if (upper) return { min: Number(lower), max: Number(upper) };
  const count = Number(lower);
  if (operator === '>') return { min: count + 1, max: 0 };
  if (operator === '<') return { min: 0, max: Math.max(count - 1, 0) };
  if (operator === '<=') return { min: 0, max: count };
  return { min: count, max: 0 };
}

export function shiftDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function parseDateRange(value: string): DateRange | null {
  const match = value.match(DATE);
  if (!match) return null;
  const [, operator = '', lower = '', upper] = match;
  if (upper) return { from: lower, to: upper };
  if (operator === '>') return { from: shiftDays(lower, 1), to: '' };
  if (operator === '<') return { from: '', to: shiftDays(lower, -1) };
  if (operator === '<=') return { from: '', to: lower };
  return { from: lower, to: '' };
}

/** Extracts recognised qualifiers out of `query` into `state`; returns leftover free text. */
function readQuery(state: FormState, query: string): string {
  const free: string[] = [];

  for (const term of splitTerms(query)) {
    const keyword = term.match(/^(-?)([\w-]+):(.*)$/);
    const [, negate = '', key = '', raw = ''] = keyword ?? [];
    const lowered = key.toLowerCase();
    const field =
      keyword &&
      QUALIFIERS.find(f => f.qualifier === lowered || ('aliases' in f && f.aliases?.includes(lowered)));
    if (!field) {
      free.push(term);
      continue;
    }

    if (field.kind === 'text') {
      const isQuoted = raw.startsWith('"') && raw.endsWith('"');
      const cleanRaw = isQuoted ? raw.slice(1, -1) : raw;
      const values = isQuoted
        ? [`${negate}"${cleanRaw}"`]
        : tokenize(cleanRaw).map(value => `${negate}${value}`);
      if (values.length) state[field.id] = [...tokenize(state[field.id]), ...values].join(', ');
      continue;
    }

    if (negate) {
      free.push(term);
      continue;
    }

    if (field.kind === 'number') {
      const range = parseNumberRange(raw);
      if (range) state[field.id] = range;
      else free.push(term);
      continue;
    }

    const range = parseDateRange(raw);
    if (range) state[field.id] = range;
    else free.push(term);
  }

  return free.join(' ');
}

function stateFromQuery(query: string, sort = '', hide = ''): FormState {
  const state = emptyState();
  state.sort = sort;
  state.hide = hide;

  let rest = query;
  const group = rest.match(/\(([^()]+)\)/);
  if (group?.[1]?.includes(' OR ')) {
    state.or = group[1]
      .split(' OR ')
      .map(term => term.trim())
      .filter(Boolean)
      .join(', ');
    rest = rest.replace(group[0], ' ');
  }

  state.and = readQuery(state, rest).replace(/\s+/g, ' ').trim();
  return state;
}

export const parseUrl = (search: string): FormState => {
  const params = new URLSearchParams(search);
  return stateFromQuery(params.get('q') ?? '', params.get('s') ?? '', params.get(PARAM.hide) ?? '');
};

/* ------------------------------- normalising ------------------------------ */

function legacyQuery(q: unknown): string {
  if (!q || typeof q !== 'object') return '';
  const source = q as Record<string, string>;
  const terms: string[] = [];

  for (const field of QUALIFIERS) {
    const value = source[field.id];
    if (typeof value !== 'string') continue;
    for (const token of tokenize(value)) {
      const [bare, negate] = splitNegation(token);
      if (!bare) continue;
      const numeric = field.kind === 'number' && /^\d+$/.test(bare) ? `>=${bare}` : bare;
      terms.push(`${negate}${field.qualifier}:${numeric}`);
    }
  }

  return terms.join(' ');
}

const isNumberRange = (value: unknown): value is NumberRange =>
  typeof value === 'object' &&
  value !== null &&
  Number.isFinite((value as NumberRange).min) &&
  Number.isFinite((value as NumberRange).max);

const isDateRange = (value: unknown): value is DateRange =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as DateRange).from === 'string' &&
  typeof (value as DateRange).to === 'string';

export function normalizeState(raw: unknown): FormState {
  if (!raw || typeof raw !== 'object') return emptyState();
  const input = raw as Record<string, unknown>;
  const text = (key: string) => (typeof input[key] === 'string' ? (input[key] as string) : '');

  const state = stateFromQuery(legacyQuery(input.q), text('sort'), text('hide'));
  state.and = text('and');
  state.or = text('or');

  for (const field of QUALIFIERS) {
    const value = input[field.id];
    if (field.kind === 'text' && typeof value === 'string') state[field.id] = value;
    else if (field.kind === 'number' && isNumberRange(value)) state[field.id] = value;
    else if (field.kind === 'date' && isDateRange(value)) state[field.id] = value;
  }

  return state;
}

/* --------------------------------- sliders -------------------------------- */

export function toIndex(stops: readonly number[], value: number, end: 'min' | 'max'): number {
  const last = stops.length - 1;
  if (value <= 0) return end === 'min' ? 0 : last;

  let best = 1;
  for (let i = 1; i <= last; i += 1) {
    if (Math.abs((stops[i] ?? 0) - value) < Math.abs((stops[best] ?? 0) - value)) best = i;
  }
  return best;
}

export function fromIndex(stops: readonly number[], index: number, end: 'min' | 'max'): number {
  if (end === 'min') return index <= 0 ? 0 : (stops[index] ?? 0);
  return index >= stops.length - 1 ? 0 : (stops[index] ?? 0);
}

/* --------------------------------- hide ----------------------------------- */

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function buildHideMatcher(input: string): RegExp | null {
  const words = tokenize(input)
    .map(w => w.replace(/^-?"|"$/g, '').trim())
    .filter(Boolean);
  if (!words.length) return null;
  const alt = words.sort((a, b) => b.length - a.length).map(escapeRe).join('|');
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alt})(?![\\p{L}\\p{N}])`, 'iu');
}

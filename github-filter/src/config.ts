export const NAME = 'GitHub Filter';

export const IDS = {
  panel: 'ghf-panel',
  style: 'ghf-style',
  fab: 'ghf-fab'
} as const;

export const STORE = {
  presets: 'ghf:presets',
  theme: 'ghf:theme'
} as const;

/** Custom param tacked onto GitHub's search URL to carry our own state across navigation. */
export const PARAM = {
  hide: 'ghf_hide'
} as const;

export const RESULTS_LIST = '[data-testid="results-list"]';
/** Legacy server-rendered markup, only consulted when RESULTS_LIST is absent. */
export const LEGACY_ROW = '.repo-list-item, .Box-row';

/** GitHub navigates with Turbo, so a "page load" can happen without a document load. */
export const NAV_EVENTS = ['turbo:render', 'turbo:load', 'pjax:end'] as const;

export const SEARCH_PATH = '/search';

/**
 * The panel only builds repository searches. Every qualifier it offers (stars,
 * forks, pushed) means nothing on a code or issue search, and half the old scope
 * options produced queries GitHub ignored.
 */
export const SEARCH_TYPE = 'repositories';

export const SORTS = [
  { value: '', label: 'Best match' },
  { value: 'stars', label: 'Most stars' },
  { value: 'forks', label: 'Most forks' },
  { value: 'updated', label: 'Recently updated' }
];

export interface KeywordField {
  id: 'and' | 'or' | 'hide';
  /** Monospace gutter key shown in the query table. */
  key: string;
  label: string;
  placeholder: string;
}

export const KEYWORDS: KeywordField[] = [
  { id: 'and', key: 'all', label: 'All of these words', placeholder: 'rust async' },
  { id: 'or', key: 'any', label: 'Any of these words', placeholder: 'react, vue' },
  { id: 'hide', key: 'hide', label: 'Hide results containing', placeholder: 'spam, bot' }
];

/**
 * Slider scales, not linear ranges: 10 stars and 1 000 stars are both meaningful
 * cut-offs, so equal thumb travel should not be worth equal stars.
 */
export const STARS_STOPS = [0, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
export const FORKS_STOPS = [0, 5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000, 10000];

type TextField = {
  kind: 'text';
  id: 'repo' | 'lang';
  label: string;
  qualifier: string;
  placeholder: string;
  /** Shorthands GitHub also accepts, so parsing a pasted query finds them. */
  aliases?: string[];
};

type NumberField = {
  kind: 'number';
  id: 'stars' | 'forks';
  label: string;
  qualifier: string;
  stops: number[];
};

type DateField = {
  kind: 'date';
  id: 'created' | 'pushed';
  label: string;
  qualifier: string;
};

export type QualifierField = TextField | NumberField | DateField;

/**
 * The field schema is the single source of truth: the query builder, the URL
 * parser, the preset summaries and the tape all derive from it. `kind` picks the
 * control (text input, dual slider, date range) and the shape of its value.
 */
export const QUALIFIERS: QualifierField[] = [
  { kind: 'text', id: 'repo', label: 'Repo', qualifier: 'repo', placeholder: 'facebook/react' },
  {
    kind: 'text',
    id: 'lang',
    label: 'Language',
    qualifier: 'language',
    aliases: ['lang'],
    placeholder: 'python, -html'
  },
  { kind: 'number', id: 'stars', label: 'Stars', qualifier: 'stars', stops: STARS_STOPS },
  { kind: 'number', id: 'forks', label: 'Forks', qualifier: 'forks', stops: FORKS_STOPS },
  { kind: 'date', id: 'created', label: 'Created', qualifier: 'created' },
  { kind: 'date', id: 'pushed', label: 'Pushed', qualifier: 'pushed' }
];

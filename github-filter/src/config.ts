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

/** Custom param on GitHub search URL carrying client-side hide filters. */
export const PARAM = {
  hide: 'ghf_hide'
} as const;

export const RESULTS_LIST = '[data-testid="results-list"]';
export const LEGACY_ROW = '.repo-list-item, .Box-row';

/** GitHub Turbo navigation events. */
export const NAV_EVENTS = ['turbo:render', 'turbo:load', 'pjax:end'] as const;

export const SEARCH_PATH = '/search';
export const SEARCH_TYPE = 'repositories';

export const SHORTCUT_LABEL = 'Alt+F';

export const SORTS = [
  { value: '', label: 'Best match' },
  { value: 'stars', label: 'Most stars' },
  { value: 'forks', label: 'Most forks' },
  { value: 'updated', label: 'Recently updated' }
] as const;

export interface KeywordField {
  id: 'and' | 'or' | 'hide';
  key: string;
  label: string;
  placeholder: string;
}

export const KEYWORDS: KeywordField[] = [
  { id: 'and', key: 'all', label: 'All of these words', placeholder: 'e.g. rust async engine' },
  { id: 'or', key: 'any', label: 'Any of these words', placeholder: 'e.g. react, vue, svelte' },
  { id: 'hide', key: 'hide', label: 'Hide results containing', placeholder: 'e.g. spam, tutorial, homework' }
];

/** Popular languages for 1-click filtering. */
export const POPULAR_LANGUAGES = [
  'TypeScript',
  'JavaScript',
  'Python',
  'Rust',
  'Go',
  'C++',
  'Java',
  'Ruby'
] as const;

/** Quick star thresholds. */
export const STAR_PRESETS = [100, 500, 1000, 5000, 10000] as const;

/** Non-linear slider stop scales. */
export const STARS_STOPS = [0, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
export const FORKS_STOPS = [0, 5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000, 10000];

type TextField = {
  kind: 'text';
  id: 'repo' | 'lang';
  label: string;
  qualifier: string;
  placeholder: string;
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

export const QUALIFIERS: QualifierField[] = [
  { kind: 'text', id: 'repo', label: 'Repo', qualifier: 'repo', placeholder: 'e.g. facebook/react' },
  {
    kind: 'text',
    id: 'lang',
    label: 'Language',
    qualifier: 'language',
    aliases: ['lang'],
    placeholder: 'e.g. python, -html'
  },
  { kind: 'number', id: 'stars', label: 'Stars', qualifier: 'stars', stops: STARS_STOPS },
  { kind: 'number', id: 'forks', label: 'Forks', qualifier: 'forks', stops: FORKS_STOPS },
  { kind: 'date', id: 'created', label: 'Created', qualifier: 'created' },
  { kind: 'date', id: 'pushed', label: 'Pushed', qualifier: 'pushed' }
];

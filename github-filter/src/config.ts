export const NAME = 'GitHub Filter';
export const LAUNCHER_LABEL = 'Advanced filters';

export const IDS = {
  panel: 'ghf-panel',
  style: 'ghf-style',
  fab: 'ghf-fab'
} as const;

export const STORE = {
  presets: 'ghf:presets'
} as const;

export const PARAM = {
  hide: 'ghf_hide'
} as const;

export const RESULTS_LIST = '[data-testid="results-list"]';
export const LEGACY_ROW = '.repo-list-item, .Box-row';
export const NAV_EVENTS = ['turbo:render', 'turbo:load', 'pjax:end'] as const;

const SEARCH_PATH = '/search';
export const SEARCH_TYPE = 'repositories';

/** GitHub occasionally renders `/search/`; treat both as the results page. */
export const isSearchPath = (pathname: string): boolean =>
  pathname.replace(/\/+$/, '') === SEARCH_PATH;

export const SORTS = [
  { value: '', label: 'Best match' },
  { value: 'stars', label: 'Most stars' },
  { value: 'forks', label: 'Most forks' },
  { value: 'updated', label: 'Recently updated' }
] as const;

export const KEYWORDS = [
  { id: 'and', label: 'All of these words', placeholder: 'e.g. rust async engine' },
  { id: 'or', label: 'Any of these words', placeholder: 'e.g. react, vue, svelte' },
  { id: 'hide', label: 'Hide results containing', placeholder: 'e.g. spam, tutorial, bot' }
] as const;

/** Modern, popular languages for quick filtering. */
export const POPULAR_LANGUAGES = [
  'TypeScript',
  'Python',
  'Rust',
  'Go',
  'Zig',
  'Swift',
  'Kotlin',
  'Dart',
  'C++',
  'C'
] as const;

/** Logarithmic thresholds including 1+. */
export const STAR_PRESETS = [1, 10, 100, 1000, 10000] as const;
export const FORK_PRESETS = [1, 10, 100, 1000] as const;

export const STARS_MAX = 100000;
export const FORKS_MAX = 25000;

/** Logarithmic stop scales starting from 0, 1 for fine-grained low-count filtering. */
export const STARS_STOPS = [0, 1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
export const FORKS_STOPS = [0, 1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

export type QualifierField =
  | { kind: 'text'; id: 'repo' | 'lang'; label: string; qualifier: string; placeholder: string; aliases?: string[] }
  | { kind: 'number'; id: 'stars' | 'forks'; label: string; qualifier: string; stops: number[] }
  | { kind: 'date'; id: 'created' | 'pushed'; label: string; qualifier: string };

export const QUALIFIERS: QualifierField[] = [
  { kind: 'text', id: 'repo', label: 'Repo', qualifier: 'repo', placeholder: 'e.g. facebook/react' },
  { kind: 'text', id: 'lang', label: 'Language', qualifier: 'language', aliases: ['lang'], placeholder: 'e.g. python, -html' },
  { kind: 'number', id: 'stars', label: 'Stars', qualifier: 'stars', stops: STARS_STOPS },
  { kind: 'number', id: 'forks', label: 'Forks', qualifier: 'forks', stops: FORKS_STOPS },
  { kind: 'date', id: 'created', label: 'Created', qualifier: 'created' },
  { kind: 'date', id: 'pushed', label: 'Pushed', qualifier: 'pushed' }
];

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

/** Qualifiers that take a bare number, so a lone `500` should mean `>=500`. */
export const NUMERIC = new Set(['stars', 'forks', 'size']);

export interface SearchType {
  /** GitHub's `type` query parameter. */
  value: string;
  label: string;
  /** Short form for the scope switch, where the full label would overflow. */
  short: string;
}

export const TYPES: SearchType[] = [
  { value: 'repositories', label: 'Repositories', short: 'Repos' },
  { value: 'code', label: 'Code', short: 'Code' },
  { value: 'issues', label: 'Issues', short: 'Issues' },
  { value: 'pullrequests', label: 'Pull requests', short: 'PRs' },
  { value: 'discussions', label: 'Discussions', short: 'Discussions' },
  { value: 'users', label: 'Users', short: 'Users' }
];

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

export interface QualifierField {
  id: string;
  label: string;
  placeholder: string;
  /** GitHub search qualifier this field compiles to. */
  qualifier: string;
  /** Shorthands GitHub also accepts, so parsing a pasted query finds them. */
  aliases?: string[];
}

export interface FilterGroup {
  title: string;
  fields: QualifierField[];
}

/**
 * The field schema is the single source of truth: the query builder, the URL
 * parser, the preset chips and the generated query all derive from it.
 */
export const FILTER_GROUPS: FilterGroup[] = [
  {
    title: 'Repository',
    fields: [
      { id: 'repo', label: 'Repo', placeholder: 'facebook/react', qualifier: 'repo' },
      { id: 'lang', label: 'Language', placeholder: 'python, -html', qualifier: 'language', aliases: ['lang'] },
      { id: 'ext', label: 'Extension', placeholder: 'md', qualifier: 'extension', aliases: ['ext'] }
    ]
  },
  {
    title: 'Limits',
    fields: [
      { id: 'stars', label: 'Stars', placeholder: '>500', qualifier: 'stars' },
      { id: 'forks', label: 'Forks', placeholder: '>100', qualifier: 'forks' },
      { id: 'size', label: 'Size (KB)', placeholder: '<5000', qualifier: 'size' },
      { id: 'created', label: 'Created', placeholder: '>2023-01', qualifier: 'created' },
      { id: 'pushed', label: 'Pushed', placeholder: '>2024-01-01', qualifier: 'pushed' }
    ]
  }
];

export const QUALIFIERS: QualifierField[] = FILTER_GROUPS.flatMap(group => group.fields);

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

export type Field =
  | { id: string; label: string; kind: 'select'; options: { value: string; label: string }[] }
  | {
      id: string;
      label: string;
      kind: 'text';
      placeholder?: string;
      /** GitHub search qualifier this field compiles to. Absent for free text. */
      qualifier?: string;
      /** Shorthands GitHub also accepts, so parsing a pasted query finds them. */
      aliases?: string[];
      full?: boolean;
    };

export interface Section {
  title: string;
  fields: Field[];
}

export const SECTIONS: Section[] = [
  {
    title: 'Search',
    fields: [
      {
        id: 'type',
        label: 'Type',
        kind: 'select',
        options: [
          { value: 'repositories', label: 'Repositories' },
          { value: 'code', label: 'Code' },
          { value: 'issues', label: 'Issues' },
          { value: 'pullrequests', label: 'Pull requests' },
          { value: 'discussions', label: 'Discussions' },
          { value: 'users', label: 'Users' }
        ]
      },
      {
        id: 'sort',
        label: 'Sort by',
        kind: 'select',
        options: [
          { value: '', label: 'Best match' },
          { value: 'stars', label: 'Most stars' },
          { value: 'forks', label: 'Most forks' },
          { value: 'updated', label: 'Recently updated' }
        ]
      }
    ]
  },
  {
    title: 'Terms',
    fields: [
      { id: 'and', label: 'All of these', kind: 'text', placeholder: 'rust async' },
      { id: 'or', label: 'Any of these', kind: 'text', placeholder: 'react, vue' },
      { id: 'hide', label: 'Hide results containing', kind: 'text', placeholder: 'spam, bot', full: true }
    ]
  },
  {
    title: 'Qualifiers',
    fields: [
      { id: 'repo', label: 'Repo', kind: 'text', placeholder: 'facebook/react', qualifier: 'repo' },
      { id: 'lang', label: 'Language', kind: 'text', placeholder: 'python, -html', qualifier: 'language', aliases: ['lang'] },
      { id: 'ext', label: 'Extension', kind: 'text', placeholder: 'md', qualifier: 'extension', aliases: ['ext'] },
      { id: 'stars', label: 'Stars', kind: 'text', placeholder: '>500', qualifier: 'stars' },
      { id: 'forks', label: 'Forks', kind: 'text', placeholder: '>100', qualifier: 'forks' },
      { id: 'size', label: 'Size (KB)', kind: 'text', placeholder: '<5000', qualifier: 'size' },
      { id: 'created', label: 'Created', kind: 'text', placeholder: '>2023-01', qualifier: 'created' },
      { id: 'pushed', label: 'Pushed', kind: 'text', placeholder: '>2024-01-01', qualifier: 'pushed' }
    ]
  }
];

export const QUALIFIERS = SECTIONS.flatMap(s => s.fields).filter(
  (f): f is Extract<Field, { kind: 'text' }> & { qualifier: string } => f.kind === 'text' && !!f.qualifier
);

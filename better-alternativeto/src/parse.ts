/** Pure helpers — no DOM, no network. Unit-tested in tests/parse.test.ts. */

export type LinkType = 'Official' | 'Social' | 'Appstore' | 'Source';

export interface AppLink {
  name: string;
  url: string;
  type: LinkType;
}

/**
 * AlternativeTo is a Next.js app-router site. Requesting an app page with the
 * `RSC: 1` header returns the flight payload (~110KB instead of ~430KB of HTML)
 * which carries `"externalLinks":[{name,url,type}]` verbatim. No entry contains
 * a `]`, so a non-greedy character class is enough to grab the array.
 */
const EXTERNAL_LINKS = /"externalLinks":(\[[^\]]*\])/;

export function extractLinks(rsc: string): AppLink[] {
  const m = rsc.match(EXTERNAL_LINKS);
  if (!m) return [];
  try {
    const raw = JSON.parse(m[1]) as Array<Partial<AppLink>>;
    return raw.filter((l): l is AppLink => Boolean(l && l.url && l.type));
  } catch {
    return [];
  }
}

/** `/software/sencho/about/` -> `sencho` */
export function slugFromHref(href: string | null | undefined): string | null {
  const m = /\/software\/([^/?#]+)/.exec(href ?? '');
  return m ? m[1] : null;
}

/** `"486 likes"` -> 486. Anything unparseable is 0 so cards never vanish silently. */
export function parseLikes(text: string | null | undefined): number {
  const m = /(\d[\d,]*)/.exec(text ?? '');
  return m ? Number(m[1].replace(/,/g, '')) : 0;
}

export interface CardData {
  title: string;
  description: string;
  likes: number;
  /** undefined while the app's links have not been fetched yet. */
  links?: AppLink[];
}

export interface FilterState {
  query: string;
  minLikes: number;
  /** NaN means "no upper bound". */
  maxLikes: number;
  needsSource: boolean;
  needsOfficial: boolean;
}

export const EMPTY_FILTER: FilterState = {
  query: '',
  minLikes: 0,
  maxLikes: NaN,
  needsSource: false,
  needsOfficial: false,
};

export function isFilterActive(f: FilterState): boolean {
  return (
    f.query !== '' ||
    f.minLikes > 0 ||
    !Number.isNaN(f.maxLikes) ||
    f.needsSource ||
    f.needsOfficial
  );
}

export function matchesFilter(card: CardData, f: FilterState): boolean {
  if (f.query) {
    const hay = `${card.title} ${card.description}`.toLowerCase();
    // Every whitespace-separated term must appear, so "ai docker" narrows.
    for (const term of f.query.toLowerCase().split(/\s+/)) {
      if (term && !hay.includes(term)) return false;
    }
  }
  if (card.likes < f.minLikes) return false;
  if (!Number.isNaN(f.maxLikes) && card.likes > f.maxLikes) return false;

  if (f.needsSource || f.needsOfficial) {
    // Links not fetched yet: keep the card visible rather than flashing it away.
    if (!card.links) return true;
    if (f.needsSource && !card.links.some((l) => l.type === 'Source')) return false;
    if (f.needsOfficial && !card.links.some((l) => l.type === 'Official')) return false;
  }
  return true;
}

/**
 * Chips for the facets currently in the URL. `category` is the page's identity
 * on /browse/all/ so it is listed too — removing it widens the browse.
 */
const FACET_LABELS: Record<string, string> = {
  category: 'Category',
  platform: 'Platform',
  license: 'License',
  feature: 'Feature',
  property: 'Property',
  origin: 'Origin',
  tag: 'Tag',
  sort: 'Sort',
  q: 'Search',
};

export interface Facet {
  key: string;
  value: string;
  label: string;
}

export function activeFacets(search: string): Facet[] {
  const out: Facet[] = [];
  for (const [key, value] of new URLSearchParams(search)) {
    if (key === 'p' || key === 'page' || !value) continue;
    out.push({ key, value, label: FACET_LABELS[key] ?? key });
  }
  return out;
}

/** URL with one facet dropped, plus the page reset so you don't land past the end. */
export function urlWithoutFacet(href: string, key: string, value: string): string {
  const url = new URL(href);
  const kept = [...url.searchParams.entries()].filter(
    ([k, v]) => !(k === key && v === value),
  );
  url.search = new URLSearchParams(kept).toString();
  url.searchParams.delete('p');
  return url.toString();
}

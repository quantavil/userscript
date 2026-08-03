import {
  EMPTY_FILTER,
  activeFacets,
  isFilterActive,
  urlWithoutFacet,
  type FilterState,
} from './parse';

export interface BarHooks {
  /** Re-evaluate which cards are visible. */
  apply(filter: FilterState): void;
  /** The link toggles need every card's links, not just the ones scrolled into view. */
  requestAllLinks(): void;
}

export interface FilterBar {
  setCount(text: string): void;
  element: HTMLElement;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  children: Array<Node | string> = [],
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

/**
 * The site only mounts its facet panel once it has been expanded, so opening is
 * delegated to the site's own chevron. It is never collapsed again — hiding it
 * is pure CSS from then on, which keeps toggling instant and React untouched.
 */
function panelExists(): boolean {
  return Boolean(document.querySelector('[data-testid="app-filter-bar"]'));
}

function expandSitePanel(): void {
  const items = document.querySelectorAll<HTMLElement>('[data-testid="popular-filters"] ul > li');
  const chevron = items[items.length - 1]?.querySelector<HTMLElement>('span');
  chevron?.click();
}

/**
 * Paging through a listing is a full navigation, so the bar is rebuilt from
 * scratch every time — the filter has to outlive it. sessionStorage keeps it for
 * the tab only; a new tab starts clean.
 */
const STORE = 'bat:filter';

function loadFilter(): FilterState {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE) ?? '') as Partial<FilterState>;
    // JSON has no NaN — an absent upper bound round-trips as null.
    return { ...EMPTY_FILTER, ...saved, maxLikes: saved.maxLikes ?? NaN };
  } catch {
    return { ...EMPTY_FILTER };
  }
}

function saveFilter(filter: FilterState): void {
  try {
    sessionStorage.setItem(STORE, JSON.stringify(filter));
  } catch {
    // Private mode — the filter just won't survive the next page.
  }
}

/* The bar is remounted on every navigation, so these are registered once at
   module scope: per-mount listeners piled up and kept dead bars alive. */
let currentBar: HTMLElement | null = null;

function closePanel(): void {
  document.documentElement.classList.remove('bat-panel-open');
}

document.addEventListener('click', (event) => {
  if (!document.documentElement.classList.contains('bat-panel-open')) return;
  const target = event.target as Node;
  if (currentBar?.contains(target)) return;
  if (document.querySelector('[data-testid="app-filter-bar"]')?.contains(target)) return;
  closePanel();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closePanel();
});

/** Pin the bar just under the site header, when that header is sticky at all. */
function measure(): void {
  const header = document.querySelector<HTMLElement>('header');
  const top = header && getComputedStyle(header).position === 'sticky' ? header.offsetHeight : 0;
  document.documentElement.style.setProperty('--bat-top', `${top}px`);
}
window.addEventListener('resize', measure, { passive: true });

export function mountFilterBar(nav: HTMLElement, hooks: BarHooks): FilterBar {
  const filter = loadFilter();

  const search = el('input', {
    type: 'search',
    className: 'bat-search',
    placeholder: 'Filter these apps by name or description…',
  });
  const minLikes = el('input', { type: 'number', min: '0', placeholder: 'min' });
  const maxLikes = el('input', { type: 'number', min: '0', placeholder: 'max' });
  search.setAttribute('aria-label', 'Filter apps on this page');
  minLikes.setAttribute('aria-label', 'Minimum likes');
  maxLikes.setAttribute('aria-label', 'Maximum likes');

  search.value = filter.query;
  minLikes.value = filter.minLikes ? String(filter.minLikes) : '';
  maxLikes.value = Number.isNaN(filter.maxLikes) ? '' : String(filter.maxLikes);

  const srcToggle = el('button', { type: 'button', className: 'bat-toggle', textContent: 'Has source' });
  const siteToggle = el('button', { type: 'button', className: 'bat-toggle', textContent: 'Has website' });
  srcToggle.setAttribute('aria-pressed', String(filter.needsSource));
  siteToggle.setAttribute('aria-pressed', String(filter.needsOfficial));

  const filtersBtn = el('button', { type: 'button', className: 'bat-filters-btn', textContent: 'Filters' });
  const reset = el('button', { type: 'button', className: 'bat-reset', textContent: 'Reset', hidden: true });
  const count = el('span', { className: 'bat-count' });
  const chips = el('div', { className: 'bat-chips' });

  const bar = el('div', { className: 'bat-bar' }, [
    search,
    el('span', { className: 'bat-likes' }, [minLikes, el('span', { textContent: '–' }), maxLikes]),
    siteToggle,
    srcToggle,
    filtersBtn,
    reset,
    count,
    chips,
  ]);

  function sync(): void {
    reset.hidden = !isFilterActive(filter);
    saveFilter(filter);
    hooks.apply(filter);
  }

  let debounce = 0;
  search.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = window.setTimeout(() => {
      filter.query = search.value.trim();
      sync();
    }, 140);
  });

  const readLikes = (): void => {
    filter.minLikes = Number(minLikes.value) || 0;
    filter.maxLikes = maxLikes.value === '' ? NaN : Number(maxLikes.value);
    sync();
  };
  minLikes.addEventListener('input', readLikes);
  maxLikes.addEventListener('input', readLikes);

  function wireToggle(button: HTMLButtonElement, key: 'needsSource' | 'needsOfficial'): void {
    button.addEventListener('click', () => {
      filter[key] = !filter[key];
      button.setAttribute('aria-pressed', String(filter[key]));
      if (filter[key]) hooks.requestAllLinks();
      sync();
    });
  }
  wireToggle(srcToggle, 'needsSource');
  wireToggle(siteToggle, 'needsOfficial');

  reset.addEventListener('click', () => {
    Object.assign(filter, EMPTY_FILTER);
    search.value = '';
    minLikes.value = '';
    maxLikes.value = '';
    for (const [button, key] of [[srcToggle, 'needsSource'], [siteToggle, 'needsOfficial']] as const) {
      filter[key] = false;
      button.setAttribute('aria-pressed', 'false');
    }
    sync();
  });

  /**
   * The panel opens in normal flow beneath the bar, which may be far above the
   * current scroll position. The bar itself can't be used to find that spot —
   * it is sticky, so its rect reports where it is stuck, not where it sits in
   * flow. Scroll the panel into view instead, then back off far enough to clear
   * the site header and the pinned bar.
   */
  function revealPanel(): void {
    document.documentElement.classList.add('bat-panel-open');
    const panel = document.querySelector('[data-testid="app-filter-bar"]');
    if (!panel) return;
    panel.scrollIntoView({ block: 'start' });
    const top =
      Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--bat-top'),
      ) || 0;
    window.scrollBy(0, -(top + bar.offsetHeight + 10));
  }

  filtersBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    const root = document.documentElement;
    // The panel carries the site's own collapse chevron, which unmounts it and
    // would otherwise leave this class stale — so check the panel, not just it.
    if (root.classList.contains('bat-panel-open') && panelExists()) {
      root.classList.remove('bat-panel-open');
      return;
    }
    if (panelExists()) {
      revealPanel();
      return;
    }
    expandSitePanel();
    // The panel mounts a tick later; wait for it before revealing.
    let tries = 0;
    const timer = window.setInterval(() => {
      if (panelExists() || ++tries > 20) {
        clearInterval(timer);
        if (panelExists()) revealPanel();
      }
    }, 50);
  });

  for (const facet of activeFacets(location.search)) {
    chips.append(
      el('a', {
        className: 'bat-facet',
        href: urlWithoutFacet(location.href, facet.key, facet.value),
        title: `Remove ${facet.label}: ${facet.value}`,
      }, [el('b', { textContent: facet.label }), document.createTextNode(facet.value)]),
    );
  }

  nav.parentElement?.insertBefore(bar, nav);
  currentBar = bar;
  measure();
  sync(); // push a restored filter through on the new page

  return {
    element: bar,
    setCount: (text) => {
      count.textContent = text;
    },
  };
}

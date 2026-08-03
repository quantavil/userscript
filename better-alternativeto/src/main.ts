import { getLinks, renderLinkRow } from './links';
import { mountFilterBar, type FilterBar } from './filterbar';
import {
  EMPTY_FILTER,
  isFilterActive,
  matchesFilter,
  parseLikes,
  slugFromHref,
  type CardData,
  type FilterState,
} from './parse';
import { CSS } from './styles';

interface Card {
  el: HTMLElement;
  slug: string;
  data: CardData;
}

let bar: FilterBar | null = null;
let cards: Card[] = [];
let filter: FilterState = { ...EMPTY_FILTER };
let lastUrl = location.href;

/* ------------------------------------------------------------------ styles */

function injectStyles(): void {
  if (document.getElementById('bat-style')) return;
  const style = document.createElement('style');
  style.id = 'bat-style';
  style.textContent = CSS;
  (document.head ?? document.documentElement).append(style);
}

/* ------------------------------------------------------------- dark toggle */

function currentTheme(): string {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function mountThemeButton(): void {
  const menuButton = document.querySelector<HTMLElement>('button[aria-label="Open page menu"]');
  if (!menuButton || document.querySelector('.bat-theme')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'bat-theme';

  const paint = (): void => {
    const dark = currentTheme() === 'dark';
    button.textContent = dark ? '☀' : '☾';
    button.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    button.setAttribute('aria-label', button.title);
  };
  paint();

  button.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Private mode — the theme still applies for this page view.
    }
    paint();
  });

  // Keep in sync if the site's own menu item is used instead.
  new MutationObserver(paint).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  (menuButton.parentElement ?? menuButton).before(button);
}

/* -------------------------------------------------------------- card links */

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      const card = cards.find((c) => c.el === entry.target);
      if (card) void loadLinks(card);
    }
  },
  { rootMargin: '300px 0px' },
);

async function loadLinks(card: Card): Promise<void> {
  const host = card.el.querySelector<HTMLElement>('[data-testid="main-app-info"]') ?? card.el;
  if (card.data.links) {
    // A React re-render can drop the row; repaint it from what we already have.
    if (!card.el.querySelector('.bat-links')) host.append(renderLinkRow(card.data.links));
    return;
  }
  let placeholder = card.el.querySelector<HTMLElement>('.bat-links');
  if (!placeholder) {
    placeholder = document.createElement('div');
    placeholder.className = 'bat-links bat-links-pending';
    host.append(placeholder);
  }

  const links = await getLinks(card.slug);
  card.data.links = links;
  if (placeholder.isConnected) placeholder.replaceWith(renderLinkRow(links));
  else host.append(renderLinkRow(links));
  applyFilter();
}

/* ------------------------------------------------------------- card sweeps */

function cardSlug(el: HTMLElement): string | null {
  return slugFromHref(el.querySelector('a[href*="/software/"]')?.getAttribute('href'));
}

/**
 * React reuses these <li> nodes when paging, so the marker holds the app's slug
 * rather than a flag: a node that now renders a different app is stale and has
 * to be re-read, or it keeps the previous app's links and likes.
 */
function isStale(el: HTMLElement): boolean {
  const slug = cardSlug(el);
  return Boolean(slug) && el.dataset.bat !== slug;
}

function readCard(el: HTMLElement): Card | null {
  const slug = cardSlug(el);
  if (!slug) return null;

  const info = el.querySelector('[data-testid="main-app-info"]');
  const platforms = el.querySelector('[data-testid="platform-row"]');
  const likesText =
    el.querySelector('#like-button-container')?.textContent ??
    /\d[\d,]*\s+likes?/.exec(info?.textContent ?? '')?.[0];

  return {
    el,
    slug,
    data: {
      title: el.querySelector('h2')?.textContent?.trim() ?? '',
      description: `${info?.textContent ?? ''} ${platforms?.textContent ?? ''}`,
      likes: parseLikes(likesText),
    },
  };
}

function scanCards(): void {
  const previous = cards;
  cards = [];
  for (const el of document.querySelectorAll<HTMLElement>('[data-testid^="item-"]')) {
    const card = readCard(el);
    if (!card) continue;
    if (el.dataset.bat === card.slug) {
      // Same app in the same node — keep the links already fetched for it.
      cards.push(previous.find((c) => c.el === el) ?? card);
      continue;
    }
    el.querySelector('.bat-links')?.remove();
    el.dataset.bat = card.slug;
    cards.push(card);
    observer.observe(el);
  }
}

function requestAllLinks(): void {
  for (const card of cards) void loadLinks(card);
}

/* ---------------------------------------------------------------- filtering */

/**
 * The site prints the total twice — a bare number for narrow screens and
 * "13533  apps" for wide ones — so reading the wrapper's textContent yields
 * "1353313533  apps". Pick the one span that is the whole label instead.
 */
function siteCount(): string {
  const wrapper = document.querySelector('[data-testid="app-filter-bar-wrapper"]');
  if (!wrapper) return '';
  for (const span of wrapper.querySelectorAll('span')) {
    // Leaf spans only: the parent span wraps both copies, so its own text
    // reads "1353313533  apps" and would match just as happily.
    if (span.children.length) continue;
    const text = span.textContent?.trim() ?? '';
    if (/^\d[\d,]*\s+apps?$/.test(text)) return text.replace(/\s+/g, ' ');
  }
  return '';
}

function applyFilter(): void {
  let visible = 0;
  for (const card of cards) {
    const show = matchesFilter(card.data, filter);
    // An attribute, not a class: React owns className on these nodes and drops
    // anything added to it on its next render, so hidden cards came back.
    card.el.toggleAttribute('data-bat-hide', !show);
    if (show) visible++;
  }

  const filtering = isFilterActive(filter);

  bar?.setCount(filtering ? `${visible} of ${cards.length} on this page` : siteCount());

  let note = document.querySelector<HTMLElement>('.bat-empty-note');
  if (filtering && visible === 0 && cards.length) {
    if (!note) {
      note = document.createElement('div');
      note.className = 'bat-empty-note';
      note.textContent = 'No app on this page matches — try the Filters panel to search the whole site.';
      bar?.element.after(note);
    }
  } else {
    note?.remove();
  }
}

/* --------------------------------------------------------------------- boot */

function boot(): void {
  mountThemeButton();

  const nav = document
    .querySelector('[data-testid="app-filter-bar-wrapper"]')
    ?.closest<HTMLElement>('nav');

  if (nav && (!bar || !bar.element.isConnected)) {
    filter = { ...EMPTY_FILTER };
    bar = mountFilterBar(nav, {
      apply: (next) => {
        filter = next;
        applyFilter();
      },
      requestAllLinks,
    });
    document.documentElement.classList.add('bat-on');
  }

  scanCards();
  // A restored link toggle needs every card's links, not just the visible ones.
  if (filter.needsSource || filter.needsOfficial) requestAllLinks();
  applyFilter();
}

function teardown(): void {
  bar?.element.remove();
  bar = null;
  filter = { ...EMPTY_FILTER };
  document.documentElement.classList.remove('bat-panel-open');
  document.querySelector('.bat-empty-note')?.remove();
}

/**
 * The observer watches the whole document, so it also sees this script's own
 * writes (link rows, the count, class toggles). Without this guard boot() would
 * re-run forever on a 120ms tick.
 */
function needsWork(): boolean {
  if (location.href !== lastUrl) return true;
  if (!bar || !bar.element.isConnected) {
    return Boolean(document.querySelector('[data-testid="app-filter-bar-wrapper"]'));
  }
  if (!document.querySelector('.bat-theme')) {
    return Boolean(document.querySelector('button[aria-label="Open page menu"]'));
  }
  // Not `:not([data-bat])` — paging reuses the nodes, so the marker survives
  // with the previous page's slug still on it and nothing looked stale.
  return [...document.querySelectorAll<HTMLElement>('[data-testid^="item-"]')].some(isStale);
}

let scheduled = 0;
function schedule(): void {
  clearTimeout(scheduled);
  scheduled = window.setTimeout(() => {
    if (!needsWork()) return;
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      teardown();
    }
    boot();
  }, 120);
}

injectStyles();
schedule();
new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });

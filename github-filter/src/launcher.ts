import { IDS, isSearchPath, LAUNCHER_LABEL, NAME, RESULTS_LIST } from './config';
import { iconSvg } from './icons';
import { countActiveFilters, parseUrl } from './query';

type LauncherPlacement = 'sidebar' | 'row' | 'toolbar' | 'floating';

export interface LauncherTarget {
  placement: LauncherPlacement;
  parent: Element;
  /** Insert directly before this node, or append when null. */
  before: Element | null;
}

let openHandler: (() => void) | null = null;
let launcherObserved = false;
let launcherQueued = false;
let launcherItem: HTMLDivElement | null = null;
let launcherRow: HTMLDivElement | null = null;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let retryAttempts = 0;

const isVisible = (element: Element | null): element is HTMLElement => {
  if (!(element instanceof HTMLElement)) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

/**
 * GitHub uses two native homes for filtering: a "Filter by" sidebar on
 * desktop/tablet and a Filter button in the results toolbar on phones. Reuse
 * whichever is rendered so the launcher sits in the same place users already
 * look, instead of floating over the page.
 */
export function findLauncherTarget(doc: Document = document): LauncherTarget | null {
  const filterButton = doc.querySelector<HTMLElement>('[data-testid="filter-button"]');
  const filterWrapper = filterButton?.parentElement ?? null;
  const toolbar = filterWrapper?.parentElement ?? null;
  if (isVisible(filterButton)) {
    // The phone toolbar is already full, so add a full-width filter row just
    // below it rather than squeezing another button beside GitHub's own.
    const subHeader = doc.querySelector<HTMLElement>('[data-testid="search-sub-header"]');
    if (isVisible(subHeader)) {
      return { placement: 'row', parent: subHeader, before: null };
    }
    if (toolbar) {
      return { placement: 'toolbar', parent: toolbar, before: filterWrapper };
    }
  }

  const pane = doc.querySelector<HTMLElement>(
    '[role="region"][aria-labelledby="search-filters-title"]'
  );
  if (isVisible(pane)) {
    // Above the facet list, directly under the "Filter by" heading. The
    // Advanced group at the bottom is below the fold on most screens.
    const list = pane.querySelector('ul');
    return { placement: 'sidebar', parent: list?.parentElement ?? pane, before: list };
  }

  return null;
}

/** Moves one persistent button between native slots; all insertion is idempotent. */
export function placeLauncher(button: HTMLButtonElement, target: LauncherTarget | null): void {
  if (!target) {
    launcherItem?.remove();
    launcherItem = null;
    launcherRow?.remove();
    launcherRow = null;
    button.dataset.placement = 'floating';
    if (button.parentElement !== document.body) document.body.append(button);
    return;
  }

  button.dataset.placement = target.placement;

  if (target.placement === 'sidebar' || target.placement === 'row') {
    let slot: HTMLDivElement;
    if (target.placement === 'sidebar') {
      launcherItem ??= createSlot('ghf-launcher-item');
      slot = launcherItem;
    } else {
      launcherRow ??= createSlot('ghf-launcher-row');
      slot = launcherRow;
    }
    if (button.parentElement !== slot) slot.append(button);
    if (slot.parentElement !== target.parent || slot.nextElementSibling !== target.before) {
      target.parent.insertBefore(slot, target.before);
    }
    const other = target.placement === 'sidebar' ? launcherRow : launcherItem;
    other?.remove();
    if (target.placement === 'sidebar') launcherRow = null;
    else launcherItem = null;
    return;
  }

  launcherItem?.remove();
  launcherItem = null;
  launcherRow?.remove();
  launcherRow = null;
  if (
    button.parentElement !== target.parent ||
    button.nextElementSibling !== target.before
  ) {
    target.parent.insertBefore(button, target.before);
  }
}

function createSlot(className: string): HTMLDivElement {
  const slot = document.createElement('div');
  slot.className = className;
  return slot;
}

function updateBadge(button: HTMLButtonElement, count: number): void {
  let badge = button.querySelector<HTMLElement>('.ghf-fab-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'ghf-fab-badge';
    badge.setAttribute('aria-hidden', 'true');
    button.append(badge);
  }
  const text = String(count);
  if (badge.textContent !== text) badge.textContent = text;
  const display = count > 0 ? 'inline-flex' : 'none';
  if (badge.style.display !== display) badge.style.display = display;
}

function createLauncher(): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = IDS.fab;
  button.type = 'button';
  button.className = 'ghf-launcher';
  button.dataset.placement = 'floating';
  button.setAttribute('aria-haspopup', 'dialog');
  button.append(iconSvg('filter', 16));

  const text = document.createElement('span');
  text.className = 'ghf-fab-text';
  text.textContent = LAUNCHER_LABEL;
  button.append(text);

  button.addEventListener('click', () => openHandler?.());
  return button;
}

/**
 * Keep the launcher mounted in GitHub's own filter chrome. Runs on Turbo
 * events and on a debounced DOM observer, because GitHub re-renders the
 * toolbar and sidebar without a page load.
 */
export function syncLauncher(open: () => void): void {
  openHandler = open;
  try {
    if (window.self !== window.top) return;
  } catch {
    return;
  }
  if (!document.body) return;

  if (!isSearchPath(location.pathname)) {
    document.getElementById(IDS.fab)?.remove();
    launcherItem?.remove();
    launcherItem = null;
    launcherRow?.remove();
    launcherRow = null;
    retryAttempts = 0;
    if (retryTimer !== undefined) {
      clearTimeout(retryTimer);
      retryTimer = undefined;
    }
    return;
  }

  let button = document.getElementById(IDS.fab) as HTMLButtonElement | null;
  if (!button) {
    launcherItem?.remove();
    launcherItem = null;
    button = createLauncher();
  }

  const count = countActiveFilters(parseUrl(location.search));
  updateBadge(button, count);
  const label = count > 0 ? `${LAUNCHER_LABEL}, ${count} active filters` : LAUNCHER_LABEL;
  button.setAttribute('aria-label', label);
  button.title = `${NAME} — ${LAUNCHER_LABEL}`;
  const panel = document.getElementById(IDS.panel) as HTMLDialogElement | null;
  button.setAttribute('aria-expanded', String(panel?.open ?? false));

  const target = findLauncherTarget();
  // During Turbo navigation results render before the sidebar/toolbar, so a
  // floating fallback would flash over the page. Wait for native chrome on
  // results pages; only the bare /search landing page may use the fallback.
  if (!target && document.querySelector(RESULTS_LIST)) {
    button.remove();
    launcherItem?.remove();
    launcherItem = null;
    launcherRow?.remove();
    launcherRow = null;
    // GitHub can restore a cached results page before (or without) a later
    // mutation, so retry the native slot lookup a few times.
    if (retryAttempts < 5 && retryTimer === undefined) {
      retryAttempts += 1;
      retryTimer = setTimeout(() => {
        retryTimer = undefined;
        if (openHandler) syncLauncher(openHandler);
      }, 400);
    }
    observeLauncher();
    return;
  }

  retryAttempts = 0;
  if (retryTimer !== undefined) {
    clearTimeout(retryTimer);
    retryTimer = undefined;
  }
  placeLauncher(button, target);
  observeLauncher();
}

function observeLauncher(): void {
  if (launcherObserved) return;
  launcherObserved = true;
  new MutationObserver(scheduleLauncherSync).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  // GitHub swaps the sidebar for the toolbar at a breakpoint; a resize must
  // move the launcher even when React does not re-render its filter chrome.
  window.addEventListener('resize', scheduleLauncherSync, { passive: true });
}

function scheduleLauncherSync(): void {
  if (launcherQueued) return;
  launcherQueued = true;
  requestAnimationFrame(() => {
    launcherQueued = false;
    if (openHandler) syncLauncher(openHandler);
  });
}

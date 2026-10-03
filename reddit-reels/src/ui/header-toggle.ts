/**
 * Header Toggle
 * Reel / list switch (plus the videos-only filter while reels are on) living
 * inside Reddit's own header, next to the user menu. Falls back to a fixed
 * pill at the top right when the header anchors are not found.
 */

export interface HeaderToggleHandlers {
  onToggleReel: () => void;
  onToggleFilter: () => void;
}

const CLUSTER_ID = 'rr-header-cluster';
const HEADER_ANCHORS = [
  '#expand-user-drawer-button',
  '#login-button',
  'reddit-header-large header nav > :last-child',
  'reddit-header-small header nav > :last-child',
];

const FILTER_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.5"></rect><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"></path></svg>`;
const REEL_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="3"></rect><polygon points="10 9 15 12 10 15 10 9"></polygon></svg>`;
const LIST_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><circle cx="4" cy="6" r="1"></circle><circle cx="4" cy="12" r="1"></circle><circle cx="4" cy="18" r="1"></circle></svg>`;

function findHeaderAnchor(): HTMLElement | null {
  for (const sel of HEADER_ANCHORS) {
    try {
      const el = document.querySelector<HTMLElement>(sel);
      if (el?.parentElement) return el;
    } catch {}
  }
  return null;
}

function buildCluster(handlers: HeaderToggleHandlers): HTMLElement {
  const cluster = document.createElement('div');
  cluster.id = CLUSTER_ID;
  cluster.className = 'rr-header-cluster';

  const filterBtn = document.createElement('button');
  filterBtn.type = 'button';
  filterBtn.className = 'rr-header-btn rr-header-filter';
  filterBtn.innerHTML = FILTER_ICON;
  filterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handlers.onToggleFilter();
  });

  const reelBtn = document.createElement('button');
  reelBtn.type = 'button';
  reelBtn.className = 'rr-header-btn rr-header-reel';
  reelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handlers.onToggleReel();
  });

  cluster.append(filterBtn, reelBtn);
  return cluster;
}

/**
 * Ensures the cluster exists and sits in the header (re-mounts after Reddit
 * re-renders its header on navigation). Returns the cluster element.
 */
export function mountHeaderToggle(handlers: HeaderToggleHandlers): HTMLElement {
  let cluster = document.getElementById(CLUSTER_ID);
  if (!cluster) cluster = buildCluster(handlers);

  const anchor = findHeaderAnchor();
  if (anchor && anchor.parentElement) {
    if (cluster.nextElementSibling !== anchor) {
      anchor.parentElement.insertBefore(cluster, anchor);
    }
    cluster.classList.remove('is-floating');
  } else if (!cluster.isConnected || !cluster.classList.contains('is-floating')) {
    cluster.classList.add('is-floating');
    document.body.appendChild(cluster);
  }
  return cluster;
}

export function syncHeaderToggle(reelOn: boolean, videosOnly: boolean): void {
  const cluster = document.getElementById(CLUSTER_ID);
  if (!cluster) return;
  const reelBtn = cluster.querySelector<HTMLButtonElement>('.rr-header-reel');
  if (reelBtn) {
    reelBtn.innerHTML = reelOn ? LIST_ICON : REEL_ICON;
    const label = reelOn ? 'Switch to list view' : 'Switch to reel view';
    reelBtn.setAttribute('aria-label', label);
    reelBtn.title = label;
    reelBtn.setAttribute('aria-pressed', String(reelOn));
  }
  const filterBtn = cluster.querySelector<HTMLButtonElement>('.rr-header-filter');
  if (filterBtn) {
    filterBtn.classList.toggle('is-active', videosOnly);
    filterBtn.setAttribute('aria-pressed', String(videosOnly));
    const label = videosOnly ? 'Showing videos only (show all posts)' : 'Showing all posts (videos only)';
    filterBtn.setAttribute('aria-label', label);
    filterBtn.title = label;
  }
}

export function unmountHeaderToggle(): void {
  document.getElementById(CLUSTER_ID)?.remove();
}

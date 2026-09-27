/**
 * In-Reel Comments Drawer UI Component
 * Provides an embedded, same-origin slide-over / bottom-sheet comments view
 * without bouncing users out to a new tab or violating zero-external-API rules.
 */

import type { ReelPost } from '../extractor/types';
import { escapeHtml, formatCount } from '../utils';

const safeRaf = typeof requestAnimationFrame === 'function'
  ? requestAnimationFrame
  : (cb: FrameRequestCallback) => setTimeout(cb, 16);

let activeDrawer: HTMLElement | null = null;
let activeBackdrop: HTMLElement | null = null;
let onDrawerCloseCallback: (() => void) | null = null;

export function isCommentsDrawerOpen(): boolean {
  return activeDrawer !== null && document.body.contains(activeDrawer);
}

export function closeCommentsDrawer(): void {
  if (onDrawerCloseCallback) {
    try { onDrawerCloseCallback(); } catch {}
    onDrawerCloseCallback = null;
  }
  if (activeDrawer) {
    activeDrawer.classList.remove('is-open');
    const drawerToKill = activeDrawer;
    setTimeout(() => drawerToKill.remove(), 280);
    activeDrawer = null;
  }
  if (activeBackdrop) {
    activeBackdrop.classList.remove('is-visible');
    const backdropToKill = activeBackdrop;
    setTimeout(() => backdropToKill.remove(), 200);
    activeBackdrop = null;
  }
}

export function openCommentsDrawer(
  post: ReelPost,
  callbacks?: { onBeforeOpen?: () => void; onClose?: () => void }
): HTMLElement {
  closeCommentsDrawer();
  if (callbacks?.onBeforeOpen) {
    try { callbacks.onBeforeOpen(); } catch {}
  }
  onDrawerCloseCallback = callbacks?.onClose || null;

  const rawUrl = post.permalink?.startsWith('http')
    ? post.permalink
    : `https://www.reddit.com${post.permalink || ''}`;
  const embedUrl = rawUrl.includes('?') ? `${rawUrl}&embedded=true` : `${rawUrl}?embedded=true`;

  const backdrop = document.createElement('div');
  backdrop.className = 'rr-comments-backdrop';
  backdrop.onclick = () => closeCommentsDrawer();
  document.body.appendChild(backdrop);
  activeBackdrop = backdrop;
  safeRaf(() => backdrop.classList.add('is-visible'));

  const drawer = document.createElement('div');
  drawer.className = 'rr-comments-drawer';
  drawer.innerHTML = `
    <div class="rr-drawer-header">
      <div class="rr-drawer-title-group">
        <div class="rr-drawer-title">${escapeHtml(post.title || 'Comments')}</div>
        <div class="rr-drawer-subtitle">${post.subreddit ? escapeHtml(post.subreddit) + ' • ' : ''}${formatCount(post.commentCount)} comments</div>
      </div>
      <div class="rr-drawer-actions">
        <a class="rr-drawer-btn" href="${escapeHtml(rawUrl)}" target="_blank" rel="noopener noreferrer" title="Open in new tab">
          <svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </a>
        <button type="button" class="rr-drawer-btn rr-drawer-close-btn" aria-label="Close comments" title="Close">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    </div>
    <div class="rr-drawer-body">
      <div class="rr-drawer-spinner"><div class="rr-spinner-circle"></div><span>Loading comments...</span></div>
      <iframe class="rr-drawer-iframe" src="${escapeHtml(embedUrl)}" loading="eager" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
    </div>
  `;

  const closeBtn = drawer.querySelector<HTMLButtonElement>('.rr-drawer-close-btn');
  closeBtn?.addEventListener('click', () => closeCommentsDrawer());

  const iframe = drawer.querySelector<HTMLIFrameElement>('.rr-drawer-iframe');
  const spinner = drawer.querySelector<HTMLElement>('.rr-drawer-spinner');
  iframe?.addEventListener('load', () => spinner?.classList.add('is-hidden'), { once: true });
  setTimeout(() => spinner?.classList.add('is-hidden'), 3500);

  document.body.appendChild(drawer);
  activeDrawer = drawer;
  safeRaf(() => drawer.classList.add('is-open'));

  return drawer;
}

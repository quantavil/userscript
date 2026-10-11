import { extractThumbMeta } from './extract';
import { I } from './icons';

/**
 * Persistent detail strip BELOW every thumbnail (never an overlay, no hover
 * needed — touch-safe). Free listing data renders instantly; the HD block
 * fills in only after an explicit tap on the details toggle.
 */
export function enhanceThumb(thumb: HTMLElement): void {
  if (thumb.dataset.whEnhanced === '1') return;
  thumb.dataset.whEnhanced = '1';
  const m = extractThumbMeta(thumb);

  const catCls = m.category ? `wh-cat-${m.category.toLowerCase()}` : '';
  const purCls = m.purity ? `wh-pur-${m.purity.toLowerCase()}` : '';
  const below = document.createElement('div');
  below.className = 'wh-below';
  below.innerHTML = `
    <div class="whb-row">
      <span class="wh-chip wh-res">${m.res || '—'}</span>
      <span class="wh-chip wh-fav">${I.star}<span>${m.favs}</span></span>
      <span class="wh-chip wh-type">${m.fileType}</span>
      ${m.category ? `<span class="wh-dot ${catCls}" data-kind="category" title="Category: ${m.category}" aria-label="Category: ${m.category}"></span>` : ''}
      ${m.purity ? `<span class="wh-dot ${purCls}" data-kind="purity" title="Purity: ${m.purity}" aria-label="Purity: ${m.purity}"></span>` : ''}
    </div>
    <div class="whb-actions">
      <button class="wh-btn wh-dl" data-act="dl" title="Download full">${I.download}</button>
      <button class="wh-btn wh-fs" data-act="fs" title="Fullscreen">${I.expand}</button>
      <button class="wh-btn wh-op" data-act="op" title="Open page">${I.open}</button>
      <button class="wh-btn wh-fav" data-act="fav" title="Favorite">${I.star}</button>
      <button class="wh-btn wh-more" data-act="more" data-open="0" title="Details">${I.chev}</button>
    </div>
    <div class="whb-full" hidden></div>
  `;
  thumb.after(below);
  syncFavButton(thumb);
}

export function enhanceAll(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('figure.thumb[data-wallpaper-id]:not([data-wh-enhanced])').forEach(enhanceThumb);
}

export function thumbId(thumb: HTMLElement): string {
  return thumb.getAttribute('data-wallpaper-id') || '';
}

/** The grid cell (li) a button belongs to, and its thumbnail figure. */
export function scopeThumb(btn: HTMLElement): HTMLElement | null {
  const li = btn.closest('li');
  return (li && li.querySelector('figure.thumb')) as HTMLElement | null;
}

/** Mirror the native favorite state onto our strip button. */
export function syncFavButton(thumb: HTMLElement): void {
  const li = thumb.parentElement;
  if (!li) return;
  const nativeFav = thumb.querySelector('.thumb-btn-fav, .wall-favs');
  const isFav = !!(nativeFav && (nativeFav.classList.contains('active') || nativeFav.classList.contains('favorited') || nativeFav.getAttribute('data-faved') === '1'));
  const btn = li.querySelector('.wh-btn.wh-fav');
  if (btn) {
    btn.classList.toggle('wh-fav-active', isFav);
    btn.setAttribute('title', isFav ? 'Favorited' : 'Favorite');
  }
}

function dlButtons(thumb: HTMLElement): HTMLButtonElement[] {
  const li = thumb.parentElement;
  const scope: ParentNode = li || document;
  return [...scope.querySelectorAll<HTMLButtonElement>('.wh-btn.wh-dl')];
}

export function setDlState(thumb: HTMLElement, state: 'idle' | 'loading' | 'done' | 'error'): void {
  const btns = dlButtons(thumb);
  btns.forEach(btn => {
    btn.dataset.state = state;
    if (state === 'loading') btn.innerHTML = I.spin;
    else if (state === 'done') btn.innerHTML = I.check;
    else btn.innerHTML = I.download;
  });
  if (state === 'done' || state === 'error') {
    setTimeout(() => {
      if (!thumb.isConnected) return;
      dlButtons(thumb).forEach(btn => {
        btn.dataset.state = 'idle';
        btn.innerHTML = I.download;
      });
    }, 1600);
  }
}

export function setFullHtml(thumb: HTMLElement, html: string, open: boolean): void {
  const li = thumb.parentElement;
  if (!li) return;
  const full = li.querySelector('.whb-full');
  const more = li.querySelector<HTMLButtonElement>('.wh-btn.wh-more');
  if (full) {
    full.innerHTML = html;
    if (open) full.removeAttribute('hidden');
    else full.setAttribute('hidden', '');
  }
  if (more) more.dataset.open = open ? '1' : '0';
}

export function isFullOpen(thumb: HTMLElement): boolean {
  const li = thumb.parentElement;
  const more = li && li.querySelector<HTMLButtonElement>('.wh-btn.wh-more');
  return !!(more && more.dataset.open === '1');
}

export function observeGrid(onNew: () => void): MutationObserver {
  const obs = new MutationObserver(mutations => {
    let found = false;
    for (const mu of mutations) {
      mu.addedNodes.forEach(n => {
        if (n instanceof HTMLElement) {
          if (n.matches?.('figure.thumb[data-wallpaper-id]')) found = true;
          else if (n.querySelector?.('figure.thumb[data-wallpaper-id]')) found = true;
        }
      });
    }
    if (found) onNew();
  });
  const host = document.getElementById('thumbs') || document.body;
  obs.observe(host, { childList: true, subtree: true });
  return obs;
}

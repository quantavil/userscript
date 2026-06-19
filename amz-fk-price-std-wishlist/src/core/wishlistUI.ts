import type { WishlistItem } from './types';
import { getWishlist, removeItem, clearWishlist } from './wishlist';
import { fmtPrice } from '../utils/formatters';
import { ICON } from './icons';

// ── State ────────────────────────────────────────────────────────────
let fab: HTMLDivElement;
let panel: HTMLDivElement;
let badge: HTMLDivElement;
let listContainer: HTMLDivElement;
let panelVisible = false;

let searchQuery = '';
let activeSort: SortKey = 'dateAdded';
let activePlatform: PlatformFilter = 'All';

type SortKey = 'dateAdded' | 'priceLow' | 'priceHigh' | 'nameAz';
type PlatformFilter = 'All' | 'Amazon' | 'Flipkart';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'dateAdded', label: 'Date Added' },
  { key: 'priceLow', label: 'Price: Low → High' },
  { key: 'priceHigh', label: 'Price: High → Low' },
  { key: 'nameAz', label: 'Name: A → Z' },
];

// ── Public entry ─────────────────────────────────────────────────────
export function initWishlistUI() {
  createFAB();
  createPanel();
  window.addEventListener('wishlist-updated', updateUI);
  updateUI();
}

// ── FAB ──────────────────────────────────────────────────────────────
function createFAB() {
  fab = document.createElement('div');
  fab.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px;
    background: linear-gradient(135deg, #6366f1, #4f46e5); border-radius: 28px;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    z-index: 2147483647;
    box-shadow: 0 4px 16px rgba(79,70,229,0.4), 0 2px 4px rgba(0,0,0,0.1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  `;
  fab.innerHTML = ICON.heart(28);
  fab.onmouseenter = () => {
    fab.style.transform = 'scale(1.1)';
    fab.style.boxShadow = '0 6px 24px rgba(79,70,229,0.5), 0 2px 4px rgba(0,0,0,0.15)';
  };
  fab.onmouseleave = () => {
    fab.style.transform = 'scale(1)';
    fab.style.boxShadow = '0 4px 16px rgba(79,70,229,0.4), 0 2px 4px rgba(0,0,0,0.1)';
  };

  badge = document.createElement('div');
  badge.style.cssText = `
    position: absolute; top: -4px; right: -4px; background: #ef4444; color: white;
    font-size: 11px; font-weight: 700; min-width: 18px; height: 18px; border-radius: 9px;
    display: none; align-items: center; justify-content: center; padding: 0 4px;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  fab.appendChild(badge);

  fab.addEventListener('click', (e) => {
    e.stopPropagation();
    panelVisible = !panelVisible;
    panel.style.display = panelVisible ? 'flex' : 'none';
    if (panelVisible) renderPanelList();
  });

  document.body.appendChild(fab);
}

// ── Panel ────────────────────────────────────────────────────────────
function createPanel() {
  panel = document.createElement('div');
  panel.style.cssText = `
    position: fixed; bottom: 92px; right: 24px; width: 400px; max-height: 540px;
    background: #ffffff; border-radius: 16px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08);
    z-index: 2147483646; display: none; flex-direction: column; overflow: hidden;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    border: 1px solid #e5e7eb;
  `;

  // ─ Header ─
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex; justify-content: space-between; align-items: center;
    padding: 14px 16px; border-bottom: 1px solid #f3f4f6;
    background: linear-gradient(to right, #fafafe, #f5f3ff);
  `;

  const titleWrap = document.createElement('div');
  titleWrap.style.cssText = `display: flex; align-items: center; gap: 8px;`;

  const title = document.createElement('h3');
  title.id = 'ppu-panel-title';
  title.textContent = 'Wishlist';
  title.style.cssText = `margin: 0; font-size: 15px; color: #111827; font-weight: 700; letter-spacing: -0.01em;`;

  const countBadge = document.createElement('span');
  countBadge.id = 'ppu-panel-count';
  countBadge.style.cssText = `
    font-size: 11px; font-weight: 600; color: #6366f1; background: #eef2ff;
    padding: 2px 7px; border-radius: 10px;
  `;
  countBadge.textContent = '0';
  titleWrap.appendChild(title);
  titleWrap.appendChild(countBadge);

  const actions = document.createElement('div');
  actions.style.cssText = `display: flex; gap: 4px;`;
  actions.appendChild(createHeaderBtn('ppu-copy-btn', 'Copy as Markdown', ICON.clipboard(), '#6b7280', '#f3f4f6', handleCopy));
  actions.appendChild(createHeaderBtn('ppu-clear-btn', 'Clear All', ICON.trash(20, '#ef4444'), '#ef4444', '#fef2f2', handleClearClick));

  header.appendChild(titleWrap);
  header.appendChild(actions);
  panel.appendChild(header);

  // ─ Toolbar: Search + Sort + Filter ─
  const toolbar = document.createElement('div');
  toolbar.style.cssText = `padding: 10px 12px 6px; display: flex; flex-direction: column; gap: 8px; border-bottom: 1px solid #f3f4f6;`;

  // Search row
  const searchRow = document.createElement('div');
  searchRow.style.cssText = `position: relative; display: flex; align-items: center;`;

  const searchIcon = document.createElement('div');
  searchIcon.style.cssText = `position: absolute; left: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; display: flex;`;
  searchIcon.innerHTML = ICON.search(14, '#9ca3af');

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search wishlist…';
  searchInput.style.cssText = `
    width: 100%; padding: 7px 32px 7px 32px; border: 1px solid #e5e7eb; border-radius: 8px;
    font-size: 13px; color: #374151; background: #f9fafb; outline: none;
    font-family: inherit; transition: border-color 0.15s, box-shadow 0.15s;
  `;
  searchInput.onfocus = () => { searchInput.style.borderColor = '#a5b4fc'; searchInput.style.boxShadow = '0 0 0 3px rgba(165,180,252,0.2)'; };
  searchInput.onblur = () => { searchInput.style.borderColor = '#e5e7eb'; searchInput.style.boxShadow = 'none'; };

  let searchTimer: number | null = null;
  searchInput.addEventListener('input', () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      searchQuery = searchInput.value.trim().toLowerCase();
      renderPanelList();
    }, 150);
  });

  const clearSearch = document.createElement('div');
  clearSearch.style.cssText = `position: absolute; right: 8px; top: 50%; transform: translateY(-50%); cursor: pointer; display: none; padding: 2px;`;
  clearSearch.innerHTML = ICON.close(14, '#9ca3af');
  clearSearch.addEventListener('click', (e) => {
    e.stopPropagation();
    searchInput.value = '';
    searchQuery = '';
    clearSearch.style.display = 'none';
    renderPanelList();
  });
  searchInput.addEventListener('input', () => {
    clearSearch.style.display = searchInput.value ? 'flex' : 'none';
  });

  searchRow.appendChild(searchIcon);
  searchRow.appendChild(searchInput);
  searchRow.appendChild(clearSearch);
  toolbar.appendChild(searchRow);

  // Sort + Filter row
  const controlsRow = document.createElement('div');
  controlsRow.style.cssText = `display: flex; gap: 8px; align-items: center; justify-content: space-between;`;

  // Sort selector
  const sortWrap = document.createElement('div');
  sortWrap.style.cssText = `position: relative; display: flex; align-items: center;`;

  const sortBtn = document.createElement('button');
  sortBtn.style.cssText = `
    display: flex; align-items: center; gap: 4px; padding: 4px 10px; border: 1px solid #e5e7eb;
    border-radius: 6px; background: #f9fafb; cursor: pointer; font-size: 11px; color: #6b7280;
    font-family: inherit; font-weight: 500; transition: border-color 0.15s;
  `;
  sortBtn.innerHTML = ICON.sort(12, '#9ca3af') + ' <span style="margin-left:2px">Date Added</span>';

  const sortDropdown = document.createElement('div');
  sortDropdown.style.cssText = `
    position: absolute; top: calc(100% + 4px); left: 0; min-width: 160px;
    background: white; border: 1px solid #e5e7eb; border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 10; display: none;
    overflow: hidden;
  `;

  SORT_OPTIONS.forEach(opt => {
    const item = document.createElement('div');
    item.style.cssText = `
      padding: 8px 12px; font-size: 12px; color: #374151; cursor: pointer;
      font-family: inherit; transition: background 0.1s;
    `;
    if (opt.key === activeSort) item.style.background = '#eef2ff';
    item.textContent = opt.label;
    item.onmouseenter = () => { item.style.background = '#f3f4f6'; };
    item.onmouseleave = () => { item.style.background = opt.key === activeSort ? '#eef2ff' : 'transparent'; };
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      activeSort = opt.key;
      const label = sortBtn.querySelector('span');
      if (label) label.textContent = opt.label;
      sortDropdown.style.display = 'none';
      // Update active highlight
      Array.from(sortDropdown.children).forEach((c, i) => {
        (c as HTMLElement).style.background = SORT_OPTIONS[i]!.key === activeSort ? '#eef2ff' : 'transparent';
      });
      renderPanelList();
    });
    sortDropdown.appendChild(item);
  });

  sortBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sortDropdown.style.display = sortDropdown.style.display === 'none' ? 'block' : 'none';
  });

  // Close dropdown on outside click
  document.addEventListener('click', () => { sortDropdown.style.display = 'none'; });

  sortWrap.appendChild(sortBtn);
  sortWrap.appendChild(sortDropdown);
  controlsRow.appendChild(sortWrap);

  // Platform filter pills
  const pillWrap = document.createElement('div');
  pillWrap.style.cssText = `display: flex; gap: 4px;`;

  const platforms: PlatformFilter[] = ['All', 'Amazon', 'Flipkart'];
  const pillEls: HTMLDivElement[] = [];

  platforms.forEach(p => {
    const pill = document.createElement('div');
    pill.style.cssText = pillStyle(p === activePlatform);
    pill.textContent = p;
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      activePlatform = p;
      pillEls.forEach((el, i) => { el.style.cssText = pillStyle(platforms[i] === activePlatform); });
      renderPanelList();
    });
    pillEls.push(pill);
    pillWrap.appendChild(pill);
  });

  controlsRow.appendChild(pillWrap);
  toolbar.appendChild(controlsRow);
  panel.appendChild(toolbar);

  // ─ Inline confirmation bar (hidden) ─
  const confirmBar = document.createElement('div');
  confirmBar.id = 'ppu-confirm-bar';
  confirmBar.style.cssText = `
    display: none; padding: 10px 16px; background: #fef2f2; border-bottom: 1px solid #fecaca;
    align-items: center; justify-content: space-between; gap: 8px;
  `;
  const confirmText = document.createElement('span');
  confirmText.textContent = 'Clear all items?';
  confirmText.style.cssText = `font-size: 13px; color: #991b1b; font-weight: 500;`;

  const confirmActions = document.createElement('div');
  confirmActions.style.cssText = `display: flex; gap: 6px;`;

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = `
    padding: 4px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: white;
    font-size: 12px; color: #6b7280; cursor: pointer; font-family: inherit; font-weight: 500;
  `;
  cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); confirmBar.style.display = 'none'; });

  const confirmClearBtn = document.createElement('button');
  confirmClearBtn.textContent = 'Clear';
  confirmClearBtn.style.cssText = `
    padding: 4px 12px; border: none; border-radius: 6px; background: #ef4444;
    font-size: 12px; color: white; cursor: pointer; font-family: inherit; font-weight: 600;
  `;
  confirmClearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearWishlist();
    confirmBar.style.display = 'none';
    showToast('Wishlist cleared');
  });

  confirmActions.appendChild(cancelBtn);
  confirmActions.appendChild(confirmClearBtn);
  confirmBar.appendChild(confirmText);
  confirmBar.appendChild(confirmActions);
  panel.appendChild(confirmBar);

  // ─ List container ─
  listContainer = document.createElement('div');
  listContainer.style.cssText = `flex: 1; overflow-y: auto; padding: 4px 0;`;
  panel.appendChild(listContainer);

  document.body.appendChild(panel);
}

// ── Helpers ──────────────────────────────────────────────────────────
function pillStyle(active: boolean): string {
  return `
    padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; font-family: inherit;
    ${active
      ? 'background: #4f46e5; color: white; border: 1px solid #4f46e5;'
      : 'background: #f3f4f6; color: #6b7280; border: 1px solid #e5e7eb;'
    }
  `;
}

function createHeaderBtn(id: string, title: string, iconHtml: string, color: string, hoverBg: string, handler: (e: Event) => void): HTMLDivElement {
  const btn = document.createElement('div');
  btn.id = id;
  btn.title = title;
  btn.style.cssText = `cursor: pointer; color: ${color}; display: flex; align-items: center; padding: 6px; border-radius: 6px; transition: background 0.15s;`;
  btn.innerHTML = iconHtml;
  btn.onmouseenter = () => { btn.style.background = hoverBg; };
  btn.onmouseleave = () => { btn.style.background = 'transparent'; };
  btn.addEventListener('click', (e) => { e.stopPropagation(); handler(e); });
  return btn;
}

// ── Data pipeline: filter → sort ─────────────────────────────────────
function getFilteredSortedItems(): WishlistItem[] {
  let items = getWishlist();

  // Platform filter
  if (activePlatform !== 'All') {
    items = items.filter(i => i.platform === activePlatform);
  }

  // Search filter
  if (searchQuery) {
    items = items.filter(i => i.title.toLowerCase().includes(searchQuery));
  }

  // Sort
  switch (activeSort) {
    case 'priceLow':
      items.sort((a, b) => a.price - b.price);
      break;
    case 'priceHigh':
      items.sort((a, b) => b.price - a.price);
      break;
    case 'nameAz':
      items.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'dateAdded':
    default:
      items.sort((a, b) => (b.dateAdded ?? 0) - (a.dateAdded ?? 0));
      break;
  }

  return items;
}

// ── Render ────────────────────────────────────────────────────────────
function renderPanelList() {
  if (!listContainer) return;
  listContainer.innerHTML = '';

  const allItems = getWishlist();
  const items = getFilteredSortedItems();

  // Update count badge
  const countEl = document.getElementById('ppu-panel-count');
  if (countEl) countEl.textContent = String(allItems.length);

  if (allItems.length === 0) {
    renderEmptyState(listContainer);
    return;
  }

  if (items.length === 0) {
    const noMatch = document.createElement('div');
    noMatch.style.cssText = `text-align: center; color: #9ca3af; padding: 28px 16px; font-size: 13px;`;
    noMatch.textContent = 'No items match your filters.';
    listContainer.appendChild(noMatch);
    return;
  }

  items.forEach(item => listContainer.appendChild(createItemRow(item)));
}

function renderEmptyState(container: HTMLDivElement) {
  const wrap = document.createElement('div');
  wrap.style.cssText = `
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 40px 24px; color: #d1d5db;
  `;
  const iconWrap = document.createElement('div');
  iconWrap.style.cssText = `margin-bottom: 12px; opacity: 0.6;`;
  iconWrap.innerHTML = ICON.emptyHeart(48, '#d1d5db');
  const msg = document.createElement('div');
  msg.style.cssText = `font-size: 13px; color: #9ca3af; text-align: center; line-height: 1.5;`;
  msg.innerHTML = 'Your wishlist is empty.<br>Click the heart icon on product<br>badges to save items.';
  wrap.appendChild(iconWrap);
  wrap.appendChild(msg);
  container.appendChild(wrap);
}

function createItemRow(item: WishlistItem): HTMLDivElement {
  const row = document.createElement('div');
  row.style.cssText = `
    display: flex; gap: 10px; padding: 10px 14px; margin: 0 4px;
    align-items: center; transition: background 0.15s; border-radius: 8px;
  `;
  row.onmouseenter = () => { row.style.background = '#f9fafb'; };
  row.onmouseleave = () => { row.style.background = 'transparent'; };

  // Thumbnail with cross-origin fallback
  const thumb = document.createElement('div');
  thumb.style.cssText = `width: 44px; height: 44px; border-radius: 6px; flex-shrink: 0; overflow: hidden; position: relative;`;

  const fallbackColor = item.platform === 'Amazon' ? '#f59e0b' : '#3b82f6';
  const fallbackLetter = item.platform === 'Amazon' ? 'A' : 'F';

  // Always create the fallback badge (visible if img fails or missing)
  const fallback = document.createElement('div');
  fallback.style.cssText = `
    width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
    background: ${fallbackColor}15; color: ${fallbackColor}; font-size: 18px; font-weight: 700;
    font-family: inherit; border: 1px solid ${fallbackColor}30; border-radius: 6px;
  `;
  fallback.textContent = fallbackLetter;
  thumb.appendChild(fallback);

  if (item.imageUrl) {
    const img = document.createElement('img');
    img.referrerPolicy = 'no-referrer';
    img.crossOrigin = 'anonymous';
    img.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      object-fit: contain; background: #f3f4f6; border-radius: 6px; border: 1px solid #f0f0f0;
    `;
    img.onload = () => { fallback.style.display = 'none'; };
    img.onerror = () => { img.style.display = 'none'; };
    img.src = item.imageUrl;
    thumb.appendChild(img);
  }
  row.appendChild(thumb);

  // Details
  const details = document.createElement('div');
  details.style.cssText = `flex: 1; min-width: 0;`;

  const titleEl = document.createElement('a');
  titleEl.href = item.url;
  titleEl.target = '_blank';
  titleEl.textContent = item.title;
  titleEl.style.cssText = `
    display: block; font-size: 12px; font-weight: 500; color: #1f2937;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    text-decoration: none; line-height: 1.4;
  `;
  titleEl.onmouseenter = () => { titleEl.style.color = '#4f46e5'; };
  titleEl.onmouseleave = () => { titleEl.style.color = '#1f2937'; };
  titleEl.addEventListener('click', (e) => e.stopPropagation());

  const metaRow = document.createElement('div');
  metaRow.style.cssText = `font-size: 11px; color: #6b7280; margin-top: 3px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;`;

  const priceSpan = document.createElement('span');
  priceSpan.textContent = fmtPrice(item.price);
  priceSpan.style.cssText = `font-weight: 600; color: #111827;`;

  const sep = document.createElement('span');
  sep.textContent = '·';
  sep.style.cssText = `color: #d1d5db;`;

  const rateSpan = document.createElement('span');
  rateSpan.textContent = item.rateText;

  const platformBadge = document.createElement('span');
  const isAmazon = item.platform === 'Amazon';
  platformBadge.innerHTML = isAmazon ? ICON.amazon(16, 16) : ICON.flipkart(16, 16);
  platformBadge.title = `Saved from ${item.platform}`;
  platformBadge.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
    margin-left: auto;
  `;

  metaRow.appendChild(priceSpan);
  metaRow.appendChild(sep);
  metaRow.appendChild(rateSpan);
  metaRow.appendChild(platformBadge);

  details.appendChild(titleEl);
  details.appendChild(metaRow);

  // Remove button
  const removeBtn = document.createElement('button');
  removeBtn.style.cssText = `
    background: none; border: none; cursor: pointer; padding: 4px;
    flex-shrink: 0; border-radius: 4px; display: flex; align-items: center;
    transition: background 0.15s;
  `;
  removeBtn.innerHTML = ICON.close(14, '#c4c8cf');
  removeBtn.onmouseenter = () => { removeBtn.style.background = '#fef2f2'; removeBtn.innerHTML = ICON.close(14, '#ef4444'); };
  removeBtn.onmouseleave = () => { removeBtn.style.background = 'none'; removeBtn.innerHTML = ICON.close(14, '#c4c8cf'); };
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeItem(item.id);
    showToast('Item removed');
  });

  row.appendChild(details);
  row.appendChild(removeBtn);
  return row;
}

// ── Actions ──────────────────────────────────────────────────────────
function handleClearClick() {
  const bar = document.getElementById('ppu-confirm-bar');
  if (bar) bar.style.display = bar.style.display === 'flex' ? 'none' : 'flex';
}

function handleCopy() {
  const items = getWishlist();
  if (items.length === 0) return;

  const header = '| Title | Price | Rate | Platform | Rating | Num Ratings | URL |';
  const divider = '|---|---|---|---|---|---|---|';
  const rows = items.map(i =>
    `| ${i.title.replace(/\|/g, '')} | ${fmtPrice(i.price)} | ${i.rateText} | ${i.platform} | ${i.rating ?? 'N/A'} | ${i.numRatings ?? 'N/A'} | ${i.url} |`
  );

  const text = [header, divider, ...rows].join('\n');
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('ppu-copy-btn');
    if (btn) {
      btn.innerHTML = ICON.check();
      setTimeout(() => { btn.innerHTML = ICON.clipboard(); }, 2000);
    }
    showToast('Copied to clipboard!');
  });
}

// ── Toast ────────────────────────────────────────────────────────────
function showToast(msg: string) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 92px; left: 50%; transform: translateX(-50%);
    background: #1f2937; color: white; padding: 8px 20px; border-radius: 8px;
    font-size: 13px; font-weight: 500; z-index: 2147483647;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    font-family: system-ui, -apple-system, sans-serif;
    opacity: 0; transition: opacity 0.2s ease;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  // Trigger fade-in
  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { toast.remove(); }, 200);
  }, 2000);
}

// ── Reactive update ──────────────────────────────────────────────────
function updateUI() {
  const items = getWishlist();
  const count = items.length;
  badge.textContent = String(count);
  badge.style.display = count > 0 ? 'flex' : 'none';

  if (panelVisible) renderPanelList();
}

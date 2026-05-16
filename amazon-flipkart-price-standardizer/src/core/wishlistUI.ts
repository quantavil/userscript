import type { WishlistItem } from './types';
import { getWishlist, removeItem, clearWishlist } from './wishlist';
import { fmtPrice } from '../utils/formatters';

let fab: HTMLDivElement;
let panel: HTMLDivElement;
let badge: HTMLDivElement;
let panelVisible = false;

export function initWishlistUI() {
  createFAB();
  createPanel();
  window.addEventListener('wishlist-updated', updateUI);
  updateUI();
}

function createFAB() {
  fab = document.createElement('div');
  fab.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px;
    background: #1d4ed8; border-radius: 28px; display: flex; align-items: center;
    justify-content: center; cursor: pointer; z-index: 2147483647;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: transform 0.2s ease;
  `;
  fab.innerHTML = `
    <svg viewBox="0 0 24 24" width="28" height="28" fill="white" stroke="white" stroke-width="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
  `;

  badge = document.createElement('div');
  badge.style.cssText = `
    position: absolute; top: -4px; right: -4px; background: #ef4444; color: white;
    font-size: 11px; font-weight: 700; min-width: 18px; height: 18px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center; padding: 0 4px;
  `;
  badge.textContent = '0';
  fab.appendChild(badge);

  fab.addEventListener('click', () => {
    panelVisible = !panelVisible;
    panel.style.display = panelVisible ? 'flex' : 'none';
    if (panelVisible) renderPanelList();
  });

  document.body.appendChild(fab);
}

function createPanel() {
  panel = document.createElement('div');
  panel.style.cssText = `
    position: fixed; bottom: 92px; right: 24px; width: 380px; max-height: 500px;
    background: white; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    z-index: 2147483646; display: none; flex-direction: column; overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    border: 1px solid #e5e7eb;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    display: flex; justify-content: space-between; align-items: center;
    padding: 16px; border-bottom: 1px solid #e5e7eb; background: #f9fafb;
  `;
  
  const title = document.createElement('h3');
  title.textContent = 'Cross-Platform Wishlist';
  title.style.cssText = `margin: 0; font-size: 16px; color: #111827; font-weight: 600;`;

  const actions = document.createElement('div');
  actions.style.cssText = `display: flex; gap: 8px;`;

  const copyBtn = document.createElement('div');
  copyBtn.id = 'ppu-copy-btn';
  copyBtn.style.cssText = `cursor: pointer; color: #6b7280; display: flex; align-items: center; padding: 4px; border-radius: 4px; transition: background 0.15s;`;
  copyBtn.title = 'Copy Wishlist as Markdown Table';
  copyBtn.onmouseenter = () => copyBtn.style.background = '#f3f4f6';
  copyBtn.onmouseleave = () => copyBtn.style.background = 'transparent';
  copyBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    </svg>
  `;
  copyBtn.addEventListener('click', copyWishlistToClipboard);

  const clearBtn = document.createElement('div');
  clearBtn.style.cssText = `cursor: pointer; color: #ef4444; display: flex; align-items: center; padding: 4px; border-radius: 4px; transition: background 0.15s;`;
  clearBtn.title = 'Clear All Items';
  clearBtn.onmouseenter = () => clearBtn.style.background = '#fef2f2';
  clearBtn.onmouseleave = () => clearBtn.style.background = 'transparent';
  clearBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  `;
  clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear your wishlist?')) {
      clearWishlist();
    }
  });

  actions.appendChild(copyBtn);
  actions.appendChild(clearBtn);
  header.appendChild(title);
  header.appendChild(actions);
  panel.appendChild(header);

  const listContainer = document.createElement('div');
  listContainer.id = 'ppu-wishlist-list';
  listContainer.style.cssText = `flex: 1; overflow-y: auto; padding: 8px;`;
  panel.appendChild(listContainer);

  document.body.appendChild(panel);
}

function renderPanelList() {
  const listContainer = document.getElementById('ppu-wishlist-list');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  const items = getWishlist();

  if (items.length === 0) {
    listContainer.innerHTML = `<div style="text-align: center; color: #9ca3af; padding: 32px 16px; font-size: 14px;">Your wishlist is empty.<br>Click the heart icon on product badges to save items.</div>`;
    return;
  }

  items.forEach(item => {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex; gap: 12px; padding: 12px; border-bottom: 1px solid #f3f4f6;
      align-items: center; transition: background 0.15s;
    `;
    row.onmouseenter = () => row.style.background = '#f9fafb';
    row.onmouseleave = () => row.style.background = 'transparent';

    const img = document.createElement('img');
    img.src = item.imageUrl || '';
    img.style.cssText = `width: 48px; height: 48px; object-fit: contain; border-radius: 4px; flex-shrink: 0; background: #f3f4f6;`;
    if (!item.imageUrl) img.style.display = 'none';

    const details = document.createElement('div');
    details.style.cssText = `flex: 1; min-width: 0;`;

    const titleEl = document.createElement('a');
    titleEl.href = item.url;
    titleEl.target = '_blank';
    titleEl.textContent = item.title;
    titleEl.style.cssText = `
      display: block; font-size: 13px; font-weight: 500; color: #111827;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-decoration: none;
    `;
    titleEl.onmouseenter = () => titleEl.style.textDecoration = 'underline';
    titleEl.onmouseleave = () => titleEl.style.textDecoration = 'none';

    const metaEl = document.createElement('div');
    metaEl.style.cssText = `font-size: 12px; color: #6b7280; margin-top: 4px; display: flex; gap: 8px;`;
    metaEl.innerHTML = `
      <span style="font-weight: 600; color: #111827;">${fmtPrice(item.price)}</span>
      <span style="color:#9ca3af;">•</span>
      <span>${item.rateText}</span>
    `;

    const platformEl = document.createElement('span');
    platformEl.textContent = item.platform;
    platformEl.style.cssText = `
      display: inline-block; margin-top: 4px; font-size: 10px; font-weight: 600;
      padding: 2px 6px; border-radius: 4px; text-transform: uppercase;
      background: ${item.platform === 'Amazon' ? '#ff9900' : '#2874f0'}; color: white;
    `;

    details.appendChild(titleEl);
    details.appendChild(metaEl);
    details.appendChild(platformEl);

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✕';
    removeBtn.style.cssText = `
      background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 14px;
      padding: 4px 8px; flex-shrink: 0; border-radius: 4px;
    `;
    removeBtn.onmouseenter = () => { removeBtn.style.color = '#ef4444'; removeBtn.style.background = '#fef2f2'; };
    removeBtn.onmouseleave = () => { removeBtn.style.color = '#9ca3af'; removeBtn.style.background = 'none'; };
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeItem(item.id);
    });

    row.appendChild(img);
    row.appendChild(details);
    row.appendChild(removeBtn);
    listContainer.appendChild(row);
  });
}

function copyWishlistToClipboard() {
  const items = getWishlist();
  if (items.length === 0) return;

  const header = "| Title | Price | Rate | Platform | Rating | Num Ratings | URL |";
  const divider = "|---|---|---|---|---|---|---|";
  const rows = items.map(i => 
    `| ${i.title.replace(/\|/g, '')} | ${fmtPrice(i.price)} | ${i.rateText} | ${i.platform} | ${i.rating ?? 'N/A'} | ${i.numRatings ?? 'N/A'} | ${i.url} |`
  );
  
  const text = [header, divider, ...rows].join('\n');
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('ppu-copy-btn');
    if (btn) {
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#22c55e" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
      setTimeout(() => {
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
          </svg>
        `;
      }, 2000);
    }
  });
}

function updateUI() {
  const items = getWishlist();
  const count = items.length;
  badge.textContent = String(count);
  badge.style.display = count > 0 ? 'flex' : 'none';
  
  if (panelVisible) renderPanelList();
}

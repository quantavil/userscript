import type { WishlistItem } from './types';
import { getWishlist, removeItem, clearWishlist, clearScrapedCache, addItem, saveWishlist, isInWishlist } from './wishlist';
import { fmtPrice, formatMarkdownToHtml, sanitizeHtml, cleanNumber } from '../utils/formatters';
import { ICON, HEART_PATH_D } from './icons';
import { getSettings, saveSettings, DEFAULT_SETTINGS, isGeminiUrl } from './settings';

// ── State ────────────────────────────────────────────────────────────
let fab: HTMLDivElement;
let pdpLikeBtn: HTMLDivElement | null = null;
let panel: HTMLDivElement;
let badge: HTMLDivElement;
let listContainer: HTMLDivElement;
let panelVisible = false;

let settingsDrawer: HTMLDivElement;
let settingsDrawerVisible = false;
let aiChatDrawer: HTMLDivElement;
let aiChatDrawerVisible = false;
let chatHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

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

function syncSettingsUI() {
  if (!settingsDrawer) return;
  const settings = getSettings();
  
  const inputModel = settingsDrawer.querySelector('#settings-model') as HTMLInputElement | null;
  if (inputModel) inputModel.value = settings.model;
  
  const inputUrl = settingsDrawer.querySelector('#settings-base-url') as HTMLInputElement | null;
  if (inputUrl) inputUrl.value = settings.baseUrl;
  
  const inputKey = settingsDrawer.querySelector('#settings-key') as HTMLInputElement | null;
  if (inputKey) inputKey.value = settings.apiKey;
  
  const dots = settingsDrawer.querySelectorAll('.aiw-accent-dot');
  if (dots) {
    dots.forEach(d => {
      const colorHex = (d as HTMLElement).dataset.color;
      if (colorHex === settings.accentColor) d.classList.add('active');
      else d.classList.remove('active');
    });
  }
  
  const checkCrawl = settingsDrawer.querySelector('#settings-crawl') as HTMLInputElement | null;
  if (checkCrawl) checkCrawl.checked = settings.autocrawl;
  
  const verifyBtn = settingsDrawer.querySelector('.aiw-verify-btn') as HTMLButtonElement | null;
  if (verifyBtn) {
    verifyBtn.className = 'aiw-verify-btn';
    verifyBtn.textContent = 'Verify';
  }
}

// ── Public entry ─────────────────────────────────────────────────────
export function initWishlistUI() {
  createFAB();
  createPdpLikeButton();
  createPanel();
  window.addEventListener('wishlist-updated', updateUI);
  updateUI();
  applyThemeAndAccent();

  // Close panel or sort dropdown on outside click
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Close sort dropdown if clicked outside the sort wrapper
    const sortWrap = panel?.querySelector('.aiw-sort-wrap');
    const sortDropdown = panel?.querySelector('.aiw-sort-dropdown') as HTMLElement | null;
    if (sortDropdown && sortWrap && !sortWrap.contains(target)) {
      sortDropdown.style.display = 'none';
    }

    // Close panel if clicked outside the panel and FAB
    if (panelVisible && panel && !panel.contains(target) && fab && !fab.contains(target)) {
      togglePanel();
    }
  });

  // Register Violentmonkey/Tampermonkey menu command to clear all cache & data
  if (typeof GM_registerMenuCommand !== 'undefined') {
    GM_registerMenuCommand('Clear Cache & All Data', () => {
      clearWishlist();
      chatHistory = [];
      saveSettings(DEFAULT_SETTINGS);
      updateUI();
      applyThemeAndAccent();
      syncSettingsUI();
      showToast('All cache and data cleared!');
    });
  }
}

// ── FAB ──────────────────────────────────────────────────────────────
function createFAB() {
  fab = document.createElement('div');
  fab.className = 'aiw-fab';
  fab.style.color = '#d97757';
  fab.setAttribute('role', 'button');
  fab.setAttribute('aria-label', 'Toggle AI Wishlist Panel');
  fab.setAttribute('tabindex', '0');

  const iconWrap = document.createElement('span');
  iconWrap.className = 'aiw-fab-icon-wrap';
  iconWrap.style.display = 'flex';
  iconWrap.style.alignItems = 'center';
  iconWrap.style.justifyContent = 'center';
  iconWrap.innerHTML = ICON.heart(28, 'currentColor', 'currentColor');
  fab.appendChild(iconWrap);

  const crabContainer = document.createElement('div');
  crabContainer.className = 'aiw-fab-crab';
  crabContainer.innerHTML = ICON.crab(28);
  fab.appendChild(crabContainer);

  badge = document.createElement('div');
  badge.className = 'aiw-fab-badge';
  badge.addEventListener('animationend', () => {
    badge.classList.remove('pulse');
  });
  fab.appendChild(badge);

  fab.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePanel();
  });

  fab.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      togglePanel();
    }
  });

  let activeCrawls = 0;
  window.addEventListener('crawling-start', () => {
    activeCrawls++;
    fab.classList.toggle('crawling', activeCrawls > 0);
  });

  window.addEventListener('crawling-end', () => {
    activeCrawls = Math.max(0, activeCrawls - 1);
    fab.classList.toggle('crawling', activeCrawls > 0);
  });

  document.body.appendChild(fab);
}

// ── PDP Like Button ──────────────────────────────────────────────────
function createPdpLikeButton() {
  pdpLikeBtn = document.createElement('div');
  pdpLikeBtn.className = 'aiw-heart-container aiw-pdp-heart-floating';
  pdpLikeBtn.setAttribute('role', 'button');
  pdpLikeBtn.setAttribute('aria-label', 'Add to AI Wishlist');
  pdpLikeBtn.setAttribute('tabindex', '0');
  
  pdpLikeBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" style="flex-shrink: 0;"><path d="${HEART_PATH_D}"></path></svg>`;

  pdpLikeBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pdpLikeBtn?.click();
    }
  });

  pdpLikeBtn.addEventListener('animationend', (ev) => {
    if (ev.animationName === 'aiwHeartPop') {
      pdpLikeBtn?.classList.remove('pop-anim');
    }
  });

  document.body.appendChild(pdpLikeBtn);

  // Watch URL changes for SPA navigation
  watchUrlChanges(() => {
    updatePdpLikeButton();
  });

  // Also check periodically to handle delayed dynamic loading of PDP elements
  setInterval(updatePdpLikeButton, 1000);

  updatePdpLikeButton();
}

function updatePdpLikeButton() {
  if (!pdpLikeBtn) return;

  const info = getPdpProductInfo();
  if (!info || panelVisible) {
    pdpLikeBtn.style.display = 'none';
    return;
  }

  pdpLikeBtn.style.display = 'inline-flex';
  
  // Attach metadata and dataset id so the global capture listener in ui.ts processes it directly
  (pdpLikeBtn as any).__wishlistMeta = info;
  pdpLikeBtn.dataset.wishlistId = info.id;

  const liked = isInWishlist(info.id);
  pdpLikeBtn.classList.toggle('active', liked);

  if (liked) {
    pdpLikeBtn.setAttribute('aria-label', 'Remove from AI Wishlist');
  } else {
    pdpLikeBtn.setAttribute('aria-label', 'Add to AI Wishlist');
  }
}

function isProductDetailsPage(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  if (hostname.includes('amazon.')) {
    return /\/(dp|gp\/product)\/[A-Z0-9]{10}/i.test(pathname);
  }
  if (hostname.includes('flipkart.com')) {
    return /\/p\//.test(pathname);
  }
  return false;
}

function getProductInfoFromSchema(): { title?: string; price?: number; imageUrl?: string } | null {
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of Array.from(scripts)) {
      const text = script.textContent || '';
      if (text.includes('"Product"') || text.includes('"@type": "Product"') || text.includes('"@type":"Product"')) {
        const data = JSON.parse(text);
        
        let product: any = null;
        if (Array.isArray(data)) {
          product = data.find(item => item && (item['@type'] === 'Product' || String(item['@type']).includes('Product')));
        } else if (data) {
          if (data['@type'] === 'Product' || String(data['@type']).includes('Product')) {
            product = data;
          } else if (data['@graph'] && Array.isArray(data['@graph'])) {
            product = data['@graph'].find((item: any) => item && (item['@type'] === 'Product' || String(item['@type']).includes('Product')));
          }
        }
        
        if (!product) continue;

        const title = product.name || '';
        let price: number | undefined = undefined;
        if (product.offers) {
          const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
          if (offers && offers.price !== undefined) {
            const p = parseFloat(String(offers.price).replace(/[^0-9.]/g, ''));
            if (!isNaN(p) && p > 0) price = p;
          }
        }
        let imageUrl = '';
        if (product.image) {
          imageUrl = Array.isArray(product.image) ? product.image[0] : (typeof product.image === 'object' ? product.image.url : product.image);
        }

        if (title || price || imageUrl) {
          return { title, price, imageUrl };
        }
      }
    }
  } catch (e) {
    console.warn('AI Wishlist: Failed to parse ld+json schema', e);
  }
  return null;
}

function cleanAmazonPageTitle(pageTitle: string): string {
  let title = pageTitle;
  if (title.startsWith('Amazon.in: Buy ')) {
    title = title.replace('Amazon.in: Buy ', '');
  }
  const onlineIdx = title.indexOf(' Online at Low Prices');
  if (onlineIdx !== -1) {
    title = title.substring(0, onlineIdx);
  }
  return title.split(': Amazon.in')[0]?.split(':Amazon.in')[0]?.split('|')[0]?.trim() || '';
}

function cleanFlipkartPageTitle(pageTitle: string): string {
  let title = pageTitle;
  const priceIdx = title.indexOf(' Price in India');
  if (priceIdx !== -1) {
    title = title.substring(0, priceIdx);
  }
  const buyIdx = title.indexOf(' - Buy ');
  if (buyIdx !== -1) {
    title = title.substring(0, buyIdx);
  }
  const onlineIdx = title.indexOf(' Online');
  if (onlineIdx !== -1) {
    title = title.substring(0, onlineIdx);
  }
  return title.split('-')[0]?.split('|')[0]?.split(':')[0]?.trim() || '';
}

function scanPriceFromLeafNodes(): number | null {
  const rupeeEls = Array.from(document.querySelectorAll('*')).filter(el => {
    return el.children.length === 0 && (el.textContent || '').includes('₹');
  }) as HTMLElement[];

  for (const el of rupeeEls) {
    if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
      try {
        const style = window.getComputedStyle(el);
        const decor = style.textDecorationLine || style.textDecoration || '';
        if (decor.includes('line-through')) continue;
      } catch {}
    }
    if (el.style.textDecorationLine === 'line-through' || 
        el.style.textDecoration === 'line-through' ||
        el.getAttribute('style')?.includes('line-through')) {
      continue;
    }
    const val = cleanNumber(el.textContent || '');
    if (val !== null && val > 0) return val;
  }
  return null;
}

function getPdpProductInfo(): WishlistItem | null {
  if (typeof window === 'undefined') return null;
  const hostname = window.location.hostname;
  const isPDP = isProductDetailsPage();

  if (hostname.includes('amazon.')) {
    const asinMatch = window.location.pathname.match(/\/(dp|gp\/product)\/([A-Z0-9]{10})/i);
    const asin = asinMatch ? asinMatch[2] : (document.querySelector('#ASIN') as HTMLInputElement)?.value;
    if (!asin) {
      if (isPDP) console.warn("AI Wishlist: On PDP but ASIN not found");
      return null;
    }

    const schema = getProductInfoFromSchema();
    const titleEl = document.querySelector('#productTitle');
    const title = titleEl?.textContent?.trim() || schema?.title || cleanAmazonPageTitle(document.title);
    if (!title) {
      if (isPDP) console.warn("AI Wishlist: On PDP but title not resolved");
      return null;
    }

    let price = schema?.price || null;
    if (price === null || price <= 0) {
      const priceSelectors = [
        '.apexPriceToPay .a-offscreen',
        '.priceToPay .a-offscreen',
        '#price_inside_buybox',
        '#newBuyBoxPrice',
        '#priceblock_ourprice',
        '#priceblock_dealprice'
      ];
      for (const sel of priceSelectors) {
        const text = document.querySelector(sel)?.textContent;
        if (text) {
          price = cleanNumber(text);
          if (price !== null && price > 0) break;
        }
      }
    }
    if (price === null || price <= 0) {
      price = scanPriceFromLeafNodes();
    }
    if (price === null || price <= 0) {
      if (isPDP) console.warn("AI Wishlist: On PDP but price not resolved", { title });
      return null;
    }

    let imageUrl = schema?.imageUrl || '';
    if (!imageUrl) {
      const imgEl = document.querySelector('#landingImage, #imgBlkFront') as HTMLImageElement | null;
      if (imgEl) {
        imageUrl = imgEl.getAttribute('data-old-hires') || imgEl.getAttribute('src') || '';
        if (!imageUrl || imageUrl.startsWith('data:')) {
          const dynamicJson = imgEl.getAttribute('data-a-dynamic-image');
          if (dynamicJson) {
            try {
              const urls = Object.keys(JSON.parse(dynamicJson));
              if (urls.length > 0) imageUrl = urls[urls.length - 1]!;
            } catch {}
          }
        }
      }
    }

    return {
      id: `amz_${asin}`,
      title,
      price,
      imageUrl,
      url: `https://www.amazon.in/dp/${asin}`,
      platform: 'Amazon'
    };
  }

  if (hostname.includes('flipkart.com')) {
    const pid = new URLSearchParams(window.location.search).get('pid');
    if (!pid) {
      if (isPDP) console.warn("AI Wishlist: On PDP but PID not found");
      return null;
    }

    const schema = getProductInfoFromSchema();
    const titleEl = document.querySelector('h1, .B_NuCI, span.VU-ZEz');
    const title = titleEl?.textContent?.trim() || schema?.title || cleanFlipkartPageTitle(document.title);
    if (!title) {
      if (isPDP) console.warn("AI Wishlist: On PDP but title not resolved");
      return null;
    }

    let price = schema?.price || null;
    if (price === null || price <= 0) {
      const priceSelectors = ['.Nx9Qxx', '._30jeq3', '._16Jk6d', '._16J5WJ'];
      for (const sel of priceSelectors) {
        const text = document.querySelector(sel)?.textContent;
        if (text) {
          price = cleanNumber(text);
          if (price !== null && price > 0) break;
        }
      }
    }
    if (price === null || price <= 0) {
      price = scanPriceFromLeafNodes();
    }
    if (price === null || price <= 0) {
      if (isPDP) console.warn("AI Wishlist: On PDP but price not resolved", { title });
      return null;
    }

    let imageUrl = schema?.imageUrl || '';
    if (!imageUrl) {
      const imgEls = Array.from(document.querySelectorAll('img'));
      const mainImg = imgEls.find(img => {
        const src = img.getAttribute('src') || '';
        return src.includes('/image/') && !src.includes('/www/') && !src.includes('/promos/');
      });
      if (mainImg) {
        imageUrl = mainImg.getAttribute('src') || '';
      }
    }

    return {
      id: `fk_${pid}`,
      title,
      price,
      imageUrl,
      url: `https://www.flipkart.com${window.location.pathname}?pid=${pid}`,
      platform: 'Flipkart'
    };
  }

  return null;
}

function watchUrlChanges(callback: () => void) {
  if (typeof window === 'undefined') return;
  window.addEventListener('popstate', callback);

  const pushState = window.history.pushState;
  if (pushState) {
    (window.history as any).historyPushState = pushState; // store original
    window.history.pushState = function(...args) {
      pushState.apply(this, args);
      setTimeout(callback, 0);
    };
  }

  const replaceState = window.history.replaceState;
  if (replaceState) {
    (window.history as any).historyReplaceState = replaceState; // store original
    window.history.replaceState = function(...args) {
      replaceState.apply(this, args);
      setTimeout(callback, 0);
    };
  }
}

function togglePanel() {
  panelVisible = !panelVisible;

  const iconWrap = fab?.querySelector('.aiw-fab-icon-wrap');
  if (iconWrap) {
    if (panelVisible) {
      iconWrap.innerHTML = ICON.close(28, 'currentColor');
    } else {
      iconWrap.innerHTML = ICON.heart(28, 'currentColor', 'currentColor');
    }
  }

  updatePdpLikeButton();

  if (panelVisible) {
    applyThemeAndAccent();
    renderPanelList();
    panel.style.display = 'flex';
    requestAnimationFrame(() => {
      panel.classList.add('visible');
    });
  } else {
    panel.classList.remove('visible');
    setTimeout(() => {
      if (!panelVisible) {
        panel.style.display = 'none';
      }
    }, 250);
  }
}

// ── Panel ────────────────────────────────────────────────────────────
function createPanel() {
  panel = document.createElement('div');
  panel.className = 'aiw-panel';

  // ─ Header ─
  const header = document.createElement('div');
  header.className = 'aiw-header';

  const titleWrap = document.createElement('div');
  titleWrap.className = 'aiw-title-wrap';

  const title = document.createElement('h3');
  title.id = 'aiw-panel-title';
  title.textContent = 'AI Wishlist';
  title.className = 'aiw-title';

  const countBadge = document.createElement('span');
  countBadge.id = 'aiw-panel-count';
  countBadge.className = 'aiw-count-badge';
  countBadge.textContent = '0';
  titleWrap.appendChild(title);
  titleWrap.appendChild(countBadge);

  const actions = document.createElement('div');
  actions.className = 'aiw-header-actions';
  actions.appendChild(createHeaderBtn('aiw-ai-btn', 'Ask AI Assistant', ICON.sparkle(16), 'aiw-ai', () => toggleAIChatDrawer()));
  actions.appendChild(createHeaderBtn('aiw-settings-btn', 'Wishlist Settings', ICON.settings(16), 'aiw-settings', () => toggleSettingsDrawer()));
  actions.appendChild(createHeaderBtn('aiw-close-btn', 'Close Panel', ICON.close(16), 'aiw-close', togglePanel));

  header.appendChild(titleWrap);
  header.appendChild(actions);
  panel.appendChild(header);

  // ─ Toolbar: Search + Sort + Filter ─
  const toolbar = document.createElement('div');
  toolbar.className = 'aiw-toolbar';

  // Search row
  const searchRow = document.createElement('div');
  searchRow.className = 'aiw-search-row';

  const searchIcon = document.createElement('div');
  searchIcon.className = 'aiw-search-icon';
  searchIcon.innerHTML = ICON.search(14, '#9ca3af');

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search AI wishlist…';
  searchInput.className = 'aiw-search-input';

  const clearSearch = document.createElement('div');
  clearSearch.className = 'aiw-clear-search';
  clearSearch.innerHTML = ICON.close(14, '#9ca3af');
  clearSearch.addEventListener('click', (e) => {
    e.stopPropagation();
    searchInput.value = '';
    searchQuery = '';
    clearSearch.style.display = 'none';
    renderPanelList();
  });

  let searchTimer: number | null = null;
  searchInput.addEventListener('input', () => {
    clearSearch.style.display = searchInput.value ? 'flex' : 'none';
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      searchQuery = searchInput.value.trim().toLowerCase();
      renderPanelList();
    }, 150);
  });

  searchRow.appendChild(searchIcon);
  searchRow.appendChild(searchInput);
  searchRow.appendChild(clearSearch);
  toolbar.appendChild(searchRow);

  // Sort + Filter row
  const controlsRow = document.createElement('div');
  controlsRow.className = 'aiw-controls-row';

  // Sort selector
  const sortWrap = document.createElement('div');
  sortWrap.className = 'aiw-sort-wrap';

  const sortBtn = document.createElement('button');
  sortBtn.className = 'aiw-sort-btn';
  sortBtn.innerHTML = ICON.sort(12, '#9ca3af') + ' <span style="margin-left:2px">Date Added</span>';

  const sortDropdown = document.createElement('div');
  sortDropdown.className = 'aiw-sort-dropdown';

  SORT_OPTIONS.forEach(opt => {
    const item = document.createElement('div');
    item.className = 'aiw-sort-item';
    if (opt.key === activeSort) item.classList.add('active');
    item.textContent = opt.label;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `Sort by ${opt.label}`);
    item.setAttribute('tabindex', '0');

    const selectSort = (e: Event) => {
      e.stopPropagation();
      activeSort = opt.key;
      const label = sortBtn.querySelector('span');
      if (label) label.textContent = opt.label;
      sortDropdown.style.display = 'none';
      // Update active highlight
      Array.from(sortDropdown.children).forEach((c, i) => {
        const itemEl = c as HTMLElement;
        if (SORT_OPTIONS[i]!.key === activeSort) {
          itemEl.classList.add('active');
        } else {
          itemEl.classList.remove('active');
        }
      });
      renderPanelList();
    };

    item.addEventListener('click', selectSort);
    item.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        selectSort(ev);
      }
    });
    sortDropdown.appendChild(item);
  });

  sortBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sortDropdown.style.display = sortDropdown.style.display === 'none' ? 'block' : 'none';
  });

  sortWrap.appendChild(sortBtn);
  sortWrap.appendChild(sortDropdown);
  controlsRow.appendChild(sortWrap);

  // Platform filter pills
  const pillWrap = document.createElement('div');
  pillWrap.className = 'aiw-pill-wrap';

  const platforms: PlatformFilter[] = ['All', 'Amazon', 'Flipkart'];
  const pillEls: HTMLDivElement[] = [];

  platforms.forEach(p => {
    const pill = document.createElement('div');
    pill.className = 'aiw-pill';
    if (p === activePlatform) pill.classList.add('active');
    pill.textContent = p;
    pill.setAttribute('role', 'button');
    pill.setAttribute('aria-label', `Filter by ${p}`);
    pill.setAttribute('tabindex', '0');

    const clickHandler = (e: Event) => {
      e.stopPropagation();
      activePlatform = p;
      pillEls.forEach((el, i) => {
        if (platforms[i] === activePlatform) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });
      renderPanelList();
    };

    pill.addEventListener('click', clickHandler);
    pill.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        clickHandler(ev);
      }
    });
    pillEls.push(pill);
    pillWrap.appendChild(pill);
  });

  controlsRow.appendChild(pillWrap);
  toolbar.appendChild(controlsRow);
  panel.appendChild(toolbar);

  // ─ List container ─
  listContainer = document.createElement('div');
  listContainer.className = 'aiw-list-container';
  panel.appendChild(listContainer);

  // ─ Floating Action Pills Overlay ─
  const pillsContainer = document.createElement('div');
  pillsContainer.id = 'aiw-floating-pills';
  pillsContainer.className = 'aiw-floating-pills';

  const copyPill = document.createElement('button');
  copyPill.id = 'aiw-copy-btn';
  copyPill.className = 'aiw-pill-btn copy';
  copyPill.innerHTML = ICON.clipboard(13) + ' <span>Copy JSON</span>';
  copyPill.addEventListener('click', (e) => {
    e.stopPropagation();
    handleCopy();
  });

  const clearPill = document.createElement('button');
  clearPill.id = 'aiw-clear-btn';
  clearPill.className = 'aiw-pill-btn clear';
  clearPill.innerHTML = ICON.trash(13) + ' <span>Clear All</span>';

  let isConfirmingClear = false;
  let clearTimer: number | null = null;

  function resetClearPill() {
    isConfirmingClear = false;
    clearPill.classList.remove('confirming');
    clearPill.innerHTML = ICON.trash(13) + ' <span>Clear All</span>';
    if (clearTimer) clearTimeout(clearTimer);
  }

  clearPill.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!isConfirmingClear) {
      isConfirmingClear = true;
      clearPill.classList.add('confirming');
      clearPill.innerHTML = ICON.close(13, '#ffffff') + ' <span>Confirm Clear?</span>';
      clearTimer = window.setTimeout(resetClearPill, 3000);
    } else {
      clearWishlist();
      chatHistory = [];
      resetClearPill();
      showToast('AI Wishlist cleared');
    }
  });

  // Reset clear warning on panel click
  panel.addEventListener('click', () => {
    resetClearPill();
  });

  pillsContainer.appendChild(copyPill);
  pillsContainer.appendChild(clearPill);
  panel.appendChild(pillsContainer);

  // ─ Settings Drawer ─
  createSettingsDrawer();

  // ─ AI Chat Drawer ─
  createAIChatDrawer();

  document.body.appendChild(panel);
}

// ── Helpers ──────────────────────────────────────────────────────────
function createHeaderBtn(id: string, title: string, iconHtml: string, btnClass: string, handler: (e: Event) => void): HTMLDivElement {
  const btn = document.createElement('div');
  btn.id = id;
  btn.title = title;
  btn.className = `aiw-header-btn ${btnClass}`;
  btn.innerHTML = iconHtml;
  btn.setAttribute('role', 'button');
  btn.setAttribute('aria-label', title);
  btn.setAttribute('tabindex', '0');
  
  const clickHandler = (e: Event) => {
    e.stopPropagation();
    handler(e);
  };
  btn.addEventListener('click', clickHandler);
  btn.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      clickHandler(ev);
    }
  });
  
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
  const countEl = document.getElementById('aiw-panel-count');
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

  items.forEach((item, index) => {
    const row = createItemRow(item);
    row.style.animationDelay = `${index * 30}ms`;
    row.classList.add('animate-entry');
    listContainer.appendChild(row);
  });
}

function renderEmptyState(container: HTMLDivElement) {
  const wrap = document.createElement('div');
  wrap.className = 'aiw-empty-state';
  
  const iconWrap = document.createElement('div');
  iconWrap.className = 'aiw-empty-icon';
  iconWrap.innerHTML = ICON.emptyHeart(48, '#d1d5db');
  
  const msg = document.createElement('div');
  msg.className = 'aiw-empty-msg';
  msg.innerHTML = 'Your AI wishlist is empty.<br>Click the heart icon on product<br>cards to save items.';
  
  wrap.appendChild(iconWrap);
  wrap.appendChild(msg);
  container.appendChild(wrap);
}

function createItemRow(item: WishlistItem): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'aiw-item-row';

  // Platform logo
  const platformLogo = document.createElement('div');
  platformLogo.className = 'aiw-item-platform';
  const isAmazon = item.platform === 'Amazon';
  platformLogo.innerHTML = isAmazon ? ICON.amazon(18, 18) : ICON.flipkart(18, 18);
  platformLogo.title = `Saved from ${item.platform}`;
  row.appendChild(platformLogo);

  // Thumbnail with cross-origin fallback
  const thumb = document.createElement('div');
  thumb.className = 'aiw-thumb';

  const platformClass = item.platform.toLowerCase();
  const fallbackLetter = item.platform === 'Amazon' ? 'A' : 'F';

  // Always create the fallback badge (visible if img fails or missing)
  const fallback = document.createElement('div');
  fallback.className = `aiw-thumb-fallback ${platformClass}`;
  fallback.textContent = fallbackLetter;
  thumb.appendChild(fallback);

  if (item.imageUrl) {
    const img = document.createElement('img');
    img.className = 'aiw-thumb-img';
    img.referrerPolicy = 'no-referrer';
    img.crossOrigin = 'anonymous';
    img.onload = () => { fallback.style.display = 'none'; };
    img.onerror = () => {
      img.onerror = null; // Prevent infinite loops
      if (item.imageUrl.startsWith('data:')) {
        img.style.display = 'none';
        return;
      }
      // Try to load via GM_xmlhttpRequest to bypass CSP
      if (typeof GM_xmlhttpRequest !== 'undefined') {
        GM_xmlhttpRequest({
          method: 'GET',
          url: item.imageUrl,
          responseType: 'blob',
          onload: (response) => {
            if (response.status === 200 && response.response) {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64Url = reader.result as string;
                img.src = base64Url;
                // Cache it back to the item in GM storage
                item.imageUrl = base64Url;
                const items = getWishlist();
                const idx = items.findIndex(i => i.id === item.id);
                if (idx !== -1) {
                  items[idx]!.imageUrl = base64Url;
                  saveWishlist(items, true);
                }
              };
              reader.readAsDataURL(response.response);
            } else {
              img.style.display = 'none';
            }
          },
          onerror: () => {
            img.style.display = 'none';
          }
        });
      } else {
        img.style.display = 'none';
      }
    };
    img.src = item.imageUrl;
    thumb.appendChild(img);
  }
  row.appendChild(thumb);

  // Details
  const details = document.createElement('div');
  details.className = 'aiw-item-details';

  const titleEl = document.createElement('a');
  titleEl.href = item.url;
  titleEl.target = '_blank';
  titleEl.textContent = item.title;
  titleEl.className = 'aiw-item-title';
  titleEl.addEventListener('click', (e) => e.stopPropagation());

  const metaRow = document.createElement('div');
  metaRow.className = 'aiw-item-meta';

  const priceSpan = document.createElement('span');
  priceSpan.textContent = fmtPrice(item.price);
  priceSpan.className = 'aiw-item-price';

  metaRow.appendChild(priceSpan);

  details.appendChild(titleEl);
  details.appendChild(metaRow);

  // Remove button
  const removeBtn = document.createElement('button');
  removeBtn.className = 'aiw-item-remove';
  removeBtn.innerHTML = ICON.close(14);
  removeBtn.setAttribute('aria-label', `Remove ${item.title} from wishlist`);
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const itemBackup = { ...item };
    removeItem(item.id);
    showToast('Item removed', 'Undo', () => {
      addItem(itemBackup);
    });
  });

  row.appendChild(details);
  row.appendChild(removeBtn);
  return row;
}

// ── Actions ──────────────────────────────────────────────────────────
function handleCopy() {
  const items = getWishlist();
  if (items.length === 0) return;

  const exportItems = items.map(item => {
    let detailsObj: any = null;
    if (item.details) {
      try { detailsObj = JSON.parse(item.details); } catch { detailsObj = item.details; }
    }

    return {
      title: item.title,
      price: item.price,
      platform: item.platform,
      details: detailsObj,
      url: item.url,
      imageUrl: item.imageUrl,
      dateAdded: item.dateAdded
    };
  });

  const text = JSON.stringify(exportItems, null, 2);
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('aiw-copy-btn');
    if (btn) {
      btn.innerHTML = ICON.check(13) + ' <span>Copied!</span>';
      setTimeout(() => { btn.innerHTML = ICON.clipboard(13) + ' <span>Copy JSON</span>'; }, 2000);
    }
    showToast('Copied to clipboard as JSON!');
  });
}

// ── Toast ────────────────────────────────────────────────────────────
function showToast(msg: string, actionLabel?: string, onAction?: () => void) {
  const toast = document.createElement('div');
  toast.className = 'aiw-toast';
  
  const textSpan = document.createElement('span');
  textSpan.textContent = `✓ ${msg}`;
  toast.appendChild(textSpan);
  
  let container = document.getElementById('aiw-toast-container') as HTMLDivElement | null;
  if (!container) {
    container = document.createElement('div');
    container.id = 'aiw-toast-container';
    document.body.appendChild(container);
  }

  if (actionLabel && onAction) {
    const actionBtn = document.createElement('button');
    actionBtn.className = 'aiw-toast-action';
    actionBtn.textContent = actionLabel;
    actionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onAction();
      toast.remove();
      if (container && container.childNodes.length === 0) {
        container.remove();
      }
    });
    toast.appendChild(actionBtn);
  }
  
  container.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });
  
  const displayTime = onAction ? 4000 : 2000;
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => { 
      toast.remove(); 
      if (container && container.childNodes.length === 0) {
        container.remove();
      }
    }, 200);
  }, displayTime);
}

// ── Reactive update ──────────────────────────────────────────────────
function updateUI() {
  const items = getWishlist();
  const count = items.length;
  badge.textContent = String(count);
  badge.style.display = count > 0 ? 'flex' : 'none';

  // Toggle pills overlay based on count
  const pillsContainer = document.getElementById('aiw-floating-pills');
  if (pillsContainer) {
    pillsContainer.style.display = count > 0 ? 'flex' : 'none';
  }

  if (count > 0) {
    badge.classList.remove('pulse');
    void badge.offsetWidth; // trigger reflow
    badge.classList.add('pulse');
  }

  if (panelVisible) renderPanelList();
  applyThemeAndAccent();
  updatePdpLikeButton();
}

// ── Settings Drawer Implementation ───────────────────────────────────
function createSettingsDrawer() {
  settingsDrawer = document.createElement('div');
  settingsDrawer.className = 'aiw-drawer-overlay';
  
  const header = document.createElement('div');
  header.className = 'aiw-drawer-header';
  
  const titleWrap = document.createElement('div');
  titleWrap.className = 'aiw-drawer-title-wrap';
  titleWrap.innerHTML = ICON.settings(14) + ' <span class="aiw-drawer-title">Settings</span>';
  
  const backBtn = document.createElement('div');
  backBtn.className = 'aiw-drawer-close';
  backBtn.innerHTML = ICON.arrowLeft(16);
  backBtn.title = 'Back to Wishlist';
  backBtn.setAttribute('role', 'button');
  backBtn.setAttribute('aria-label', 'Close Settings Drawer');
  backBtn.setAttribute('tabindex', '0');
  
  const closeSettings = (e: Event) => {
    e.stopPropagation();
    toggleSettingsDrawer(false);
  };
  backBtn.addEventListener('click', closeSettings);
  backBtn.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      closeSettings(ev);
    }
  });
  
  header.appendChild(titleWrap);
  header.appendChild(backBtn);
  settingsDrawer.appendChild(header);
  
  const body = document.createElement('div');
  body.className = 'aiw-drawer-body';
  
  const settings = getSettings();
  
  // Section 1: AI Configuration (OpenAI-compatible)
  const secAI = createSettingsSection('🤖 AI Configuration');
  
  const modelRow = createSettingsInputRow('Model Name', 'settings-model', 'text', settings.model, 'e.g. gemini-2.0-flash', (val) => {
    const s = getSettings();
    s.model = val;
    saveSettings(s);
  });
  secAI.appendChild(modelRow);
  
  const urlRow = createSettingsInputRow('API Base URL', 'settings-base-url', 'text', settings.baseUrl, 'https://api.openai.com/v1', (val) => {
    const s = getSettings();
    s.baseUrl = val;
    saveSettings(s);
  });
  secAI.appendChild(urlRow);
  
  // API Key with verify button
  const keyRow = document.createElement('div');
  keyRow.className = 'aiw-settings-row';
  const keyLabel = document.createElement('label');
  keyLabel.className = 'aiw-input-label';
  keyLabel.textContent = 'API Key';
  
  const keyInline = document.createElement('div');
  keyInline.className = 'aiw-input-row-inline';
  
  const keyInput = document.createElement('input');
  keyInput.className = 'aiw-input-control';
  keyInput.id = 'settings-key';
  keyInput.type = 'text';
  keyInput.setAttribute('autocomplete', 'off');
  keyInput.setAttribute('spellcheck', 'false');
  keyInput.value = settings.apiKey;
  keyInput.placeholder = 'Enter API key...';
  keyInput.addEventListener('change', () => {
    const s = getSettings();
    s.apiKey = keyInput.value.trim();
    saveSettings(s);
    verifyBtn.className = 'aiw-verify-btn'; // reset state
    verifyBtn.textContent = 'Verify';
  });
  
  const verifyBtn = document.createElement('button');
  verifyBtn.className = 'aiw-verify-btn';
  verifyBtn.textContent = 'Verify';
  verifyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleVerifyApiKey(verifyBtn);
  });
  
  keyInline.appendChild(keyInput);
  keyInline.appendChild(verifyBtn);
  keyRow.appendChild(keyLabel);
  keyRow.appendChild(keyInline);
  secAI.appendChild(keyRow);
  body.appendChild(secAI);
  
  // Section 2: Look & Feel
  const secLook = createSettingsSection('🎨 Accent Palette');
  
  // Accent Selector Dots
  const accentRow = document.createElement('div');
  accentRow.className = 'aiw-settings-row';
  accentRow.innerHTML = '<label class="aiw-input-label">Choose Accent Color</label>';
  const dotsContainer = document.createElement('div');
  dotsContainer.className = 'aiw-dots-palette';
  
  const colors = [
    { hex: '#dc2626', name: 'red' },          // Refined Red
    { hex: '#be123c', name: 'wine' },         // Wine Pink
    { hex: '#ea580c', name: 'orange' },       // Sunset Orange
    { hex: '#f59e0b', name: 'amber' },        // Warm Amber
    { hex: '#10b981', name: 'emerald' },      // Emerald Green
    { hex: '#0d9488', name: 'teal' },         // Blue Green
    { hex: '#2563eb', name: 'blue' },         // Sapphire Blue
    { hex: '#8b5cf6', name: 'purple' }        // Amethyst Purple
  ];
  
  colors.forEach(color => {
    const dot = document.createElement('div');
    dot.className = 'aiw-accent-dot';
    dot.style.backgroundColor = color.hex;
    dot.dataset.color = color.hex; // Robust identification of color hex on reset
    if (settings.accentColor === color.hex) dot.classList.add('active');
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      dotsContainer.querySelectorAll('.aiw-accent-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      const s = getSettings();
      s.accentColor = color.hex;
      saveSettings(s);
      applyThemeAndAccent();
    });
    dotsContainer.appendChild(dot);
  });
  accentRow.appendChild(dotsContainer);
  secLook.appendChild(accentRow);
  body.appendChild(secLook);
  
  // Section 3: Background Crawler
  const secCrawler = createSettingsSection('⚙ Background Scraping');
  const crawlToggle = createSettingsToggleRow('Scrape details on heart click', 'settings-crawl', settings.autocrawl, (val) => {
    const s = getSettings();
    s.autocrawl = val;
    saveSettings(s);
  });
  secCrawler.appendChild(crawlToggle);

  const clearCacheRow = document.createElement('div');
  clearCacheRow.className = 'aiw-settings-row';
  clearCacheRow.style.marginTop = '8px';
  const clearCacheBtn = document.createElement('button');
  clearCacheBtn.className = 'aiw-verify-btn';
  clearCacheBtn.style.width = '100%';
  clearCacheBtn.textContent = 'Clear Scraped Cache';
  clearCacheBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearScrapedCache();
    showToast('Scraped specifications cache cleared!');
  });
  clearCacheRow.appendChild(clearCacheBtn);
  secCrawler.appendChild(clearCacheRow);

  body.appendChild(secCrawler);
  
  settingsDrawer.appendChild(body);
  panel.appendChild(settingsDrawer);
  
  syncSettingsUI();
}

function handleVerifyApiKey(btn: HTMLButtonElement) {
  const settings = getSettings();
  if (!settings.apiKey) {
    btn.className = 'aiw-verify-btn error';
    btn.textContent = 'No key';
    setTimeout(() => { btn.className = 'aiw-verify-btn'; btn.textContent = 'Verify'; }, 2000);
    return;
  }
  
  btn.textContent = '...';
  btn.className = 'aiw-verify-btn';
  
  const isGemini = isGeminiUrl(settings.baseUrl);
  const url = isGemini
    ? `${settings.baseUrl}/models?key=${settings.apiKey}`
    : `${settings.baseUrl}/models`;
  
  const headers: Record<string, string> = {};
  if (!isGemini) {
    headers['Authorization'] = `Bearer ${settings.apiKey}`;
  }
  
  if (typeof GM_xmlhttpRequest !== 'undefined') {
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      headers,
      onload: (res) => {
        if (res.status >= 200 && res.status < 300) {
          btn.className = 'aiw-verify-btn success';
          btn.textContent = '✓ Valid';
        } else {
          btn.className = 'aiw-verify-btn error';
          btn.textContent = '✗ Failed';
        }
        setTimeout(() => { btn.className = 'aiw-verify-btn'; btn.textContent = 'Verify'; }, 3000);
      },
      onerror: () => {
        btn.className = 'aiw-verify-btn error';
        btn.textContent = '✗ Error';
        setTimeout(() => { btn.className = 'aiw-verify-btn'; btn.textContent = 'Verify'; }, 3000);
      }
    });
  } else {
    // Fallback: just check key exists
    btn.className = 'aiw-verify-btn success';
    btn.textContent = '✓ Saved';
    setTimeout(() => { btn.className = 'aiw-verify-btn'; btn.textContent = 'Verify'; }, 2000);
  }
}

function createSettingsSection(title: string): HTMLDivElement {
  const card = document.createElement('div');
  card.className = 'aiw-settings-section-card';
  const header = document.createElement('div');
  header.className = 'aiw-card-title';
  header.textContent = title;
  card.appendChild(header);
  return card;
  return card;
}

function createSettingsSelectRow(label: string, id: string, options: { value: string; label: string }[], currentValue: string, onChange: (val: string) => void): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'aiw-settings-row';
  
  const lbl = document.createElement('label');
  lbl.className = 'aiw-input-label';
  lbl.textContent = label;
  
  const select = document.createElement('select');
  select.className = 'aiw-input-control';
  select.id = id;
  
  options.forEach(opt => {
    const el = document.createElement('option');
    el.value = opt.value;
    el.textContent = opt.label;
    if (opt.value === currentValue) el.selected = true;
    select.appendChild(el);
  });
  
  select.addEventListener('change', () => onChange(select.value));
  
  row.appendChild(lbl);
  row.appendChild(select);
  return row;
}

function createSettingsInputRow(label: string, id: string, type: string, currentValue: string, placeholder: string, onChange: (val: string) => void): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'aiw-settings-row';
  
  const lbl = document.createElement('label');
  lbl.className = 'aiw-input-label';
  lbl.textContent = label;
  
  const input = document.createElement('input');
  input.className = 'aiw-input-control';
  input.id = id;
  input.type = type;
  input.value = currentValue;
  input.placeholder = placeholder;
  
  input.addEventListener('change', () => onChange(input.value.trim()));
  
  row.appendChild(lbl);
  row.appendChild(input);
  return row;
}

function createSettingsToggleRow(label: string, id: string, checked: boolean, onChange: (val: boolean) => void): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'aiw-toggle-row';
  
  const lbl = document.createElement('span');
  lbl.className = 'aiw-toggle-label';
  lbl.textContent = label;
  
  const switchEl = document.createElement('label');
  switchEl.className = 'aiw-toggle-switch';
  
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = id;
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  
  const slider = document.createElement('span');
  slider.className = 'aiw-switch-slider';
  
  switchEl.appendChild(input);
  switchEl.appendChild(slider);
  
  row.appendChild(lbl);
  row.appendChild(switchEl);
  return row;
}

function toggleSettingsDrawer(forceShow?: boolean) {
  const show = typeof forceShow === 'boolean' ? forceShow : !settingsDrawerVisible;
  settingsDrawerVisible = show;
  
  if (show && aiChatDrawerVisible) {
    toggleAIChatDrawer(false);
  }
  
  settingsDrawer.style.display = show ? 'flex' : 'none';
}



function applyThemeAndAccent() {
  if (!panel) return;
  const settings = getSettings();
  
  const accent = settings.accentColor || '#dc2626';
  panel.style.setProperty('--aiw-primary', accent);
  
  // Dynamic hex parsing
  const cleanHex = accent.replace(/^#/, '');
  const num = parseInt(cleanHex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const rgb = `${r}, ${g}, ${b}`;
  panel.style.setProperty('--aiw-primary-rgb', rgb);
  
  // Generate light tint background (lightHex) by mixing with white (92% white)
  const mix = (val: number) => Math.round(val + (255 - val) * 0.92);
  const lr = mix(r);
  const lg = mix(g);
  const lb = mix(b);
  const lightHex = `#${((1 << 24) + (lr << 16) + (lg << 8) + lb).toString(16).slice(1)}`;
  panel.style.setProperty('--aiw-primary-light', lightHex);
  
  panel.style.setProperty('--aiw-primary-hover', darkenHex(accent));
  
  // Sync FAB accent
  if (fab) {
    fab.style.setProperty('--aiw-primary-rgb', rgb);
    fab.style.setProperty('--aiw-fab-bg-from', lightHex);
    fab.style.setProperty('--aiw-fab-bg-to', `rgba(${rgb}, 0.12)`);
    fab.style.setProperty('--aiw-fab-border', `rgba(${rgb}, 0.2)`);
    fab.style.color = accent;
    // Re-render crab with accent
    const crabEl = fab.querySelector('.aiw-fab-crab');
    if (crabEl) crabEl.innerHTML = ICON.crab(28, accent);
  }

  // Sync PDP Like Button accent
  if (pdpLikeBtn) {
    pdpLikeBtn.style.setProperty('--aiw-primary-rgb', rgb);
    pdpLikeBtn.style.setProperty('--aiw-fab-bg-from', lightHex);
    pdpLikeBtn.style.setProperty('--aiw-fab-bg-to', `rgba(${rgb}, 0.12)`);
    pdpLikeBtn.style.setProperty('--aiw-fab-border', `rgba(${rgb}, 0.2)`);
  }
}

function darkenHex(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - 30);
  const g = Math.max(0, ((n >> 8) & 0xff) - 30);
  const b = Math.max(0, (n & 0xff) - 30);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ── AI Chat Assistant Implementation ──────────────────────────────────
function renderChatIntro(container: HTMLElement) {
  container.innerHTML = '';
  
  const introBubble = document.createElement('div');
  introBubble.className = 'aiw-chat-bubble ai';
  introBubble.setAttribute('role', 'status');
  introBubble.innerHTML = "Hi! I'm your AI Assistant. Ask me to compare products or describe saved items!";
  
  const suggs = document.createElement('div');
  suggs.className = 'aiw-chat-suggestions';
  
  const sugCompare = document.createElement('div');
  sugCompare.className = 'aiw-chat-suggestion-chip';
  sugCompare.setAttribute('role', 'button');
  sugCompare.setAttribute('tabindex', '0');
  sugCompare.textContent = '📊 Compare saved products';
  const runCompare = (ev: Event) => {
    ev.stopPropagation();
    sendChatMessage('Compare these products for me');
  };
  sugCompare.addEventListener('click', runCompare);
  sugCompare.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      runCompare(ev);
    }
  });

  const sugValue = document.createElement('div');
  sugValue.className = 'aiw-chat-suggestion-chip';
  sugValue.setAttribute('role', 'button');
  sugValue.setAttribute('tabindex', '0');
  sugValue.textContent = '💰 Best bang for buck';
  const runValue = (ev: Event) => {
    ev.stopPropagation();
    sendChatMessage('Which item in my wishlist is the best bang for the buck? Analyze and explain.');
  };
  sugValue.addEventListener('click', runValue);
  sugValue.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      runValue(ev);
    }
  });
  
  const sugSummarize = document.createElement('div');
  sugSummarize.className = 'aiw-chat-suggestion-chip';
  sugSummarize.setAttribute('role', 'button');
  sugSummarize.setAttribute('tabindex', '0');
  sugSummarize.textContent = '📝 Describe my wishlist';
  const runSummarize = (ev: Event) => {
    ev.stopPropagation();
    sendChatMessage('Describe my wishlist');
  };
  sugSummarize.addEventListener('click', runSummarize);
  sugSummarize.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      runSummarize(ev);
    }
  });
  
  suggs.appendChild(sugCompare);
  suggs.appendChild(sugValue);
  suggs.appendChild(sugSummarize);
  introBubble.appendChild(suggs);
  container.appendChild(introBubble);
}

// ── AI Chat Assistant Implementation ──────────────────────────────────
function createAIChatDrawer() {
  aiChatDrawer = document.createElement('div');
  aiChatDrawer.className = 'aiw-drawer-overlay';
  
  const header = document.createElement('div');
  header.className = 'aiw-drawer-header';
  
  const titleWrap = document.createElement('div');
  titleWrap.className = 'aiw-drawer-title-wrap';
  titleWrap.innerHTML = ICON.sparkle(14) + ' <span class="aiw-drawer-title">AI Assistant</span>';
  
  const headerActions = document.createElement('div');
  headerActions.style.display = 'flex';
  headerActions.style.gap = '8px';

  const clearChatBtn = document.createElement('div');
  clearChatBtn.className = 'aiw-drawer-close';
  clearChatBtn.innerHTML = ICON.trash(16);
  clearChatBtn.title = 'Clear Chat History';
  clearChatBtn.setAttribute('role', 'button');
  clearChatBtn.setAttribute('aria-label', 'Clear Chat History');
  clearChatBtn.setAttribute('tabindex', '0');
  const runClearChat = (e: Event) => {
    e.stopPropagation();
    chatHistory = [];
    const messagesArea = document.getElementById('aiw-chat-messages-area');
    if (messagesArea) {
      renderChatIntro(messagesArea);
    }
  };
  clearChatBtn.addEventListener('click', runClearChat);
  clearChatBtn.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      runClearChat(ev);
    }
  });

  const backBtn = document.createElement('div');
  backBtn.className = 'aiw-drawer-close';
  backBtn.innerHTML = ICON.arrowLeft(16);
  backBtn.title = 'Back to Wishlist';
  backBtn.setAttribute('role', 'button');
  backBtn.setAttribute('aria-label', 'Close Chat Drawer');
  backBtn.setAttribute('tabindex', '0');
  const closeChat = (e: Event) => {
    e.stopPropagation();
    toggleAIChatDrawer(false);
  };
  backBtn.addEventListener('click', closeChat);
  backBtn.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      closeChat(ev);
    }
  });
  
  headerActions.appendChild(clearChatBtn);
  headerActions.appendChild(backBtn);
  header.appendChild(titleWrap);
  header.appendChild(headerActions);
  aiChatDrawer.appendChild(header);
  
  const messagesArea = document.createElement('div');
  messagesArea.className = 'aiw-chat-messages';
  messagesArea.id = 'aiw-chat-messages-area';
  
  renderChatIntro(messagesArea);
  aiChatDrawer.appendChild(messagesArea);
  
  const inputRow = document.createElement('div');
  inputRow.className = 'aiw-chat-input-area';
  
  const chatInput = document.createElement('input');
  chatInput.type = 'text';
  chatInput.className = 'aiw-chat-input';
  chatInput.placeholder = 'Ask AI about wishlist...';
  chatInput.id = 'aiw-chat-input-box';
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendChatMessage();
    }
  });
  
  const sendBtn = document.createElement('button');
  sendBtn.className = 'aiw-chat-send-btn';
  sendBtn.innerHTML = ICON.send(14, '#ffffff');
  sendBtn.setAttribute('aria-label', 'Send message');
  sendBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sendChatMessage();
  });
  
  inputRow.appendChild(chatInput);
  inputRow.appendChild(sendBtn);
  aiChatDrawer.appendChild(inputRow);
  
  panel.appendChild(aiChatDrawer);
}

function toggleAIChatDrawer(forceShow?: boolean) {
  const show = typeof forceShow === 'boolean' ? forceShow : !aiChatDrawerVisible;
  aiChatDrawerVisible = show;
  
  if (show && settingsDrawerVisible) {
    toggleSettingsDrawer(false);
  }
  
  aiChatDrawer.style.display = show ? 'flex' : 'none';
}

function sendChatMessage(overrideQuery?: string) {
  const inputEl = document.getElementById('aiw-chat-input-box') as HTMLInputElement;
  const query = (overrideQuery || (inputEl ? inputEl.value.trim() : '')).trim();
  if (!query) return;
  
  if (inputEl) inputEl.value = '';
  
  const messagesContainer = document.getElementById('aiw-chat-messages-area');
  if (!messagesContainer) return;
  
  appendChatBubble(messagesContainer, query, 'user');
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  const thinkingBubble = appendChatBubble(messagesContainer, '<div class="aiw-chat-thinking"><span></span><span></span><span></span></div>', 'ai thinking-state');
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  // Push user turn to history
  chatHistory.push({
    role: 'user',
    parts: [{ text: query }]
  });

  const settings = getSettings();
  if (!settings.apiKey) {
    setTimeout(() => {
      thinkingBubble.remove();
      const localReply = getAIResponseText(query);
      const msg = `<div class="aiw-offline-banner"><strong>[Offline Mode]</strong> API Key not set in Settings. Showing offline fallback.</div>${sanitizeHtml(localReply)}`;
      chatHistory.push({
        role: 'model',
        parts: [{ text: msg }]
      });
      appendChatBubble(messagesContainer, msg, 'ai');
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 800);
    return;
  }

  const isGemini = isGeminiUrl(settings.baseUrl);
  const url = isGemini
    ? `${settings.baseUrl}/models/${settings.model}:generateContent?key=${settings.apiKey}`
    : `${settings.baseUrl}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (!isGemini) {
    headers['Authorization'] = `Bearer ${settings.apiKey}`;
  }

  const items = getWishlist();
  const itemsContext = items.map((item, idx) => {
    return `Product #${idx + 1}:
Title: ${item.title}
Price: ${fmtPrice(item.price)}
Platform: ${item.platform}
URL: ${item.url}
Specs/Details: ${item.details || 'N/A'}`;
  }).join('\n\n');

  const systemInstruction = `You are a savvy, highly analytical AI Shopping Assistant. Your goal is to help the user make the smartest buying decisions by analyzing their saved wishlist data (containing ${items.length} items):
${itemsContext}

Core Objectives & Analysis Guidelines:
1. Value-for-Money ("Bang for the Buck") Analysis:
   - When asked to compare, choose, or evaluate items, always perform a "bang for the buck" analysis.
   - Compare key features (performance, specs, brand reputation, warranty) against their actual prices.
   - Explicitly highlight which option offers the best value per rupee/dollar spent, and explain why (e.g., "Product A costs 25% less than Product B but delivers 90% of the key specifications, making it the superior value choice").
2. Rich Feature Comparisons:
   - Detail similarities, differences, missing specifications, and targeted user profiles for each product (e.g., "Best budget pick", "Best for power users").
   - Highlight advantages/pros and disadvantages/cons of each item.
3. Presentation & Formatting:
   - Keep answers clear, structured, objective, and direct. Use standard markdown for text layout.
   - To display side-by-side comparisons or feature lists, ALWAYS use an HTML table:
     '<table class="aiw-chat-table"><thead><tr><th>Feature</th><th>Product A</th><th>Product B</th></tr></thead><tbody><tr><td>Price</td><td>...</td><td>...</td></tr>...</tbody></table>'
   - For links to wishlist items, always use: '<a href="URL" target="_blank" class="aiw-chat-link">Product Title</a>'.
4. Tone & Scope:
   - Maintain a helpful, conversational, objective, and unbiased shopping advisor persona.
   - You can also answer general questions, chat about other topics, or retrieve facts, but keep your primary value focused on shopping advisory.`;

  const payload = isGemini
    ? {
        contents: chatHistory,
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        }
      }
    : {
        model: settings.model,
        messages: [
          { role: 'system', content: systemInstruction },
          ...chatHistory.map(h => ({
            role: h.role === 'model' ? 'assistant' : 'user',
            content: h.parts[0]?.text || ''
          }))
        ]
      };

  if (typeof GM_xmlhttpRequest !== 'undefined') {
    GM_xmlhttpRequest({
      method: 'POST',
      url,
      headers,
      data: JSON.stringify(payload),
      onload: (res) => {
        thinkingBubble.remove();
        let reply = '';
        if (res.status >= 200 && res.status < 300) {
          try {
            const data = JSON.parse(res.responseText);
            reply = isGemini
              ? (data.candidates?.[0]?.content?.parts?.[0]?.text || '')
              : (data.choices?.[0]?.message?.content || '');
          } catch (e) {
            console.error('Failed to parse AI response:', e);
          }
        }
        
        if (!reply) {
          const localReply = getAIResponseText(query);
          reply = `<div class="aiw-offline-banner"><strong>[Offline Mode]</strong> AI API error (Status ${res.status}). Showing offline fallback.</div>${sanitizeHtml(localReply)}`;
        } else {
          reply = sanitizeHtml(formatMarkdownToHtml(reply));
        }
        
        // Push model turn to history
        chatHistory.push({
          role: 'model',
          parts: [{ text: reply }]
        });

        appendChatBubble(messagesContainer, reply, 'ai');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      },
      onerror: () => {
        thinkingBubble.remove();
        const localReply = getAIResponseText(query);
        const reply = `<div class="aiw-offline-banner"><strong>[Offline Mode]</strong> Network error calling AI API. Showing offline fallback.</div>${sanitizeHtml(localReply)}`;
        chatHistory.push({
          role: 'model',
          parts: [{ text: reply }]
        });
        appendChatBubble(messagesContainer, reply, 'ai');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    });
  } else {
    fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        thinkingBubble.remove();
        let reply = isGemini
          ? data.candidates?.[0]?.content?.parts?.[0]?.text
          : data.choices?.[0]?.message?.content;
        if (reply) {
          reply = sanitizeHtml(formatMarkdownToHtml(reply));
        } else {
          reply = `<div class="aiw-offline-banner"><strong>[Offline Mode]</strong> Failed to receive response from AI. Showing offline fallback.</div>${sanitizeHtml(getAIResponseText(query))}`;
        }
        chatHistory.push({
          role: 'model',
          parts: [{ text: reply }]
        });
        appendChatBubble(messagesContainer, reply, 'ai');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      })
      .catch(() => {
        thinkingBubble.remove();
        const localReply = getAIResponseText(query);
        const reply = `<div class="aiw-offline-banner"><strong>[Offline Mode]</strong> Error communicating with AI server. Showing offline fallback.</div>${sanitizeHtml(localReply)}`;
        chatHistory.push({
          role: 'model',
          parts: [{ text: reply }]
        });
        appendChatBubble(messagesContainer, reply, 'ai');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      });
  }
}

function appendChatBubble(container: HTMLElement, content: string, senderClass: string): HTMLDivElement {
  const bubble = document.createElement('div');
  bubble.className = `aiw-chat-bubble ${senderClass}`;
  
  if (senderClass.includes('ai') && !senderClass.includes('thinking-state')) {
    const contentDiv = document.createElement('div');
    contentDiv.className = 'aiw-chat-bubble-content';
    contentDiv.innerHTML = content;
    bubble.appendChild(contentDiv);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'aiw-chat-copy-btn';
    copyBtn.innerHTML = ICON.clipboard(14);
    copyBtn.title = 'Copy response';
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const textToCopy = contentDiv.innerText || contentDiv.textContent || '';
      navigator.clipboard.writeText(textToCopy).then(() => {
        copyBtn.innerHTML = ICON.check(14);
        setTimeout(() => {
          copyBtn.innerHTML = ICON.clipboard(14);
        }, 2000);
      });
    });
    bubble.appendChild(copyBtn);
  } else {
    if (senderClass.includes('thinking-state')) {
      bubble.innerHTML = content;
    } else {
      bubble.textContent = content;
    }
  }
  
  container.appendChild(bubble);
  return bubble;
}

function getAIResponseText(query: string): string {
  const items = getWishlist();
  if (items.length === 0) {
    return 'Your AI wishlist is currently empty. Add products on Amazon or Flipkart by clicking the heart button, and I can analyze and compare them for you here!';
  }
  
  const lowerQuery = query.toLowerCase();
  
  // Handle cheapest item local query
  if (lowerQuery.includes('cheap') || lowerQuery.includes('lowest') || lowerQuery.includes('min')) {
    const sorted = [...items].sort((a, b) => a.price - b.price);
    const cheapest = sorted[0];
    if (cheapest) {
      return `The cheapest item in your wishlist is <strong><a href="${cheapest.url}" target="_blank" class="aiw-chat-link">${escapeHtml(cheapest.title)}</a></strong> at <strong>${fmtPrice(cheapest.price)}</strong> (saved from ${cheapest.platform}).`;
    }
  }

  // Handle most expensive item local query
  if (lowerQuery.includes('expensive') || lowerQuery.includes('highest') || lowerQuery.includes('max')) {
    const sorted = [...items].sort((a, b) => b.price - a.price);
    const mostExpensive = sorted[0];
    if (mostExpensive) {
      return `The most expensive item in your wishlist is <strong><a href="${mostExpensive.url}" target="_blank" class="aiw-chat-link">${escapeHtml(mostExpensive.title)}</a></strong> at <strong>${fmtPrice(mostExpensive.price)}</strong> (saved from ${mostExpensive.platform}).`;
    }
  }

  // Handle total count item local query
  if (lowerQuery.includes('count') || lowerQuery.includes('how many') || lowerQuery.includes('total')) {
    const amzn = items.filter(i => i.platform === 'Amazon').length;
    const fk = items.filter(i => i.platform === 'Flipkart').length;
    return `You have <strong>${items.length} items</strong> in total in your AI wishlist:<br>• ${amzn} from Amazon<br>• ${fk} from Flipkart.`;
  }

  if (lowerQuery.includes('compare') || lowerQuery.includes('diff') || lowerQuery.includes('versus') || lowerQuery.includes('vs')) {
    let html = `I compared your saved products. Here is the summary matrix:<br>`;
    html += `<table class="aiw-chat-table">`;
    html += `<thead><tr><th>Feature</th>`;
    items.forEach(item => {
      const shortTitle = item.title.length > 25 ? item.title.substring(0, 22) + '...' : item.title;
      html += `<th>${escapeHtml(shortTitle)}</th>`;
    });
    html += `</tr></thead><tbody>`;
    
    html += `<tr><td><strong>Price</strong></td>`;
    items.forEach(item => {
      html += `<td>${fmtPrice(item.price)}</td>`;
    });
    html += `</tr>`;
    
    html += `<tr><td><strong>Platform</strong></td>`;
    items.forEach(item => {
      html += `<td>${escapeHtml(item.platform)}</td>`;
    });
    html += `</tr>`;
    
    const allSpecs: { [key: string]: string[] } = {};
    items.forEach((item, index) => {
      if (item.details) {
        try {
          const parsed = JSON.parse(item.details);
          if (parsed && typeof parsed === 'object') {
            Object.keys(parsed).forEach(k => {
              if (!allSpecs[k]) allSpecs[k] = Array(items.length).fill('-');
              allSpecs[k]![index] = String(parsed[k]);
            });
          }
        } catch {}
      }
    });
    
    const specKeys = Object.keys(allSpecs).slice(0, 5);
    specKeys.forEach(k => {
      html += `<tr><td><strong>${escapeHtml(k)}</strong></td>`;
      items.forEach((item, index) => {
        html += `<td>${escapeHtml(allSpecs[k]![index] || '-')}</td>`;
      });
      html += `</tr>`;
    });
    
    html += `</tbody></table>`;
    return html;
  }
  
  if (lowerQuery.includes('describe') || lowerQuery.includes('summar') || lowerQuery.includes('wishlist') || lowerQuery.includes('list')) {
    const total = items.reduce((acc, i) => acc + i.price, 0);
    const avg = total / items.length;
    const amzn = items.filter(i => i.platform === 'Amazon').length;
    const fk = items.filter(i => i.platform === 'Flipkart').length;
    
    let summary = `You have <strong>${items.length} items</strong> on your AI Wishlist:<br>`;
    summary += `• ${amzn} item(s) from Amazon<br>`;
    summary += `• ${fk} item(s) from Flipkart<br>`;
    summary += `• Estimated Total Cost: <strong>${fmtPrice(total)}</strong><br>`;
    summary += `• Average Price: <strong>${fmtPrice(avg)}</strong><br><br>`;
    summary += `Saved items:<br>`;
    items.forEach((item, idx) => {
      summary += `${idx + 1}. <a href="${item.url}" target="_blank" class="aiw-chat-link">${escapeHtml(item.title)}</a> (${fmtPrice(item.price)})<br>`;
    });
    
    return summary;
  }
  
  return `I found <strong>${items.length} item(s)</strong> in your AI Wishlist database. Let me know if you would like me to compare specifications, create a feature summary table, or help you compare prices across saved items.`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


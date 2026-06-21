import type { WishlistItem } from './types';
import { getWishlist, removeItem, clearWishlist } from './wishlist';
import { fmtPrice, formatMarkdownToHtml } from '../utils/formatters';
import { ICON } from './icons';
import { getSettings, saveSettings, DEFAULT_SETTINGS } from './settings';

// ── State ────────────────────────────────────────────────────────────
let fab: HTMLDivElement;
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

// ── Public entry ─────────────────────────────────────────────────────
export function initWishlistUI() {
  createFAB();
  createPanel();
  window.addEventListener('wishlist-updated', updateUI);
  updateUI();
  applyThemeAndAccent();

  // Close panel on outside click
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
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

      // Dynamically sync DOM inputs in settings drawer if they exist on the page
      const inputModel = settingsDrawer?.querySelector('#settings-model') as HTMLInputElement;
      if (inputModel) inputModel.value = DEFAULT_SETTINGS.model;
      const inputUrl = settingsDrawer?.querySelector('#settings-base-url') as HTMLInputElement;
      if (inputUrl) inputUrl.value = DEFAULT_SETTINGS.baseUrl;
      const inputKey = settingsDrawer?.querySelector('#settings-key') as HTMLInputElement;
      if (inputKey) inputKey.value = DEFAULT_SETTINGS.apiKey;
      const dots = settingsDrawer?.querySelectorAll('.aiw-accent-dot');
      if (dots) {
        dots.forEach(d => {
          const bg = (d as HTMLElement).style.backgroundColor;
          if (bg.includes('220') || bg.includes('rgb(220,')) d.classList.add('active');
          else d.classList.remove('active');
        });
      }
      const checkCrawl = settingsDrawer?.querySelector('#settings-crawl') as HTMLInputElement;
      if (checkCrawl) checkCrawl.checked = DEFAULT_SETTINGS.autocrawl;

      showToast('All cache and data cleared!');
    });
  }
}

// ── FAB ──────────────────────────────────────────────────────────────
function createFAB() {
  fab = document.createElement('div');
  fab.className = 'aiw-fab';
  fab.innerHTML = ICON.heart(28, 'currentColor', 'currentColor');
  fab.style.color = '#d97757';

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

  // ponytail: simplified crawling count state toggle
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

function togglePanel() {
  panelVisible = !panelVisible;
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
  actions.appendChild(createHeaderBtn('aiw-ai-btn', 'Ask AI Assistant', ICON.sparkle(16), 'ai', () => toggleAIChatDrawer()));
  actions.appendChild(createHeaderBtn('aiw-settings-btn', 'Wishlist Settings', ICON.settings(16), 'settings', () => toggleSettingsDrawer()));
  actions.appendChild(createHeaderBtn('aiw-close-btn', 'Close Panel', ICON.close(16), 'close', togglePanel));

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
    item.addEventListener('click', (e) => {
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
  pillWrap.className = 'aiw-pill-wrap';

  const platforms: PlatformFilter[] = ['All', 'Amazon', 'Flipkart'];
  const pillEls: HTMLDivElement[] = [];

  platforms.forEach(p => {
    const pill = document.createElement('div');
    pill.className = 'aiw-pill';
    if (p === activePlatform) pill.classList.add('active');
    pill.textContent = p;
    pill.addEventListener('click', (e) => {
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

  // Stop click propagation on panel and reset clear warning on panel click
  panel.addEventListener('click', (e) => {
    e.stopPropagation();
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
                img.src = reader.result as string;
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
function showToast(msg: string) {
  const toast = document.createElement('div');
  toast.className = 'aiw-toast';
  toast.textContent = `✓ ${msg}`;
  document.body.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });
  
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => { toast.remove(); }, 200);
  }, 2000);
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
  backBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSettingsDrawer(false);
  });
  
  header.appendChild(titleWrap);
  header.appendChild(backBtn);
  settingsDrawer.appendChild(header);
  
  const body = document.createElement('div');
  body.className = 'aiw-drawer-body';
  
  const settings = getSettings();
  
  // Section 1: AI Configuration (OpenAI-compatible)
  const secAI = createSettingsSection('🤖 AI Configuration');
  
  const modelRow = createSettingsInputRow('Model Name', 'settings-model', 'text', settings.model, 'e.g. gemini-3.1-flash-lite', (val) => {
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
  body.appendChild(secCrawler);
  

  
  settingsDrawer.appendChild(body);
  panel.appendChild(settingsDrawer);
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
  
  // ponytail: detect Gemini vs OpenAI-compatible endpoints automatically based on baseUrl
  const isGemini = settings.baseUrl.includes('googleapis.com');
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
}

function darkenHex(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - 30);
  const g = Math.max(0, ((n >> 8) & 0xff) - 30);
  const b = Math.max(0, (n & 0xff) - 30);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
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
  clearChatBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    chatHistory = [];
    const messagesArea = document.getElementById('aiw-chat-messages-area');
    if (messagesArea) {
      messagesArea.innerHTML = '';
      const introBubble = document.createElement('div');
      introBubble.className = 'aiw-chat-bubble ai';
      introBubble.innerHTML = 'Hi! I\'m your AI Assistant. Ask me to compare products or describe saved items!';
      
      const suggs = document.createElement('div');
      suggs.className = 'aiw-chat-suggestions';
      
      const sugCompare = document.createElement('div');
      sugCompare.className = 'aiw-chat-suggestion-chip';
      sugCompare.textContent = '📊 Compare saved products';
      sugCompare.addEventListener('click', (ev) => {
        ev.stopPropagation();
        sendChatMessage('Compare these products for me');
      });
      
      const sugSummarize = document.createElement('div');
      sugSummarize.className = 'aiw-chat-suggestion-chip';
      sugSummarize.textContent = '📝 Describe my wishlist';
      sugSummarize.addEventListener('click', (ev) => {
        ev.stopPropagation();
        sendChatMessage('Describe my wishlist');
      });
      
      suggs.appendChild(sugCompare);
      suggs.appendChild(sugSummarize);
      introBubble.appendChild(suggs);
      messagesArea.appendChild(introBubble);
    }
  });

  const backBtn = document.createElement('div');
  backBtn.className = 'aiw-drawer-close';
  backBtn.innerHTML = ICON.arrowLeft(16);
  backBtn.title = 'Back to Wishlist';
  backBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleAIChatDrawer(false);
  });
  
  headerActions.appendChild(clearChatBtn);
  headerActions.appendChild(backBtn);
  header.appendChild(titleWrap);
  header.appendChild(headerActions);
  aiChatDrawer.appendChild(header);
  
  const messagesArea = document.createElement('div');
  messagesArea.className = 'aiw-chat-messages';
  messagesArea.id = 'aiw-chat-messages-area';
  
  const introBubble = document.createElement('div');
  introBubble.className = 'aiw-chat-bubble ai';
  introBubble.innerHTML = 'Hi! I\'m your AI Assistant. Ask me to compare products or describe saved items!';
  
  const suggs = document.createElement('div');
  suggs.className = 'aiw-chat-suggestions';
  
  const sugCompare = document.createElement('div');
  sugCompare.className = 'aiw-chat-suggestion-chip';
  sugCompare.textContent = '📊 Compare saved products';
  sugCompare.addEventListener('click', (e) => {
    e.stopPropagation();
    sendChatMessage('Compare these products for me');
  });
  
  const sugSummarize = document.createElement('div');
  sugSummarize.className = 'aiw-chat-suggestion-chip';
  sugSummarize.textContent = '📝 Describe my wishlist';
  sugSummarize.addEventListener('click', (e) => {
    e.stopPropagation();
    sendChatMessage('Describe my wishlist');
  });
  
  suggs.appendChild(sugCompare);
  suggs.appendChild(sugSummarize);
  introBubble.appendChild(suggs);
  messagesArea.appendChild(introBubble);
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
      const msg = `<em>[Offline Mode - API Key not set in Settings]</em><br><br>${localReply}`;
      chatHistory.push({
        role: 'model',
        parts: [{ text: msg }]
      });
      appendChatBubble(messagesContainer, msg, 'ai');
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 800);
    return;
  }

  // ponytail: detect Gemini vs OpenAI-compatible endpoints dynamically
  const isGemini = settings.baseUrl.includes('googleapis.com');
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

  const systemInstruction = `You are a helpful AI assistant connected to the user's shopping wishlist.
Here is the user's saved wishlist data (containing ${items.length} items):
${itemsContext}

Guidelines:
1. You can answer general questions, chat about unrelated topics, compare wishlist products, or retrieve real-time specs/reviews. Do not restrict yourself only to the wishlist context.
2. Chat in a relaxed, friendly, conversational, and natural tone.
3. You can use standard markdown format (e.g. bold, italics, lists, or headers).
4. To display comparison tables nicely, please use HTML: '<table class="aiw-chat-table">' with '<thead><tr><th>Feature</th>...</tr></thead>' and '<tbody>...</tbody>'.
5. For product links, always use: '<a href="URL" target="_blank" class="aiw-chat-link">Product Title</a>'.`;

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
          reply = `<em>[Offline Mode - AI API error (Status ${res.status})]</em><br><br>${localReply}`;
        } else {
          reply = formatMarkdownToHtml(reply);
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
        const reply = `<em>[Offline Mode - Network error calling AI API]</em><br><br>${localReply}`;
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
          reply = formatMarkdownToHtml(reply);
        } else {
          reply = getAIResponseText(query);
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
        chatHistory.push({
          role: 'model',
          parts: [{ text: localReply }]
        });
        appendChatBubble(messagesContainer, localReply, 'ai');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      });
  }
}

function appendChatBubble(container: HTMLElement, content: string, senderClass: string): HTMLDivElement {
  const bubble = document.createElement('div');
  bubble.className = `aiw-chat-bubble ${senderClass}`;
  
  // ponytail: only append copy button to non-thinking AI bubbles
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
    bubble.innerHTML = content;
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
  
  // ponytail: handle cheapest item local query
  if (lowerQuery.includes('cheap') || lowerQuery.includes('lowest') || lowerQuery.includes('min')) {
    const sorted = [...items].sort((a, b) => a.price - b.price);
    const cheapest = sorted[0];
    if (cheapest) {
      return `The cheapest item in your wishlist is <strong><a href="${cheapest.url}" target="_blank" class="aiw-chat-link">${escapeHtml(cheapest.title)}</a></strong> at <strong>${fmtPrice(cheapest.price)}</strong> (saved from ${cheapest.platform}).`;
    }
  }

  // ponytail: handle most expensive item local query
  if (lowerQuery.includes('expensive') || lowerQuery.includes('highest') || lowerQuery.includes('max')) {
    const sorted = [...items].sort((a, b) => b.price - a.price);
    const mostExpensive = sorted[0];
    if (mostExpensive) {
      return `The most expensive item in your wishlist is <strong><a href="${mostExpensive.url}" target="_blank" class="aiw-chat-link">${escapeHtml(mostExpensive.title)}</a></strong> at <strong>${fmtPrice(mostExpensive.price)}</strong> (saved from ${mostExpensive.platform}).`;
    }
  }

  // ponytail: handle total count item local query
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


import { Cache } from '../cache';
import { FilterSettings, BadgeSettings, PerformerProfile } from '../types';
import { Badges } from './badges';

let filterFab: HTMLButtonElement | null = null;
let settingsFab: HTMLButtonElement | null = null;
let filterDrawer: HTMLDivElement | null = null;
let settingsDrawer: HTMLDivElement | null = null;
let backdrop: HTMLDivElement | null = null;
let activeFiltersCountEl: HTMLSpanElement | null = null;
let statusLineEl: HTMLDivElement | null = null;

// Track known tags to diff instead of full DOM teardown
const knownEthnicities = new Set<string>();
const knownHairColors = new Set<string>();
const knownEyeColors = new Set<string>();
const knownCups = new Set<string>();
const knownPerformances = new Set<string>();

// Debounce timer for text search
let searchDebounce: ReturnType<typeof setTimeout> | null = null;

export const FilterPanel = {
  init(onFilterChange: () => void): void {
    if (document.getElementById('bp-filter-fab')) return;

    this.createBackdrop();
    this.createFABs();
    this.createDrawers(onFilterChange);
    this.setupEvents(onFilterChange);
    this.applySettingsUI();
  },

  createBackdrop(): void {
    backdrop = document.createElement('div');
    backdrop.id = 'bp-backdrop';
    document.body.appendChild(backdrop);
  },

  createFABs(): void {
    settingsFab = document.createElement('button');
    settingsFab.id = 'bp-settings-fab';
    settingsFab.className = 'bp-fab';
    settingsFab.title = 'Userscript Settings';
    settingsFab.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
      </svg>
    `;
    document.body.appendChild(settingsFab);

    filterFab = document.createElement('button');
    filterFab.id = 'bp-filter-fab';
    filterFab.className = 'bp-fab';
    filterFab.title = 'Filter Performers';
    filterFab.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
      </svg>
      <span class="bp-fab-badge" style="display:none;">0</span>
    `;
    document.body.appendChild(filterFab);
    activeFiltersCountEl = filterFab.querySelector('.bp-fab-badge');
  },

  createDrawers(onFilterChange: () => void): void {
    // ── Filter Drawer ──
    filterDrawer = document.createElement('div');
    filterDrawer.id = 'bp-filter-drawer';
    filterDrawer.className = 'bp-drawer';
    filterDrawer.innerHTML = `
      <div class="bp-drawer-header">
        <h3>Babepedia Filter</h3>
        <button class="bp-close-btn" title="Close Panel">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="bp-drawer-body">
        <!-- Status Line -->
        <div id="bp-status-line" class="bp-status-line" style="display:none;"></div>

        <!-- Search -->
        <div class="bp-section">
          <div class="bp-input-group">
            <input type="text" id="bp-search" class="bp-text-input" placeholder="Search by name..." />
          </div>
        </div>

        <!-- Personal -->
        <div class="bp-section">
          <div class="bp-section-title">Personal Details</div>

          <div class="bp-input-group">
            <label>Performer Type</label>
            <div class="bp-segmented" id="bp-profession-segment">
              <button class="bp-segmented-btn active" data-val="all">All</button>
              <button class="bp-segmented-btn" data-val="pornstar">Porn Star</button>
              <button class="bp-segmented-btn" data-val="non-pornstar">Model Only</button>
            </div>
          </div>

          <div class="bp-input-group">
            <label>Min Age <span class="bp-range-display" id="bp-lbl-min-age">18</span></label>
            <input type="range" id="bp-min-age" class="bp-slider" min="18" max="70" value="18" />
          </div>
          <div class="bp-input-group">
            <label>Max Age <span class="bp-range-display" id="bp-lbl-max-age">70</span></label>
            <input type="range" id="bp-max-age" class="bp-slider" min="18" max="70" value="70" />
          </div>

          <div class="bp-input-group">
            <label>Ethnicities</label>
            <div id="bp-ethnicities-container" class="bp-tag-container"></div>
          </div>
        </div>

        <!-- Body -->
        <div class="bp-section">
          <div class="bp-section-title">Body Stats</div>

          <div class="bp-input-group">
            <label>Boobs Type</label>
            <div class="bp-segmented" id="bp-boobs-segment">
              <button class="bp-segmented-btn active" data-val="all">All</button>
              <button class="bp-segmented-btn" data-val="natural">Natural</button>
              <button class="bp-segmented-btn" data-val="implants">Implants</button>
            </div>
          </div>

          <div class="bp-input-group">
            <label>Min Height <span class="bp-range-display" id="bp-lbl-min-height">130 cm</span></label>
            <input type="range" id="bp-min-height" class="bp-slider" min="130" max="220" value="130" />
          </div>
          <div class="bp-input-group">
            <label>Max Height <span class="bp-range-display" id="bp-lbl-max-height">220 cm</span></label>
            <input type="range" id="bp-max-height" class="bp-slider" min="130" max="220" value="220" />
          </div>

          <div class="bp-input-group">
            <label>Cup Size</label>
            <div id="bp-cups-container" class="bp-tag-container"></div>
          </div>

          <div class="bp-input-group">
            <label>Hair Color</label>
            <div id="bp-hair-container" class="bp-tag-container"></div>
          </div>

          <div class="bp-input-group">
            <label>Eye Color</label>
            <div id="bp-eyes-container" class="bp-tag-container"></div>
          </div>
        </div>

        <!-- Performances -->
        <div class="bp-section">
          <div class="bp-section-title">Performance Acts</div>
          <div class="bp-input-group">
            <div id="bp-performances-container" class="bp-tag-container" style="max-height: 140px;"></div>
          </div>
        </div>

        <!-- Ratings -->
        <div class="bp-section">
          <div class="bp-section-title">Ratings & Popularity</div>

          <div class="bp-input-group">
            <label>Min Rating <span class="bp-range-display" id="bp-lbl-min-rating">0.0</span></label>
            <input type="range" id="bp-min-rating" class="bp-slider" min="0" max="10" step="0.1" value="0" />
          </div>

          <div class="bp-input-group">
            <label>Min Favorites</label>
            <input type="number" id="bp-min-favs" class="bp-text-input" min="0" placeholder="e.g. 500" />
          </div>
        </div>

        <!-- Reset -->
        <div class="bp-section" style="border-bottom:none;">
          <button id="bp-reset-filters-btn" class="bp-btn-reset">Reset All Filters</button>
        </div>
      </div>
    `;
    document.body.appendChild(filterDrawer);

    statusLineEl = filterDrawer.querySelector('#bp-status-line');

    // ── Settings Drawer ──
    settingsDrawer = document.createElement('div');
    settingsDrawer.id = 'bp-settings-drawer';
    settingsDrawer.className = 'bp-drawer';
    settingsDrawer.innerHTML = `
      <div class="bp-drawer-header">
        <h3>Userscript Settings</h3>
        <button class="bp-close-btn" title="Close Panel">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="bp-drawer-body">
        <div class="bp-section">
          <div class="bp-section-title">Badge Configuration</div>

          <div class="bp-switch-row">
            <label>Enable Badges</label>
            <label class="bp-switch">
              <input type="checkbox" id="bp-sett-enabled" checked />
              <span class="bp-switch-slider"></span>
            </label>
          </div>
          <div class="bp-switch-row">
            <label>Show Age</label>
            <label class="bp-switch">
              <input type="checkbox" id="bp-sett-age" checked />
              <span class="bp-switch-slider"></span>
            </label>
          </div>
          <div class="bp-switch-row">
            <label>Show Cup & Boobs Status</label>
            <label class="bp-switch">
              <input type="checkbox" id="bp-sett-cup-boobs" checked />
              <span class="bp-switch-slider"></span>
            </label>
          </div>
          <div class="bp-switch-row">
            <label>Show Nationality</label>
            <label class="bp-switch">
              <input type="checkbox" id="bp-sett-country" checked />
              <span class="bp-switch-slider"></span>
            </label>
          </div>
        </div>

        <div class="bp-section">
          <div class="bp-section-title">Database Utilities</div>
          <button id="bp-clear-profiles-btn" class="bp-btn-danger">Clear Cached Profiles</button>
          <button id="bp-clear-all-btn" class="bp-btn-danger" style="margin-top:8px;">Clear Everything & Reload</button>
        </div>
      </div>
    `;
    document.body.appendChild(settingsDrawer);
  },

  setupEvents(onFilterChange: () => void): void {
    if (!filterFab || !settingsFab || !filterDrawer || !settingsDrawer || !backdrop) return;

    const openDrawer = (drawer: HTMLDivElement, fab: HTMLButtonElement) => {
      drawer.classList.add('open');
      fab.classList.add('active');
      backdrop!.classList.add('active');
    };

    const closeAll = () => {
      filterDrawer?.classList.remove('open');
      filterFab?.classList.remove('active');
      settingsDrawer?.classList.remove('open');
      settingsFab?.classList.remove('active');
      backdrop?.classList.remove('active');
    };

    // Toggle Filter Drawer
    filterFab.addEventListener('click', () => {
      const isOpen = filterDrawer!.classList.contains('open');
      closeAll();
      if (!isOpen) openDrawer(filterDrawer!, filterFab!);
    });

    // Toggle Settings Drawer
    settingsFab.addEventListener('click', () => {
      const isOpen = settingsDrawer!.classList.contains('open');
      closeAll();
      if (!isOpen) openDrawer(settingsDrawer!, settingsFab!);
    });

    // Close on backdrop click
    backdrop.addEventListener('click', closeAll);

    // Close buttons
    filterDrawer.querySelector('.bp-close-btn')?.addEventListener('click', closeAll);
    settingsDrawer.querySelector('.bp-close-btn')?.addEventListener('click', closeAll);

    // ── Sliders validation min/max boundaries (Bug 11) ──
    const minAgeEl = document.getElementById('bp-min-age') as HTMLInputElement;
    const maxAgeEl = document.getElementById('bp-max-age') as HTMLInputElement;
    minAgeEl?.addEventListener('input', () => {
      const minVal = parseInt(minAgeEl.value, 10);
      const maxVal = parseInt(maxAgeEl.value, 10);
      if (minVal > maxVal) maxAgeEl.value = String(minVal);
    });
    maxAgeEl?.addEventListener('input', () => {
      const minVal = parseInt(minAgeEl.value, 10);
      const maxVal = parseInt(maxAgeEl.value, 10);
      if (maxVal < minVal) minAgeEl.value = String(maxVal);
    });

    const minHeightEl = document.getElementById('bp-min-height') as HTMLInputElement;
    const maxHeightEl = document.getElementById('bp-max-height') as HTMLInputElement;
    minHeightEl?.addEventListener('input', () => {
      const minVal = parseInt(minHeightEl.value, 10);
      const maxVal = parseInt(maxHeightEl.value, 10);
      if (minVal > maxVal) maxHeightEl.value = String(minVal);
    });
    maxHeightEl?.addEventListener('input', () => {
      const minVal = parseInt(minHeightEl.value, 10);
      const maxVal = parseInt(maxHeightEl.value, 10);
      if (maxVal < minVal) minHeightEl.value = String(maxVal);
    });

    // ── Range sliders: instant feedback & debounced storage saves (Bug 8) ──
    const rangeInputs = ['bp-min-age', 'bp-max-age', 'bp-min-height', 'bp-max-height', 'bp-min-rating'];
    rangeInputs.forEach((id) => {
      const el = document.getElementById(id);
      el?.addEventListener('input', () => {
        this.saveFiltersToCache(true); // Debounce write to avoid blocking GM thread
        this.updateLabelBubbles();
        onFilterChange();
      });
    });

    // ── Search: debounced 'input' event (fires while typing) ──
    const searchEl = document.getElementById('bp-search');
    searchEl?.addEventListener('input', () => {
      if (searchDebounce) clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        this.saveFiltersToCache(false);
        onFilterChange();
      }, 200);
    });

    // ── Min Favorites: on change ──
    const favsEl = document.getElementById('bp-min-favs');
    favsEl?.addEventListener('change', () => {
      this.saveFiltersToCache(false);
      onFilterChange();
    });

    // ── Segmented Buttons ──
    this.setupSegmented('#bp-boobs-segment', onFilterChange);
    this.setupSegmented('#bp-profession-segment', onFilterChange);

    // ── Badge toggles ──
    const badgeToggles = ['bp-sett-enabled', 'bp-sett-age', 'bp-sett-cup-boobs', 'bp-sett-country'];
    badgeToggles.forEach((id) => {
      document.getElementById(id)?.addEventListener('change', () => {
        const badgeSettings: BadgeSettings = {
          enabled: (document.getElementById('bp-sett-enabled') as HTMLInputElement).checked,
          showAge: (document.getElementById('bp-sett-age') as HTMLInputElement).checked,
          showCupBoobs: (document.getElementById('bp-sett-cup-boobs') as HTMLInputElement).checked,
          showCountry: (document.getElementById('bp-sett-country') as HTMLInputElement).checked
        };
        Cache.setBadgeSettings(badgeSettings);
        onFilterChange();
      });
    });

    // ── Reset Filters ──
    document.getElementById('bp-reset-filters-btn')?.addEventListener('click', () => {
      this.resetFilters(onFilterChange);
    });

    // ── Clear Profiles ──
    document.getElementById('bp-clear-profiles-btn')?.addEventListener('click', () => {
      if (confirm('Clear all cached performer profiles? They will be re-scraped on next visit.')) {
        Cache.clearAllProfiles();
        location.reload();
      }
    });

    // ── Clear Everything ──
    document.getElementById('bp-clear-all-btn')?.addEventListener('click', () => {
      if (confirm('Clear ALL data (profiles + settings)? This cannot be undone.')) {
        Cache.clearEverything();
        location.reload();
      }
    });
  },

  setupSegmented(selector: string, onFilterChange: () => void): void {
    const btns = document.querySelectorAll(`${selector} .bp-segmented-btn`);
    btns.forEach((btn) => {
      btn.addEventListener('click', () => {
        btns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.saveFiltersToCache(false);
        onFilterChange();
      });
    });
  },

  resetFilters(onFilterChange: () => void): void {
    // Reset sliders
    const setVal = (id: string, val: string) => {
      const el = document.getElementById(id) as HTMLInputElement;
      if (el) el.value = val;
    };
    setVal('bp-search', '');
    setVal('bp-min-age', '18');
    setVal('bp-max-age', '70');
    setVal('bp-min-height', '130');
    setVal('bp-max-height', '220');
    setVal('bp-min-rating', '0');
    setVal('bp-min-favs', '');

    // Reset segmented buttons
    document.querySelectorAll('#bp-boobs-segment .bp-segmented-btn').forEach((btn, i) => {
      btn.classList.toggle('active', i === 0);
    });
    document.querySelectorAll('#bp-profession-segment .bp-segmented-btn').forEach((btn, i) => {
      btn.classList.toggle('active', i === 0);
    });

    // Clear all active tags
    document.querySelectorAll('.bp-tag-container .bp-tag.active').forEach((tag) => {
      tag.classList.remove('active');
    });

    this.updateLabelBubbles();
    this.saveFiltersToCache(false);
    onFilterChange();
  },

  updateLabelBubbles(): void {
    const val = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value || '';

    const set = (lblId: string, text: string) => {
      const el = document.getElementById(lblId);
      if (el) el.textContent = text;
    };

    set('bp-lbl-min-age', val('bp-min-age'));
    set('bp-lbl-max-age', val('bp-max-age'));
    set('bp-lbl-min-height', `${val('bp-min-height')} cm`);
    set('bp-lbl-max-height', `${val('bp-max-height')} cm`);
    set('bp-lbl-min-rating', parseFloat(val('bp-min-rating')).toFixed(1));
  },

  applySettingsUI(): void {
    const f = Cache.getFilterSettings();
    const b = Cache.getBadgeSettings();

    const setVal = (id: string, val: any) => {
      const el = document.getElementById(id) as HTMLInputElement;
      if (el) el.value = String(val);
    };

    setVal('bp-search', f.searchQuery);
    setVal('bp-min-age', f.minAge);
    setVal('bp-max-age', f.maxAge);
    setVal('bp-min-height', f.minHeight);
    setVal('bp-max-height', f.maxHeight);
    setVal('bp-min-rating', f.minRating);
    setVal('bp-min-favs', f.minFavorites || '');

    // Segmented buttons
    this.setSegmented('#bp-boobs-segment', f.boobs);
    this.setSegmented('#bp-profession-segment', f.professionFilter);

    // Badge checkboxes
    const setChk = (id: string, val: boolean) => {
      const el = document.getElementById(id) as HTMLInputElement;
      if (el) el.checked = val;
    };
    setChk('bp-sett-enabled', b.enabled);
    setChk('bp-sett-age', b.showAge);
    setChk('bp-sett-cup-boobs', b.showCupBoobs);
    setChk('bp-sett-country', b.showCountry);

    this.updateLabelBubbles();
  },

  setSegmented(selector: string, activeVal: string): void {
    document.querySelectorAll(`${selector} .bp-segmented-btn`).forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-val') === activeVal);
    });
  },

  /** Diff-based: only appends tags that aren't already in the DOM. */
  populateDynamicTags(profiles: Map<string, PerformerProfile>): void {
    const activeFilters = Cache.getFilterSettings();

    // Gather new unique values
    const newEth = new Set<string>();
    const newHair = new Set<string>();
    const newEyes = new Set<string>();
    const newCups = new Set<string>();
    const newPerfs = new Set<string>();

    profiles.forEach((p) => {
      if (p.personal.ethnicity && !knownEthnicities.has(p.personal.ethnicity)) newEth.add(p.personal.ethnicity);
      if (p.body.hairColor && !knownHairColors.has(p.body.hairColor)) newHair.add(p.body.hairColor);
      if (p.body.eyeColor && !knownEyeColors.has(p.body.eyeColor)) newEyes.add(p.body.eyeColor);
      if (p.body.cup && !knownCups.has(p.body.cup)) newCups.add(p.body.cup);
      p.performances.solo.forEach((a) => { if (a && !knownPerformances.has(a)) newPerfs.add(a); });
      p.performances.girlGirl.forEach((a) => { if (a && !knownPerformances.has(a)) newPerfs.add(a); });
      p.performances.boyGirl.forEach((a) => { if (a && !knownPerformances.has(a)) newPerfs.add(a); });
    });

    // Append only new tags
    this.appendTags('bp-ethnicities-container', newEth, knownEthnicities, activeFilters.ethnicities);
    this.appendTags('bp-hair-container', newHair, knownHairColors, activeFilters.hairColors);
    this.appendTags('bp-eyes-container', newEyes, knownEyeColors, activeFilters.eyeColors);
    this.appendTags('bp-cups-container', newCups, knownCups, activeFilters.cupSizes);
    this.appendTags('bp-performances-container', newPerfs, knownPerformances, activeFilters.performances);
  },

  appendTags(containerId: string, newValues: Set<string>, tracker: Set<string>, activeList: string[]): void {
    if (newValues.size === 0) return;

    const container = document.getElementById(containerId);
    if (!container) return;

    // Sort new values and append
    Array.from(newValues).sort().forEach((val) => {
      tracker.add(val);
      const tag = document.createElement('div');
      tag.className = `bp-tag ${activeList.includes(val) ? 'active' : ''}`;
      tag.textContent = val;
      tag.addEventListener('click', () => {
        tag.classList.toggle('active');
        this.saveFiltersToCache(false);
        // Trigger filter via cached onFilterChange — we re-apply
        this.applyFiltersToPage(this._lastProfiles!);
      });
      container.appendChild(tag);
    });
  },

  // Store ref for tag click callbacks
  _lastProfiles: null as Map<string, PerformerProfile> | null,

  saveFiltersToCache(debounce = false): void {
    const val = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value || '';
    const activeTags = (cid: string) => {
      const c = document.getElementById(cid);
      if (!c) return [];
      return Array.from(c.querySelectorAll('.bp-tag.active')).map((el) => el.textContent || '');
    };

    const activeBtn = (segId: string) =>
      document.querySelector(`${segId} .bp-segmented-btn.active`)?.getAttribute('data-val') || 'all';

    const settings: FilterSettings = {
      searchQuery: val('bp-search'),
      minAge: parseInt(val('bp-min-age'), 10) || 18,
      maxAge: parseInt(val('bp-max-age'), 10) || 70,
      minHeight: parseInt(val('bp-min-height'), 10) || 130,
      maxHeight: parseInt(val('bp-max-height'), 10) || 220,
      minRating: parseFloat(val('bp-min-rating')) || 0,
      minFavorites: parseInt(val('bp-min-favs'), 10) || 0,
      boobs: activeBtn('#bp-boobs-segment') as FilterSettings['boobs'],
      professionFilter: activeBtn('#bp-profession-segment') as FilterSettings['professionFilter'],
      ethnicities: activeTags('bp-ethnicities-container'),
      hairColors: activeTags('bp-hair-container'),
      eyeColors: activeTags('bp-eyes-container'),
      cupSizes: activeTags('bp-cups-container'),
      performances: activeTags('bp-performances-container'),
    };

    Cache.setFilterSettings(settings, debounce);
  },

  applyFiltersToPage(cachedProfiles: Map<string, PerformerProfile>): void {
    this._lastProfiles = cachedProfiles;
    const filters = Cache.getFilterSettings();
    const badgeSettings = Cache.getBadgeSettings();

    // Toggle badge CSS visibility flags once on parent container (Bug 7 - Avoid thrashing)
    const thumbsContainer = document.getElementById('thumbs');
    if (thumbsContainer) {
      thumbsContainer.classList.toggle('bp-hide-badges', !badgeSettings.enabled);
      thumbsContainer.classList.toggle('bp-hide-age', !badgeSettings.showAge);
      thumbsContainer.classList.toggle('bp-hide-cup-boobs', !badgeSettings.showCupBoobs);
      thumbsContainer.classList.toggle('bp-hide-country', !badgeSettings.showCountry);
    }

    const thumbshots = document.querySelectorAll('.thumbshot');
    let matchCount = 0;
    let totalCount = 0;

    const nonSearchFilterActive = this.isNonSearchFilterActive(filters);

    thumbshots.forEach((thumb) => {
      const el = thumb as HTMLElement;
      const anchor = el.querySelector('a');
      if (!anchor) return;
      const url = anchor.getAttribute('href');
      if (!url) return;

      totalCount++;
      const profile = cachedProfiles.get(url);

      if (!profile) {
        // Unscraped profile
        // Bug 1: If any active filter criteria requires stats, hide unscraped performers until loaded
        if (nonSearchFilterActive) {
          el.style.display = 'none';
          return;
        }

        // Bug 2: Name search fallback extraction must read ONLY name, avoiding badge text Pollution
        if (filters.searchQuery) {
          const textEl = el.querySelector('.thumbtext');
          const cleanName = textEl 
            ? (textEl.textContent || '').replace(/^#\d+:\s*/, '').trim() 
            : (anchor.getAttribute('title') || '').trim();

          el.style.display = cleanName.toLowerCase().includes(filters.searchQuery.toLowerCase()) ? '' : 'none';
        } else {
          el.style.display = '';
        }
        if (el.style.display !== 'none') matchCount++;
        return;
      }

      // Render badges once (internally writes data-bp-badged to prevent DOM rebuild cycles)
      Badges.render(el, profile);

      // Apply filter conditions
      let matches = true;

      // Search Query
      if (filters.searchQuery && !profile.name.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
        matches = false;
      }

      // Profession
      if (matches && filters.professionFilter !== 'all') {
        const isPornstar = profile.personal.professions.includes('Porn Star');
        if (filters.professionFilter === 'pornstar' && !isPornstar) matches = false;
        if (filters.professionFilter === 'non-pornstar' && isPornstar) matches = false;
      }

      // Age (Bug 1: If non-default settings set and field is null, filter it out)
      if (matches) {
        const isAgeFilterActive = filters.minAge > 18 || filters.maxAge < 70;
        if (profile.personal.age !== null) {
          if (profile.personal.age < filters.minAge || profile.personal.age > filters.maxAge) matches = false;
        } else if (isAgeFilterActive) {
          matches = false;
        }
      }

      // Height (Bug 1: Filter out null height when height constraint is set)
      if (matches) {
        const isHeightFilterActive = filters.minHeight > 130 || filters.maxHeight < 220;
        if (profile.body.heightCm !== null) {
          if (profile.body.heightCm < filters.minHeight || profile.body.heightCm > filters.maxHeight) matches = false;
        } else if (isHeightFilterActive) {
          matches = false;
        }
      }

      // Rating (Bug 1: Filter out null rating when constraint is active)
      if (matches && filters.minRating > 0) {
        if (profile.rating.score === null || profile.rating.score < filters.minRating) {
          matches = false;
        }
      }

      // Favorites (Bug 1: Filter out null when constraint is active)
      if (matches && filters.minFavorites > 0) {
        if (profile.rating.favorites === null || profile.rating.favorites < filters.minFavorites) {
          matches = false;
        }
      }

      // Boobs (Bug 1: Filter out null when boobs criteria is chosen)
      if (matches && filters.boobs !== 'all') {
        if (profile.body.boobs === 'Unknown') {
          matches = false;
        } else {
          if (filters.boobs === 'natural' && profile.body.boobs !== 'Natural') matches = false;
          if (filters.boobs === 'implants' && profile.body.boobs !== 'Implants') matches = false;
        }
      }

      // Ethnicities
      if (matches && filters.ethnicities.length > 0) {
        if (!profile.personal.ethnicity || !filters.ethnicities.includes(profile.personal.ethnicity)) matches = false;
      }

      // Hair color
      if (matches && filters.hairColors.length > 0) {
        if (!profile.body.hairColor || !filters.hairColors.includes(profile.body.hairColor)) matches = false;
      }

      // Eye color
      if (matches && filters.eyeColors.length > 0) {
        if (!profile.body.eyeColor || !filters.eyeColors.includes(profile.body.eyeColor)) matches = false;
      }

      // Cup
      if (matches && filters.cupSizes.length > 0) {
        if (!profile.body.cup || !filters.cupSizes.includes(profile.body.cup)) matches = false;
      }

      // Performances (ALL selected must match)
      if (matches && filters.performances.length > 0) {
        const allActs = [
          ...profile.performances.solo,
          ...profile.performances.girlGirl,
          ...profile.performances.boyGirl
        ];
        if (!filters.performances.every((act) => allActs.includes(act))) matches = false;
      }

      el.style.display = matches ? '' : 'none';
      if (matches) matchCount++;
    });

    // Update status line
    this.updateStatusLine(matchCount, totalCount, filters);

    // Update FAB badge to display active filters count (Bug 10)
    this.updateFabBadge(filters);
  },

  updateStatusLine(matchCount: number, totalCount: number, filters: FilterSettings): void {
    if (!statusLineEl) return;

    const isFiltering = this.isFiltering(filters);
    if (isFiltering) {
      statusLineEl.style.display = 'block';
      statusLineEl.textContent = `Showing ${matchCount} of ${totalCount}`;
    } else {
      statusLineEl.style.display = 'none';
    }
  },

  updateFabBadge(filters: FilterSettings): void {
    if (!activeFiltersCountEl) return;

    const activeFiltersCount = this.getActiveFiltersCount(filters);
    if (activeFiltersCount > 0) {
      activeFiltersCountEl.style.display = 'flex';
      activeFiltersCountEl.textContent = String(activeFiltersCount);
    } else {
      activeFiltersCountEl.style.display = 'none';
    }
  },

  getActiveFiltersCount(f: FilterSettings): number {
    let count = 0;
    if (f.searchQuery) count++;
    if (f.minAge > 18 || f.maxAge < 70) count++;
    if (f.minHeight > 130 || f.maxHeight < 220) count++;
    if (f.minRating > 0) count++;
    if (f.minFavorites > 0) count++;
    if (f.boobs !== 'all') count++;
    if (f.professionFilter !== 'all') count++;
    if (f.ethnicities.length > 0) count++;
    if (f.hairColors.length > 0) count++;
    if (f.eyeColors.length > 0) count++;
    if (f.cupSizes.length > 0) count++;
    if (f.performances.length > 0) count++;
    return count;
  },

  isFiltering(f: FilterSettings): boolean {
    return this.getActiveFiltersCount(f) > 0;
  },

  isNonSearchFilterActive(f: FilterSettings): boolean {
    return !!(
      f.minAge > 18 || f.maxAge < 70 ||
      f.minHeight > 130 || f.maxHeight < 220 ||
      f.minRating > 0 ||
      f.minFavorites > 0 ||
      f.boobs !== 'all' ||
      f.professionFilter !== 'all' ||
      f.ethnicities.length > 0 ||
      f.hairColors.length > 0 ||
      f.eyeColors.length > 0 ||
      f.cupSizes.length > 0 ||
      f.performances.length > 0
    );
  }
};

import { Cache } from '../cache';
import { FilterSettings, BadgeSettings, PerformerProfile } from '../types';
import { Badges } from './badges';
import { icon } from './icons';
import { extractPerformerName } from '../parser';

let filterFab: HTMLButtonElement | null = null;
let filterDrawer: HTMLDivElement | null = null;
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

// File-scope DRY helpers
const getVal = (id: string): string =>
  (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';

const setVal = (id: string, value: any): void => {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (el) el.value = String(value);
};

const activeTags = (cid: string): string[] => {
  const c = document.getElementById(cid);
  if (!c) return [];
  return Array.from(c.querySelectorAll('.bp-tag.active')).map((el) => el.textContent || '');
};

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
    filterFab = document.createElement('button');
    filterFab.id = 'bp-filter-fab';
    filterFab.className = 'bp-fab';
    filterFab.title = 'Filter Performers';
    filterFab.setAttribute('aria-label', 'Filter Performers');

    const badge = document.createElement('span');
    badge.className = 'bp-fab-badge';
    badge.style.display = 'none';
    badge.textContent = '0';
    filterFab.appendChild(badge);

    document.body.appendChild(filterFab);
    activeFiltersCountEl = badge;
  },

  createDrawers(onFilterChange: () => void): void {
    // ── Single Combined Filter & Settings Drawer ──
    filterDrawer = document.createElement('div');
    filterDrawer.id = 'bp-filter-drawer';
    filterDrawer.className = 'bp-drawer';
    filterDrawer.setAttribute('role', 'dialog');
    filterDrawer.setAttribute('aria-modal', 'true');
    filterDrawer.setAttribute('aria-labelledby', 'bp-drawer-title');
    filterDrawer.innerHTML = `
      <div class="bp-drawer-header">
        <h3 id="bp-drawer-title">Babepedia Filter</h3>
        <div class="bp-header-actions">
          <button id="bp-drawer-settings-toggle" class="bp-icon-btn" title="Settings"></button>
          <button class="bp-close-btn" title="Close Panel"></button>
        </div>
      </div>
      
      <!-- Filters View -->
      <div id="bp-filters-view" class="bp-drawer-body">
        <!-- Status Line -->
        <div id="bp-status-line" class="bp-status-line" style="display:none;"></div>

        <!-- Search -->
        <div class="bp-section">
          <div class="bp-input-group">
            <label for="bp-search" class="sr-only">Search performers by name</label>
            <input type="search" id="bp-search" class="bp-text-input" placeholder="Search by name..." />
          </div>
        </div>

        <!-- Personal -->
        <div class="bp-section">
          <div class="bp-section-title">Personal Details</div>

          <div class="bp-input-group">
            <label id="bp-profession-label">Performer Type</label>
            <div class="bp-segmented" id="bp-profession-segment" role="radiogroup" aria-labelledby="bp-profession-label">
              <button class="bp-segmented-btn active" data-val="all" role="radio" aria-checked="true">All</button>
              <button class="bp-segmented-btn" data-val="pornstar" role="radio" aria-checked="false">Porn Star</button>
              <button class="bp-segmented-btn" data-val="non-pornstar" role="radio" aria-checked="false">Model Only</button>
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
            <label id="bp-boobs-label">Boobs Type</label>
            <div class="bp-segmented" id="bp-boobs-segment" role="radiogroup" aria-labelledby="bp-boobs-label">
              <button class="bp-segmented-btn active" data-val="all" role="radio" aria-checked="true">All</button>
              <button class="bp-segmented-btn" data-val="natural" role="radio" aria-checked="false">Natural</button>
              <button class="bp-segmented-btn" data-val="implants" role="radio" aria-checked="false">Implants</button>
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
            <label for="bp-min-favs">Min Favorites</label>
            <input type="number" id="bp-min-favs" class="bp-text-input" min="0" placeholder="e.g. 500" />
          </div>
        </div>

        <!-- Reset -->
        <div class="bp-section" style="border-bottom:none;">
          <button id="bp-reset-filters-btn" class="bp-btn-reset">Reset All Filters</button>
        </div>
      </div>

      <!-- Settings View -->
      <div id="bp-settings-view" class="bp-drawer-body" style="display:none;">
        <div class="bp-section">
          <div class="bp-section-title">Badge Configuration</div>

          <div class="bp-switch-row">
            <label for="bp-sett-age">Show Age</label>
            <label class="bp-switch">
              <input type="checkbox" id="bp-sett-age" checked />
              <span class="bp-switch-slider"></span>
            </label>
          </div>
          <div class="bp-switch-row">
            <label for="bp-sett-cup-boobs">Show Cup & Boobs Status</label>
            <label class="bp-switch">
              <input type="checkbox" id="bp-sett-cup-boobs" checked />
              <span class="bp-switch-slider"></span>
            </label>
          </div>
          <div class="bp-switch-row">
            <label for="bp-sett-country">Show Nationality</label>
            <label class="bp-switch">
              <input type="checkbox" id="bp-sett-country" checked />
              <span class="bp-switch-slider"></span>
            </label>
          </div>
        </div>

        <!-- Import / Export Section -->
        <div class="bp-section">
          <div class="bp-section-title">Backup & Sync</div>
          <div style="display:flex; gap:8px;">
            <button id="bp-export-btn" class="bp-btn-reset" style="flex:1;">Export JSON</button>
            <button id="bp-import-btn" class="bp-btn-reset" style="flex:1;">Import JSON</button>
          </div>
          <input type="file" id="bp-import-file" accept=".json" style="display:none;" />
        </div>

        <div class="bp-section">
          <div class="bp-section-title">Database Utilities</div>
          <button id="bp-clear-profiles-btn" class="bp-btn-danger">Clear Cached Profiles</button>
          <button id="bp-clear-all-btn" class="bp-btn-danger" style="margin-top:8px;">Clear Everything & Reload</button>
        </div>
      </div>
    `;
    document.body.appendChild(filterDrawer);

    // Programmatically append header icons (Trusted Types safe)
    const settingsBtn = filterDrawer.querySelector('#bp-drawer-settings-toggle');
    if (settingsBtn) {
      settingsBtn.appendChild(icon('settings', 20));
      settingsBtn.setAttribute('aria-label', 'Settings');
    }
    
    const closeBtn = filterDrawer.querySelector('.bp-close-btn');
    if (closeBtn) {
      closeBtn.appendChild(icon('x', 20));
      closeBtn.setAttribute('aria-label', 'Close Panel');
    }

    statusLineEl = filterDrawer.querySelector('#bp-status-line');
  },

  setupEvents(onFilterChange: () => void): void {
    if (!filterFab || !filterDrawer || !backdrop) return;

    const openDrawer = () => {
      filterDrawer!.classList.add('open');
      filterFab!.classList.add('active');
      backdrop!.classList.add('active');
    };

    const closeAll = () => {
      filterDrawer?.classList.remove('open');
      filterFab?.classList.remove('active');
      backdrop?.classList.remove('active');
    };

    // Toggle Filter Drawer
    filterFab.addEventListener('click', () => {
      const isOpen = filterDrawer!.classList.contains('open');
      closeAll();
      if (!isOpen) openDrawer();
    });

    // Close on backdrop click
    backdrop.addEventListener('click', closeAll);

    // Close button
    filterDrawer.querySelector('.bp-close-btn')?.addEventListener('click', closeAll);

    // ── Drawer view toggling (Filters <=> Settings) ──
    const settingsToggle = document.getElementById('bp-drawer-settings-toggle');
    const filtersView = document.getElementById('bp-filters-view');
    const settingsView = document.getElementById('bp-settings-view');
    const drawerTitle = document.getElementById('bp-drawer-title');

    settingsToggle?.addEventListener('click', () => {
      const isSettingsVisible = settingsView?.style.display !== 'none';
      if (isSettingsVisible) {
        // Switch to Filters
        if (settingsView) settingsView.style.display = 'none';
        if (filtersView) filtersView.style.display = 'block';
        if (drawerTitle) drawerTitle.textContent = 'Babepedia Filter';
        settingsToggle.title = 'Settings';
        settingsToggle.setAttribute('aria-label', 'Settings');
        settingsToggle.textContent = '';
        settingsToggle.appendChild(icon('settings', 20));
      } else {
        // Switch to Settings
        if (settingsView) settingsView.style.display = 'block';
        if (filtersView) filtersView.style.display = 'none';
        if (drawerTitle) drawerTitle.textContent = 'Userscript Settings';
        settingsToggle.title = 'Back to Filters';
        settingsToggle.setAttribute('aria-label', 'Back to Filters');
        settingsToggle.textContent = '';
        settingsToggle.appendChild(icon('back', 20));
      }
    });

    // ── Sliders validation min/max boundaries ──
    [['bp-min-age', 'bp-max-age'], ['bp-min-height', 'bp-max-height']].forEach(([minId, maxId]) => {
      const minEl = document.getElementById(minId) as HTMLInputElement;
      const maxEl = document.getElementById(maxId) as HTMLInputElement;
      minEl?.addEventListener('input', () => { if (+minEl.value > +maxEl.value) maxEl.value = minEl.value; });
      maxEl?.addEventListener('input', () => { if (+maxEl.value < +minEl.value) minEl.value = maxEl.value; });
    });

    // Centralized filter state save function
    const commitFilters = (debounce = false) => {
      this.saveFiltersToCache(debounce);
      onFilterChange();
    };

    // ── Range sliders: instant feedback & debounced storage saves ──
    const rangeInputs = ['bp-min-age', 'bp-max-age', 'bp-min-height', 'bp-max-height', 'bp-min-rating'];
    rangeInputs.forEach((id) => {
      const el = document.getElementById(id);
      el?.addEventListener('input', () => {
        this.updateLabelBubbles();
        commitFilters(true);
      });
    });

    // ── Search: debounced 'input' event (fires while typing) ──
    const searchEl = document.getElementById('bp-search');
    searchEl?.addEventListener('input', () => {
      if (searchDebounce) clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        commitFilters(false);
      }, 200);
    });

    // ── Min Favorites: on change ──
    const favsEl = document.getElementById('bp-min-favs');
    favsEl?.addEventListener('change', () => {
      commitFilters(false);
    });

    // ── Segmented Buttons ──
    this.setupSegmented('#bp-boobs-segment', commitFilters);
    this.setupSegmented('#bp-profession-segment', commitFilters);

    // ── Badge toggles ──
    const badgeToggles = ['bp-sett-age', 'bp-sett-cup-boobs', 'bp-sett-country'];
    badgeToggles.forEach((id) => {
      document.getElementById(id)?.addEventListener('change', () => {
        const badgeSettings: BadgeSettings = {
          showAge: (document.getElementById('bp-sett-age') as HTMLInputElement).checked,
          showCupBoobs: (document.getElementById('bp-sett-cup-boobs') as HTMLInputElement).checked,
          showCountry: (document.getElementById('bp-sett-country') as HTMLInputElement).checked
        };
        Cache.setBadgeSettings(badgeSettings);
        onFilterChange();
      });
    });

    // ── Export JSON ──
    document.getElementById('bp-export-btn')?.addEventListener('click', () => {
      try {
        const jsonString = Cache.exportData();
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bpedia-filter-backup.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        alert('Failed to export data: ' + err);
      }
    });

    // ── Import JSON ──
    const importFileEl = document.getElementById('bp-import-file') as HTMLInputElement | null;
    document.getElementById('bp-import-btn')?.addEventListener('click', () => {
      importFileEl?.click();
    });

    importFileEl?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const MAX_BACKUP_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit
      if (file.size > MAX_BACKUP_SIZE_BYTES) {
        alert('Selected backup file is too large. Limit is 10 MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (Cache.importData(content)) {
          alert('Data imported successfully! Reloading page...');
          location.reload();
        } else {
          alert('Failed to import data. Please check if the file format is valid.');
        }
      };
      reader.readAsText(file);
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

  setupSegmented(selector: string, commitFilters: (debounce: boolean) => void): void {
    const btns = document.querySelectorAll(`${selector} .bp-segmented-btn`);
    btns.forEach((btn) => {
      btn.addEventListener('click', () => {
        btns.forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        commitFilters(false);
      });
    });
  },

  resetFilters(onFilterChange: () => void): void {
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
      btn.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
    });
    document.querySelectorAll('#bp-profession-segment .bp-segmented-btn').forEach((btn, i) => {
      btn.classList.toggle('active', i === 0);
      btn.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
    });

    // Clear all active tags
    document.querySelectorAll('.bp-tag-container .bp-tag.active').forEach((tag) => {
      tag.classList.remove('active');
      tag.setAttribute('aria-checked', 'false');
    });

    this.updateLabelBubbles();
    this.saveFiltersToCache(false);
    onFilterChange();
  },

  updateLabelBubbles(): void {
    const set = (lblId: string, text: string) => {
      const el = document.getElementById(lblId);
      if (el) el.textContent = text;
    };

    set('bp-lbl-min-age', getVal('bp-min-age'));
    set('bp-lbl-max-age', getVal('bp-max-age'));
    set('bp-lbl-min-height', `${getVal('bp-min-height')} cm`);
    set('bp-lbl-max-height', `${getVal('bp-max-height')} cm`);
    set('bp-lbl-min-rating', parseFloat(getVal('bp-min-rating')).toFixed(1));
  },

  applySettingsUI(): void {
    const f = Cache.getFilterSettings();
    const b = Cache.getBadgeSettings();

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
    setChk('bp-sett-age', b.showAge);
    setChk('bp-sett-cup-boobs', b.showCupBoobs);
    setChk('bp-sett-country', b.showCountry);

    this.updateLabelBubbles();
  },

  setSegmented(selector: string, activeVal: string): void {
    document.querySelectorAll(`${selector} .bp-segmented-btn`).forEach((btn) => {
      const isActive = btn.getAttribute('data-val') === activeVal;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
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
      const tag = document.createElement('button');
      tag.type = 'button';
      const isActive = activeList.includes(val);
      tag.className = `bp-tag ${isActive ? 'active' : ''}`;
      tag.textContent = val;
      tag.setAttribute('role', 'checkbox');
      tag.setAttribute('aria-checked', isActive ? 'true' : 'false');
      tag.addEventListener('click', () => {
        const nowActive = tag.classList.toggle('active');
        tag.setAttribute('aria-checked', nowActive ? 'true' : 'false');
        this.saveFiltersToCache(false);
        this.applyFiltersToPage(this._lastProfiles!);
      });
      container.appendChild(tag);
    });
  },

  // Store ref for tag click callbacks
  _lastProfiles: null as Map<string, PerformerProfile> | null,

  saveFiltersToCache(debounce = false): void {
    const activeBtn = (segId: string) =>
      document.querySelector(`${segId} .bp-segmented-btn.active`)?.getAttribute('data-val') || 'all';

    const settings: FilterSettings = {
      searchQuery: getVal('bp-search'),
      minAge: parseInt(getVal('bp-min-age'), 10) || 18,
      maxAge: parseInt(getVal('bp-max-age'), 10) || 70,
      minHeight: parseInt(getVal('bp-min-height'), 10) || 130,
      maxHeight: parseInt(getVal('bp-max-height'), 10) || 220,
      minRating: parseFloat(getVal('bp-min-rating')) || 0,
      minFavorites: parseInt(getVal('bp-min-favs'), 10) || 0,
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

    // Toggle badge CSS visibility flags once on parent container (Avoid thrashing)
    const thumbsContainer = document.getElementById('thumbs');
    if (thumbsContainer) {
      const hideAll = !badgeSettings.showAge && !badgeSettings.showCupBoobs && !badgeSettings.showCountry;
      thumbsContainer.classList.toggle('bp-hide-badges', hideAll);
      thumbsContainer.classList.toggle('bp-hide-age', !badgeSettings.showAge);
      thumbsContainer.classList.toggle('bp-hide-cup-boobs', !badgeSettings.showCupBoobs);
      thumbsContainer.classList.toggle('bp-hide-country', !badgeSettings.showCountry);
    }

    const thumbshots = document.querySelectorAll('.thumbshot');
    let matchCount = 0;
    let totalCount = 0;

    const nonSearchFilterActive = this.isNonSearchFilterActive(filters);
    
    // Hoist range check function
    const inRange = (val: number | null, min: number, max: number, active: boolean) =>
      !active || (val !== null && val >= min && val <= max);

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
        // If non-search filters are active, hide the card since we don't know if it matches yet
        if (nonSearchFilterActive) {
          el.style.display = 'none';
          return;
        }

        // Keep unscraped thumbnails visible until they are actually scraped and fail the criteria
        // Dim them slightly to indicate they are loading/unscraped
        el.style.opacity = '0.5';

        // Read performer name from attribute to avoid costly DOM scraping on every keystroke
        if (filters.searchQuery) {
          const cleanName = el.getAttribute('data-bp-name') || extractPerformerName(el, anchor);
          el.style.display = cleanName.toLowerCase().includes(filters.searchQuery.toLowerCase()) ? '' : 'none';
        } else {
          el.style.display = '';
        }
        if (el.style.display !== 'none') matchCount++;
        return;
      }

      // Reset opacity for scraped profiles
      el.style.opacity = '';

      // Render badges once (internally writes data-bp-badged to prevent DOM rebuild cycles)
      Badges.render(el, profile);

      // Apply filter conditions
      const q = filters.searchQuery.toLowerCase();
      const isPornstar = profile.personal.professions.some(p => p.includes('porn star') || p.includes('pornstar'));
      const allActs = [
        ...profile.performances.solo,
        ...profile.performances.girlGirl,
        ...profile.performances.boyGirl
      ];

      const matches = !!(
        (!q || profile.name.toLowerCase().includes(q)) &&
        (filters.professionFilter === 'all' || (filters.professionFilter === 'pornstar' ? isPornstar : !isPornstar)) &&
        inRange(profile.personal.age, filters.minAge, filters.maxAge, filters.minAge > 18 || filters.maxAge < 70) &&
        inRange(profile.body.heightCm, filters.minHeight, filters.maxHeight, filters.minHeight > 130 || filters.maxHeight < 220) &&
        (filters.minRating === 0 || (profile.rating.score !== null && profile.rating.score >= filters.minRating)) &&
        (filters.minFavorites === 0 || (profile.rating.favorites !== null && profile.rating.favorites >= filters.minFavorites)) &&
        (filters.boobs === 'all' || profile.body.boobs === (filters.boobs === 'natural' ? 'Natural' : 'Implants')) &&
        (!filters.ethnicities.length || (!!profile.personal.ethnicity && filters.ethnicities.includes(profile.personal.ethnicity))) &&
        (!filters.hairColors.length || (!!profile.body.hairColor && filters.hairColors.includes(profile.body.hairColor))) &&
        (!filters.eyeColors.length || (!!profile.body.eyeColor && filters.eyeColors.includes(profile.body.eyeColor))) &&
        (!filters.cupSizes.length || (!!profile.body.cup && filters.cupSizes.includes(profile.body.cup))) &&
        (!filters.performances.length || filters.performances.every(act => allActs.includes(act)))
      );

      el.style.display = matches ? '' : 'none';
      if (matches) matchCount++;
    });

    // Update status line
    this.updateStatusLine(matchCount, totalCount, filters);

    // Update FAB badge to display active filters count
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
    return [
      !!f.searchQuery, f.minAge > 18 || f.maxAge < 70, f.minHeight > 130 || f.maxHeight < 220,
      f.minRating > 0, f.minFavorites > 0, f.boobs !== 'all', f.professionFilter !== 'all',
      f.ethnicities.length > 0, f.hairColors.length > 0, f.eyeColors.length > 0,
      f.cupSizes.length > 0, f.performances.length > 0
    ].filter(Boolean).length;
  },

  isFiltering(f: FilterSettings): boolean {
    return this.getActiveFiltersCount(f) > 0;
  },

  isNonSearchFilterActive(f: FilterSettings): boolean {
    return this.getActiveFiltersCount(f) - (f.searchQuery ? 1 : 0) > 0;
  }
};

let container: HTMLDivElement | null = null;
let bar: HTMLDivElement | null = null;
let fadeTimeout: ReturnType<typeof setTimeout> | null = null;
let cachedTitleEl: HTMLElement | null = null;

export const ProgressBar = {
  init(): void {
    if (document.getElementById('bp-progress-bar-container')) return;

    container = document.createElement('div');
    container.id = 'bp-progress-bar-container';
    container.setAttribute('role', 'progressbar');
    container.setAttribute('aria-valuemin', '0');
    container.setAttribute('aria-valuemax', '100');
    container.setAttribute('aria-valuenow', '0');

    bar = document.createElement('div');
    bar.id = 'bp-progress-bar';
    container.appendChild(bar);

    document.body.appendChild(container);
    cachedTitleEl = null;
  },

  show(): void {
    if (fadeTimeout) clearTimeout(fadeTimeout);
    this.init();
    container?.classList.add('active');
  },

  update(current: number, total: number): void {
    this.show();
    if (!bar) return;

    const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
    bar.style.width = `${percent}%`;
    container?.setAttribute('aria-valuenow', String(percent));
    container?.setAttribute('aria-valuetext', `Scraping progress: ${percent}%`);

    // Only target the filter drawer title, not the settings drawer, and only if settings view is not active
    const settingsView = document.getElementById('bp-settings-view');
    const isSettingsVisible = settingsView && settingsView.style.display !== 'none';
    if (!cachedTitleEl) {
      cachedTitleEl = document.querySelector('#bp-filter-drawer .bp-drawer-header h3');
    }
    if (cachedTitleEl && !isSettingsVisible) {
      cachedTitleEl.textContent = percent < 100
        ? `Scraping (${current}/${total})`
        : 'Babepedia Filter';
    }

    if (percent >= 100) this.hide();
  },

  hide(): void {
    if (fadeTimeout) clearTimeout(fadeTimeout);
    fadeTimeout = setTimeout(() => {
      container?.classList.remove('active');
      if (bar) bar.style.width = '0%';
      const settingsView = document.getElementById('bp-settings-view');
      const isSettingsVisible = settingsView && settingsView.style.display !== 'none';
      if (!cachedTitleEl) {
        cachedTitleEl = document.querySelector('#bp-filter-drawer .bp-drawer-header h3');
      }
      if (cachedTitleEl && !isSettingsVisible) cachedTitleEl.textContent = 'Babepedia Filter';
    }, 1000);
  }
};

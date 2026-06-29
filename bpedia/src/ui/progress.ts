let container: HTMLDivElement | null = null;
let bar: HTMLDivElement | null = null;
let fadeTimeout: ReturnType<typeof setTimeout> | null = null;

export const ProgressBar = {
  init(): void {
    if (document.getElementById('bp-progress-bar-container')) return;

    container = document.createElement('div');
    container.id = 'bp-progress-bar-container';

    bar = document.createElement('div');
    bar.id = 'bp-progress-bar';
    container.appendChild(bar);

    document.body.appendChild(container);
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

    // Only target the filter drawer title, not the settings drawer
    const filterTitle = document.querySelector('#bp-filter-drawer .bp-drawer-header h3');
    if (filterTitle) {
      filterTitle.textContent = percent < 100
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
      const filterTitle = document.querySelector('#bp-filter-drawer .bp-drawer-header h3');
      if (filterTitle) filterTitle.textContent = 'Babepedia Filter';
    }, 1000);
  }
};

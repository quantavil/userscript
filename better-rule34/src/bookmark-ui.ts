import {
  clearAllSectors,
  clearAllVideos,
  deleteSector,
  deleteVideo,
  exportArchiveJson,
  findSector,
  formatSectorTitleFromUrl,
  getSectors,
  getTotalBookmarkCount,
  getVideos,
  importArchiveJson,
  isVideoSaved,
  saveSector,
  saveVideo,
  type SectorBookmark,
  type VideoBookmark,
} from './bookmark';
import { extractCardData } from './parse';

const RIBBON_SVG = `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M4 2h8v12l-4-3-4 3z"/></svg>`;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Shows a sleek, lightweight Brutalist cyber-toast at bottom center. */
export function showToast(message: string): void {
  let toast = document.querySelector<HTMLElement>('.br34-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'br34-toast';
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.classList.add('visible');

  window.clearTimeout((toast as unknown as { _timer?: number })._timer);
  (toast as unknown as { _timer?: number })._timer = window.setTimeout(() => {
    toast?.classList.remove('visible');
  }, 2200);
}

export interface BookmarkButtonOptions {
  fab: HTMLElement;
  listKey: string;
  getPage: () => number;
  getUrl: () => string;
}

export interface BookmarkHandle {
  cleanup: () => void;
  refresh: () => void;
}

export class ArchiveModal {
  private modal: HTMLElement;
  private activeTab: 'sectors' | 'videos' = 'sectors';
  private isOpen = false;
  private videoSearchQuery = '';
  private getPage: () => number;
  private getUrl: () => string;
  private getListKey: () => string;
  private onDataChanged?: () => void;

  constructor(opts: {
    getPage: () => number;
    getUrl: () => string;
    getListKey: () => string;
    onDataChanged?: () => void;
  }) {
    this.getPage = opts.getPage;
    this.getUrl = opts.getUrl;
    this.getListKey = opts.getListKey;
    this.onDataChanged = opts.onDataChanged;
    this.modal = this.buildModal();
    document.body.append(this.modal);
    this.bindEvents();
  }

  public toggle(open?: boolean): void {
    this.isOpen = open !== undefined ? open : !this.isOpen;
    this.modal.classList.toggle('open', this.isOpen);
    if (this.isOpen) {
      this.render();
    }
  }

  public getIsOpen(): boolean {
    return this.isOpen;
  }

  private buildModal(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'br34-archive-modal';
    el.innerHTML = `
      <div class="br34-panel-header">
        <div class="br34-title-row">
          <span class="br34-title">[ EROS // ARCHIVE ]</span>
          <span class="br34-title-sub" id="br34-archive-counter">INDEX: 0 UNITS</span>
        </div>
        <button type="button" class="br34-panel-close" id="br34-archive-close" title="Close" aria-label="Close">[ X ]</button>
      </div>

      <div class="br34-archive-tabs">
        <button type="button" class="br34-archive-tab active" data-tab="sectors">SECTORS (0)</button>
        <button type="button" class="br34-archive-tab" data-tab="videos">SAVED VIDEOS (0)</button>
      </div>

      <div class="br34-archive-body" id="br34-archive-body">
        <!-- Rendered dynamically -->
      </div>

      <div class="br34-archive-footer">
        <button type="button" class="br34-archive-action-btn" id="br34-archive-export">EXPORT JSON</button>
        <button type="button" class="br34-archive-action-btn" id="br34-archive-import">IMPORT JSON</button>
        <button type="button" class="br34-archive-action-btn danger" id="br34-archive-clear">CLEAR TAB</button>
        <input type="file" id="br34-archive-file-input" accept=".json,application/json" style="display:none;" />
      </div>
    `;
    return el;
  }

  private bindEvents(): void {
    // Close button
    this.modal.querySelector('#br34-archive-close')?.addEventListener('click', () => {
      this.toggle(false);
    });

    // Tab buttons
    const tabBtns = this.modal.querySelectorAll<HTMLButtonElement>('.br34-archive-tab');
    for (const btn of tabBtns) {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab as 'sectors' | 'videos';
        if (tab && tab !== this.activeTab) {
          this.activeTab = tab;
          for (const b of tabBtns) {
            b.classList.toggle('active', b.dataset.tab === tab);
          }
          this.render();
        }
      });
    }

    // Export button
    this.modal.querySelector('#br34-archive-export')?.addEventListener('click', () => {
      const json = exportArchiveJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eros-archive-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('[ ARCHIVE EXPORTED ]');
    });

    // Import button
    const fileInput = this.modal.querySelector<HTMLInputElement>('#br34-archive-file-input');
    this.modal.querySelector('#br34-archive-import')?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = String(e.target?.result || '');
        const res = importArchiveJson(content);
        if (res.success) {
          showToast(`[ IMPORTED: ${res.sectorsAdded} SECTORS, ${res.videosAdded} VIDEOS ]`);
          this.render();
          this.onDataChanged?.();
        } else {
          showToast('[ ERROR: INVALID ARCHIVE JSON ]');
        }
      };
      reader.readAsText(file);
      fileInput.value = '';
    });

    // Clear Tab button
    this.modal.querySelector('#br34-archive-clear')?.addEventListener('click', () => {
      if (this.activeTab === 'sectors') {
        clearAllSectors();
        showToast('[ ALL SECTORS CLEARED ]');
      } else {
        clearAllVideos();
        showToast('[ ALL SAVED VIDEOS CLEARED ]');
      }
      this.render();
      this.onDataChanged?.();
    });
  }

  public render(): void {
    const sectors = getSectors();
    const videos = getVideos();
    const total = sectors.length + videos.length;

    // Update counter and tab labels
    const counter = this.modal.querySelector('#br34-archive-counter');
    if (counter) counter.textContent = `INDEX: ${total} UNITS`;

    const sectorsTab = this.modal.querySelector('[data-tab="sectors"]');
    if (sectorsTab) sectorsTab.textContent = `SECTORS (${sectors.length})`;

    const videosTab = this.modal.querySelector('[data-tab="videos"]');
    if (videosTab) videosTab.textContent = `SAVED VIDEOS (${videos.length})`;

    const body = this.modal.querySelector('#br34-archive-body');
    if (!body) return;

    if (this.activeTab === 'sectors') {
      this.renderSectors(body, sectors);
    } else {
      this.renderVideos(body, videos);
    }
  }

  private renderSectors(container: Element, sectors: SectorBookmark[]): void {
    const curPage = this.getPage();
    const curUrl = this.getUrl();
    const listKey = this.getListKey();
    const isCurrentSaved = Boolean(findSector(listKey, curPage));

    let html = `
      <div class="br34-archive-toolbar">
        <button type="button" class="br34-btn-mark-sector ${isCurrentSaved ? 'saved' : ''}" id="br34-mark-sector-btn">
          ${isCurrentSaved ? `[ ✓ SECTOR P.${curPage} SAVED (CLICK TO REMOVE) ]` : `[ + BOOKMARK CURRENT SECTOR // P.${curPage} ]`}
        </button>
      </div>
    `;

    if (sectors.length === 0) {
      html += `
        <div class="br34-archive-empty">
          <div class="br34-archive-empty-title">[ NO SECTORS ARCHIVED ]</div>
          <div class="br34-archive-empty-sub">Browse any catalog, tag, or search and click '+ Bookmark Current Sector'.</div>
        </div>
      `;
    } else {
      html += `<div class="br34-archive-list">`;
      for (const s of sectors) {
        const isThisCurrent = s.listKey === listKey && s.page === curPage;
        html += `
          <div class="br34-archive-item ${isThisCurrent ? 'is-current' : ''}">
            <div class="br34-archive-item-main">
              <div class="br34-archive-item-title">${escapeHtml(s.title || 'SECTOR')}</div>
              <div class="br34-archive-item-meta">
                <span class="br34-tag-page">PAGE ${s.page}</span>
                <span class="br34-tag-date">${new Date(s.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div class="br34-archive-item-actions">
              <a href="${escapeHtml(s.url)}" class="br34-btn-jump" title="Jump to page depth">[ JUMP ]</a>
              <button type="button" class="br34-btn-del" data-del-sector="${escapeHtml(s.id)}" title="Delete sector" aria-label="Delete sector">[ ✕ ]</button>
            </div>
          </div>
        `;
      }
      html += `</div>`;
    }

    container.innerHTML = html;

    // Bind current sector toggle button
    container.querySelector('#br34-mark-sector-btn')?.addEventListener('click', () => {
      const existing = findSector(listKey, curPage);
      if (existing) {
        deleteSector(existing.id);
        showToast(`[ REMOVED SECTOR // P.${curPage} ]`);
      } else {
        saveSector({
          listKey,
          title: formatSectorTitleFromUrl(curUrl),
          url: curUrl,
          page: curPage,
        });
        showToast(`[ SAVED SECTOR // P.${curPage} ]`);
      }
      this.render();
      this.onDataChanged?.();
    });

    // Bind delete buttons
    const delBtns = container.querySelectorAll<HTMLButtonElement>('[data-del-sector]');
    for (const btn of delBtns) {
      btn.addEventListener('click', () => {
        const id = btn.dataset.delSector;
        if (id) {
          deleteSector(id);
          this.render();
          this.onDataChanged?.();
        }
      });
    }
  }

  private renderVideos(container: Element, videos: VideoBookmark[]): void {
    const filtered = this.videoSearchQuery.trim()
      ? videos.filter((v) => v.title.toLowerCase().includes(this.videoSearchQuery.toLowerCase()))
      : videos;

    let html = `
      <div class="br34-archive-toolbar">
        <input type="text" class="br34-search-input" id="br34-archive-video-search" placeholder="SEARCH SAVED VIDEOS..." value="${escapeHtml(this.videoSearchQuery)}" />
      </div>
    `;

    if (videos.length === 0) {
      html += `
        <div class="br34-archive-empty">
          <div class="br34-archive-empty-title">[ ARCHIVE EMPTY ]</div>
          <div class="br34-archive-empty-sub">Hover any video thumbnail and click the ribbon icon to save videos for later.</div>
        </div>
      `;
    } else if (filtered.length === 0) {
      html += `
        <div class="br34-archive-empty">
          <div class="br34-archive-empty-title">[ NO MATCHING VIDEOS ]</div>
        </div>
      `;
    } else {
      html += `<div class="br34-video-archive-list">`;
      for (const v of filtered) {
        html += `
          <div class="br34-video-archive-card">
            ${
              v.thumbUrl
                ? `<div class="br34-video-archive-thumb-wrap">
                    <img class="br34-video-archive-thumb" src="${escapeHtml(v.thumbUrl)}" alt="" loading="lazy" />
                    ${v.durationFormatted ? `<span class="br34-video-archive-dur">${escapeHtml(v.durationFormatted)}</span>` : ''}
                   </div>`
                : ''
            }
            <div class="br34-video-archive-info">
              <a href="${escapeHtml(v.url)}" target="_blank" rel="noopener" class="br34-video-archive-title">${escapeHtml(v.title || 'Untitled Video')}</a>
              <div class="br34-video-archive-meta">
                ${v.ratingPercent > 0 ? `<span class="br34-video-archive-rating">${v.ratingPercent}%</span>` : ''}
                ${v.viewsFormatted ? `<span class="br34-video-archive-views">${escapeHtml(v.viewsFormatted)}</span>` : ''}
              </div>
            </div>
            <div class="br34-video-archive-actions">
              <a href="${escapeHtml(v.url)}" target="_blank" rel="noopener" class="br34-btn-jump">[ WATCH ]</a>
              <button type="button" class="br34-btn-del" data-del-video="${escapeHtml(v.id)}" title="Remove" aria-label="Remove">[ ✕ ]</button>
            </div>
          </div>
        `;
      }
      html += `</div>`;
    }

    container.innerHTML = html;

    // Search input
    const searchInput = container.querySelector<HTMLInputElement>('#br34-archive-video-search');
    searchInput?.addEventListener('input', () => {
      this.videoSearchQuery = searchInput.value;
      this.render();
    });

    // Delete buttons
    const delBtns = container.querySelectorAll<HTMLButtonElement>('[data-del-video]');
    for (const btn of delBtns) {
      btn.addEventListener('click', () => {
        const id = btn.dataset.delVideo;
        if (id) {
          deleteVideo(id);
          this.render();
          this.onDataChanged?.();
        }
      });
    }
  }

  public destroy(): void {
    this.modal.remove();
  }
}

/**
 * Injects a discreet bookmark ribbon onto video card thumbnails.
 * Clicking toggles the video into the Watch Later / Saved Videos archive.
 */
export function attachCardBookmarkButtons(cards: HTMLElement[], onUpdate?: () => void): void {
  for (const card of cards) {
    if (card.dataset.br34BmWired === 'true') continue;
    card.dataset.br34BmWired = 'true';

    const wrap = card.querySelector<HTMLElement>('.wrap_image, .img.wrap_image');
    if (!wrap) continue;

    const data = extractCardData(card);
    if (!data || !data.id) continue;

    const ribbon = document.createElement('button');
    ribbon.type = 'button';
    ribbon.className = `br34-card-bookmark ${isVideoSaved(data.id) ? 'saved' : ''}`;
    ribbon.title = isVideoSaved(data.id) ? 'Saved in Archive (Click to remove)' : 'Save to Archive';
    ribbon.setAttribute('aria-label', ribbon.title);
    ribbon.innerHTML = RIBBON_SVG;

    ribbon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const currentlySaved = isVideoSaved(data.id);
      if (currentlySaved) {
        deleteVideo(data.id);
        ribbon.classList.remove('saved');
        ribbon.title = 'Save to Archive';
        ribbon.setAttribute('aria-label', ribbon.title);
        showToast('[ REMOVED FROM ARCHIVE ]');
      } else {
        saveVideo({
          id: data.id,
          title: data.title,
          url: data.url,
          thumbUrl: data.thumbUrl,
          durationFormatted: data.durationFormatted,
          ratingPercent: data.ratingPercent,
          viewsFormatted: data.viewsFormatted,
        });
        ribbon.classList.add('saved');
        ribbon.title = 'Saved in Archive (Click to remove)';
        ribbon.setAttribute('aria-label', ribbon.title);
        showToast('[ SAVED TO ARCHIVE ]');
      }
      onUpdate?.();
    });

    wrap.append(ribbon);
  }
}

/**
 * Mounts the upgraded Archive button docked with the CTRL fab.
 * Clicking opens the EROS Cyber-Archive Console.
 */
export function mountBookmarkButton(opts: BookmarkButtonOptions): BookmarkHandle {
  let dock = document.querySelector<HTMLElement>('.br34-dock');
  if (!dock) {
    dock = document.createElement('div');
    dock.className = 'br34-dock';
    document.body.append(dock);
  }
  dock.append(opts.fab);

  let btn = dock.querySelector<HTMLButtonElement>('.br34-bookmark-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'br34-bookmark-btn';
    btn.innerHTML = `${RIBBON_SVG}<span class="br34-bookmark-badge">0</span>`;
    dock.prepend(btn);
  }
  const button = btn;

  const modal = new ArchiveModal({
    getPage: opts.getPage,
    getUrl: opts.getUrl,
    getListKey: () => opts.listKey,
    onDataChanged: () => {
      updateBadge();
    },
  });

  const updateBadge = () => {
    const count = getTotalBookmarkCount();
    const isCurrentSectorSaved = Boolean(findSector(opts.listKey, opts.getPage()));
    button.classList.toggle('saved', isCurrentSectorSaved || count > 0);

    let badge = button.querySelector<HTMLElement>('.br34-bookmark-badge');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'br34-bookmark-badge';
        button.append(badge);
      }
      badge.textContent = String(count);
    } else {
      badge?.remove();
    }

    button.title = `EROS Archive (${count} saved items) — Click to open`;
    button.setAttribute('aria-label', button.title);
  };

  updateBadge();

  if (button.dataset.br34Wired !== 'true') {
    button.dataset.br34Wired = 'true';
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      modal.toggle();
    });
  }

  // Close modal when clicking outside
  const outsideClickListener = (e: MouseEvent) => {
    if (
      modal.getIsOpen() &&
      !modal['modal'].contains(e.target as Node) &&
      !button.contains(e.target as Node)
    ) {
      modal.toggle(false);
    }
  };
  document.addEventListener('click', outsideClickListener);

  return {
    cleanup: () => {
      document.removeEventListener('click', outsideClickListener);
      modal.destroy();
      button.remove();
    },
    refresh: () => {
      updateBadge();
      if (modal.getIsOpen()) modal.render();
    },
  };
}

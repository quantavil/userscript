import { GM_download, GM_xmlhttpRequest } from '$';
import { loadMeta, esc } from './api';
import { type FullMeta } from './cache';

export interface SidebarElements {
  panel: HTMLElement;
  empty: HTMLElement;
  content: HTMLElement;
  imgwrap: HTMLElement;
  img: HTMLImageElement;
  res: HTMLElement;
  fav: HTMLElement;
  size: HTMLElement;
  dl: HTMLButtonElement;
  favBtn: HTMLButtonElement;
  openBtn: HTMLButtonElement;
  prevBtn: HTMLButtonElement;
  nextBtn: HTMLButtonElement;
  metaLoading: HTMLElement;
  metaList: HTMLElement;
  tags: HTMLElement;
}

export function dlFile(url: string, name: string) {
  if (typeof GM_download === 'function') {
    GM_download({ url, name });
  } else {
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      responseType: 'blob',
      onload(r) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(r.response);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(a.href);
          a.remove();
        }, 100);
      }
    });
  }
}

export function createSidebar(initialWidth: number): SidebarElements {
  const panel = document.createElement('aside');
  panel.id = 'whPanel';
  panel.style.width = `${initialWidth}px`;
  
  panel.innerHTML = `
    <div class="whp-header">Wallpaper Details</div>
    <div class="whp-body">
      <div class="whp-empty">Click a thumbnail to see details here.</div>
      <div class="whp-content" style="display:none">
        <div class="whp-imgwrap">
          <img class="whp-img">
          <div class="whp-imghint">Click for full size</div>
        </div>
        <div class="whp-stats">
          <span class="whp-res"></span>
          <span class="whp-fav"></span>
          <span class="whp-size">…</span>
        </div>
        <div class="whp-actions">
          <button class="whp-btn whp-dl" disabled>⬇ Download</button>
          <button class="whp-btn whp-fav-btn">☆ Favorite</button>
        </div>
        <div class="whp-nav">
          <button class="whp-btn whp-prev">← Prev</button>
          <button class="whp-btn whp-open">↗ Open Page</button>
          <button class="whp-btn whp-next">Next →</button>
        </div>
        
        <div class="sidebar-section" style="border-top: 1px solid #2a2c30; padding-top: 10px; margin-top: 15px;">
          <h2>Properties</h2>
          <div class="whp-meta-loading">Loading details…</div>
          <dl class="whp-meta-list" style="display:none"></dl>
        </div>
        <div class="sidebar-section" style="border-top: 1px solid #2a2c30; padding-top: 10px; margin-top: 15px;">
          <h2>Tags</h2>
          <ul id="tags" class="whp-tags"></ul>
        </div>
      </div>
    </div>
  `;
  
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'whp-resize-handle';
  panel.appendChild(resizeHandle);
  
  document.body.appendChild(panel);
  
  const main = document.getElementById('main');
  if (main) {
    main.style.marginRight = `${initialWidth}px`;
  }
  
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  
  resizeHandle.addEventListener('mousedown', e => {
    isResizing = true;
    startX = e.clientX;
    startWidth = parseInt(document.defaultView?.getComputedStyle(panel).width || `${initialWidth}`, 10);
    resizeHandle.classList.add('active');
    
    const handleMouseMove = (me: MouseEvent) => {
      if (!isResizing) return;
      const dx = startX - me.clientX;
      let newWidth = startWidth + dx;
      if (newWidth < 250) newWidth = 250;
      if (newWidth > window.innerWidth - 100) newWidth = window.innerWidth - 100;
      
      panel.style.width = `${newWidth}px`;
      const m = document.getElementById('main');
      if (m) {
        m.style.marginRight = `${newWidth}px`;
      }
      localStorage.setItem('whPanelWidth', String(newWidth));
    };
    
    const handleMouseUp = () => {
      isResizing = false;
      resizeHandle.classList.remove('active');
      document.documentElement.removeEventListener('mousemove', handleMouseMove);
      document.documentElement.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.documentElement.addEventListener('mousemove', handleMouseMove);
    document.documentElement.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  });
  
  return {
    panel,
    empty: panel.querySelector('.whp-empty')!,
    content: panel.querySelector('.whp-content')!,
    imgwrap: panel.querySelector('.whp-imgwrap')!,
    img: panel.querySelector('.whp-img')!,
    res: panel.querySelector('.whp-res')!,
    fav: panel.querySelector('.whp-fav')!,
    size: panel.querySelector('.whp-size')!,
    dl: panel.querySelector('.whp-dl')!,
    favBtn: panel.querySelector('.whp-fav-btn')!,
    openBtn: panel.querySelector('.whp-open')!,
    prevBtn: panel.querySelector('.whp-prev')!,
    nextBtn: panel.querySelector('.whp-next')!,
    metaLoading: panel.querySelector('.whp-meta-loading')!,
    metaList: panel.querySelector('.whp-meta-list')!,
    tags: panel.querySelector('.whp-tags')!,
  };
}

export function syncFavButton(thumb: HTMLElement, favBtn: HTMLButtonElement) {
  const favEl = thumb.querySelector('.thumb-btn-fav');
  const isFav = !!(favEl && (favEl.classList.contains('active') || favEl.classList.contains('favorited')));
  favBtn.classList.toggle('whp-fav-active', isFav);
  favBtn.textContent = isFav ? '★ Favorited' : '☆ Favorite';
}

export function updateSidebarDetails(
  thumb: HTMLElement,
  els: SidebarElements,
  onMetaLoaded: (meta: FullMeta | null) => void
) {
  const id = thumb.getAttribute('data-wallpaper-id') || '';
  els.empty.style.display = 'none';
  els.content.style.display = '';

  const resEl = thumb.querySelector('.thumb-info .wall-res');
  const favEl = thumb.querySelector('.thumb-info .wall-favs');
  
  els.res.textContent = resEl ? resEl.textContent?.trim() || '' : '';
  els.fav.textContent = favEl ? '★ ' + favEl.textContent?.replace(/[^\d]/g, '').trim() : '★ 0';
  els.size.textContent = '…';
  
  const thumbImg = thumb.querySelector('img.lazyload') as HTMLImageElement;
  els.img.src = (thumbImg && (thumbImg.currentSrc || thumbImg.src)) || (thumbImg && thumbImg.dataset.src) || '';

  els.dl.disabled = true;
  els.dl.textContent = '⬇ Download';
  els.metaLoading.style.display = '';
  els.metaList.style.display = 'none';
  els.tags.innerHTML = '';

  syncFavButton(thumb, els.favBtn);

  loadMeta(id, meta => {
    if (thumb.classList.contains('wh-selected')) {
      if (meta) {
        els.dl.disabled = false;
        els.size.textContent = meta.size;
        els.metaLoading.style.display = 'none';
        els.metaList.style.display = '';
        els.metaList.innerHTML = meta.properties
          .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`)
          .join('');
        els.tags.innerHTML = meta.tagsHtml;
        onMetaLoaded(meta);
      } else {
        els.metaLoading.textContent = 'Could not load extra details.';
        els.dl.textContent = '⬇ Unavailable';
        onMetaLoaded(null);
      }
    }
  });
}

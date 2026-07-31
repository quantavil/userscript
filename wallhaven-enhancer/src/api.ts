import { GM_xmlhttpRequest } from '$';
import { C, metaCache, type FullMeta } from './cache';

// Helper to escape HTML characters
export function esc(s: any): string {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c as any]));
}

// Convert relative URLs to absolute so links work on any listing page
export function makeAbsolute(html: string): string {
  return html.replace(/(href|src)="\/(?!\/)/g, '$1="https://wallhaven.cc/');
}

// Fetch wallpaper metadata by scraping its details page
export function loadMeta(id: string, cb?: (meta: FullMeta | null) => void): void {
  if (metaCache.has(id)) {
    const data = metaCache.get(id);
    if (cb) cb(data || null);
    return;
  }

  GM_xmlhttpRequest({
    method: 'GET',
    url: `https://wallhaven.cc/w/${id}`,
    onload(r) {
      if (r.status < 200 || r.status >= 400) {
        metaCache.set(id, null);
        if (cb) cb(null);
        return;
      }

      let meta: FullMeta | null = null;
      try {
        const doc = new DOMParser().parseFromString(r.responseText, 'text/html');
        const wallImg = doc.getElementById('wallpaper');
        const fullUrl = wallImg ? wallImg.getAttribute('src') : '';

        const propDl = doc.querySelector('.sidebar-section[data-storage-id="showcase-info"] > dl');
        let sizeText = '';
        const properties: [string, string][] = [];

        if (propDl) {
          propDl.querySelectorAll(':scope > dt').forEach(dt => {
            const key = dt.textContent?.trim() || '';
            const dd = dt.nextElementSibling;
            if (!dd) return;

            if (key === 'Size') {
              sizeText = dd.textContent?.trim().split('-')[0].trim() || ''; // e.g. "4.5 MiB"
            }
            // Exclude Size (shown on top), Favorites (shown on top), and Link (redundant url box)
            if (key !== 'Size' && key !== 'Favorites' && key !== 'Link') {
              properties.push([key, makeAbsolute(dd.innerHTML)]);
            }
          });
        }

        const tagsList = doc.querySelector('#tags');
        const tagsHtml = tagsList ? makeAbsolute(tagsList.innerHTML) : '';

        if (fullUrl) {
          meta = {
            url: fullUrl,
            size: sizeText,
            properties,
            tagsHtml
          };
          // Cache URL & size persistent
          C.set(id, { url: fullUrl, sizeString: sizeText });
        }
      } catch (err) {
        console.error('Wallhaven Enhancer details parse error:', err);
        meta = null;
      }

      metaCache.set(id, meta);
      if (cb) cb(meta);
    },
    onerror() {
      metaCache.set(id, null);
      if (cb) cb(null);
    }
  });
}

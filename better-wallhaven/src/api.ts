import { GM_xmlhttpRequest } from '$';
import { C, fmtSz, metaCache, type FullMeta } from './cache';

// Helper to escape HTML characters
export function esc(s: unknown): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  return String(s).replace(/[&<>"]/g, c => map[c] ?? c);
}

// Convert relative URLs to absolute so links work on any listing page
export function makeAbsolute(html: string): string {
  return html.replace(/(href|src)="\/(?!\/)/g, '$1="https://wallhaven.cc/');
}

// Explicit full-details fetch (~4KB JSON). Called ONLY from an explicit
// user action (HD button / lightbox / download). Selection alone costs 0 bytes.
export function loadMeta(id: string, cb?: (meta: FullMeta | null) => void): void {
  if (metaCache.has(id)) {
    const data = metaCache.get(id);
    if (data) {
      if (cb) cb(data);
      return;
    }
    // Previous attempt failed — explicit retry gets a fresh request.
    metaCache.delete(id);
  }

  GM_xmlhttpRequest({
    method: 'GET',
    url: `https://wallhaven.cc/api/v1/w/${id}`,
    onload(r) {
      if (r.status < 200 || r.status >= 400) {
        loadMetaHtml(id, cb);
        return;
      }
      try {
        const meta = parseApiMeta(JSON.parse(r.responseText));
        if (meta) {
          C.set(id, { url: meta.url, sizeString: meta.size });
          metaCache.set(id, meta);
          if (cb) cb(meta);
          return;
        }
      } catch (err) {
        console.error('Better Wallhaven API parse error:', err);
      }
      loadMetaHtml(id, cb);
    },
    onerror() {
      loadMetaHtml(id, cb);
    }
  });
}

// Pure helper (unit-testable): map wallhaven API v1 JSON -> FullMeta
interface ApiTag {
  id?: unknown;
  name?: unknown;
}

interface ApiData {
  path?: unknown;
  file_size?: unknown;
  file_type?: unknown;
  resolution?: unknown;
  ratio?: unknown;
  views?: unknown;
  favorites?: unknown;
  category?: unknown;
  purity?: unknown;
  created_at?: unknown;
  source?: unknown;
  colors?: unknown;
  uploader?: unknown;
  tags?: unknown;
}

function str(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === 'number' ? v : null;
}

export function parseApiMeta(json: unknown): FullMeta | null {
  if (typeof json !== 'object' || json === null || !('data' in json)) return null;
  const d = (json as { data?: unknown }).data;
  if (typeof d !== 'object' || d === null) return null;
  const r = d as ApiData;

  const url = str(r.path);
  if (!url) return null;

  const properties: [string, string][] = [];
  const uploader = typeof r.uploader === 'object' && r.uploader !== null
    ? str((r.uploader as { username?: unknown }).username)
    : null;
  if (uploader) properties.push(['Uploader', esc(uploader)]);
  const category = str(r.category);
  if (category) properties.push(['Category', esc(cap(category))]);
  const purity = str(r.purity);
  if (purity) properties.push(['Purity', esc(purityLabel(purity))]);
  const resolution = str(r.resolution);
  if (resolution) properties.push(['Resolution', esc(resolution)]);
  const ratio = str(r.ratio);
  if (ratio) properties.push(['Ratio', esc(ratio)]);
  const fileType = str(r.file_type);
  if (fileType) properties.push(['Type', esc(fileLabel(fileType.replace('image/', '')))]);
  const views = num(r.views);
  if (views !== null) properties.push(['Views', esc(String(views))]);
  const favorites = num(r.favorites);
  if (favorites !== null) properties.push(['Favorites', esc(String(favorites))]);
  const created = str(r.created_at);
  if (created) properties.push(['Uploaded', esc(created)]);
  if (Array.isArray(r.colors)) {
    const chips = r.colors.filter((c): c is string => typeof c === 'string');
    if (chips.length > 0) {
      properties.push(['Colors', chips.map((c: string) => `<span class="wh-swatch" style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${esc(c)};margin-right:4px;vertical-align:-1px"></span>${esc(c)}`).join(' · ')]);
    }
  }
  const source = str(r.source);
  if (source) properties.push(['Source', `<a href="${esc(source)}" target="_blank">link</a>`]);
  const tagsHtml = Array.isArray(r.tags)
    ? r.tags.flatMap((t: unknown) => {
        if (typeof t !== 'object' || t === null) return [];
        const tag = t as ApiTag;
        const name = str(tag.name);
        if (!name) return [];
        const tid = typeof tag.id === 'string' || typeof tag.id === 'number' ? String(tag.id) : 'x';
        return [`<li class="tag tag-${tid}"><a href="https://wallhaven.cc/tag/${tid}">${esc(name)}</a></li>`];
      }).join('')
    : '';
  const size = num(r.file_size);
  return { url, size: size === null ? '' : fmtSz(size), properties, tagsHtml };
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function purityLabel(s: string): string {
  const k = s.toLowerCase();
  if (k === 'sfw') return 'SFW';
  if (k === 'nsfw') return 'NSFW';
  return cap(k);
}

function fileLabel(s: string): string {
  const k = s.toLowerCase();
  if (k === 'jpeg' || k === 'jpg') return 'JPG';
  if (k === 'png') return 'PNG';
  return cap(k);
}

// Fallback: legacy HTML scrape (~32KB). Only used if the API fails.
export function loadMetaHtml(id: string, cb?: (meta: FullMeta | null) => void): void {
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
              sizeText = (dd.textContent?.trim().split('-')[0] ?? '').trim() || ''; // e.g. "4.5 MiB"
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
        console.error('Better Wallhaven details parse error:', err);
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

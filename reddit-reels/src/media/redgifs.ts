/**
 * RedGifs without the RedGifs iframe.
 *
 * Measured on live reddit.com:
 * - Reddit's CSP has no redgifs host in connect-src or media-src, so the page
 *   itself can neither call api.redgifs.com nor stream media.redgifs.com.
 * - media.redgifs.com answers 403 when the Referer is reddit.com (hotlink guard).
 * So requests go through the userscript manager (GM_xmlhttpRequest: outside the
 * page CSP, no Reddit Referer) and the video plays from a blob: URL, which the
 * CSP allows. Plain fetch is the fallback (tests, managers without the grant).
 */

declare function GM_xmlhttpRequest(details: {
  method?: string;
  url: string;
  headers?: Record<string, string>;
  responseType?: 'json' | 'blob' | 'text' | 'arraybuffer';
  anonymous?: boolean;
  timeout?: number;
  onload?: (r: { status: number; response: any; responseText?: string }) => void;
  onerror?: (e: unknown) => void;
  ontimeout?: () => void;
}): unknown;

interface Res {
  status: number;
  json: () => Promise<any>;
  blob: () => Promise<Blob>;
}

function hasGm(): boolean {
  return typeof GM_xmlhttpRequest === 'function';
}

/** GM_xmlhttpRequest when available, fetch otherwise. */
function request(url: string, opts: { headers?: Record<string, string>; as: 'json' | 'blob' }): Promise<Res> {
  if (hasGm()) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        headers: opts.headers,
        responseType: opts.as,
        anonymous: true,
        timeout: 60000,
        onload: (r) =>
          resolve({
            status: r.status,
            json: async () =>
              typeof r.response === 'object' && r.response ? r.response : JSON.parse(r.responseText || 'null'),
            blob: async () => r.response as Blob,
          }),
        onerror: () => reject(new Error('network')),
        ontimeout: () => reject(new Error('timeout')),
      });
    });
  }
  return fetch(url, {
    headers: opts.headers,
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    mode: 'cors',
  }).then((r) => ({ status: r.status, json: () => r.json(), blob: () => r.blob() }));
}

export interface RedgifsInfo {
  hd: string;
  sd: string;
  poster: string;
  hasAudio: boolean;
  width: number;
  height: number;
}

const API = 'https://api.redgifs.com/v2';
const TOKEN_KEY = '@reddit-reels/redgifs-token';
const BLOB_CACHE_SIZE = 4;

let token: { value: string; exp: number } | null = null;
let tokenRequest: Promise<string> | null = null;
const infoCache = new Map<string, Promise<RedgifsInfo>>();
const blobCache = new Map<string, Promise<string>>();

function readStoredToken(): void {
  if (token) return;
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    if (raw) {
      const t = JSON.parse(raw);
      if (t && typeof t.value === 'string' && t.exp > Date.now()) token = t;
    }
  } catch {}
}

function tokenExpiry(jwt: string): number {
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.exp === 'number') return payload.exp * 1000 - 60_000;
  } catch {}
  return Date.now() + 60 * 60 * 1000;
}

async function getToken(force = false): Promise<string> {
  if (!force) {
    readStoredToken();
    if (token && token.exp > Date.now()) return token.value;
  }
  if (tokenRequest) return tokenRequest;
  tokenRequest = (async () => {
    const res = await request(`${API}/auth/temporary`, { as: 'json' });
    if (res.status !== 200) throw new Error(`redgifs token ${res.status}`);
    const value = (await res.json())?.token;
    if (typeof value !== 'string') throw new Error('redgifs token missing');
    token = { value, exp: tokenExpiry(value) };
    try {
      sessionStorage.setItem(TOKEN_KEY, JSON.stringify(token));
    } catch {}
    return value;
  })().finally(() => {
    tokenRequest = null;
  });
  return tokenRequest;
}

async function requestGif(id: string, attempt = 0): Promise<RedgifsInfo> {
  const auth = await getToken(attempt > 0);
  const res = await request(`${API}/gifs/${encodeURIComponent(id)}`, {
    as: 'json',
    headers: { Authorization: `Bearer ${auth}` },
  });
  // Tokens are bound to the requesting device; a stale/foreign one gets 401.
  if ((res.status === 401 || res.status === 403) && attempt < 2) return requestGif(id, attempt + 1);
  if (res.status !== 200) throw new Error(`redgifs gif ${res.status}`);
  const gif = (await res.json())?.gif;
  if (!gif?.urls) throw new Error('redgifs gif missing');
  return {
    hd: gif.urls.hd || gif.urls.sd || '',
    sd: gif.urls.sd || gif.urls.hd || '',
    poster: gif.urls.poster || gif.urls.thumbnail || '',
    hasAudio: !!gif.hasAudio,
    width: gif.width || 0,
    height: gif.height || 0,
  };
}

export function getRedgifs(id: string): Promise<RedgifsInfo> {
  let p = infoCache.get(id);
  if (!p) {
    p = requestGif(id);
    p.catch(() => infoCache.delete(id));
    infoCache.set(id, p);
  }
  return p;
}

/** Download a media.redgifs.com file without a Reddit Referer and return a blob: URL (LRU cached). */
export function redgifsBlobUrl(url: string): Promise<string> {
  const cached = blobCache.get(url);
  if (cached) {
    blobCache.delete(url);
    blobCache.set(url, cached);
    return cached;
  }
  const p = (async () => {
    const res = await request(url, { as: 'blob' });
    if (res.status !== 200) throw new Error(`redgifs media ${res.status}`);
    const blob = await res.blob();
    // Some managers hand back an untyped blob; <video> wants video/mp4.
    const typed = blob.type ? blob : new Blob([blob], { type: 'video/mp4' });
    return URL.createObjectURL(typed);
  })();
  p.catch(() => blobCache.delete(url));
  blobCache.set(url, p);
  while (blobCache.size > BLOB_CACHE_SIZE) {
    const [oldUrl, old] = blobCache.entries().next().value as [string, Promise<string>];
    blobCache.delete(oldUrl);
    old.then((b) => URL.revokeObjectURL(b)).catch(() => {});
  }
  return p;
}

/** Phones get the lighter "-mobile" rendition. */
export function pickRedgifsUrl(info: RedgifsInfo, mobile: boolean): string {
  return mobile ? info.sd || info.hd : info.hd || info.sd;
}

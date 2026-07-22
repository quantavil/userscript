export interface CachedMeta {
  url: string;
  sizeString: string;
}

export interface FullMeta {
  url: string;
  size: string;
  properties: [string, string][];
  tagsHtml: string;
}

// In-memory cache for the current session details
export const metaCache = new Map<string, FullMeta | null>();

// Backwards-compatible persistent localStorage cache
export const C = (() => {
  let d: Record<string, any>;
  try {
    d = JSON.parse(localStorage.getItem('whc2') || '{}');
  } catch {
    d = {};
  }
  return {
    get(id: string): CachedMeta | null {
      const entry = d[id];
      if (!entry) return null;
      // Backwards-compatibility check
      if (entry.url) {
        return {
          url: entry.url,
          sizeString: entry.sizeString || (entry.size ? fmtSz(entry.size) : '')
        };
      }
      return null;
    },
    set(id: string, v: CachedMeta) {
      d[id] = v;
      const k = Object.keys(d);
      if (k.length > 2000) {
        k.slice(0, k.length - 1500).forEach(x => delete d[x]);
      }
      try {
        localStorage.setItem('whc2', JSON.stringify(d));
      } catch {}
    }
  };
})();

export function fmtSz(b: number): string {
  if (!b) return '';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}

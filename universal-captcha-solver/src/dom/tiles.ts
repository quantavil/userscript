/** What a grid tile is showing: its <img>s and CSS background images, in paint order. */
export interface TileSource {
  el: Element;
  url: string;
  kind: 'img' | 'bg';
}

const bgUrl = (el: Element): string | null => {
  const m = getComputedStyle(el).backgroundImage.match(/url\(["']?(.*?)["']?\)/);
  return m?.[1] ? new URL(m[1], location.href).href : null;
};

export function tileSources(tile: Element): TileSource[] {
  const out: TileSource[] = [];
  for (const el of [tile, ...tile.querySelectorAll('*')]) {
    if (el instanceof HTMLImageElement) {
      const url = el.currentSrc || el.src;
      if (url) out.push({ el, url, kind: 'img' });
      continue;
    }
    const url = bgUrl(el);
    if (url) out.push({ el, url, kind: 'bg' });
  }
  return out;
}

/** Changes when a tile's picture is swapped (reCAPTCHA "click until none left", hCaptcha rounds). */
export const tileSignature = (tile: Element): string =>
  tileSources(tile)
    .map((s) => s.url)
    .join('|');

/** Lowest opacity among a tile's pictures: < 1 while a replaced tile fades out or in. */
export function tileOpacity(tile: Element): number {
  let min = 1;
  for (const { el } of tileSources(tile)) {
    for (let n: Element | null = el; n && n !== tile.parentElement; n = n.parentElement) {
      const o = Number.parseFloat(getComputedStyle(n).opacity);
      if (!Number.isNaN(o)) min = Math.min(min, o); // '' (unsupported/unstyled) means opaque
    }
  }
  return min;
}

/** All <img>s in the tiles have finished loading. */
export const tilesLoaded = (tiles: Element[]): boolean =>
  tiles.every((t) =>
    tileSources(t).every(({ el }) => !(el instanceof HTMLImageElement) || (el.complete && el.naturalWidth > 0)),
  );

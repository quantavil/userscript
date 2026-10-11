import { tileSources } from '../dom/tiles.ts';
import { gmHttp, type Http } from '../net/http.ts';

export interface CapturedImage {
  mime: 'image/png' | 'image/jpeg';
  base64: string;
  width: number;
  height: number;
  /** True when the pixels were re-downloaded rather than read from the page. */
  refetched: boolean;
}

const MAX_SIDE = 1024;
const PNG_PIXEL_BUDGET = 400 * 400;

/** Scale down (never up) so the longest side is at most `max`. */
export function fitWithin(w: number, h: number, max = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

type Cell = { x: number; y: number; w: number; h: number };

/** An evenly split `size` x `size` grid over a width x height picture. */
const uniformCells = (width: number, height: number, size: number): Cell[] =>
  Array.from({ length: size * size }, (_, n) => ({
    x: (n % size) * (width / size),
    y: Math.floor(n / size) * (height / size),
    w: width / size,
    h: height / size,
  }));

/**
 * Outlines each tile and prints its number in the top-left corner. Vision models map
 * "tile 6" to a position far more reliably when the number is printed on the tile.
 */
function annotateCells(ctx: CanvasRenderingContext2D, cells: Cell[]): void {
  const side = Math.min(...cells.map((c) => Math.min(c.w, c.h)));
  const font = Math.max(10, Math.round(side * 0.16));
  ctx.save();
  ctx.lineWidth = Math.max(1, Math.round(font / 8));
  ctx.strokeStyle = '#fff';
  ctx.font = `bold ${font}px sans-serif`;
  ctx.textBaseline = 'top';
  cells.forEach((c, i) => {
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    const label = String(i + 1);
    ctx.fillStyle = '#000c';
    ctx.fillRect(c.x + 2, c.y + 2, ctx.measureText(label).width + font * 0.5, font * 1.2);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, c.x + 2 + font * 0.25, c.y + 2 + font * 0.1);
  });
  ctx.restore();
}

const encode = (canvas: HTMLCanvasElement): Pick<CapturedImage, 'mime' | 'base64'> => {
  const mime = canvas.width * canvas.height <= PNG_PIXEL_BUDGET ? 'image/png' : 'image/jpeg';
  return { mime, base64: canvas.toDataURL(mime, 0.92).split(',')[1] ?? '' };
};

function rasterize(source: CanvasImageSource, srcW: number, srcH: number, grid = 0): Omit<CapturedImage, 'refetched'> {
  const { width, height } = fitWithin(srcW, srcH);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  // JPEG/model inputs have no alpha: transparent pixels would turn black and hide dark glyphs.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  if (grid > 1) annotateCells(ctx, uniformCells(width, height, grid));
  return { ...encode(canvas), width, height };
}

async function imageReady(img: HTMLImageElement, timeoutMs: number): Promise<void> {
  if (img.complete && img.naturalWidth > 0) return;
  await Promise.race([
    img.decode(),
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Captcha image did not load')), timeoutMs)),
  ]);
}

async function download(url: string, http: Http, signal?: AbortSignal): Promise<Blob> {
  if (url.startsWith('blob:') || url.startsWith('data:')) return (await fetch(url, { signal })).blob();
  const res = await http({ method: 'GET', url, responseType: 'blob', timeout: 10_000, signal });
  if (!res.blob) throw new Error('Download returned no data');
  return res.blob;
}

async function refetch(
  url: string,
  http: Http,
  signal?: AbortSignal,
  grid = 0,
): Promise<Omit<CapturedImage, 'refetched'>> {
  const bmp = await createImageBitmap(await download(url, http, signal));
  try {
    return rasterize(bmp, bmp.width, bmp.height, grid);
  } finally {
    bmp.close();
  }
}

function backgroundUrl(el: Element): string | null {
  const m = getComputedStyle(el).backgroundImage.match(/url\(["']?(.*?)["']?\)/);
  return m?.[1] ? new URL(m[1], location.href).href : null;
}

/**
 * Reads the captcha pixels from the page.
 * Same-origin / CORS-clean images are drawn straight from the DOM, so what the model sees
 * is exactly what the user sees. Tainted canvases fall back to re-downloading the URL, which
 * on some sites yields a *different* captcha; `refetched` flags that case for the UI.
 */
export async function captureImage(
  el: Element,
  opts: {
    http?: Http;
    signal?: AbortSignal;
    loadTimeoutMs?: number;
    /** Tiles per side to number on the image (image-grid captchas). 0 = none. */
    grid?: number;
  } = {},
): Promise<CapturedImage> {
  const { http = gmHttp, signal, loadTimeoutMs = 5000, grid = 0 } = opts;

  if (el instanceof HTMLCanvasElement) {
    return { ...rasterize(el, el.width, el.height, grid), refetched: false };
  }

  if (el instanceof HTMLImageElement) {
    await imageReady(el, loadTimeoutMs);
    try {
      return { ...rasterize(el, el.naturalWidth, el.naturalHeight, grid), refetched: false };
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'SecurityError')) throw e;
      const url = el.currentSrc || el.src;
      return { ...(await refetch(url, http, signal, grid)), refetched: true };
    }
  }

  if (el instanceof SVGSVGElement) {
    const rect = el.getBoundingClientRect();
    const xml = new XMLSerializer().serializeToString(el);
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
    const img = new Image();
    img.src = url;
    await imageReady(img, loadTimeoutMs);
    return { ...rasterize(img, rect.width || 200, rect.height || 80, grid), refetched: false };
  }

  const bg = backgroundUrl(el);
  if (bg) return { ...(await refetch(bg, http, signal, grid)), refetched: true };
  throw new Error(`Unsupported captcha element <${el.tagName.toLowerCase()}>. Pick an <img>, <canvas> or <svg>`);
}

/** Pictures that can be drawn without tainting the canvas: same origin, data: and blob: URLs. */
const drawableInPlace = (url: string) =>
  url.startsWith('data:') || url.startsWith('blob:') || new URL(url, location.href).origin === location.origin;

/**
 * Builds one numbered picture from the tiles as they look on screen, for grids where each tile is
 * its own image (hCaptcha) or where some tiles were replaced (reCAPTCHA "click until none left").
 * Each tile's pictures are drawn at their on-screen rects, clipped to the tile, so an offset slice
 * of a shared image comes out as the visible slice. Cross-origin pictures are downloaded through
 * the userscript manager so the canvas stays readable. Tile URLs are fixed per picture, so
 * a re-download shows the same pixels (unlike single-URL captcha generators).
 */
export async function captureTiles(
  tiles: Element[],
  opts: { http?: Http; signal?: AbortSignal } = {},
): Promise<CapturedImage> {
  const { http = gmHttp, signal } = opts;
  if (!tiles.length) throw new Error('No tiles to capture');
  const rects = tiles.map((t) => t.getBoundingClientRect());
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const w = Math.max(...rects.map((r) => r.right)) - left || 1;
  const h = Math.max(...rects.map((r) => r.bottom)) - top || 1;
  // Small on-screen tiles are upscaled so the model sees ~120px per tile, within MAX_SIDE overall.
  const smallest = Math.min(...rects.map((r) => Math.min(r.width, r.height))) || 1;
  const scale = Math.max(1, Math.min(120 / smallest, MAX_SIDE / Math.max(w, h)));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const downloaded = new Map<string, Promise<ImageBitmap>>();
  const sourceFor = async (url: string, el: Element): Promise<CanvasImageSource> => {
    if (el instanceof HTMLImageElement && drawableInPlace(url)) return el;
    let bmp = downloaded.get(url);
    if (!bmp) {
      bmp = download(url, http, signal).then((b) => createImageBitmap(b));
      downloaded.set(url, bmp);
    }
    return bmp;
  };

  const cells: Cell[] = rects.map((r) => ({
    x: (r.left - left) * scale,
    y: (r.top - top) * scale,
    w: r.width * scale,
    h: r.height * scale,
  }));
  try {
    for (const [i, tile] of tiles.entries()) {
      const cell = cells[i] as Cell;
      ctx.save();
      ctx.beginPath();
      ctx.rect(cell.x, cell.y, cell.w, cell.h);
      ctx.clip();
      for (const { el, url } of tileSources(tile)) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        ctx.drawImage(
          await sourceFor(url, el),
          (r.left - left) * scale,
          (r.top - top) * scale,
          r.width * scale,
          r.height * scale,
        );
      }
      ctx.restore();
    }
  } finally {
    for (const p of downloaded.values())
      void p.then(
        (b) => b.close?.(),
        () => {},
      );
  }
  annotateCells(ctx, cells);
  return { ...encode(canvas), width: canvas.width, height: canvas.height, refetched: false };
}

/** Downloads an audio clip (same-origin fetch first: it carries the challenge's cookies). */
export async function captureAudio(
  url: string,
  opts: { http?: Http; signal?: AbortSignal } = {},
): Promise<{ mime: string; base64: string; blob: Blob }> {
  const { http = gmHttp, signal } = opts;
  let blob: Blob;
  try {
    if (!drawableInPlace(url)) throw new Error('cross-origin');
    const res = await fetch(url, { signal, credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    blob = await res.blob();
  } catch (e) {
    if (signal?.aborted) throw e;
    blob = await download(url, http, signal);
  }
  if (!blob.size) throw new Error('Audio clip was empty');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return {
    mime: blob.type && blob.type !== 'application/octet-stream' ? blob.type : 'audio/mpeg',
    base64: btoa(bin),
    blob,
  };
}

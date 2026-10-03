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

/**
 * Draws grid lines and a small number in each tile's top-left corner. Vision models map
 * "tile 6" to a position far more reliably when the number is printed on the tile.
 */
function annotateGrid(ctx: CanvasRenderingContext2D, width: number, height: number, size: number): void {
  const cw = width / size;
  const ch = height / size;
  const font = Math.max(10, Math.round(Math.min(cw, ch) * 0.16));
  ctx.save();
  ctx.lineWidth = Math.max(1, Math.round(font / 8));
  ctx.strokeStyle = '#fff';
  for (let i = 1; i < size; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cw, 0);
    ctx.lineTo(i * cw, height);
    ctx.moveTo(0, i * ch);
    ctx.lineTo(width, i * ch);
    ctx.stroke();
  }
  ctx.font = `bold ${font}px sans-serif`;
  ctx.textBaseline = 'top';
  for (let n = 0; n < size * size; n++) {
    const x = (n % size) * cw + 2;
    const y = Math.floor(n / size) * ch + 2;
    const label = String(n + 1);
    ctx.fillStyle = '#000c';
    ctx.fillRect(x, y, ctx.measureText(label).width + font * 0.5, font * 1.2);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, x + font * 0.25, y + font * 0.1);
  }
  ctx.restore();
}

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
  if (grid > 1) annotateGrid(ctx, width, height, grid);
  const png = width * height <= PNG_PIXEL_BUDGET;
  const mime = png ? 'image/png' : 'image/jpeg';
  const base64 = canvas.toDataURL(mime, 0.92).split(',')[1] ?? '';
  return { mime, base64, width, height };
}

async function imageReady(img: HTMLImageElement, timeoutMs: number): Promise<void> {
  if (img.complete && img.naturalWidth > 0) return;
  await Promise.race([
    img.decode(),
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Captcha image did not load')), timeoutMs)),
  ]);
}

async function refetch(
  url: string,
  http: Http,
  signal?: AbortSignal,
  grid = 0,
): Promise<Omit<CapturedImage, 'refetched'>> {
  let blob: Blob;
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    blob = await (await fetch(url, { signal })).blob();
  } else {
    const res = await http({ method: 'GET', url, responseType: 'blob', timeout: 10_000, signal });
    if (!res.blob) throw new Error('Image download returned no data');
    blob = res.blob;
  }
  const bmp = await createImageBitmap(blob);
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

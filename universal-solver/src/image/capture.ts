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

function rasterize(source: CanvasImageSource, srcW: number, srcH: number): Omit<CapturedImage, 'refetched'> {
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

async function refetch(url: string, http: Http, signal?: AbortSignal): Promise<Omit<CapturedImage, 'refetched'>> {
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
    return rasterize(bmp, bmp.width, bmp.height);
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
  opts: { http?: Http; signal?: AbortSignal; loadTimeoutMs?: number } = {},
): Promise<CapturedImage> {
  const { http = gmHttp, signal, loadTimeoutMs = 5000 } = opts;

  if (el instanceof HTMLCanvasElement) {
    return { ...rasterize(el, el.width, el.height), refetched: false };
  }

  if (el instanceof HTMLImageElement) {
    await imageReady(el, loadTimeoutMs);
    try {
      return { ...rasterize(el, el.naturalWidth, el.naturalHeight), refetched: false };
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'SecurityError')) throw e;
      const url = el.currentSrc || el.src;
      return { ...(await refetch(url, http, signal)), refetched: true };
    }
  }

  if (el instanceof SVGSVGElement) {
    const rect = el.getBoundingClientRect();
    const xml = new XMLSerializer().serializeToString(el);
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
    const img = new Image();
    img.src = url;
    await imageReady(img, loadTimeoutMs);
    return { ...rasterize(img, rect.width || 200, rect.height || 80), refetched: false };
  }

  const bg = backgroundUrl(el);
  if (bg) return { ...(await refetch(bg, http, signal)), refetched: true };
  throw new Error(`Unsupported captcha element <${el.tagName.toLowerCase()}>. Pick an <img>, <canvas> or <svg>`);
}

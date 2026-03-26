import { CACHE_KEY } from "./constants";
import type { Cache } from "./types";

// ── Query normalisation ─────────────────────────────────────────────────

/** Lowercase, collapse whitespace, trim. */
export const normalizeQ = (q: string): string =>
  q.trim().toLowerCase().replace(/\s+/g, " ");

// ── GM cache helpers ────────────────────────────────────────────────────

export function getCache(): Cache {
  try {
    const raw = GM_getValue(CACHE_KEY, null);
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return raw as Cache;
    }
  } catch { /* ignore corrupt / missing */ }
  return {};
}

export function setCache(obj: Cache): void {
  try {
    GM_setValue(CACHE_KEY, obj);
  } catch { /* best-effort */ }
}

// ── DOM helpers ─────────────────────────────────────────────────────────

/**
 * Return the first element matched by any selector in `sels`.
 * Optionally require the element to contain non-empty text.
 */
export function findBySelectors(
  sels: readonly string[],
  requireText = false,
): Element | null {
  for (const sel of sels) {
    const el = document.querySelector(sel);
    if (el && (!requireText || el.textContent?.trim())) return el;
  }
  return null;
}

// ── Clipboard ───────────────────────────────────────────────────────────

/**
 * Write text to the system clipboard.
 * Falls back to `document.execCommand("copy")` when the async Clipboard API
 * is unavailable (sandboxed iframes, older browsers, some extensions).
 */
export function writeClipboard(text: string): Promise<void> {
  const fallback = (): Promise<void> =>
    new Promise((resolve, reject) => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0;left:-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        ta.remove();
        resolve();
      } catch (e) {
        ta.remove();
        reject(e);
      }
    });

  return navigator.clipboard?.writeText
    ? navigator.clipboard.writeText(text).catch(fallback)
    : fallback();
}
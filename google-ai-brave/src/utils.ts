import { CACHE_KEY, SETTINGS_KEY, MAX_CACHE_ENTRIES } from "./constants";
import type { Cache } from "./types";

// ── Query normalisation ─────────────────────────────────────────────────

/** Lowercase, collapse whitespace, trim. */
export const normalizeQ = (q: string): string =>
  q.trim().toLowerCase().replace(/\s+/g, " ");

/** Strip both --ai and --noai flags and re-normalise. Assumes input is already normalised. */
export const stripFlags = (q: string): string => {
  const settings = getSettings();
  const ai = escapeRegex(settings.aiFlag);
  const noai = escapeRegex(settings.noaiFlag);
  const re = new RegExp(`(?:^|\\s)(?:${ai}|${noai})(?=\\s|$)`, "g");
  return normalizeQ(q.replace(re, " "));
};

/** Determine if AI should be triggered based on settings and query flags. */
export function isAIEnabled(q: string): boolean {
  const settings = getSettings();
  const aiRE = new RegExp(`(?:^|\\s)${escapeRegex(settings.aiFlag)}(?=\\s|$)`);
  const noaiRE = new RegExp(
    `(?:^|\\s)${escapeRegex(settings.noaiFlag)}(?=\\s|$)`,
  );

  const hasAI = aiRE.test(q);
  const hasNoAI = noaiRE.test(q);

  return settings.aiByDefault ? !hasNoAI : hasAI;
}

export interface Settings {
  aiByDefault: boolean;
  aiFlag: string;
  noaiFlag: string;
}

export function getSettings(): Settings {
  return GM_getValue(SETTINGS_KEY, {
    aiByDefault: false,
    aiFlag: "--ai",
    noaiFlag: "--noai",
  });
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
    const keys = Object.keys(obj);
    if (keys.length > MAX_CACHE_ENTRIES) {
      // Sort by timestamp (oldest first) and delete until within limit
      const sorted = keys.sort((a, b) => (obj[a].ts ?? 0) - (obj[b].ts ?? 0));
      const toRemove = sorted.slice(0, keys.length - MAX_CACHE_ENTRIES);
      for (const k of toRemove) delete obj[k];
    }
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
        const ok = document.execCommand("copy");
        ta.remove();
        ok ? resolve() : reject(new Error("execCommand returned false"));
      } catch (e) {
        ta.remove();
        reject(e);
      }
    });

  return navigator.clipboard?.writeText
    ? navigator.clipboard.writeText(text).catch(fallback)
    : fallback();
}
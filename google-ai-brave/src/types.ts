/** A single cross-tab cache entry stored via GM_setValue / GM_getValue. */
export interface CacheEntry {
  html: string;
  ts: number;
  error: string | null;
  status: "fetching" | "done" | "error";
  resultUrl: string | null;
}

/** The full cache object — keys are normalised queries. */
export type Cache = Record<string, CacheEntry>;
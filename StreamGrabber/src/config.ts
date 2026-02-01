/**
 * Runtime configuration
 */
export const CFG = {
  /** Max retry attempts per segment */
  RETRIES: 3,
  /** Concurrent segment downloads */
  CONCURRENCY: 6,
  /** Segment request timeout (ms) */
  REQUEST_TIMEOUT: 60_000,
  /** Manifest request timeout (ms) */
  MANIFEST_TIMEOUT: 30_000,
  /** Skip videos smaller than this */
  SMALL_BYTES: 1 * 1024 * 1024,
  /** FAB idle opacity delay (ms) */
  UI_IDLE_MS: 5_000,
  /** Enrichment queue debounce (ms) */
  ENRICH_DELAY: 150,
  /** Detection debounce (ms) */
  DETECT_DEBOUNCE: 50,
  /** Enrichment timeout (ms) */
  ENRICH_TIMEOUT: 10_000,
  /** Is top frame */
  IS_TOP: window.self === window.top,
} as const;

/**
 * Cache limits
 */
export const CACHE = {
  /** Max text cache entries */
  TEXT_MAX: 256,
  /** Max head cache entries */
  HEAD_MAX: 256,
  /** Max items in DB */
  DB_MAX: 120,
  /** Cache cleanup interval (ms) */
  CLEAR_MS: 120_000,
} as const;

/**
 * Setting keys for GM storage
 */
export const SETTINGS_KEYS = {
  EXCLUDE_SMALL: 'sg_exclude_small',
} as const;
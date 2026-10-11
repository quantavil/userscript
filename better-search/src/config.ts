// src/config.ts

export const SVF_CONFIG = {
    /** Prefix for all localStorage / GM storage keys */
    STORAGE_PREFIX: 'svf_',
    /** data-attribute written to result items for identification */
    ITEM_ATTR: 'data-svf-id',
    /** How long (ms) to debounce the scanner after DOM mutations */
    SCAN_DEBOUNCE_MS: 120,
    /** How long (ms) to debounce settings saves */
    SAVE_DEBOUNCE_MS: 800,
    /** Default liked domains prepopulated on first install */
    DEFAULT_LIKED: [],
    /** Default disliked domains prepopulated on first install */
    DEFAULT_DISLIKED: [],
    /** Debounce (ms) before auto-pushing to Gist after a domain change */
    SYNC_PUSH_DEBOUNCE_MS: 10000,
    /** Filename used inside the Gist */
    GIST_FILENAME: 'domains.json',
    /** Always-latest raw URL for quick import (no token needed) */
    GIST_IMPORT_URL: 'https://gist.githubusercontent.com/quantavil/12880b87fd1ebd497469455d1898088b/raw/domains.json',
} as const;

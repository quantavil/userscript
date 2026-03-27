// ── Origins & storage keys ──────────────────────────────────────────────

export const GOOGLE_ORIGIN = "https://www.google.com";
export const CACHE_KEY = "gai_cache";

// ── Tuning ──────────────────────────────────────────────────────────────

/** How long a "fetching" lock is considered valid (ms). */
export const FETCH_LOCK_TTL = 70_000;

/** How long a cached result is considered fresh (ms). */
export const CACHE_TTL = 900_000;

/** Maximum number of entries kept in the cross-tab cache. */
export const MAX_CACHE_ENTRIES = 10;

/** CSS id / class prefix used for the Brave-side sidebar panel. */
export const PANEL_ID = "gai";

// ── URL builders ────────────────────────────────────────────────────────

export const googleSearchUrl = (q: string): string =>
  `${GOOGLE_ORIGIN}/search?q=${encodeURIComponent(q)}`;

export const googleUrl = (q: string): string =>
  `${googleSearchUrl(q)}&udm=50`;

export const aiUrl = (q: string): string => `${googleUrl(q)}#gai`;

// ── Regex ───────────────────────────────────────────────────────────────

/** Matches the --ai opt-in flag anywhere in a query string. */
export const AI_RE = /(?:^|\s)--ai(?:\s|$)/;

/** Matches the --noai opt-out flag anywhere in a query string. */
export const NOAI_RE = /(?:^|\s)--noai(?:\s|$)/;

export const SETTINGS_KEY = "gai_settings";

// ── Selector lists ─────────────────────────────────────────────────────

/** AI Mode content containers (tried in order). */
export const CONTENT_SELS: readonly string[] = [
  '[data-container-id="main-col"]',
  ".pWvJNd",
];

/** Elements whose presence signals a complete AI response. */
export const COMPLETE_SELS: readonly string[] = [
  'button[aria-label="Copy text"]',
  'button[aria-label="Good response"]',
  'button[aria-label="Bad response"]',
  ".bKxaof",
  ".ya9Iof",
];

/** Elements whose presence signals an error page (CAPTCHA / sign-in). */
export const ERROR_SELS: readonly string[] = [
  "#captcha-form",
  'form[action*="signin"]',
  '#infoDiv[class*="captcha"]',
  "#consent-bump",
  "#recaptcha",
];

/** Elements removed from the cloned content DOM during extraction. */
export const STRIP_SELS: readonly string[] = [
  // Standard web noise
  "script", "noscript", "style", "link", "iframe", "header", "footer",
  "#gb", "#fbar", "#searchform", "#top_nav", '[role="navigation"]',
  // Media & interactive
  "svg",
  // AI Mode: feedback / tracking
  ".JuoeAb", "[data-crb-el]",
  // AI Mode: UI chrome
  ".VlQBpc", ".zkL70c", ".DwkS",
  ".IBZVef",   // show more / less toggle
  ".Fsg96",    // spacer divs
  ".alk4p",    // loading animation
  ".kwdzO",    // timestamp
  ".sNRHic",   // bottom spacer
  // Source / citation panels
  ".ofHStc", ".jKhXsc", ".SGF5Lb",
  ".wDa0n", ".hpw4G", ".qacuz",
  // Toolbar rows (copy / edit bar)
  ".ilZyRc", ".UYpEO", ".dcCF7d",
];

/** Attributes preserved during the attribute-strip pass. */
export const KEEP_ATTRS: ReadonlySet<string> = new Set([
  "colspan",
  "rowspan",
  "href",
  "src",
  "srcset",
  "alt",
  "aria-label",
  "target",
  "rel",
  "width",
  "height",
]);

/** Tags considered inline (used to detect mis-nested block-in-inline). */
export const INLINE_TAGS: ReadonlySet<string> = new Set([
  "strong", "b", "em", "i", "a", "span",
]);

/** Brave Search sidebar container selectors (tried in order). */
export const SIDEBAR_SELS: readonly string[] = [
  "aside.sidebar > .sidebar-content",
  "aside.side > .sidebar-content",
  "aside.sidebar",
  "aside.side",
];
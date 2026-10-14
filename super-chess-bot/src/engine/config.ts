/**
 * Centralized engine search, premove arming, tablebase, throttling, and cognitive timing configuration.
 * Consolidates all engine tuning parameters, thresholds, timeouts, and limits in one single place.
 */

// --- Premove Engine Tuning ---

/** Number of candidate opponent branches evaluated in parallel during the opponent's clock. */
export const PREMOVE_PONDER_BRANCHES = 6;

/** Search depth for opponent-turn Multi-Branch ponder table arming (budget = 0 ms). */
export const PREMOVE_PONDER_DEPTH = 8;

/** Maximum evaluation loss in centipawns tolerated on our turn to steer into a tactical recapture chain. */
export const MAX_CHAIN_STEERING_LOSS_CP = 120;

// --- Live Analysis & Display Tuning ---

/** Number of Multi-PV lines requested during live analysis and displayed on the panel. */
export const LIVE_MULTI_PV = 3;

/** Minimum search depth required to reuse a background ponder result when transitioning to our turn. */
export const PONDER_REUSE_DEPTH = 12;

// --- UCI Worker Timeouts & Slack ---

/** Maximum milliseconds to wait for Stockfish worker initialization / UCI readiness. */
export const UCI_INIT_TIMEOUT_MS = 25_000;

/** Extra milliseconds allowed past search time budget before forcefully terminating a search. */
export const UCI_SEARCH_SLACK_MS = 3_000;

/** Maximum milliseconds to wait for a graceful UCI "stop" command before killing the worker. */
export const UCI_STOP_TIMEOUT_MS = 2_000;

/** Maximum timeout in milliseconds for unbounded depth-only searches (e.g. game reports). */
export const UCI_DEPTH_ONLY_TIMEOUT_MS = 120_000;

// --- Syzygy Tablebase (Lichess) ---

/** Public API endpoint for Syzygy tablebase lookups. */
export const TABLEBASE_API_URL = 'https://tablebase.lichess.ovh/standard';

/** Timeout in milliseconds for Syzygy tablebase HTTP requests. */
export const TABLEBASE_DEFAULT_TIMEOUT_MS = 2_000;

/** Maximum number of resolved tablebase positions held in the LRU/in-memory cache. */
export const TABLEBASE_CACHE_CAPACITY = 256;

/** Cooldown duration in milliseconds after a failed tablebase fetch before retrying. */
export const TABLEBASE_FAILURE_COOLDOWN_MS = 30_000;

// --- Elo Throttling & Rating Simulation ---

/** Minimum rating threshold supported by the human error simulation engine. */
export const MIN_THROTTLED_ELO = 800;

/** Maximum rating threshold for throttling (~3200+ runs unrestricted / maximum Stockfish strength). */
export const MAX_THROTTLED_ELO = 3200;

// --- Cognitive Delay & Shannon Entropy Tuning ---

/** Softmax temperature parameter T (in centipawns) for the Shannon entropy model over candidate move evaluations. */
export const ENTROPY_TEMPERATURE_CP = 75;

/** Minimum human motor latency floor in milliseconds. */
export const MIN_HUMAN_DELAY_MS = 25;

/** Maximum multiplier applied to the base move time budget to prevent runaway delays. */
export const MAX_DELAY_BUDGET_MULTIPLIER = 3;

/** Maximum delay ceiling in milliseconds when responding to a forced single-legal-move position. */
export const FORCED_MOVE_MAX_DELAY_MS = 120;

// --- Automation & Recovery ---

/** Maximum automatic retry attempts per session-position before requiring user manual intervention. */
export const MAX_AUTOMATIC_RETRIES = 2;

// --- Post-Game Report ---

/** Default search depth per move for post-game report generation. */
export const DEFAULT_REPORT_DEPTH = 18;

/** Number of Multi-PV lines requested during post-game report analysis (reads only top evaluation). */
export const REPORT_MULTI_PV = 1;

/** Centipawn evaluation cap applied before win-percentage conversion to prevent runaway swings. */
export const REPORT_CPL_CAP = 1000;

// --- Maximum Aggression (experimental style tuning) ---
export const MADMAN_MULTI_PV = 6;
export const MADMAN_MAX_LOSS_CP = 120;
export const MADMAN_DISCOVERY_MIN_BUDGET_MS = 80;
export const MADMAN_VERIFY_MIN_BUDGET_MS = 400;

// Engine + logic constants
export const API_URL = 'https://stockfish.online/api/s/v2.php';
export const MULTIPV = 1;
export const ANALYZE_TIMEOUT_MS = 1000;       // ⚡ 3000 → 1000ms — fail fast to local engine
export const AUTO_MOVE_BASE = 200;            // ⚡ 800 → 200ms — near-instant moves
export const AUTO_MOVE_STEP = 20;             // ⚡ 300 → 20ms — fine-grained speed control
export const RANDOM_JITTER_MIN = 0;           // ⚡ 50 → 0ms — no minimum jitter
export const GAME_CACHE_TTL = 100; // Cache game object for 100ms (was 500ms — too slow for turn detection)

// Piece values for safety checks
export const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// Engine + logic constants
export const API_URL = 'https://stockfish.online/api/s/v2.php';
export const MULTIPV = 1;
export const ANALYZE_TIMEOUT_MS = 3000;      // ⚡ 8000 → 3000ms for bullet
export const AUTO_MOVE_BASE = 800;            // ⚡ 5000 → 800ms for bullet
export const AUTO_MOVE_STEP = 300;            // ⚡ 500 → 300ms for bullet
export const RANDOM_JITTER_MIN = 50;          // ⚡ 120 → 50ms for bullet
export const GAME_CACHE_TTL = 500; // Cache game object for 500ms

// Piece values for safety checks
export const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

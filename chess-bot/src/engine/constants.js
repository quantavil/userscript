// ============================================================
// ENGINE CONSTANTS
// ============================================================

export const WP = 1, WN = 2, WB = 3, WR = 4, WQ = 5, WK = 6;
export const BP = -1, BN = -2, BB = -3, BR = -4, BQ = -5, BK = -6;
export const EMPTY = 0;
export const FLAG_NONE = 0, FLAG_EP = 1, FLAG_CASTLE = 2, FLAG_PROMO = 4;
export const MATE_SCORE = 30000;

// --- Hot-path constants (hoisted to avoid per-call allocation) ---
export const KNIGHT_OFFSETS = [-17, -15, -10, -6, 6, 10, 15, 17];
export const STRAIGHT_DIRS = [8, -8, 1, -1];
export const DIAG_DIRS = [9, 7, -9, -7];
export const ALL_DIRS = [9, 7, -9, -7, 8, -8, 1, -1];
export const PHASE_VAL = [0, 0, 1, 1, 2, 4]; // indexed by abs piece type (0=empty,1=P,2=N,3=B,4=R,5=Q)
export const ATTACK_WEIGHT = [0, 0, 20, 20, 40, 80]; // indexed by abs piece type

// Transposition table flags
export const TT_EXACT = 0, TT_ALPHA = 1, TT_BETA = 2;
export const TT_SIZE = 65536; // Max entries

// Single-value table for move ordering, SEE, and premove safety checks
export const PIECE_VAL = { 1: 82, 2: 337, 3: 365, 4: 477, 5: 1025, 6: 20000 };

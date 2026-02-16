// ============================================================
// LOCAL CHESS ENGINE
// ============================================================
// Pieces: P=1,N=2,B=3,R=4,Q=5,K=6. White positive, black negative.
// --- Zobrist Hashing ---
// Pre-computed random 64-bit keys stored as pairs of 32-bit ints for speed
export const ZOBRIST = (() => {
    // Simple seeded PRNG (xorshift32) for deterministic keys
    let seed = 1070372;
    const rand32 = () => { seed ^= seed << 13; seed ^= seed >> 17; seed ^= seed << 5; return seed >>> 0; };
    const table = new Uint32Array(13 * 64 * 2); // piece(0-12) * 64 squares * 2 (hi/lo)
    for (let i = 0; i < table.length; i++) table[i] = rand32();
    const sideKey = [rand32(), rand32()];
    const castlingKeys = new Uint32Array(16 * 2);
    for (let i = 0; i < castlingKeys.length; i++) castlingKeys[i] = rand32();
    const epKeys = new Uint32Array(8 * 2); // per-file
    for (let i = 0; i < epKeys.length; i++) epKeys[i] = rand32();
    return { table, sideKey, castlingKeys, epKeys };
})();
// Board: 64-element array, index = rank*8+file, a1=0, h8=63

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

// Piece-square tables (from white's perspective, a1=index 0)
// Indexed [rank][file] visually but stored flat as [sq] where sq = rank*8+file
// So index 0 = a1, index 7 = h1, index 56 = a8, index 63 = h8

// --- PeSTO Piece-Square Tables (a1=index 0, h8=index 63, white perspective) ---
// Middlegame tables
export const PST_PAWN_MG = [
    0, 0, 0, 0, 0, 0, 0, 0,
    -35, -1, -20, -23, -15, 24, 38, -22,
    -26, -4, -4, -10, 3, 3, 33, -12,
    -27, -2, -5, 12, 17, 6, 10, -25,
    -14, 13, 6, 21, 23, 12, 17, -23,
    -6, 7, 26, 31, 65, 56, 25, -20,
    98, 134, 61, 95, 68, 126, 34, -11,
    0, 0, 0, 0, 0, 0, 0, 0
];
export const PST_KNIGHT_MG = [
    -105, -21, -58, -33, -17, -28, -19, -23,
    -29, -53, -12, -3, -1, 18, -14, -19,
    -23, -9, 12, 10, 19, 17, 25, -16,
    -13, 4, 16, 13, 28, 19, 21, -8,
    -9, 17, 19, 53, 37, 69, 18, 22,
    -47, 60, 37, 65, 84, 129, 73, 44,
    -73, -41, 72, 36, 23, 62, 7, -17,
    -167, -89, -34, -49, 61, -97, -15, -107
];
export const PST_BISHOP_MG = [
    -33, -3, -14, -21, -13, -12, -39, -21,
    4, 15, 16, 0, 7, 21, 33, 1,
    0, 15, 15, 15, 14, 27, 18, 10,
    -6, 13, 13, 26, 34, 12, 10, 4,
    -4, 5, 19, 50, 37, 37, 7, -2,
    -16, 37, 43, 40, 35, 50, 37, -2,
    -26, 16, -18, -13, 30, 59, 18, -47,
    -29, 4, -82, -37, -25, -42, 7, -8
];
export const PST_ROOK_MG = [
    -19, -13, 1, 17, 16, 7, -37, -26,
    -44, -16, -20, -9, -1, 11, -6, -71,
    -45, -25, -16, -17, 3, 0, -5, -33,
    -36, -26, -12, -1, 9, -7, 6, -23,
    -24, -11, 7, 26, 24, 35, -8, -20,
    -5, 19, 26, 36, 17, 45, 61, 16,
    27, 32, 58, 62, 80, 67, 26, 44,
    32, 42, 32, 51, 63, 9, 31, 43
];
export const PST_QUEEN_MG = [
    -1, -18, -9, 10, -15, -25, -31, -50,
    -35, -8, 11, 2, 8, 15, -3, 1,
    -14, 2, -11, -2, -5, 2, 14, 5,
    -9, -26, -9, -10, -2, -4, 3, -3,
    -27, -27, -16, -16, -1, 17, -2, 1,
    -13, -17, 7, 8, 29, 56, 47, 57,
    -24, -39, -5, 1, -16, 57, 28, 54,
    -28, 0, 29, 12, 59, 44, 43, 45
];
export const PST_KING_MG = [
    -15, 36, 12, -54, 8, -28, 24, 14,
    1, 7, -8, -64, -43, -16, 9, 8,
    -14, -14, -22, -46, -44, -30, -15, -27,
    -49, -1, -27, -39, -46, -44, -33, -51,
    -17, -20, -12, -27, -30, -25, -14, -36,
    -9, 24, 2, -16, -20, 6, 22, -22,
    29, -1, -20, -7, -8, -4, -38, -29,
    -65, 23, 16, -15, -56, -34, 2, 13
];

// Endgame tables
export const PST_PAWN_EG = [
    0, 0, 0, 0, 0, 0, 0, 0,
    13, 8, 8, 10, 13, 0, 2, -7,
    4, 7, -6, 1, 0, -5, -1, -8,
    13, 9, -3, -7, -7, -8, 3, -1,
    32, 24, 13, 5, -2, 4, 17, 17,
    94, 100, 85, 67, 56, 53, 82, 84,
    178, 173, 158, 134, 147, 132, 165, 187,
    0, 0, 0, 0, 0, 0, 0, 0
];
export const PST_KNIGHT_EG = [
    -29, -51, -23, -15, -22, -18, -50, -64,
    -42, -20, -10, -5, -2, -20, -23, -44,
    -23, -3, -1, 15, 10, -3, -20, -22,
    -18, -6, 16, 25, 16, 17, 4, -18,
    -17, 3, 22, 22, 22, 11, 8, -18,
    -24, -20, 10, 9, -1, -9, -19, -41,
    -25, -8, -25, -2, -9, -25, -24, -52,
    -58, -38, -13, -28, -31, -27, -63, -99
];
export const PST_BISHOP_EG = [
    -23, -9, -23, -5, -9, -16, -5, -17,
    -14, -18, -7, -1, 4, -9, -15, -27,
    -12, -3, 8, 10, 13, 3, -7, -15,
    -6, 3, 13, 19, 7, 10, -3, -9,
    -3, 9, 12, 9, 14, 10, 3, 2,
    2, -8, 0, -1, -2, 6, 0, 4,
    -8, -4, 7, -12, -3, -13, -4, -14,
    -14, -21, -11, -8, -7, -9, -17, -24
];
export const PST_ROOK_EG = [
    -9, 2, 3, -1, -5, -13, 4, -20,
    -6, -6, 0, 2, -9, -9, -11, -3,
    -4, 0, -5, -1, -7, -12, -8, -16,
    3, 5, 8, 4, -5, -6, -8, -11,
    4, 3, 13, 1, 2, 1, -1, 2,
    7, 7, 7, 5, 4, -3, -5, -3,
    11, 13, 13, 11, -3, 3, 8, 3,
    13, 10, 18, 15, 12, 12, 8, 5
];
export const PST_QUEEN_EG = [
    -33, -28, -22, -43, -5, -32, -20, -41,
    -22, -23, -30, -16, -16, -23, -36, -32,
    -16, -27, 15, 6, 9, 17, 10, 5,
    -18, 28, 19, 47, 31, 34, 39, 23,
    3, 22, 24, 45, 57, 40, 57, 36,
    -20, 6, 9, 49, 47, 35, 19, 9,
    -17, 20, 32, 41, 58, 25, 30, 0,
    -9, 22, 22, 27, 27, 19, 10, 20
];
export const PST_KING_EG = [
    -53, -34, -21, -11, -28, -14, -24, -43,
    -27, -11, 4, 13, 14, 4, -5, -17,
    -19, -3, 11, 21, 23, 16, 7, -9,
    -18, -4, 21, 24, 27, 23, 9, -11,
    -8, 22, 24, 27, 26, 33, 26, 3,
    10, 17, 23, 15, 20, 45, 44, 13,
    -12, 17, 14, 17, 17, 38, 23, 11,
    -74, -35, -18, -18, -11, 15, 4, -17
];

// Lookup arrays indexed by abs piece type (0=unused, 1=P, 2=N, 3=B, 4=R, 5=Q, 6=K)
export const PST_MG = [null, PST_PAWN_MG, PST_KNIGHT_MG, PST_BISHOP_MG, PST_ROOK_MG, PST_QUEEN_MG, PST_KING_MG];
export const PST_EG = [null, PST_PAWN_EG, PST_KNIGHT_EG, PST_BISHOP_EG, PST_ROOK_EG, PST_QUEEN_EG, PST_KING_EG];

// PeSTO material values (MG/EG) for incremental eval
export const MAT_MG = [0, 82, 337, 365, 477, 1025, 0];
export const MAT_EG = [0, 94, 281, 297, 512, 936, 0];

// Single-value table for move ordering, SEE, and premove safety checks
export const PIECE_VAL = { 1: 82, 2: 337, 3: 365, 4: 477, 5: 1025, 6: 20000 };

export function mirrorSq(sq) { return (7 - (sq >> 3)) * 8 + (sq & 7); }
export function sqFile(sq) { return sq & 7; }
export function sqRank(sq) { return sq >> 3; }
export function sqName(sq) { return 'abcdefgh'[sqFile(sq)] + (sqRank(sq) + 1); }
export function nameToSq(s) { return (s.charCodeAt(0) - 97) + (s.charCodeAt(1) - 49) * 8; }

// Zobrist helpers
export function zobPieceIdx(piece) {
    // Map piece value (-6..-1, 1..6) to index 0-11. Empty=invalid
    return piece > 0 ? (piece - 1) : (-piece + 5);
}
export function zobPieceKey(piece, sq) {
    const base = (zobPieceIdx(piece) * 64 + sq) * 2;
    return [ZOBRIST.table[base], ZOBRIST.table[base + 1]];
}
export function zobXor(hash, key) {
    hash[0] ^= key[0]; hash[1] ^= key[1];
}


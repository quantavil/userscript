// ============================================================
// ZOBRIST HASHING
// ============================================================

// Pre-computed random 64-bit keys stored as pairs of 32-bit ints for speed
export const ZOBRIST = (() => {
    // Simple seeded PRNG (xorshift32) for deterministic keys
    let seed = 1070372;
    const rand32 = () => { seed ^= seed << 13; seed ^= seed >> 17; seed ^= seed << 5; return seed >>> 0; };
    const table = new Uint32Array(13 * 128 * 2); // piece(0-12) * 128 squares * 2 (hi/lo) (0x88 compatible)
    for (let i = 0; i < table.length; i++) table[i] = rand32();
    const sideKey = [rand32(), rand32()];
    const castlingKeys = new Uint32Array(16 * 2);
    for (let i = 0; i < castlingKeys.length; i++) castlingKeys[i] = rand32();
    const epKeys = new Uint32Array(8 * 2); // per-file
    for (let i = 0; i < epKeys.length; i++) epKeys[i] = rand32();
    return { table, sideKey, castlingKeys, epKeys };
})();

// Zobrist helpers
export function zobPieceIdx(piece) {
    // Map piece value (-6..-1, 1..6) to index 0-11. Empty=invalid
    return piece > 0 ? (piece - 1) : (-piece + 5);
}
export function zobPieceKey(piece, sq) {
    const base = (zobPieceIdx(piece) * 128 + sq) * 2;
    return [ZOBRIST.table[base], ZOBRIST.table[base + 1]];
}
export function zobXor(hash, key) {
    hash[0] ^= key[0]; hash[1] ^= key[1];
}

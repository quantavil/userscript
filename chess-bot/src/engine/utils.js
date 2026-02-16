// ============================================================
// BOARD UTILITIES
// ============================================================

export function mirrorSq(sq) { return (7 - (sq >> 3)) * 8 + (sq & 7); }
export function sqFile(sq) { return sq & 7; }
export function sqRank(sq) { return sq >> 3; }
export function sqName(sq) { return 'abcdefgh'[sqFile(sq)] + (sqRank(sq) + 1); }
export function nameToSq(s) { return (s.charCodeAt(0) - 97) + (s.charCodeAt(1) - 49) * 8; }

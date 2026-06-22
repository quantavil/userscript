// ============================================================
// BOARD UTILITIES
// ============================================================

export function mirrorSq(sq: number): number { return sq ^ 0x70; }
export function sqFile(sq: number): number { return sq & 7; }
export function sqRank(sq: number): number { return sq >> 4; }
export function sqName(sq: number): string { return 'abcdefgh'[sqFile(sq)] + (sqRank(sq) + 1); }
export function nameToSq(s: string): number { return (s.charCodeAt(0) - 97) + (s.charCodeAt(1) - 49) * 16; }

/**
 * @license GPL-3.0-or-later
 *
 * Super Chess Bot - Ultra-fast in-memory opening book (plies 1–6)
 * Normalized EPD dictionary for instant (<0.01 ms) opening moves in bullet.
 */

export function normalizeEpd(fen: string): string {
  const parts = fen.trim().split(/\s+/);
  return parts.length >= 4 ? parts.slice(0, 4).join(' ') : fen;
}

export const EPD_BOOK: Record<string, [move: string, weight: number][]> = {
  // === PLY 1 (White to move) ===
  // Starting position: 1.e4 (tactical/open) or 1.d4 (classical control)
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': [
    ['e2e4', 70],
    ['d2d4', 25],
    ['c2c4', 5],
  ],

  // === PLY 2 (Black response) ===
  // 1.e4 -> Sicilian (70%), Open Game 1...e5 (20%), French (5%), Caro-Kann (5%)
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3': [
    ['c7c5', 70],
    ['e7e5', 20],
    ['e7e6', 5],
    ['c7c6', 5],
  ],
  // 1.d4 -> Indian Defense 1...Nf6 (70%), Classical 1...d5 (25%), Benoni 1...c5 (5%)
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3': [
    ['g8f6', 70],
    ['d7d5', 25],
    ['c7c5', 5],
  ],
  // 1.c4 -> English Defense: 1...e5 (75%), 1...Nf6 (25%)
  'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq c3': [
    ['e7e5', 75],
    ['g8f6', 25],
  ],
  // 1.Nf3 -> Réti: 1...d5 (70%), 1...Nf6 (30%)
  'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq -': [
    ['d7d5', 70],
    ['g8f6', 30],
  ],

  // === PLY 3 (White 2nd move) ===
  // 1.e4 e5 -> King's Gambit (f2f4 - aggressive!) or Scotch/Italian (g1f3)
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [
    ['f2f4', 60],
    ['g1f3', 40],
  ],
  // 1.e4 c5 -> Smith-Morra / Open Sicilian (d2d4) or Open Sicilian (g1f3)
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6': [
    ['d2d4', 60],
    ['g1f3', 40],
  ],
  // 1.e4 e6 (French) -> 2.d4
  'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [['d2d4', 100]],
  // 1.e4 c6 (Caro-Kann) -> 2.d4
  'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [['d2d4', 100]],
  // 1.d4 d5 -> Queen's Gambit (c2c4)
  'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': [
    ['c2c4', 90],
    ['g1f3', 10],
  ],
  // 1.d4 Nf6 -> Mainline c2c4
  'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': [
    ['c2c4', 90],
    ['g1f3', 10],
  ],

  // === PLY 4 (Black 2nd move) ===
  // 1.e4 e5 2.Nf3 -> 2...Nc6 (85%) or Petroff 2...Nf6 (15%)
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': [
    ['b8c6', 85],
    ['g8f6', 15],
  ],
  // 1.e4 e5 2.f4 (King's Gambit) -> Accept with 2...exf4 (80%) or Falkbeer 2...d5 (20%)
  'rnbqkbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR b KQkq f3': [
    ['e5f4', 80],
    ['d7d5', 20],
  ],
  // 1.e4 c5 2.Nf3 -> 2...d6 (60%), 2...Nc6 (30%), 2...e6 (10%)
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': [
    ['d7d6', 60],
    ['b8c6', 30],
    ['e7e6', 10],
  ],
  // 1.e4 c5 2.d4 (Smith-Morra) -> 2...cxd4
  'rnbqkbnr/pp1ppppp/8/2p5/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3': [['c5d4', 100]],
  // 1.e4 e6 2.d4 -> 2...d5 (French Mainline)
  'rnbqkbnr/pppp1ppp/4p3/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3': [['d7d5', 100]],
  // 1.e4 c6 2.d4 -> 2...d5 (Caro-Kann Mainline)
  'rnbqkbnr/pp1ppppp/2p5/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3': [['d7d5', 100]],
  // 1.d4 d5 2.c4 -> Queen's Gambit Declined (e7e6 - 70%), Slav (c7c6 - 20%), Accepted (d5c4 - 10%)
  'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3': [
    ['e7e6', 70],
    ['c7c6', 20],
    ['d5c4', 10],
  ],
  // 1.d4 Nf6 2.c4 -> 2...e6 (50%), King's Indian 2...g6 (30%), Benoni 2...c5 (20%)
  'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3': [
    ['e7e6', 50],
    ['g7g6', 30],
    ['c7c5', 20],
  ],

  // === PLY 5 (White 3rd move) ===
  // 1.e4 e5 2.Nf3 Nc6 -> Italian (f1c4 - 60%), Ruy Lopez (f1b5 - 25%), Scotch (d2d4 - 15%)
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': [
    ['f1c4', 60],
    ['f1b5', 25],
    ['d2d4', 15],
  ],
  // 1.e4 e5 2.f4 exf4 -> King's Knight Gambit (g1f3 - 80%) or Bishop Gambit (f1c4 - 20%)
  'rnbqkbnr/pppp1ppp/8/8/4Pp2/8/PPPP2PP/RNBQKBNR w KQkq -': [
    ['g1f3', 80],
    ['f1c4', 20],
  ],
  // 1.e4 c5 2.Nf3 d6 -> Open Sicilian: 3.d4
  'rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': [['d2d4', 100]],
  // 1.e4 c5 2.d4 cxd4 -> Smith-Morra Gambit: 3.c3! (80%) or 3.Nf3 (20%)
  'rnbqkbnr/pp1ppppp/8/8/3pP3/8/PPP2PPP/RNBQKBNR w KQkq -': [
    ['c2c3', 80],
    ['g1f3', 20],
  ],
  // 1.e4 e6 2.d4 d5 -> French Paulsen (b1c3 - 60%) or Advance (e4e5 - 40%)
  'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq -': [
    ['b1c3', 60],
    ['e4e5', 40],
  ],
  // 1.e4 c6 2.d4 d5 -> Caro-Kann Classical (b1c3 - 60%) or Advance (e4e5 - 40%)
  'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq -': [
    ['b1c3', 60],
    ['e4e5', 40],
  ],
  // 1.d4 d5 2.c4 e6 -> 3.Nc3 (70%) or 3.Nf3 (30%)
  'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -': [
    ['b1c3', 70],
    ['g1f3', 30],
  ],
  // 1.d4 Nf6 2.c4 e6 -> 3.Nc3 (70%) or 3.Nf3 (30%)
  'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -': [
    ['b1c3', 70],
    ['g1f3', 30],
  ],
  // 1.d4 Nf6 2.c4 g6 -> 3.Nc3 (80%) or 3.Nf3 (20%)
  'rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -': [
    ['b1c3', 80],
    ['g1f3', 20],
  ],

  // === PLY 6 (Black 3rd move) ===
  // 1.e4 e5 2.Nf3 Nc6 3.Bc4 (Italian) -> 3...Bc5 (60%) or Two Knights 3...Nf6 (40%)
  'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq -': [
    ['f8c5', 60],
    ['g8f6', 40],
  ],
  // 1.e4 e5 2.Nf3 Nc6 3.Bb5 (Ruy Lopez) -> Morphy 3...a6 (80%) or Berlin 3...Nf6 (20%)
  'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq -': [
    ['a7a6', 80],
    ['g8f6', 20],
  ],
  // 1.e4 e5 2.Nf3 Nc6 3.d4 (Scotch) -> 3...exd4
  'r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3': [['e5d4', 100]],
  // 1.e4 c5 2.Nf3 d6 3.d4 -> 3...cxd4
  'rnbqkbnr/pp2pppp/3p4/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3': [['c5d4', 100]],
  // 1.e4 c5 2.d4 cxd4 3.c3 (Smith-Morra) -> Accept with 3...dxc3 (80%) or Push 3...d5 (20%)
  'rnbqkbnr/pp1ppppp/8/8/3pP3/2P5/PP3PPP/RNBQKBNR b KQkq -': [
    ['d4c3', 80],
    ['d7d5', 20],
  ],
  // 1.d4 d5 2.c4 e6 3.Nc3 -> 3...Nf6
  'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq -': [
    ['g8f6', 80],
    ['c7c6', 20],
  ],
  // 1.d4 Nf6 2.c4 e6 3.Nc3 -> Nimzo-Indian 3...Bb4 (70%) or 3...d5 (30%)
  'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq -': [
    ['f8b4', 70],
    ['d7d5', 30],
  ],
  // 1.d4 Nf6 2.c4 g6 3.Nc3 -> Grünfeld 3...d5 (50%) or King's Indian 3...Bg7 (50%)
  'rnbqkb1r/pppppp1p/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq -': [
    ['d7d5', 50],
    ['f8g7', 50],
  ],
};

export function lookupBookMove(fen: string, rng: () => number = Math.random): string | null {
  const epd = normalizeEpd(fen);
  const candidates = EPD_BOOK[epd];
  if (!candidates || candidates.length === 0) return null;

  const totalWeight = candidates.reduce((sum, [, w]) => sum + w, 0);
  let threshold = rng() * totalWeight;
  for (const [move, weight] of candidates) {
    threshold -= weight;
    if (threshold <= 0) return move;
  }
  return candidates[0][0];
}

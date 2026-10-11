/**
 * @license GPL-3.0-or-later
 *
 * Super Chess Bot - Ultra-fast in-memory opening book (plies 1–8)
 * Normalized EPD dictionary with configurable opening styles:
 * - hyper-defensive: Solid fortresses, Berlin Wall, Petroff, Slav, Réti
 * - defensive: French, Caro-Kann, Queen's Gambit Declined, Nimzo-Indian
 * - balanced: Classical GM mainlines, Italian Giuoco Piano, Ruy Lopez Morphy, Open Sicilian
 * - aggressive: King's Gambit, Evans Gambit, Scotch Gambit, Smith-Morra, Sicilian Dragon
 * - hyper-aggressive: Danish Gambit, Halloween, Blackmar-Diemer, Traxler Counterattack, Stafford
 */

import type { OpeningStyle } from '../types/chess';

export type CandidateMove = [move: string, weight: number];

export type BookEntry =
  | CandidateMove[]
  | (Partial<Record<OpeningStyle, CandidateMove[]>> & { default: CandidateMove[] });

export function normalizeEpd(fen: string): string {
  const parts = fen.trim().split(/\s+/);
  return parts.length >= 4 ? parts.slice(0, 4).join(' ') : fen;
}

/**
 * Opening positions are keyed on placement, side to move, and castling rights only.
 *
 * Hosts disagree on the en passant field: Chess.com returns the raw controller
 * FEN, which keeps the ep square after every double push, while the Lichess and
 * PyChess adapters pass chessops' canonical FEN, which emits the ep square only
 * when a capture is actually available. Matching the ep field exactly made most
 * of the book unreachable on two of three sites, so the field is ignored on both
 * the key and the lookup. No book move is an en passant capture, so no candidate
 * depends on it.
 */
function bookKey(epd: string): string {
  return `${epd.split(' ').slice(0, 3).join(' ')} -`;
}

export const EPD_BOOK: Record<string, BookEntry> = {
  // =========================================================================
  // === PLY 1 (White to move) ===
  // =========================================================================
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': {
    default: [
      ['e2e4', 65],
      ['d2d4', 25],
      ['c2c4', 10],
    ],
    'hyper-defensive': [
      ['g1f3', 50], // Réti / King's Indian Attack setup
      ['c2c4', 30], // English Opening
      ['d2d4', 20], // Classical solid pawn
    ],
    defensive: [
      ['d2d4', 60], // Solid positional center
      ['c2c4', 25],
      ['g1f3', 15],
    ],
    balanced: [
      ['e2e4', 65],
      ['d2d4', 25],
      ['c2c4', 10],
    ],
    aggressive: [
      ['e2e4', 80], // Open tactical lines
      ['d2d4', 20],
    ],
    'hyper-aggressive': [
      ['e2e4', 85], // Direct King's Gambit / Danish / Evans path
      ['d2d4', 15], // Blackmar-Diemer Gambit path
    ],
  },

  // =========================================================================
  // === PLY 2 (Black response) ===
  // =========================================================================
  // 1.e4
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3': {
    default: [
      ['c7c5', 60], // Sicilian
      ['e7e5', 30], // Open Game
      ['c7c6', 5], // Caro-Kann
      ['e7e6', 5], // French
    ],
    'hyper-defensive': [
      ['e7e5', 60], // Petroff fortress setup
      ['c7c6', 40], // Caro-Kann solid structure
    ],
    defensive: [
      ['c7c6', 50], // Caro-Kann
      ['e7e6', 50], // French Defense
    ],
    balanced: [
      ['c7c5', 60],
      ['e7e5', 30],
      ['c7c6', 5],
      ['e7e6', 5],
    ],
    aggressive: [
      ['c7c5', 75], // Sicilian (Dragon / Najdorf)
      ['e7e5', 25], // Sharp open games
    ],
    'hyper-aggressive': [
      ['e7e5', 50], // Stafford / Traxler counterattack lines
      ['c7c5', 35], // Sharp Sicilian Dragon
      ['d7d5', 15], // Scandinavian Portuguese gambit lines
    ],
  },

  // 1.d4
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3': {
    default: [
      ['g8f6', 70], // Indian Defenses
      ['d7d5', 25], // Classical Queen's Gambit
      ['c7c5', 5], // Benoni
    ],
    'hyper-defensive': [
      ['d7d5', 70], // Slav / QGD solid setup
      ['g8f6', 30],
    ],
    defensive: [
      ['d7d5', 50], // QGD
      ['g8f6', 50], // Nimzo-Indian / Queen's Indian
    ],
    balanced: [
      ['g8f6', 70],
      ['d7d5', 25],
      ['c7c5', 5],
    ],
    aggressive: [
      ['g8f6', 80], // King's Indian Defense
      ['c7c5', 20], // Benoni
    ],
    'hyper-aggressive': [
      ['g8f6', 60], // Budapest Gambit / Benko setup
      ['c7c5', 25], // Benko Gambit
      ['e7e5', 15], // Englund Gambit
    ],
  },

  // 1.c4
  'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq c3': {
    default: [
      ['e7e5', 70],
      ['g8f6', 30],
    ],
    'hyper-defensive': [
      ['e7e6', 60],
      ['c7c6', 40],
    ],
    defensive: [
      ['e7e6', 50],
      ['c7c5', 50], // Symmetrical English
    ],
    balanced: [
      ['e7e5', 70],
      ['g8f6', 30],
    ],
    aggressive: [
      ['e7e5', 80],
      ['g8f6', 20],
    ],
    'hyper-aggressive': [
      ['e7e5', 70],
      ['f7f5', 30], // Dutch vs English
    ],
  },

  // 1.Nf3
  'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq -': {
    default: [
      ['d7d5', 60],
      ['g8f6', 40],
    ],
    'hyper-defensive': [
      ['d7d5', 70],
      ['c7c6', 30],
    ],
    defensive: [
      ['d7d5', 60],
      ['g8f6', 40],
    ],
    balanced: [
      ['d7d5', 60],
      ['g8f6', 40],
    ],
    aggressive: [
      ['g8f6', 70],
      ['c7c5', 30],
    ],
    'hyper-aggressive': [
      ['c7c5', 60],
      ['g8f6', 40],
    ],
  },

  // =========================================================================
  // === PLY 3 (White 2nd move) ===
  // =========================================================================
  // 1.e4 e5
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': {
    default: [
      ['g1f3', 75], // Mainline
      ['f1c4', 15], // Bishop's Opening
      ['f2f4', 10], // King's Gambit
    ],
    'hyper-defensive': [
      ['g1f3', 100], // Standard development
    ],
    defensive: [
      ['g1f3', 80],
      ['f1c4', 20],
    ],
    balanced: [
      ['g1f3', 75],
      ['f1c4', 15],
      ['f2f4', 10],
    ],
    aggressive: [
      ['f2f4', 50], // King's Gambit!
      ['g1f3', 30], // Italian / Evans / Scotch
      ['b1c3', 20], // Vienna Game
    ],
    'hyper-aggressive': [
      ['d2d4', 50], // Danish Gambit!
      ['f2f4', 40], // King's Gambit!
      ['b1c3', 10], // Vienna Gambit
    ],
  },

  // 1.e4 c5 (Sicilian)
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6': {
    default: [
      ['g1f3', 75], // Open Sicilian
      ['d2d4', 15], // Smith-Morra
      ['b1c3', 10], // Closed Sicilian
    ],
    'hyper-defensive': [
      ['g1f3', 60],
      ['c2c3', 40], // Alapin solid
    ],
    defensive: [
      ['g1f3', 70],
      ['c2c3', 30],
    ],
    balanced: [
      ['g1f3', 75],
      ['d2d4', 15],
      ['b1c3', 10],
    ],
    aggressive: [
      ['d2d4', 55], // Smith-Morra Gambit!
      ['f2f4', 30], // Grand Prix Attack!
      ['g1f3', 15],
    ],
    'hyper-aggressive': [
      ['d2d4', 60], // Smith-Morra Gambit!
      ['b2b4', 40], // Sicilian Wing Gambit!
    ],
  },

  // 1.e4 e6 (French)
  'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [['d2d4', 100]],

  // 1.e4 c6 (Caro-Kann)
  'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': {
    default: [['d2d4', 100]],
    aggressive: [
      ['d2d4', 70],
      ['c2c4', 30], // Panov Attack
    ],
    'hyper-aggressive': [
      ['d2d4', 60],
      ['f2f4', 40],
    ],
  },

  // 1.e4 d5 (Scandinavian)
  'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6': {
    default: [['e4d5', 100]],
    'hyper-aggressive': [
      ['e4d5', 80],
      ['g1f3', 20], // Tennison Gambit
    ],
  },

  // 1.d4 d5
  'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': {
    default: [
      ['c2c4', 85], // Queen's Gambit
      ['g1f3', 15],
    ],
    'hyper-defensive': [
      ['g1f3', 70], // London / Colle
      ['c2c4', 30],
    ],
    defensive: [
      ['c2c4', 70],
      ['g1f3', 30],
    ],
    balanced: [
      ['c2c4', 85],
      ['g1f3', 15],
    ],
    aggressive: [
      ['c2c4', 75],
      ['e2e4', 25], // Blackmar-Diemer Gambit!
    ],
    'hyper-aggressive': [
      ['e2e4', 70], // Blackmar-Diemer Gambit!
      ['c2c4', 30],
    ],
  },

  // 1.d4 Nf6
  'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': {
    default: [
      ['c2c4', 85],
      ['g1f3', 15],
    ],
    'hyper-defensive': [
      ['g1f3', 60],
      ['c2c4', 40],
    ],
    defensive: [
      ['c2c4', 70],
      ['g1f3', 30],
    ],
    balanced: [
      ['c2c4', 85],
      ['g1f3', 15],
    ],
    aggressive: [
      ['c2c4', 80],
      ['c1g5', 20], // Trompowsky Attack
    ],
    'hyper-aggressive': [
      ['c1g5', 60], // Trompowsky Attack!
      ['c2c4', 40],
    ],
  },

  // =========================================================================
  // === PLY 4 (Black 2nd move) ===
  // =========================================================================
  // 1.e4 e5 2.Nf3
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': {
    default: [
      ['b8c6', 85], // Open Game
      ['g8f6', 15], // Petroff
    ],
    'hyper-defensive': [
      ['g8f6', 100], // Petroff Defense (The Russian Fortress)
    ],
    defensive: [
      ['b8c6', 70],
      ['g8f6', 30],
    ],
    balanced: [
      ['b8c6', 85],
      ['g8f6', 15],
    ],
    aggressive: [
      ['b8c6', 80],
      ['g8f6', 20],
    ],
    'hyper-aggressive': [
      ['g8f6', 60], // Stafford Gambit setup
      ['f7f5', 30], // Latvian Gambit!
      ['b8c6', 10], // Traxler preparation
    ],
  },

  // 1.e4 e5 2.f4 (King's Gambit)
  'rnbqkbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR b KQkq f3': {
    default: [
      ['e5f4', 80],
      ['d7d5', 20],
    ],
    'hyper-defensive': [
      ['d7d5', 60], // Falkbeer Countergambit solid
      ['e5f4', 40],
    ],
    defensive: [
      ['d7d5', 50],
      ['e5f4', 50],
    ],
    balanced: [
      ['e5f4', 80],
      ['d7d5', 20],
    ],
    aggressive: [
      ['e5f4', 85],
      ['d7d5', 15],
    ],
    'hyper-aggressive': [
      ['e5f4', 80],
      ['f8c5', 20], // King's Gambit Declined counterattack
    ],
  },

  // 1.e4 e5 2.d4 (Center Game / Danish)
  'rnbqkbnr/pppp1ppp/8/4p3/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3': [['e5d4', 100]],

  // 1.e4 c5 2.Nf3
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': {
    default: [
      ['d7d6', 60],
      ['b8c6', 30],
      ['e7e6', 10],
    ],
    'hyper-defensive': [
      ['e7e6', 60],
      ['d7d6', 40],
    ],
    defensive: [
      ['e7e6', 50],
      ['b8c6', 30],
      ['d7d6', 20],
    ],
    balanced: [
      ['d7d6', 60],
      ['b8c6', 30],
      ['e7e6', 10],
    ],
    aggressive: [
      ['d7d6', 70], // Dragon / Najdorf setup
      ['b8c6', 30],
    ],
    'hyper-aggressive': [
      ['d7d6', 65], // Dragon setup
      ['g7g6', 35], // Accelerated Dragon
    ],
  },

  // 1.e4 c5 2.d4 (Smith-Morra)
  'rnbqkbnr/pp1ppppp/8/2p5/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3': [['c5d4', 100]],

  // 1.e4 c5 2.b4 (Wing Gambit)
  'rnbqkbnr/pp1ppppp/8/2p5/1P6/8/P1PPPPPP/RNBQKBNR b KQkq b3': [['c5b4', 100]],

  // 1.e4 c5 2.f4 (Grand Prix)
  'rnbqkbnr/pp1ppppp/8/2p5/4PP2/8/PPPP2PP/RNBQKBNR b KQkq f3': [
    ['d7d6', 60],
    ['b8c6', 40],
  ],

  // 1.e4 e6 2.d4 (French)
  'rnbqkbnr/pppp1ppp/4p3/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3': [['d7d5', 100]],

  // 1.e4 c6 2.d4 (Caro-Kann)
  'rnbqkbnr/pp1ppppp/2p5/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3': [['d7d5', 100]],

  // 1.e4 d5 2.exd5 (Scandinavian)
  'rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR b KQkq -': {
    default: [
      ['d8d5', 70],
      ['g8f6', 30],
    ],
    'hyper-defensive': [['d8d5', 100]],
    defensive: [['d8d5', 100]],
    balanced: [
      ['d8d5', 70],
      ['g8f6', 30],
    ],
    aggressive: [
      ['g8f6', 75], // Portuguese / Icelandic Gambit
      ['d8d5', 25],
    ],
    'hyper-aggressive': [
      ['g8f6', 85], // Portuguese Gambit!
      ['d8d5', 15],
    ],
  },

  // 1.d4 d5 2.c4 (Queen's Gambit)
  'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3': {
    default: [
      ['e7e6', 70], // QGD
      ['c7c6', 20], // Slav
      ['d5c4', 10], // QGA
    ],
    'hyper-defensive': [
      ['c7c6', 60], // Slav Defense (ironclad)
      ['e7e6', 40],
    ],
    defensive: [
      ['e7e6', 60],
      ['c7c6', 40],
    ],
    balanced: [
      ['e7e6', 70],
      ['c7c6', 20],
      ['d5c4', 10],
    ],
    aggressive: [
      ['d5c4', 50], // QGA
      ['e7e6', 30],
      ['c7c6', 20],
    ],
    'hyper-aggressive': [
      ['e7e5', 60], // Albin Countergambit!
      ['d5c4', 30], // QGA
      ['b8c6', 10], // Chigorin
    ],
  },

  // 1.d4 d5 2.e4 (Blackmar-Diemer)
  'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3': [['d5e4', 100]],

  // 1.d4 Nf6 2.c4
  'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3': {
    default: [
      ['e7e6', 50], // Nimzo-Indian path
      ['g7g6', 30], // King's Indian
      ['c7c5', 20], // Benoni
    ],
    'hyper-defensive': [
      ['e7e6', 70],
      ['g7g6', 30],
    ],
    defensive: [
      ['e7e6', 60],
      ['g7g6', 40],
    ],
    balanced: [
      ['e7e6', 50],
      ['g7g6', 30],
      ['c7c5', 20],
    ],
    aggressive: [
      ['g7g6', 70], // King's Indian Mar del Plata
      ['c7c5', 30], // Benoni
    ],
    'hyper-aggressive': [
      ['e7e5', 50], // Budapest Gambit!
      ['c7c5', 35], // Benko Gambit setup
      ['g7g6', 15],
    ],
  },

  // =========================================================================
  // === PLY 5 (White 3rd move) ===
  // =========================================================================
  // 1.e4 e5 2.Nf3 Nc6
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': {
    default: [
      ['f1c4', 50], // Italian
      ['f1b5', 35], // Ruy Lopez
      ['d2d4', 15], // Scotch
    ],
    'hyper-defensive': [
      ['f1b5', 60], // Ruy Lopez (Berlin path)
      ['b1c3', 40], // Four Knights
    ],
    defensive: [
      ['f1b5', 60],
      ['f1c4', 40],
    ],
    balanced: [
      ['f1c4', 50],
      ['f1b5', 35],
      ['d2d4', 15],
    ],
    aggressive: [
      ['f1c4', 65], // Italian / Evans / Fried Liver
      ['d2d4', 35], // Scotch Gambit
    ],
    'hyper-aggressive': [
      ['f1c4', 70], // Evans Gambit & Fried Liver setup
      ['d2d4', 30], // Scotch Gambit
    ],
  },

  // 1.e4 e5 2.Nf3 Nf6 (Petroff / Stafford setup)
  'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': {
    default: [
      ['f3e5', 80],
      ['d2d4', 20],
    ],
    'hyper-defensive': [['f3e5', 100]],
    defensive: [
      ['f3e5', 80],
      ['d2d4', 20],
    ],
    balanced: [
      ['f3e5', 80],
      ['d2d4', 20],
    ],
    aggressive: [
      ['f3e5', 70],
      ['f1c4', 30],
    ],
    'hyper-aggressive': [
      ['f3e5', 70], // Takes knight, invites Stafford Gambit!
      ['f1c4', 30],
    ],
  },

  // 1.e4 e5 2.d4 exd4 (Center Game / Danish)
  'rnbqkbnr/pppp1ppp/8/8/3pP3/8/PPP2PPP/RNBQKBNR w KQkq -': {
    default: [
      ['c2c3', 70],
      ['g1f3', 30],
    ],
    'hyper-aggressive': [
      ['c2c3', 90], // Danish Gambit!
      ['g1f3', 10],
    ],
    aggressive: [
      ['c2c3', 75],
      ['g1f3', 25],
    ],
  },

  // 1.e4 e5 2.f4 exf4 (King's Gambit Accepted)
  'rnbqkbnr/pppp1ppp/8/8/4Pp2/8/PPPP2PP/RNBQKBNR w KQkq -': {
    default: [
      ['g1f3', 80], // King's Knight Gambit
      ['f1c4', 20], // Bishop's Gambit
    ],
    'hyper-aggressive': [
      ['f1c4', 60], // Bishop's Gambit (Muzio sacrifice line!)
      ['g1f3', 40],
    ],
  },

  // 1.e4 c5 2.Nf3 d6 (Open Sicilian)
  'rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': [['d2d4', 100]],

  // 1.e4 c5 2.d4 cxd4 (Smith-Morra)
  'rnbqkbnr/pp1ppppp/8/8/3pP3/8/PPP2PPP/RNBQKBNR w KQkq -': {
    default: [
      ['c2c3', 80],
      ['g1f3', 20],
    ],
    aggressive: [
      ['c2c3', 90],
      ['g1f3', 10],
    ],
    'hyper-aggressive': [
      ['c2c3', 90],
      ['g1f3', 10],
    ],
  },

  // 1.e4 e6 2.d4 d5 (French)
  'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq -': [
    ['b1c3', 60],
    ['e4e5', 40],
  ],

  // 1.e4 c6 2.d4 d5 (Caro-Kann)
  'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq -': [
    ['b1c3', 60],
    ['e4e5', 40],
  ],

  // 1.d4 d5 2.c4 e6
  'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -': [
    ['b1c3', 70],
    ['g1f3', 30],
  ],

  // 1.d4 d5 2.e4 dxe4 (Blackmar-Diemer)
  'rnbqkbnr/ppp1pppp/8/8/4p3/8/PPPP1PPP/RNBQKBNR w KQkq -': [['b1c3', 100]],

  // 1.d4 Nf6 2.c4 e6
  'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -': [
    ['b1c3', 70],
    ['g1f3', 30],
  ],

  // 1.d4 Nf6 2.c4 g6
  'rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -': [
    ['b1c3', 80],
    ['g1f3', 20],
  ],

  // 1.d4 Nf6 2.c4 c5 3.d5 (Benoni / Benko)
  'rnbqkb1r/pp1ppppp/5n2/2pP4/2P5/8/PP2PPPP/RNBQKBNR b KQkq -': {
    default: [
      ['e7e6', 60],
      ['b7b5', 40],
    ],
    'hyper-aggressive': [
      ['b7b5', 80], // Benko Gambit!
      ['e7e6', 20],
    ],
    aggressive: [
      ['b7b5', 60], // Benko Gambit
      ['e7e6', 40],
    ],
  },

  // 1.d4 Nf6 2.c4 e5 3.dxe5 (Budapest Gambit)
  'rnbqkb1r/pppp1ppp/5n2/4P3/2P5/8/PP2PPPP/RNBQKBNR b KQkq -': [['f6g4', 100]],

  // 1.d4 d5 2.c4 e5 3.dxe5 (Albin Countergambit)
  'rnbqkbnr/ppp2ppp/8/3pP3/2P5/8/PP2PPPP/RNBQKBNR b KQkq -': [['d5d4', 100]],

  // =========================================================================
  // === PLY 6 (Black 3rd move or White 4th move) ===
  // =========================================================================
  // 1.e4 e5 2.Nf3 Nc6 3.Bc4 (Italian)
  'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq -': {
    default: [
      ['f8c5', 50],
      ['g8f6', 50], // Two Knights
    ],
    'hyper-defensive': [
      ['f8c5', 70],
      ['g8f6', 30],
    ],
    defensive: [
      ['f8c5', 60],
      ['g8f6', 40],
    ],
    balanced: [
      ['f8c5', 50],
      ['g8f6', 50],
    ],
    aggressive: [
      ['g8f6', 70], // Two Knights (welcomes 4.Ng5)
      ['f8c5', 30],
    ],
    'hyper-aggressive': [
      ['g8f6', 90], // Traxler Counterattack intent!
      ['f8c5', 10],
    ],
  },

  // 1.e4 e5 2.Nf3 Nc6 3.Bb5 (Ruy Lopez)
  'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq -': {
    default: [
      ['a7a6', 75], // Morphy
      ['g8f6', 25], // Berlin
    ],
    'hyper-defensive': [
      ['g8f6', 90], // Berlin Defense (The Wall)
      ['a7a6', 10],
    ],
    defensive: [
      ['g8f6', 50],
      ['a7a6', 50],
    ],
    balanced: [
      ['a7a6', 75],
      ['g8f6', 25],
    ],
    aggressive: [
      ['a7a6', 80],
      ['f7f5', 20], // Schliemann Gambit
    ],
    'hyper-aggressive': [
      ['f7f5', 60], // Schliemann Gambit!
      ['a7a6', 40],
    ],
  },

  // 1.e4 e5 2.Nf3 Nc6 3.d4 (Scotch)
  'r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3': [['e5d4', 100]],

  // 1.e4 e5 2.Nf3 Nf6 3.Nxe5 (Petroff / Stafford)
  'rnbqkb1r/pppp1ppp/8/4N3/4P3/8/PPPP1PPP/RNBQKB1R b KQkq -': {
    default: [
      ['d7d6', 85],
      ['b8c6', 15],
    ],
    'hyper-defensive': [['d7d6', 100]],
    defensive: [['d7d6', 100]],
    balanced: [
      ['d7d6', 85],
      ['b8c6', 15],
    ],
    aggressive: [
      ['d7d6', 50],
      ['b8c6', 50], // Stafford Gambit!
    ],
    'hyper-aggressive': [
      ['b8c6', 90], // Stafford Gambit! (Eric Rosen's sacrificial line)
      ['d7d6', 10],
    ],
  },

  // 1.e4 e5 2.d4 exd4 3.c3 (Danish Gambit)
  'rnbqkbnr/pppp1ppp/8/8/3pP3/2P5/PP3PPP/RNBQKBNR b KQkq -': {
    default: [
      ['d4c3', 80],
      ['d7d5', 20],
    ],
    aggressive: [
      ['d4c3', 85],
      ['d7d5', 15],
    ],
    'hyper-aggressive': [
      ['d4c3', 90], // Accept the sacrifice
      ['d7d5', 10],
    ],
  },

  // 1.d4 d5 2.e4 dxe4 3.Nc3 (Blackmar-Diemer)
  'rnbqkbnr/ppp1pppp/8/8/4p3/2N5/PPPP1PPP/R1BQKBNR b KQkq -': [['g8f6', 100]],

  // 1.e4 c5 2.Nf3 d6 3.d4 cxd4
  'rnbqkbnr/pp2pppp/3p4/8/3pP3/5N2/PPP2PPP/RNBQKB1R w KQkq -': [['f3d4', 100]],

  // 1.e4 c5 2.d4 cxd4 3.c3 dxc3 (Smith-Morra Accepted)
  'rnbqkbnr/pp1ppppp/8/8/4P3/2p5/PP3PPP/RNBQKBNR w KQkq -': [['b1c3', 100]],

  // 1.d4 d5 2.c4 e6 3.Nc3
  'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq -': [
    ['g8f6', 80],
    ['c7c6', 20],
  ],

  // 1.d4 Nf6 2.c4 e6 3.Nc3
  'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq -': [
    ['f8b4', 70], // Nimzo-Indian
    ['d7d5', 30],
  ],

  // 1.d4 Nf6 2.c4 g6 3.Nc3
  'rnbqkb1r/pppppp1p/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq -': [
    ['d7d5', 50], // Grünfeld
    ['f8g7', 50], // King's Indian
  ],

  // =========================================================================
  // === PLY 7 (White 4th move) ===
  // =========================================================================
  // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 (Two Knights Defense)
  'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq -': {
    default: [
      ['d2d3', 60],
      ['f3g5', 30], // Fried Liver / Knight Attack
      ['d2d4', 10],
    ],
    'hyper-defensive': [
      ['d2d3', 80],
      ['d2d4', 20],
    ],
    defensive: [
      ['d2d3', 75],
      ['d2d4', 25],
    ],
    balanced: [
      ['d2d3', 60],
      ['f3g5', 30],
      ['d2d4', 10],
    ],
    aggressive: [
      ['f3g5', 70], // Knight Attack!
      ['d2d4', 30],
    ],
    'hyper-aggressive': [
      ['f3g5', 85], // Direct attack on f7!
      ['d2d4', 15],
    ],
  },

  // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 (Giuoco Piano)
  'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq -': {
    default: [
      ['c2c3', 60],
      ['d2d3', 30],
      ['b2b4', 10], // Evans Gambit
    ],
    'hyper-defensive': [
      ['d2d3', 70],
      ['c2c3', 30],
    ],
    defensive: [
      ['d2d3', 60],
      ['c2c3', 40],
    ],
    balanced: [
      ['c2c3', 60],
      ['d2d3', 30],
      ['b2b4', 10],
    ],
    aggressive: [
      ['b2b4', 60], // Evans Gambit!
      ['c2c3', 40],
    ],
    'hyper-aggressive': [
      ['b2b4', 85], // Evans Gambit!
      ['c2c3', 15],
    ],
  },

  // 1.e4 e5 2.Nf3 Nc6 3.d4 exd4 4.Bc4 (Scotch Gambit)
  'r1bqkbnr/pppp1ppp/2n5/8/2BpP3/5N2/PPP2PPP/RNBQK2R b KQkq -': [
    ['f8c5', 50],
    ['g8f6', 50],
  ],

  // 1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nc6 4.Nxc6 dxc6 (Stafford Gambit accepted)
  'r1bqkb1r/ppp2ppp/2p5/4P3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq -': [
    ['d2d3', 80],
    ['b1c3', 20],
  ],

  // 1.d4 d5 2.e4 dxe4 3.Nc3 Nf6 4.f3 (Blackmar-Diemer Ryder Gambit)
  'rnbqkb1r/ppp1pppp/5n2/8/4p3/2N2P2/PPPP2PP/R1BQKBNR b KQkq -': [['e4f3', 100]],

  // =========================================================================
  // === PLY 8 (Black 4th move) ===
  // =========================================================================
  // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 (Fried Liver setup -> Traxler Fork!)
  'r1bqkb1r/pppp1ppp/2n2n2/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq -': {
    default: [['d7d5', 100]],
    'hyper-defensive': [['d7d5', 100]],
    defensive: [['d7d5', 100]],
    balanced: [['d7d5', 100]],
    aggressive: [
      ['d7d5', 75],
      ['f8c5', 25], // Traxler Counterattack!
    ],
    'hyper-aggressive': [
      ['f8c5', 90], // Traxler Counterattack!! (Bxf2+ king hunt)
      ['d7d5', 10],
    ],
  },

  // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 Bxb4 5.c3 (Evans Gambit Accepted)
  'r1bqk1nr/pppp1ppp/2n5/8/1bB1P3/2P2N2/P2P1PPP/RNBQK2R b KQkq -': [
    ['b4a5', 70],
    ['b4e7', 30],
  ],

  // 1.e4 e5 2.d4 exd4 3.c3 dxc3 4.Bc4 cxb2 5.Bxb2 (Danish Double Gambit!)
  'rnbqkbnr/pppp1ppp/8/8/2B1P3/8/PB3PPP/RN1QK1NR b KQkq -': [
    ['d7d6', 50],
    ['g8f6', 50],
  ],

  // 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3
  'rnbqkb1r/pp2pppp/3p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R b KQkq -': {
    default: [
      ['a7a6', 60], // Najdorf
      ['g7g6', 25], // Dragon
      ['b8c6', 15], // Classical
    ],
    'hyper-defensive': [
      ['a7a6', 50],
      ['e7e6', 50], // Scheveningen
    ],
    defensive: [
      ['e7e6', 50],
      ['a7a6', 50],
    ],
    balanced: [
      ['a7a6', 60],
      ['g7g6', 25],
      ['b8c6', 15],
    ],
    aggressive: [
      ['g7g6', 65], // Sicilian Dragon!
      ['a7a6', 35],
    ],
    'hyper-aggressive': [
      ['g7g6', 80], // Sicilian Dragon!
      ['a7a6', 20],
    ],
  },
};

/** Ep-insensitive view of EPD_BOOK. Duplicate keys would silently shadow each other. */
const EPD_INDEX: Record<string, BookEntry> = (() => {
  const index: Record<string, BookEntry> = {};
  for (const [epd, entry] of Object.entries(EPD_BOOK)) {
    const key = bookKey(epd);
    if (index[key]) throw new Error(`duplicate opening book key: ${key}`);
    index[key] = entry;
  }
  return index;
})();

/**
 * Returns candidate moves for the given EPD position, taking the requested opening style into account.
 */
function getCandidatesForPosition(epd: string, style: OpeningStyle = 'balanced'): CandidateMove[] | null {
  const entry = EPD_INDEX[bookKey(epd)];
  if (!entry) return null;

  if (Array.isArray(entry)) {
    return entry;
  }

  const styleCandidates = entry[style];
  if (styleCandidates && styleCandidates.length > 0) {
    return styleCandidates;
  }

  return entry.default ?? entry.balanced ?? null;
}

/**
 * Looks up the best or weighted opening move for the given FEN.
 * Accepts either:
 * - (fen) -> style defaults to 'balanced', rng defaults to Math.random
 * - (fen, rng) -> style defaults to 'balanced', custom rng function (for deterministic testing)
 * - (fen, style) -> specified style, rng defaults to Math.random
 * - (fen, style, rng) -> specified style and custom rng function
 */
export function lookupBookMove(
  fen: string,
  styleOrRng?: OpeningStyle | (() => number),
  rng?: () => number,
): string | null {
  let style: OpeningStyle = 'balanced';
  let rand = rng ?? Math.random;

  if (typeof styleOrRng === 'function') {
    rand = styleOrRng;
  } else if (styleOrRng !== undefined) {
    style = styleOrRng;
  }

  const epd = normalizeEpd(fen);
  const candidates = getCandidatesForPosition(epd, style);
  if (!candidates || candidates.length === 0) return null;

  const totalWeight = candidates.reduce((sum, [, w]) => sum + w, 0);
  let threshold = rand() * totalWeight;
  for (const [move, weight] of candidates) {
    threshold -= weight;
    if (threshold <= 0) return move;
  }
  return candidates[0][0];
}

/** @license GPL-3.0-or-later */
import type { OpeningStyle } from '../../chess/types.js';

export type CandidateMove = [move: string, weight: number];

export type BookEntry =
  | CandidateMove[]
  | (Partial<Record<OpeningStyle, CandidateMove[]>> & { default: CandidateMove[] });

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

  // 1.e4 e5 2.d4 (Center Game / Danish) — single pawn push, no ep square
  'rnbqkbnr/pppp1ppp/8/4p3/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -': [['e5d4', 100]],

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

  // 1.e4 c5 2.d4 (Smith-Morra) — single pawn push, no ep square
  'rnbqkbnr/pp1ppppp/8/2p5/3PP3/8/PPP2PPP/RNBQKBNR b KQkq -': [['c5d4', 100]],

  // 1.e4 c5 2.b4 (Sicilian Wing Gambit) — 2.b4 is a double push, and the e4 pawn is still on e4.
  'rnbqkbnr/pp1ppppp/8/2p5/1P2P3/8/P1PPPPPP/RNBQKBNR b KQkq b3': [['c5b4', 100]],

  // 1.e4 c5 2.f4 (Grand Prix)
  'rnbqkbnr/pp1ppppp/8/2p5/4PP2/8/PPPP2PP/RNBQKBNR b KQkq f3': [
    ['d7d6', 60],
    ['b8c6', 40],
  ],

  // 1.e4 e6 2.d4 (French) — single pawn push, no ep square
  'rnbqkbnr/pppp1ppp/4p3/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq -': [['d7d5', 100]],

  // 1.e4 c6 2.d4 (Caro-Kann) — single pawn push, no ep square
  'rnbqkbnr/pp1ppppp/2p5/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq -': [['d7d5', 100]],

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

  // 1.d4 d5 2.e4 (Blackmar-Diemer) — single pawn push, no ep square
  'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -': [['d5e4', 100]],

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

  // =========================================================================
  // === CONTINUATION HUBS ===
  // === Positions that earlier entries offered as candidates but that had no ===
  // === entry of their own, plus the mainline hubs those candidates lead to. ===
  // =========================================================================
  // --------------------------------------------------------------------------
  // === SICILIAN ===
  // --------------------------------------------------------------------------

  // Open Sicilian hub: 4...Nf6 was the only continuation before.
  // e4 c5 Nf3 d6 d4 cxd4 Nxd4
  'rnbqkbnr/pp2pppp/3p4/8/3NP3/8/PPP2PPP/RNBQKB1R b KQkq -': {
    default: [
      ['a7a6', 55],
      ['g8f6', 30],
      ['b8c6', 15],
    ],
    'hyper-defensive': [
      ['b8c6', 50],
      ['g8f6', 50],
    ],
    defensive: [
      ['g8f6', 50],
      ['b8c6', 50],
    ],
    balanced: [
      ['a7a6', 55],
      ['g8f6', 30],
      ['b8c6', 15],
    ],
    aggressive: [
      ['g7g6', 55],
      ['a7a6', 25],
      ['g8f6', 20],
    ],
    'hyper-aggressive': [
      ['g7g6', 70],
      ['a7a6', 30],
    ],
  },

  // Open Sicilian 4...Nf6: the 5.Nc3 hub had no entry leading into it.
  // e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6
  'rnbqkb1r/pp2pppp/3p1n2/8/3NP3/8/PPP2PPP/RNBQKB1R w KQkq -': {
    default: [
      ['b1c3', 70],
      ['g2g3', 15],
      ['f1c4', 15],
    ],
    'hyper-defensive': [
      ['f1c4', 55],
      ['b1c3', 45],
    ],
    defensive: [
      ['b1c3', 60],
      ['f1c4', 40],
    ],
    balanced: [
      ['b1c3', 70],
      ['g2g3', 15],
      ['f1c4', 15],
    ],
    aggressive: [
      ['b1c3', 60],
      ['g2g3', 40],
    ],
    'hyper-aggressive': [
      ['g2g3', 60],
      ['f1c4', 40],
    ],
  },

  // Najdorf hub — the most played Sicilian position in the chess world.
  // e4 c5 Nf3 d6 d4 cxd4 Nxd4 a6 Nc3
  'rnbqkbnr/1p2pppp/p2p4/8/3NP3/2N5/PPP2PPP/R1BQKB1R b KQkq -': {
    default: [
      ['g8f6', 60],
      ['b8d7', 30],
      ['e7e6', 10],
    ],
    'hyper-defensive': [
      ['b8d7', 60],
      ['g8f6', 40],
    ],
    defensive: [
      ['b8d7', 55],
      ['g8f6', 45],
    ],
    balanced: [
      ['g8f6', 60],
      ['b8d7', 30],
      ['e7e6', 10],
    ],
    aggressive: [
      ['g8f6', 55],
      ['b7b5', 45],
    ],
    'hyper-aggressive': [
      ['b7b5', 70],
      ['g8f6', 30],
    ],
  },

  // Taimanov / Scheveningen setup: 2...e6 had no continuation.
  // e4 c5 Nf3 e6
  'rnbqkbnr/pp1p1ppp/4p3/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': {
    default: [
      ['d2d4', 80],
      ['b1c3', 20],
    ],
    'hyper-defensive': [
      ['d2d4', 85],
      ['f3e5', 15],
    ],
    defensive: [
      ['d2d4', 90],
      ['b1c3', 10],
    ],
    balanced: [
      ['d2d4', 80],
      ['b1c3', 20],
    ],
    aggressive: [
      ['b1c3', 55],
      ['f3e5', 45],
    ],
    'hyper-aggressive': [
      ['f3e5', 70],
      ['b1c3', 30],
    ],
  },

  // Closed Sicilian: 2...Nc6 had no continuation.
  // e4 c5 Nf3 Nc6
  'r1bqkbnr/pp1ppppp/2n5/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': {
    default: [
      ['d2d4', 70],
      ['c2c3', 30],
    ],
    'hyper-defensive': [
      ['c2c3', 60],
      ['d2d4', 40],
    ],
    defensive: [
      ['c2c3', 55],
      ['d2d4', 45],
    ],
    balanced: [
      ['d2d4', 70],
      ['c2c3', 30],
    ],
    aggressive: [
      ['b1c3', 50],
      ['d2d4', 50],
    ],
    'hyper-aggressive': [
      ['b1c3', 70],
      ['g2g3', 30],
    ],
  },

  // Closed Sicilian after 2.Nc3.
  // e4 c5 Nc3 Nc6
  'r1bqkbnr/pp1ppppp/2n5/2p5/4P3/2N5/PPPP1PPP/R1BQKBNR w KQkq -': {
    default: [
      ['g2g3', 60],
      ['d2d4', 40],
    ],
    'hyper-defensive': [
      ['g2g3', 65],
      ['d2d4', 35],
    ],
    defensive: [
      ['g2g3', 70],
      ['d2d4', 30],
    ],
    balanced: [
      ['g2g3', 60],
      ['d2d4', 40],
    ],
    aggressive: [
      ['d2d4', 60],
      ['f1b5', 40],
    ],
    'hyper-aggressive': [
      ['f1b5', 60],
      ['d2d4', 40],
    ],
  },

  // Alapin: 2.c3 is offered by the defensive styles and had no continuation.
  // e4 c5 c3 d5 (ep d6)
  'rnbqkbnr/pp2pppp/8/2pp4/4P3/2P5/PP1P1PPP/RNBQKBNR w KQkq d6': {
    default: [
      ['d2d4', 75],
      ['g1f3', 25],
    ],
    'hyper-defensive': [
      ['g1f3', 70],
      ['d2d4', 30],
    ],
    defensive: [
      ['g1f3', 75],
      ['d2d4', 25],
    ],
    balanced: [
      ['d2d4', 75],
      ['g1f3', 25],
    ],
    aggressive: [
      ['d2d4', 85],
      ['f2f4', 15],
    ],
    'hyper-aggressive': [
      ['d2d4', 90],
      ['f2f4', 10],
    ],
  },

  // --------------------------------------------------------------------------
  // === CARO-KANN ===
  // --------------------------------------------------------------------------

  // Caro-Kann hub: 3.Nc3 had no Black continuation.
  // e4 c6 d4 d5 Nc3
  'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR b KQkq -': {
    default: [
      ['d5e4', 45],
      ['g8f6', 30],
      ['e7e5', 15],
      ['b8d7', 10],
    ],
    'hyper-defensive': [
      ['g8f6', 55],
      ['d5e4', 45],
    ],
    defensive: [
      ['d5e4', 55],
      ['g8f6', 45],
    ],
    balanced: [
      ['d5e4', 45],
      ['g8f6', 30],
      ['e7e5', 15],
      ['b8d7', 10],
    ],
    aggressive: [
      ['e7e5', 50],
      ['g8f6', 30],
      ['c8d7', 20],
    ],
    'hyper-aggressive': [
      ['e7e5', 60],
      ['c8d7', 40],
    ],
  },

  // Caro-Kann main line after 3...Nf6.
  // e4 c6 d4 d5 Nc3 Nf6
  'rnbqkb1r/pp2pppp/2p2n2/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR w KQkq -': {
    default: [
      ['g1f3', 60],
      ['c1g5', 25],
      ['c1f4', 15],
    ],
    'hyper-defensive': [
      ['f1e2', 60],
      ['c1f4', 40],
    ],
    defensive: [
      ['g1f3', 55],
      ['c1f4', 45],
    ],
    balanced: [
      ['g1f3', 60],
      ['c1g5', 25],
      ['c1f4', 15],
    ],
    aggressive: [
      ['g1f3', 60],
      ['c3d5', 40],
    ],
    'hyper-aggressive': [
      ['c3d5', 70],
      ['c1g5', 30],
    ],
  },

  // Caro-Kann Panov Attack (2.c4 for the aggressive styles).
  // e4 c6 d4 d5 c4 (ep c3)
  'rnbqkbnr/pp2pppp/2p5/3p4/2PPP3/8/PP3PPP/RNBQKBNR b KQkq c3': {
    default: [
      ['d5c4', 55],
      ['e7e5', 30],
      ['g8f6', 15],
    ],
    'hyper-defensive': [
      ['e7e5', 60],
      ['d5c4', 40],
    ],
    defensive: [
      ['e7e5', 65],
      ['g8f6', 35],
    ],
    balanced: [
      ['d5c4', 55],
      ['e7e5', 30],
      ['g8f6', 15],
    ],
    aggressive: [
      ['d5c4', 70],
      ['e7e5', 30],
    ],
    'hyper-aggressive': [
      ['d5c4', 80],
      ['e7e5', 20],
    ],
  },

  // --------------------------------------------------------------------------
  // === FRENCH ===
  // --------------------------------------------------------------------------

  // French hub: 3.Nc3 had no Black continuation (no Winawer).
  // e4 e6 d4 d5 Nc3
  'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR b KQkq -': {
    default: [
      ['g8f6', 40],
      ['f8b4', 40],
      ['f8e7', 20],
    ],
    'hyper-defensive': [
      ['g8f6', 60],
      ['f8e7', 40],
    ],
    defensive: [
      ['g8f6', 55],
      ['f8e7', 45],
    ],
    balanced: [
      ['g8f6', 40],
      ['f8b4', 40],
      ['f8e7', 20],
    ],
    aggressive: [
      ['f8b4', 65],
      ['g8f6', 35],
    ],
    'hyper-aggressive': [
      ['f8b4', 80],
      ['h7h6', 20],
    ],
  },

  // French Winawer, White to answer the pin.
  // e4 e6 d4 d5 Nc3 Bb4
  'rnbqk1nr/ppp2ppp/4p3/3p4/1b1PP3/2N5/PPP2PPP/R1BQKBNR w KQkq -': {
    default: [
      ['g1f3', 45],
      ['d1d2', 20],
      ['e4d5', 20],
      ['a2a3', 15],
    ],
    'hyper-defensive': [
      ['d1d2', 60],
      ['a2a3', 40],
    ],
    defensive: [
      ['a2a3', 65],
      ['d1d2', 35],
    ],
    balanced: [
      ['g1f3', 45],
      ['d1d2', 20],
      ['e4d5', 20],
      ['a2a3', 15],
    ],
    aggressive: [
      ['g1f3', 60],
      ['a2a3', 40],
    ],
    'hyper-aggressive': [
      ['g1f3', 70],
      ['a2a3', 30],
    ],
  },

  // French Steinitz: 3.e5 for the aggressive styles had no continuation.
  // e4 e6 d4 d5 e5 c5 (ep c6)
  'rnbqkbnr/pp3ppp/4p3/2ppP3/3P4/8/PPP2PPP/RNBQKBNR w KQkq c6': {
    default: [
      ['b1c3', 55],
      ['c2c3', 25],
      ['b1d2', 20],
    ],
    'hyper-defensive': [
      ['b1d2', 60],
      ['c2c3', 40],
    ],
    defensive: [
      ['c2c3', 55],
      ['b1d2', 45],
    ],
    balanced: [
      ['b1c3', 55],
      ['c2c3', 25],
      ['b1d2', 20],
    ],
    aggressive: [
      ['b1c3', 60],
      ['g1f3', 40],
    ],
    'hyper-aggressive': [
      ['b1c3', 70],
      ['g1f3', 30],
    ],
  },

  // --------------------------------------------------------------------------
  // === E4 FLANKERS ===
  // --------------------------------------------------------------------------

  // Philidor Defense: 1...Nf6 was missing for the hyper-defensive styles.
  // e4 Nf6
  'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': {
    default: [
      ['e4e5', 55],
      ['g1f3', 30],
      ['f1c4', 15],
    ],
    'hyper-defensive': [
      ['e4e5', 70],
      ['g1f3', 30],
    ],
    defensive: [
      ['e4e5', 65],
      ['g1f3', 35],
    ],
    balanced: [
      ['e4e5', 55],
      ['g1f3', 30],
      ['f1c4', 15],
    ],
    aggressive: [
      ['e4e5', 50],
      ['d2d4', 35],
      ['g1f3', 15],
    ],
    'hyper-aggressive': [
      ['d2d4', 60],
      ['e4e5', 40],
    ],
  },

  // Falkbeer Countergambit: 2...d5 is a hyper-defensive candidate and had no entry.
  // e4 e5 f4 d5 (ep d6)
  'rnbqkbnr/ppp2ppp/8/3pp3/4PP2/8/PPPP2PP/RNBQKBNR w KQkq d6': {
    default: [
      ['f4e5', 50],
      ['c2c4', 30],
      ['g1f3', 20],
    ],
    'hyper-defensive': [
      ['e4d5', 60],
      ['g1f3', 40],
    ],
    defensive: [
      ['e4d5', 65],
      ['g1f3', 35],
    ],
    balanced: [
      ['f4e5', 50],
      ['c2c4', 30],
      ['g1f3', 20],
    ],
    aggressive: [
      ['f4e5', 70],
      ['c2c4', 30],
    ],
    'hyper-aggressive': [
      ['f4e5', 80],
      ['c2c4', 20],
    ],
  },

  // Scandinavian Portuguese / Icelandic after 2...Nf6.
  // e4 d5 exd5 Nf6
  'rnbqkb1r/ppp1pppp/5n2/3P4/8/8/PPPP1PPP/RNBQKBNR w KQkq -': {
    default: [
      ['b1c3', 50],
      ['f1c4', 30],
      ['d5d6', 20],
    ],
    'hyper-defensive': [
      ['b1c3', 70],
      ['f1c4', 30],
    ],
    defensive: [
      ['b1c3', 65],
      ['f1c4', 35],
    ],
    balanced: [
      ['b1c3', 50],
      ['f1c4', 30],
      ['d5d6', 20],
    ],
    aggressive: [
      ['f1c4', 60],
      ['b1c3', 40],
    ],
    'hyper-aggressive': [
      ['f1c4', 70],
      ['b1c3', 30],
    ],
  },

  // --------------------------------------------------------------------------
  // === LONDON / COLLE ===
  // --------------------------------------------------------------------------

  // London hub from the Indian side; the ply-2 entry had no 2... reply.
  // d4 Nf6 Nf3
  'rnbqkb1r/pppppppp/5n2/8/3P4/5N2/PPP1PPPP/RNBQKB1R b KQkq -': {
    default: [
      ['d7d5', 60],
      ['c7c5', 15],
      ['g7g6', 10],
      ['e7e6', 15],
    ],
    'hyper-defensive': [
      ['d7d5', 70],
      ['e7e6', 30],
    ],
    defensive: [
      ['d7d5', 75],
      ['e7e6', 25],
    ],
    balanced: [
      ['d7d5', 60],
      ['c7c5', 15],
      ['g7g6', 10],
      ['e7e6', 15],
    ],
    aggressive: [
      ['c7c5', 45],
      ['g7g6', 40],
      ['d7d5', 15],
    ],
    'hyper-aggressive': [
      ['c7c5', 60],
      ['g7g6', 40],
    ],
  },

  // London / Nimzo-London hub; the 1.d4 d5 entry offered only 2.c4 and 2.Nf3.
  // d4 d5 Nf3
  'rnbqkbnr/ppp1pppp/8/3p4/3P4/5N2/PPP1PPPP/RNBQKB1R b KQkq -': {
    default: [
      ['g8f6', 65],
      ['e7e6', 20],
      ['c7c6', 15],
    ],
    'hyper-defensive': [
      ['g8f6', 65],
      ['e7e6', 35],
    ],
    defensive: [
      ['g8f6', 70],
      ['e7e6', 30],
    ],
    balanced: [
      ['g8f6', 65],
      ['e7e6', 20],
      ['c7c6', 15],
    ],
    aggressive: [
      ['g8f6', 55],
      ['c7c6', 25],
      ['c8d7', 20],
    ],
    'hyper-aggressive': [
      ['c8d7', 45],
      ['g8f6', 55],
    ],
  },

  // London System (also reached by 1.d4 Nf6 2.Nf3 d5 3.Bf4).
  // d4 d5 Nf3 Nf6 Bf4
  'rnbqkb1r/ppp1pppp/5n2/3p4/3P1B2/5N2/PPP1PPPP/RN1QKB1R b KQkq -': {
    default: [
      ['e7e6', 55],
      ['c7c6', 25],
      ['b8d7', 20],
    ],
    'hyper-defensive': [
      ['e7e6', 65],
      ['c7c6', 35],
    ],
    defensive: [
      ['e7e6', 70],
      ['c7c6', 30],
    ],
    balanced: [
      ['e7e6', 55],
      ['c7c6', 25],
      ['b8d7', 20],
    ],
    aggressive: [
      ['g7g6', 55],
      ['e7e6', 45],
    ],
    'hyper-aggressive': [
      ['g7g6', 65],
      ['c8d7', 35],
    ],
  },

  // Colle System.
  // d4 d5 Nf3 Nf6 e3
  'rnbqkb1r/ppp1pppp/5n2/3p4/3P4/4PN2/PPP2PPP/RNBQKB1R b KQkq -': {
    default: [
      ['e7e6', 45],
      ['c7c6', 35],
      ['c8d7', 20],
    ],
    'hyper-defensive': [
      ['e7e6', 60],
      ['c7c6', 40],
    ],
    defensive: [
      ['e7e6', 65],
      ['c7c6', 35],
    ],
    balanced: [
      ['e7e6', 45],
      ['c7c6', 35],
      ['c8d7', 20],
    ],
    aggressive: [
      ['g7g6', 50],
      ['e7e6', 50],
    ],
    'hyper-aggressive': [
      ['g7g6', 60],
      ['e7e6', 40],
    ],
  },

  // --------------------------------------------------------------------------
  // === BENONI / GRUNFELD ===
  // --------------------------------------------------------------------------

  // Benoni / Benko hub: 2...c5 was listed as a candidate but had no entry.
  // d4 Nf6 c4 c5 (ep c6)
  'rnbqkb1r/pp1ppppp/5n2/2p5/2PP4/8/PP2PPPP/RNBQKBNR w KQkq c6': {
    default: [
      ['d4d5', 80],
      ['b1c3', 20],
    ],
    'hyper-defensive': [
      ['g1f3', 55],
      ['b1c3', 45],
    ],
    defensive: [
      ['d4d5', 60],
      ['g1f3', 40],
    ],
    balanced: [
      ['d4d5', 80],
      ['b1c3', 20],
    ],
    aggressive: [
      ['d4d5', 70],
      ['f2f4', 30],
    ],
    'hyper-aggressive': [
      ['d4d5', 60],
      ['f2f4', 40],
    ],
  },

  // Modern Benoni after 4.Nc3.
  // d4 Nf6 c4 c5 d5 e6 Nc3
  'rnbqkb1r/pp1p1ppp/4pn2/2pP4/2P5/2N5/PP2PPPP/R1BQKBNR b KQkq -': {
    default: [
      ['g7g6', 70],
      ['h7h6', 30],
    ],
    'hyper-defensive': [
      ['f8d6', 50],
      ['g7g6', 50],
    ],
    defensive: [
      ['g7g6', 60],
      ['h7h6', 40],
    ],
    balanced: [
      ['g7g6', 70],
      ['h7h6', 30],
    ],
    aggressive: [
      ['g7g6', 80],
      ['h7h6', 20],
    ],
    'hyper-aggressive': [
      ['g7g6', 90],
      ['h7h6', 10],
    ],
  },

  // Modern Benoni main line after 4.g6.
  // d4 Nf6 c4 c5 d5 g6
  'rnbqkb1r/pp1ppp1p/5np1/2pP4/2P5/8/PP2PPPP/RNBQKBNR w KQkq -': {
    default: [
      ['b1c3', 70],
      ['g2g3', 30],
    ],
    'hyper-defensive': [
      ['g2g3', 50],
      ['c1g5', 50],
    ],
    defensive: [
      ['g2g3', 55],
      ['b1c3', 45],
    ],
    balanced: [
      ['b1c3', 70],
      ['g2g3', 30],
    ],
    aggressive: [
      ['b2b4', 50],
      ['b1c3', 50],
    ],
    'hyper-aggressive': [
      ['b2b4', 60],
      ['c1g5', 40],
    ],
  },

  // Benko Gambit after 4.Nc3.
  // d4 Nf6 c4 c5 d5 b5 Nc3
  'rnbqkb1r/p2ppppp/5n2/1ppP4/2P5/2N5/PP2PPPP/R1BQKBNR b KQkq -': {
    default: [
      ['a7a6', 60],
      ['e7e6', 25],
      ['b5c4', 15],
    ],
    'hyper-defensive': [
      ['e7e6', 45],
      ['a7a6', 40],
      ['f6g8', 15],
    ],
    defensive: [
      ['e7e6', 55],
      ['a7a6', 45],
    ],
    balanced: [
      ['a7a6', 60],
      ['e7e6', 25],
      ['b5c4', 15],
    ],
    aggressive: [
      ['b5c4', 70],
      ['a7a6', 30],
    ],
    'hyper-aggressive': [
      ['b5c4', 80],
      ['a7a6', 20],
    ],
  },

  // Grunfeld Defense after 4.Nf3.
  // d4 Nf6 c4 g6 Nc3 d5 Nf3
  'rnbqkb1r/ppp1pp1p/5np1/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R b KQkq -': {
    default: [
      ['c7c6', 45],
      ['f8g7', 35],
      ['g6g5', 20],
    ],
    'hyper-defensive': [
      ['f8g7', 60],
      ['c7c6', 40],
    ],
    defensive: [
      ['f8g7', 65],
      ['c7c6', 35],
    ],
    balanced: [
      ['c7c6', 45],
      ['f8g7', 35],
      ['g6g5', 20],
    ],
    aggressive: [
      ['c7c6', 55],
      ['g6g5', 45],
    ],
    'hyper-aggressive': [
      ['g6g5', 65],
      ['c7c6', 35],
    ],
  },

  // --------------------------------------------------------------------------
  // === NIMZO / KID / QUEEN'S INDIAN ===
  // --------------------------------------------------------------------------

  // Nimzo-Indian hub: 3...Bb4 had no White continuation.
  // d4 Nf6 c4 e6 Nc3 Bb4
  'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq -': {
    default: [
      ['e2e3', 55],
      ['d1d2', 20],
      ['g1f3', 15],
      ['a2a3', 10],
    ],
    'hyper-defensive': [
      ['e2e3', 65],
      ['d1d2', 35],
    ],
    defensive: [
      ['e2e3', 60],
      ['a2a3', 40],
    ],
    balanced: [
      ['e2e3', 55],
      ['d1d2', 20],
      ['g1f3', 15],
      ['a2a3', 10],
    ],
    aggressive: [
      ['g1f3', 60],
      ['a2a3', 40],
    ],
    'hyper-aggressive': [
      ['g1f3', 70],
      ['a2a3', 30],
    ],
  },

  // Nimzo Rubinstein after 4.e3.
  // d4 Nf6 c4 e6 Nc3 Bb4 e3
  'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N1P3/PP3PPP/R1BQKBNR b KQkq -': {
    default: [
      ['c7c5', 55],
      ['b4d6', 25],
      ['b8c6', 20],
    ],
    'hyper-defensive': [
      ['c7c5', 55],
      ['b8c6', 45],
    ],
    defensive: [
      ['b8c6', 50],
      ['c7c5', 50],
    ],
    balanced: [
      ['c7c5', 55],
      ['b4d6', 25],
      ['b8c6', 20],
    ],
    aggressive: [
      ['c7c5', 60],
      ['b4d6', 40],
    ],
    'hyper-aggressive': [
      ['c7c5', 70],
      ['b4d6', 30],
    ],
  },

  // King's Indian hub: 3...Bg7 had no White continuation.
  // d4 Nf6 c4 g6 Nc3 Bg7
  'rnbqk2r/ppppppbp/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq -': {
    default: [
      ['e2e4', 60],
      ['g1f3', 25],
      ['f2f3', 15],
    ],
    'hyper-defensive': [
      ['e2e4', 65],
      ['g1f3', 35],
    ],
    defensive: [
      ['g1f3', 55],
      ['e2e4', 45],
    ],
    balanced: [
      ['e2e4', 60],
      ['g1f3', 25],
      ['f2f3', 15],
    ],
    aggressive: [
      ['f2f3', 55],
      ['g1f3', 45],
    ],
    'hyper-aggressive': [
      ['e2e4', 70],
      ['f2f3', 30],
    ],
  },

  // King's Indian Mar del Plata after 5.d5.
  // d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 d5
  'rnbqk2r/ppp1ppbp/3p1np1/3P4/2P1P3/2N5/PP3PPP/R1BQKBNR b KQkq -': {
    default: [
      ['c7c6', 55],
      ['e7e5', 45],
    ],
    'hyper-defensive': [
      ['c7c6', 60],
      ['e7e5', 40],
    ],
    defensive: [
      ['c7c6', 65],
      ['e7e5', 35],
    ],
    balanced: [
      ['c7c6', 55],
      ['e7e5', 45],
    ],
    aggressive: [
      ['e7e5', 60],
      ['c7c6', 40],
    ],
    'hyper-aggressive': [
      ['e7e5', 70],
      ['c7c6', 30],
    ],
  },

  // Catalan after 3.g3.
  // d4 Nf6 c4 e6 g3
  'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/6P1/PP2PP1P/RNBQKBNR b KQkq -': {
    default: [
      ['d7d5', 55],
      ['f8b4', 25],
      ['g7g6', 20],
    ],
    'hyper-defensive': [
      ['d7d5', 60],
      ['f8e7', 40],
    ],
    defensive: [
      ['d7d5', 65],
      ['f8e7', 35],
    ],
    balanced: [
      ['d7d5', 55],
      ['f8b4', 25],
      ['g7g6', 20],
    ],
    aggressive: [
      ['g7g6', 55],
      ['d7d5', 45],
    ],
    'hyper-aggressive': [
      ['g7g6', 65],
      ['f8b4', 35],
    ],
  },

  // Queen's Indian after 3...b6.
  // d4 Nf6 c4 e6 Nf3 b6
  'rnbqkb1r/p1pp1ppp/1p2pn2/8/2PP4/5N2/PP2PPPP/RNBQKB1R w KQkq -': {
    default: [
      ['b1c3', 60],
      ['g2g3', 40],
    ],
    'hyper-defensive': [
      ['b1c3', 65],
      ['e2e3', 35],
    ],
    defensive: [
      ['b1c3', 70],
      ['g2g3', 30],
    ],
    balanced: [
      ['b1c3', 60],
      ['g2g3', 40],
    ],
    aggressive: [
      ['g2g3', 55],
      ['b1c3', 45],
    ],
    'hyper-aggressive': [
      ['g2g3', 70],
      ['b1c3', 30],
    ],
  },

  // --------------------------------------------------------------------------
  // === QUEEN'S GAMBIT FAMILY ===
  // --------------------------------------------------------------------------

  // QGD main line: 3...Nf6 had no White continuation.
  // d4 d5 c4 e6 Nc3 Nf6
  'rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq -': {
    default: [
      ['c1g5', 50],
      ['e2e3', 25],
      ['e2e4', 15],
      ['d1c2', 10],
    ],
    'hyper-defensive': [
      ['c1g5', 60],
      ['d1c2', 40],
    ],
    defensive: [
      ['e2e3', 55],
      ['d1d2', 45],
    ],
    balanced: [
      ['c1g5', 50],
      ['e2e3', 25],
      ['e2e4', 15],
      ['d1c2', 10],
    ],
    aggressive: [
      ['c1g5', 50],
      ['e2e4', 30],
      ['c3d5', 20],
    ],
    'hyper-aggressive': [
      ['c1g5', 60],
      ['e2e4', 40],
    ],
  },

  // QGD Tarrasch: 3.Nf3 for the defensive styles had no continuation.
  // d4 d5 c4 e6 Nf3
  'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/5N2/PP2PPPP/RNBQKB1R b KQkq -': {
    default: [
      ['d5c4', 45],
      ['g8f6', 35],
      ['f8e7', 20],
    ],
    'hyper-defensive': [
      ['f8e7', 60],
      ['g8f6', 40],
    ],
    defensive: [
      ['g8f6', 55],
      ['f8e7', 45],
    ],
    balanced: [
      ['d5c4', 45],
      ['g8f6', 35],
      ['f8e7', 20],
    ],
    aggressive: [
      ['d5c4', 70],
      ['g8f6', 30],
    ],
    'hyper-aggressive': [
      ['d5c4', 80],
      ['g8f6', 20],
    ],
  },

  // Queen's Gambit Accepted after 2...dxc4.
  // d4 d5 c4 dxc4
  'rnbqkbnr/ppp1pppp/8/8/2pP4/8/PP2PPPP/RNBQKBNR w KQkq -': {
    default: [
      ['e2e3', 55],
      ['b1c3', 25],
      ['e2e4', 20],
    ],
    'hyper-defensive': [
      ['e2e3', 65],
      ['g1f3', 35],
    ],
    defensive: [
      ['e2e3', 60],
      ['b1c3', 40],
    ],
    balanced: [
      ['e2e3', 55],
      ['b1c3', 25],
      ['e2e4', 20],
    ],
    aggressive: [
      ['b1c3', 60],
      ['e2e4', 40],
    ],
    'hyper-aggressive': [
      ['e2e4', 65],
      ['b1c3', 35],
    ],
  },

  // Slav Defense after 2...c6.
  // d4 d5 c4 c6
  'rnbqkbnr/pp2pppp/2p5/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -': {
    default: [
      ['b1c3', 50],
      ['g1f3', 30],
      ['c1f4', 20],
    ],
    'hyper-defensive': [
      ['g1f3', 65],
      ['b1c3', 35],
    ],
    defensive: [
      ['g1f3', 60],
      ['b1c3', 40],
    ],
    balanced: [
      ['b1c3', 50],
      ['g1f3', 30],
      ['c1f4', 20],
    ],
    aggressive: [
      ['b1c3', 60],
      ['c4d5', 40],
    ],
    'hyper-aggressive': [
      ['c4d5', 65],
      ['b1c3', 35],
    ],
  },

  // Semi-Slav setup after 3...Nf6 (Botvinnik-Bondarevsky).
  // d4 d5 c4 c6 Nc3 Nf6
  'rnbqkb1r/pp2pppp/2p2n2/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq -': {
    default: [
      ['e2e3', 55],
      ['c1g5', 20],
      ['a2a4', 15],
      ['c4d5', 10],
    ],
    'hyper-defensive': [
      ['e2e3', 70],
      ['c4d5', 30],
    ],
    defensive: [
      ['e2e3', 65],
      ['c4d5', 35],
    ],
    balanced: [
      ['e2e3', 55],
      ['c1g5', 20],
      ['a2a4', 15],
      ['c4d5', 10],
    ],
    aggressive: [
      ['c1g5', 55],
      ['c4c5', 45],
    ],
    'hyper-aggressive': [
      ['c4c5', 60],
      ['a2a4', 40],
    ],
  },

  // --------------------------------------------------------------------------
  // === OPEN GAMES ===
  // --------------------------------------------------------------------------

  // Ruy Lopez Closed after 3...a6.
  // e4 e5 Nf3 Nc6 Bb5 a6
  'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq -': {
    default: [
      ['b5a4', 55],
      ['e1h1', 25],
      ['b1c3', 20],
    ],
    'hyper-defensive': [
      ['b5a4', 60],
      ['e1h1', 40],
    ],
    defensive: [
      ['e1h1', 60],
      ['b5a4', 40],
    ],
    balanced: [
      ['b5a4', 55],
      ['e1h1', 25],
      ['b1c3', 20],
    ],
    aggressive: [
      ['b5c6', 55],
      ['b1c3', 45],
    ],
    'hyper-aggressive': [
      ['b5c6', 65],
      ['f3e5', 35],
    ],
  },

  // Berlin Defense after 3...Nf6.
  // e4 e5 Nf3 Nc6 Bb5 Nf6
  'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq -': {
    default: [
      ['e1h1', 65],
      ['d2d4', 20],
      ['b1c3', 15],
    ],
    'hyper-defensive': [
      ['e1h1', 70],
      ['d2d4', 30],
    ],
    defensive: [
      ['e1h1', 65],
      ['d2d4', 35],
    ],
    balanced: [
      ['e1h1', 65],
      ['d2d4', 20],
      ['b1c3', 15],
    ],
    aggressive: [
      ['d2d4', 55],
      ['b5c6', 45],
    ],
    'hyper-aggressive': [
      ['b5c6', 65],
      ['d2d4', 35],
    ],
  },

  // Giuoco Pianissimo after 4.d3.
  // e4 e5 Nf3 Nc6 Bc4 Bc5 d3
  'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R b KQkq -': {
    default: [
      ['g8f6', 50],
      ['d7d6', 30],
      ['c6b4', 20],
    ],
    'hyper-defensive': [
      ['d7d6', 60],
      ['g8f6', 40],
    ],
    defensive: [
      ['d7d6', 65],
      ['g8f6', 35],
    ],
    balanced: [
      ['g8f6', 50],
      ['d7d6', 30],
      ['c6b4', 20],
    ],
    aggressive: [
      ['g8f6', 55],
      ['b7b6', 45],
    ],
    'hyper-aggressive': [
      ['g8f6', 65],
      ['d7d5', 35],
    ],
  },

  // Two Knights Defense after 4.d3.
  // e4 e5 Nf3 Nc6 Bc4 Nf6 d3
  'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R b KQkq -': {
    default: [
      ['d7d6', 50],
      ['f6e4', 25],
      ['c6b4', 25],
    ],
    'hyper-defensive': [
      ['d7d6', 70],
      ['c6b4', 30],
    ],
    defensive: [
      ['d7d6', 65],
      ['c6b4', 35],
    ],
    balanced: [
      ['d7d6', 50],
      ['f6e4', 25],
      ['c6b4', 25],
    ],
    aggressive: [
      ['f6e4', 60],
      ['d7d6', 40],
    ],
    'hyper-aggressive': [
      ['f6e4', 75],
      ['d7d6', 25],
    ],
  },

  // Vienna Game / Four Knights: 2.Nc3 is a candidate for three styles and had no entry.
  // e4 e5 Nc3 Nf6
  'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR w KQkq -': {
    default: [
      ['g1f3', 55],
      ['f1c4', 30],
      ['d2d4', 15],
    ],
    'hyper-defensive': [
      ['g1f3', 70],
      ['d2d4', 30],
    ],
    defensive: [
      ['g1f3', 65],
      ['d2d4', 35],
    ],
    balanced: [
      ['g1f3', 55],
      ['f1c4', 30],
      ['d2d4', 15],
    ],
    aggressive: [
      ['f1c4', 50],
      ['d2d4', 50],
    ],
    'hyper-aggressive': [
      ['f2f4', 50],
      ['d2d4', 50],
    ],
  },

  // Bishop's Opening: 2.Bc4 is a candidate for several styles and had no entry.
  // e4 e5 Bc4
  'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq -': {
    default: [
      ['g8f6', 45],
      ['f8c5', 35],
      ['b8c6', 20],
    ],
    'hyper-defensive': [
      ['g8f6', 60],
      ['f8c5', 40],
    ],
    defensive: [
      ['g8f6', 55],
      ['f8c5', 45],
    ],
    balanced: [
      ['g8f6', 45],
      ['f8c5', 35],
      ['b8c6', 20],
    ],
    aggressive: [
      ['f8c5', 55],
      ['b8c6', 45],
    ],
    'hyper-aggressive': [
      ['b8c6', 60],
      ['d7d5', 40],
    ],
  },

  // King's Knight Gambit after 3...exf4.
  // e4 e5 f4 exf4 Nf3
  'rnbqkbnr/pppp1ppp/8/8/4Pp2/5N2/PPPP2PP/RNBQKB1R b KQkq -': {
    default: [
      ['g7g5', 55],
      ['g7g6', 20],
      ['g8h6', 15],
      ['h7h6', 10],
    ],
    'hyper-defensive': [
      ['h7h6', 55],
      ['g8h6', 45],
    ],
    defensive: [
      ['h7h6', 60],
      ['g7g6', 40],
    ],
    balanced: [
      ['g7g5', 55],
      ['g7g6', 20],
      ['g8h6', 15],
      ['h7h6', 10],
    ],
    aggressive: [
      ['g7g5', 75],
      ['g8h6', 25],
    ],
    'hyper-aggressive': [
      ['g7g5', 85],
      ['g8h6', 15],
    ],
  },

  // Scotch Game after 4.Nxd4.
  // e4 e5 Nf3 Nc6 d4 exd4 Nxd4
  'r1bqkbnr/pppp1ppp/2n5/8/3NP3/8/PPP2PPP/RNBQKB1R b KQkq -': {
    default: [
      ['g8f6', 65],
      ['f8c5', 35],
    ],
    'hyper-defensive': [
      ['f8c5', 65],
      ['g8f6', 35],
    ],
    defensive: [
      ['f8c5', 60],
      ['g8f6', 40],
    ],
    balanced: [
      ['g8f6', 65],
      ['f8c5', 35],
    ],
    aggressive: [
      ['g8f6', 70],
      ['f8c5', 30],
    ],
    'hyper-aggressive': [
      ['g8f6', 80],
      ['c6e5', 20],
    ],
  },

  // --------------------------------------------------------------------------
  // === ENGLISH / RETI ===
  // --------------------------------------------------------------------------

  // English Opening 1...e6: listed as a candidate for the defensive styles with no entry.
  // c4 e6
  'rnbqkbnr/pppp1ppp/4p3/8/2P5/8/PP1PPPPP/RNBQKBNR w KQkq -': {
    default: [
      ['b1c3', 45],
      ['g1f3', 30],
      ['g2g3', 25],
    ],
    'hyper-defensive': [
      ['g2g3', 55],
      ['g1f3', 45],
    ],
    defensive: [
      ['g2g3', 60],
      ['e2e3', 40],
    ],
    balanced: [
      ['b1c3', 45],
      ['g1f3', 30],
      ['g2g3', 25],
    ],
    aggressive: [
      ['e2e4', 55],
      ['b1c3', 45],
    ],
    'hyper-aggressive': [
      ['e2e4', 65],
      ['b1c3', 35],
    ],
  },

  // English Opening 1...d5.
  // c4 d5
  'rnbqkbnr/ppp1pppp/8/3p4/2P5/8/PP1PPPPP/RNBQKBNR w KQkq d6': {
    default: [
      ['g1f3', 45],
      ['b1c3', 30],
      ['c4d5', 25],
    ],
    'hyper-defensive': [
      ['g1f3', 60],
      ['g2g3', 40],
    ],
    defensive: [
      ['g1f3', 65],
      ['e2e3', 35],
    ],
    balanced: [
      ['g1f3', 45],
      ['b1c3', 30],
      ['c4d5', 25],
    ],
    aggressive: [
      ['c4d5', 60],
      ['b1c3', 40],
    ],
    'hyper-aggressive': [
      ['c4d5', 75],
      ['b1c3', 25],
    ],
  },

  // Botvinnik English setup after 1...g6.
  // c4 g6
  'rnbqkbnr/pppppp1p/6p1/8/2P5/8/PP1PPPPP/RNBQKBNR w KQkq -': {
    default: [
      ['b1c3', 55],
      ['g1f3', 25],
      ['g2g3', 20],
    ],
    'hyper-defensive': [
      ['g2g3', 60],
      ['g1f3', 40],
    ],
    defensive: [
      ['g2g3', 65],
      ['g1f3', 35],
    ],
    balanced: [
      ['b1c3', 55],
      ['g1f3', 25],
      ['g2g3', 20],
    ],
    aggressive: [
      ['e2e4', 55],
      ['b1c3', 45],
    ],
    'hyper-aggressive': [
      ['e2e4', 70],
      ['b1c3', 30],
    ],
  },

  // English Opening 1...Nc6.
  // c4 Nc6
  'r1bqkbnr/pppppppp/2n5/8/2P5/8/PP1PPPPP/RNBQKBNR w KQkq -': {
    default: [
      ['b1c3', 50],
      ['g1f3', 30],
      ['g2g3', 20],
    ],
    'hyper-defensive': [
      ['g2g3', 60],
      ['g1f3', 40],
    ],
    defensive: [
      ['g1f3', 60],
      ['e2e3', 40],
    ],
    balanced: [
      ['b1c3', 50],
      ['g1f3', 30],
      ['g2g3', 20],
    ],
    aggressive: [
      ['e2e4', 60],
      ['b1c3', 40],
    ],
    'hyper-aggressive': [
      ['e2e4', 75],
      ['b1c3', 25],
    ],
  },

  // Reti 1...c6: listed as a candidate for the defensive styles with no entry.
  // Nf3 c6
  'rnbqkbnr/pp1ppppp/2p5/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq -': {
    default: [
      ['d2d4', 55],
      ['c2c4', 25],
      ['g2g3', 20],
    ],
    'hyper-defensive': [
      ['g2g3', 60],
      ['d2d4', 40],
    ],
    defensive: [
      ['d2d4', 65],
      ['e2e3', 35],
    ],
    balanced: [
      ['d2d4', 55],
      ['c2c4', 25],
      ['g2g3', 20],
    ],
    aggressive: [
      ['d2d4', 60],
      ['c2c4', 40],
    ],
    'hyper-aggressive': [
      ['c2c4', 70],
      ['d2d4', 30],
    ],
  },

  // Reti 1...Nc6.
  // Nf3 Nc6
  'r1bqkbnr/pppppppp/2n5/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq -': {
    default: [
      ['d2d4', 50],
      ['c2c4', 30],
      ['b2b4', 20],
    ],
    'hyper-defensive': [
      ['c2c4', 55],
      ['e2e3', 45],
    ],
    defensive: [
      ['d2d4', 60],
      ['c2c4', 40],
    ],
    balanced: [
      ['d2d4', 50],
      ['c2c4', 30],
      ['b2b4', 20],
    ],
    aggressive: [
      ['b2b4', 55],
      ['d2d4', 45],
    ],
    'hyper-aggressive': [
      ['b2b4', 70],
      ['d2d4', 30],
    ],
  },

  // English Opening: 1.c4 had no follow-up for any style.
  // c4 e5 (ep e6)
  'rnbqkbnr/pppp1ppp/8/4p3/2P5/8/PP1PPPPP/RNBQKBNR w KQkq e6': {
    default: [
      ['b1c3', 45],
      ['g1f3', 35],
      ['g2g3', 20],
    ],
    'hyper-defensive': [
      ['g1f3', 55],
      ['g2g3', 45],
    ],
    defensive: [
      ['g2g3', 50],
      ['g1f3', 50],
    ],
    balanced: [
      ['b1c3', 45],
      ['g1f3', 35],
      ['g2g3', 20],
    ],
    aggressive: [
      ['b1c3', 55],
      ['g2g3', 45],
    ],
    'hyper-aggressive': [
      ['b1c3', 60],
      ['e2e4', 40],
    ],
  },

  // English Four Knights setup after 2.Nc3.
  // c4 e5 Nc3
  'rnbqkbnr/pppp1ppp/8/4p3/2P5/2N5/PP1PPPPP/R1BQKBNR b KQkq -': {
    default: [
      ['g8f6', 45],
      ['b8c6', 30],
      ['g7g6', 25],
    ],
    'hyper-defensive': [
      ['b8c6', 55],
      ['g7g6', 45],
    ],
    defensive: [
      ['g7g6', 60],
      ['b8c6', 40],
    ],
    balanced: [
      ['g8f6', 45],
      ['b8c6', 30],
      ['g7g6', 25],
    ],
    aggressive: [
      ['g8f6', 60],
      ['b8c6', 40],
    ],
    'hyper-aggressive': [
      ['g8f6', 70],
      ['f8e7', 30],
    ],
  },

  // English Opening 1...Nf6.
  // c4 Nf6
  'rnbqkb1r/pppppppp/5n2/8/2P5/8/PP1PPPPP/RNBQKBNR w KQkq -': {
    default: [
      ['b1c3', 50],
      ['g2g3', 30],
      ['d2d4', 20],
    ],
    'hyper-defensive': [
      ['g2g3', 55],
      ['b1c3', 45],
    ],
    defensive: [
      ['b1c3', 55],
      ['g2g3', 45],
    ],
    balanced: [
      ['b1c3', 50],
      ['g2g3', 30],
      ['d2d4', 20],
    ],
    aggressive: [
      ['d2d4', 55],
      ['b1c3', 45],
    ],
    'hyper-aggressive': [
      ['d2d4', 65],
      ['b1c3', 35],
    ],
  },

  // Symmetrical English after 1...c5.
  // c4 c5 (ep c6)
  'rnbqkbnr/pp1ppppp/8/2p5/2P5/8/PP1PPPPP/RNBQKBNR w KQkq c6': {
    default: [
      ['b1c3', 50],
      ['e2e4', 30],
      ['g2g3', 20],
    ],
    'hyper-defensive': [
      ['g2g3', 55],
      ['b1c3', 45],
    ],
    defensive: [
      ['b1c3', 55],
      ['g2g3', 45],
    ],
    balanced: [
      ['b1c3', 50],
      ['e2e4', 30],
      ['g2g3', 20],
    ],
    aggressive: [
      ['e2e4', 60],
      ['b1c3', 40],
    ],
    'hyper-aggressive': [
      ['e2e4', 75],
      ['b1c3', 25],
    ],
  },

  // Reti hub: 1.Nf3 had no follow-up for any style.
  // Nf3 d5 (ep d6)
  'rnbqkbnr/ppp1pppp/8/3p4/8/5N2/PPPPPPPP/RNBQKB1R w KQkq d6': {
    default: [
      ['d2d4', 55],
      ['c2c4', 25],
      ['g2g3', 20],
    ],
    'hyper-defensive': [
      ['g2g3', 60],
      ['c2c4', 40],
    ],
    defensive: [
      ['c2c4', 55],
      ['d2d4', 45],
    ],
    balanced: [
      ['d2d4', 55],
      ['c2c4', 25],
      ['g2g3', 20],
    ],
    aggressive: [
      ['e2e4', 45],
      ['c2c4', 35],
      ['d2d4', 20],
    ],
    'hyper-aggressive': [
      ['e2e4', 55],
      ['c2c4', 45],
    ],
  },

  // Reti hub against 1...Nf6.
  // Nf3 Nf6
  'rnbqkb1r/pppppppp/5n2/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq -': {
    default: [
      ['c2c4', 45],
      ['d2d4', 30],
      ['g2g3', 25],
    ],
    'hyper-defensive': [
      ['g2g3', 55],
      ['c2c4', 45],
    ],
    defensive: [
      ['c2c4', 55],
      ['d2d4', 45],
    ],
    balanced: [
      ['c2c4', 45],
      ['d2d4', 30],
      ['g2g3', 25],
    ],
    aggressive: [
      ['d2d4', 45],
      ['f3g5', 30],
      ['g2g3', 25],
    ],
    'hyper-aggressive': [
      ['d2d4', 55],
      ['f3g5', 45],
    ],
  },

  // Reti Sicilian: 1...c5 for the hyper-aggressive styles had no entry.
  // Nf3 c5 (ep c6)
  'rnbqkbnr/pp1ppppp/8/2p5/8/5N2/PPPPPPPP/RNBQKB1R w KQkq c6': {
    default: [
      ['e2e4', 55],
      ['b1c3', 25],
      ['d2d4', 20],
    ],
    'hyper-defensive': [
      ['d2d4', 55],
      ['g2g3', 45],
    ],
    defensive: [
      ['d2d4', 60],
      ['b1c3', 40],
    ],
    balanced: [
      ['e2e4', 55],
      ['b1c3', 25],
      ['d2d4', 20],
    ],
    aggressive: [
      ['e2e4', 70],
      ['b1c3', 30],
    ],
    'hyper-aggressive': [
      ['e2e4', 85],
      ['b1c3', 15],
    ],
  },
};

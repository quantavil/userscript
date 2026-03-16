/**
 * Premove Core Issue Verification
 * ================================
 * Reproduces the exact Queen-loss from the user's game:
 *   1. g3 d5 2. Bg2 Nf6 3. c4 Bf5 4. cxd5 c6 5. Nc3 cxd5
 *   6. d4 Nc6 7. Nf3 Qb6 8. O-O Rc8 9. Na4 e6?? 10. Nxb6!
 *
 * The bot (Black) premoved e7e6 while the opponent played Na4,
 * which attacks Qb6. The premove system failed to detect that
 * after Na4 + e6, the Queen on b6 is hanging to Nxb6.
 *
 * CORE ISSUE UNDER TEST:
 *   checkHanging() only examines SEE on the MOVED piece's destination
 *   (e6 in this case). It does NOT scan for other pieces left hanging
 *   after the opponent's move. The stability check also fails because
 *   it tests alternate OPPONENT responses, not whether our move is
 *   adequate against the MAIN predicted opponent move.
 */

import { describe, it, expect } from 'vitest';
import { evaluatePremove, evaluatePremoveChain } from '../src/engine/premove.js';

// ─── Helper ─────────────────────────────────────────────────────────────────
function assertBlocked(result, label) {
    if (result.execute) {
        throw new Error(
            `[${label}] Expected BLOCKED but got ALLOWED.\n` +
            `  confidence: ${result.confidence}\n` +
            `  reasons: ${JSON.stringify(result.reasons)}\n` +
            `  blocked: ${result.blocked}`
        );
    }
}

function assertAllowed(result, label) {
    if (!result.execute) {
        throw new Error(
            `[${label}] Expected ALLOWED but got BLOCKED.\n` +
            `  confidence: ${result.confidence}\n` +
            `  blocked: ${result.blocked}`
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE ISSUE 1: Opponent move creates threat to ANOTHER piece
// ═══════════════════════════════════════════════════════════════════════════

describe('Core Issue: Opponent move threatens a DIFFERENT piece than the one we move', () => {

    it('[BLOCK] EXACT GAME REPLAY — Na4 attacks Qb6, bot premoves e6 (queen hangs)', () => {
        // Position after 8...Rc8 (White to move, will play 9. Na4)
        // White: Kg1, Qd1, Ra1, Rf1, Bg2, Nc3, Nf3 | Pawns: a2 b2 d4 e2 f2 g3 h2
        // Black: Ke8, Qb6, Rc8, Rh8, Bf5, Bf8, Nc6, Nf6 | Pawns: a7 b7 d5 e7 f7 g7 h7
        //
        // Engine PV predicts: c3a4 e7e6 (opponent Na4, we play e6)
        // But after Na4, the knight attacks Qb6 (Nxb6 wins the queen!)
        // checkHanging only checks SEE on e7→e6 (safe pawn push) — PASSES
        // The Queen hanging on b6 is completely MISSED.
        const fen = '2r1kb1r/pp2pppp/1qn2n2/3p1b2/3P4/2N2NP1/PP2PP1P/R2Q1RK1 w - - 0 9';
        const opponentUci = 'c3a4'; // White plays Na4 (attacks Qb6)
        const ourUci = 'e7e6';      // Bot premoves e6 (ignoring queen threat)
        const ourColor = 'b';

        const result = evaluatePremove(fen, opponentUci, ourUci, ourColor);
        console.log('GAME REPLAY Na4+e6:', {
            execute: result.execute,
            confidence: result.confidence,
            reasons: result.reasons,
            blocked: result.blocked
        });

        // This MUST be blocked — our queen on b6 is hanging to Nxb6
        assertBlocked(result, 'Queen-loss game replay');
    });

    it('[BLOCK] Knight fork threatens queen — premove ignores the fork', () => {
        // Simplified: White Nc3 can go to d5 forking Qb6 and Ke8
        // Bot premoves a quiet pawn move, ignoring the fork threat
        // White: Kg1, Nc3, Pawns: d4 | Black: Ke8, Qb6, Pawns: d5 e7
        const fen = '4k3/4p3/1q6/3p4/3P4/2N5/8/6K1 w - - 0 1';
        const opponentUci = 'c3d5'; // Nd5 forks queen and king
        const ourUci = 'e7e6';       // quiet pawn move, ignoring fork
        const ourColor = 'b';

        const result = evaluatePremove(fen, opponentUci, ourUci, ourColor);
        console.log('Fork ignores queen:', {
            execute: result.execute,
            confidence: result.confidence,
            blocked: result.blocked
        });

        // Should be blocked — Nd5 attacks Qb6, and e6 doesn't address it
        assertBlocked(result, 'Knight fork ignores queen');
    });

    it('[BLOCK] Opponent attacks our rook with bishop — premove moves pawn elsewhere', () => {
        // White Bd3 can go to a6 attacking Rc8 (a6-b7-c8 diagonal)
        // Bot premoves h7h6 (quiet pawn move), ignoring rook threat
        // After Ba6, Bxc8 wins the exchange.
        const fen = '2r1k3/pp3ppp/8/8/8/3B4/5PPP/6K1 w - - 0 1';
        const result = evaluatePremove(fen, 'd3a6', 'h7h6', 'b');
        console.log('Bishop attacks rook, pawn ignores:', {
            execute: result.execute,
            blocked: result.blocked
        });

        // Ba6 threatens Bxc8. h6 doesn't address it.
        assertBlocked(result, 'Bishop attacks rook ignored');
    });

    it('[ALLOW] Baseline — safe premove where opponent move creates no threats', () => {
        // Same game position but opponent plays a non-threatening move
        // White plays Kh1 instead of Na4 — no threats created
        const fen = '2r1kb1r/pp2pppp/1qn2n2/3p1b2/3P4/2N2NP1/PP2PP1P/R2Q1RK1 w - - 0 9';
        const opponentUci = 'g1h1'; // safe king move
        const ourUci = 'e7e6';
        const ourColor = 'b';

        const result = evaluatePremove(fen, opponentUci, ourUci, ourColor);
        console.log('Safe baseline e6 with Kh1:', {
            execute: result.execute,
            confidence: result.confidence,
            reasons: result.reasons
        });

        // This should be ALLOWED — no threats from Kh1
        assertAllowed(result, 'Safe e6 with non-threatening opponent move');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// CORE ISSUE 2: evaluatePremoveChain also misses threats 
// ═══════════════════════════════════════════════════════════════════════════

describe('Core Issue: Chain evaluation misses threats to other pieces', () => {

    it('[BLOCK] Chain should reject premove when opponent PV creates threats', () => {
        const fen = '2r1kb1r/pp2pppp/1qn2n2/3p1b2/3P4/2N2NP1/PP2PP1P/R2Q1RK1 w - - 0 9';
        // PV: Na4 e6 Nxb6 axb6 — opponent's first move threatens the queen
        const pv = 'c3a4 e7e6 a4b6 a7b6';
        const ourColor = 'b';
        const sideToMove = 'w';

        const chain = evaluatePremoveChain(fen, pv, ourColor, sideToMove);
        console.log('Chain with Na4 threat:', chain);

        // Chain should be empty (first premove e6 should be blocked)
        expect(chain).toHaveLength(0);
    });
});

import { describe, it, expect } from 'vitest';
import { LocalEngine } from '../src/engine/local-engine.js';

// ============================================================
// SAN to Move converter — uses the engine's legal move generator
// ============================================================
function sanToMove(engine, san) {
    const legalMoves = engine.generateLegalMoves();

    // Castling
    if (san === 'O-O' || san === 'O-O-O') {
        const isKingside = san === 'O-O';
        for (const mv of legalMoves) {
            if (mv.flags & 2) { // FLAG_CASTLE
                if (isKingside && mv.to > mv.from) return mv;
                if (!isKingside && mv.to < mv.from) return mv;
            }
        }
        throw new Error(`No castling move found for ${san}`);
    }

    // Strip decorators
    let cleaned = san.replace(/[+#x!?]/g, '');

    // Identify piece (default: pawn = abs 1)
    const pieceMap = { N: 2, B: 3, R: 4, Q: 5, K: 6 };
    let piece = 1;
    if (pieceMap[cleaned[0]]) {
        piece = pieceMap[cleaned[0]];
        cleaned = cleaned.substring(1);
    }

    // Promotion
    let promo = 0;
    const promoMatch = cleaned.match(/=?([NBRQ])$/);
    if (promoMatch) {
        promo = pieceMap[promoMatch[1]];
        cleaned = cleaned.replace(/=?[NBRQ]$/, '');
    }

    // Destination: last 2 chars (0x88 encoding: rank*16 + file)
    const destStr = cleaned.slice(-2);
    const destFile = destStr.charCodeAt(0) - 97;
    const destRank = parseInt(destStr[1]) - 1;
    const destSq = destRank * 16 + destFile;

    // Disambiguation: remaining chars before dest
    const disambig = cleaned.slice(0, -2);
    let fromFile = -1, fromRank = -1;
    if (disambig.length >= 1) {
        const c = disambig[0];
        if (c >= 'a' && c <= 'h') fromFile = c.charCodeAt(0) - 97;
        else if (c >= '1' && c <= '8') fromRank = parseInt(c) - 1;
    }
    if (disambig.length >= 2) {
        fromFile = disambig.charCodeAt(0) - 97;
        fromRank = parseInt(disambig[1]) - 1;
    }

    // Match legal moves
    const candidates = legalMoves.filter(mv => {
        if (mv.to !== destSq) return false;
        if (Math.abs(mv.piece) !== piece) return false;
        if (promo && Math.abs(mv.promo) !== promo) return false;
        if (fromFile >= 0 && (mv.from & 7) !== fromFile) return false;
        if (fromRank >= 0 && (mv.from >> 4) !== fromRank) return false;
        return true;
    });

    if (candidates.length === 0) {
        const fen = engine.toFen();
        const allUci = legalMoves.map(m => engine.moveToUci(m)).join(', ');
        throw new Error(`No legal move matches SAN "${san}" in position ${fen}. Legal: [${allUci}]`);
    }
    return candidates[0];
}

// ============================================================
// Game from PGN: Bot lost — verify engine never returns empty PV
// [White "imq78"] [Black "hema_blaster"] [Result "0-1"]
// TimeControl 60s (bullet), Termination: checkmate
// ============================================================

const GAME_MOVES = [
    'e4', 'e6', 'd4', 'c5', 'Nf3', 'cxd4', 'Nbd2', 'Nc6',
    'Bd3', 'Nf6', 'O-O', 'e5', 'Rb1', 'Bc5', 'Nb3', 'Be7',
    'c3', 'a5', 'cxd4', 'Nxd4', 'Nfxd4', 'exd4', 'e5', 'Nd5',
    'Ra1', 'd6', 'exd6', 'Bxd6', 'Rb1', 'a4', 'Nxd4', 'Nb4',
    'Re1+', 'Be6', 'Nxe6', 'fxe6', 'Ra1', 'Nxd3', 'Rb1', 'O-O',
    'Rxe6', 'Qb6', 'Be3', 'Rfe8', 'Rxe8+', 'Rxe8', 'Rc1', 'Qd8',
    'Rc3', 'Ne5', 'Qxa4', 'Rf8', 'Qb3+', 'Kh8', 'Kh1', 'Qf6',
    'Qxb7', 'Ng4', 'Qd7', 'Nxe3', 'Rc8', 'Qxf2', 'a3'
    // Last move 'Qf1#' is checkmate — no analysis needed after
];

describe('Full Game Simulation — Never Return Empty PV', () => {
    it('should produce valid analysis (success, PV, depth >= 1) at every position', () => {
        const replayEngine = new LocalEngine();
        const analyzeEngine = new LocalEngine();
        replayEngine.loadFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

        const TIME_LIMIT = 100;
        const failures = [];

        for (let i = 0; i < GAME_MOVES.length; i++) {
            const san = GAME_MOVES[i];
            const moveNum = Math.floor(i / 2) + 1;
            const side = i % 2 === 0 ? 'W' : 'B';

            const mv = sanToMove(replayEngine, san);
            replayEngine.makeMove(mv);

            const fen = replayEngine.toFen();
            const result = analyzeEngine.analyze(fen, 12, TIME_LIMIT);

            const isValid = result.success &&
                result.bestmove !== '(none)' &&
                result.depth >= 1 &&
                result.analysis &&
                result.analysis.length > 0 &&
                result.analysis[0].pv &&
                result.analysis[0].pv.length > 0;

            if (!isValid) {
                failures.push({
                    move: `${moveNum}. ${side === 'W' ? '' : '...'}${san}`,
                    fen,
                    success: result.success,
                    bestmove: result.bestmove,
                    depth: result.depth,
                    hasPV: !!(result.analysis?.[0]?.pv),
                    eval: result.evaluation
                });
            }
        }

        if (failures.length > 0) {
            console.error('\n=== FAILURES ===');
            for (const f of failures) {
                console.error(`  ${f.move}: success=${f.success} move=${f.bestmove} D=${f.depth} PV=${f.hasPV} eval=${f.eval}`);
            }
        }

        expect(failures).toHaveLength(0);
    }, 120_000); // 2 minute timeout for full game

    it('should never return NaN or undefined evaluation', () => {
        const replayEngine = new LocalEngine();
        const analyzeEngine = new LocalEngine();
        replayEngine.loadFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

        const TIME_LIMIT = 100;
        const evalIssues = [];

        for (let i = 0; i < GAME_MOVES.length; i++) {
            const san = GAME_MOVES[i];
            const mv = sanToMove(replayEngine, san);
            replayEngine.makeMove(mv);

            const fen = replayEngine.toFen();
            const result = analyzeEngine.analyze(fen, 12, TIME_LIMIT);

            if (result.evaluation === undefined || result.evaluation === null ||
                isNaN(result.evaluation) || !result.analysis?.[0]?.score) {
                evalIssues.push({
                    move: `${Math.floor(i / 2) + 1}.${i % 2 === 0 ? '' : '..'}${san}`,
                    eval: result.evaluation,
                    score: result.analysis?.[0]?.score
                });
            }
        }

        if (evalIssues.length > 0) {
            console.error('\n=== EVAL ISSUES ===');
            evalIssues.forEach(f => console.error(`  ${f.move}: eval=${f.eval} score=${JSON.stringify(f.score)}`));
        }

        expect(evalIssues).toHaveLength(0);
    }, 120_000);
});

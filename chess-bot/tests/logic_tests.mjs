
import { strict as assert } from 'assert';
import {
    isSquareAttackedBy,
    findKing,
    makeSimpleMove,
    getAttackersOfSquare,
    fenCharAtSquare,
    pieceFromFenChar
} from '../src/utils.js';

// Since we can't easily import PIECE_VALUES and internal functions from engine.js without exporting them,
// We will test the utils functions which are the building blocks.

console.log("Running Logic Tests (ESM)...");

// Test 1: findKing
try {
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const whiteKing = findKing(fen, 'w');
    const blackKing = findKing(fen, 'b');
    assert.equal(whiteKing, 'e1', 'White king should be at e1');
    assert.equal(blackKing, 'e8', 'Black king should be at e8');
    console.log("PASS: findKing (Standard Start)");
} catch (e) {
    console.error("FAIL: findKing", e);
}

// Test 2: isSquareAttackedBy (Pawn)
try {
    // White pawn at e4, Black king at e8.
    // d5 is attacked by white pawn at e4? No, e4 attacks d5 and f5 if it captures?
    // White pawn at e4 captures to d5 and f5.

    const fen = "8/8/8/3p4/4P3/8/8/8 w - - 0 1";
    // e4 white pawn. d5 black pawn.
    // d5 is attacked by e4? Yes (diagonal).

    // isSquareAttackedBy(fen, square, attackerColor)
    // Does White attack d5?
    const attacked = isSquareAttackedBy(fen, 'd5', 'w');
    assert.equal(attacked, true, 'd5 should be attacked by white pawn at e4');
    console.log("PASS: isSquareAttackedBy (Pawn Capture)");
} catch (e) {
    console.error("FAIL: isSquareAttackedBy (Pawn)", e);
}

// Test 3: isSquareAttackedBy (Knight)
try {
    const fen = "8/8/8/4N3/8/8/8/8 w - - 0 1"; // White Knight at e5
    // Attacks: d7, f7, c6, g6, c4, g4, d3, f3
    const attacked = isSquareAttackedBy(fen, 'f7', 'w');
    assert.equal(attacked, true, 'f7 should be attacked by white knight at e5');

    const notAttacked = isSquareAttackedBy(fen, 'e6', 'w');
    assert.equal(notAttacked, false, 'e6 should NOT be attacked by white knight at e5');
    console.log("PASS: isSquareAttackedBy (Knight)");
} catch (e) {
    console.error("FAIL: isSquareAttackedBy (Knight)", e);
}

// Test 4: makeSimpleMove (Capture)
try {
    const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"; // e4 played
    // Black d5 (fake move for test)
    // from d8(q) to d4 (empty?) No let's do a simple capture.
    // Set up: White P e4, Black P d5.
    const fen2 = "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
    // White captures d5: exd5
    const result = makeSimpleMove(fen2, 'e4', 'd5');
    // e4 becomes 1 (or part of gap), d5 becomes P

    // Target rank 4 (indices 0-7 from top? rank 8=0, rank 1=7)
    // Rank 5 is index 3. Rank 4 is index 4.
    // e4 is Rank 4.
    // d5 is Rank 5.

    // Result should have P on d5.
    const pAtD5 = fenCharAtSquare(result, 'd5');
    assert.equal(pAtD5, 'P', 'd5 should contain White Pawn after capture');

    const pAtE4 = fenCharAtSquare(result, 'e4');
    assert.equal(pAtE4, null, 'e4 should be empty after move');

    console.log("PASS: makeSimpleMove (Capture)");
} catch (e) {
    console.error("FAIL: makeSimpleMove", e);
}

console.log("Tests Completed.");


import { describe, it, expect } from 'vitest';
import { evaluatePremove } from '../src/engine/premove.js';

describe('evaluatePremove', () => {

    it('should block premove that hangs a piece (tactical check via quiesce)', () => {
        // White to move. Black just played ...
        // Logic: 
        // 1. Setup position where White premoves a hanging piece capture or move.
        // 2. Opponent response (predicted) happens.
        // 3. Our move happens.
        // 4. Opponent recaptures.

        // FEN: White Queen at d1, Black Pawn at d4 (guarded by Black Queen at d8).
        // Predicted opp move: ...e5
        // Our premove: Qxd4 (capturing protected pawn) -> BAD

        // Simpler: 
        // FEN: 8/8/8/3r4/8/8/3Q4/8 b - - 0 1 (Black to move)
        // Black predicted: ...Rd8 (retreat)
        // White premove: Qxd8 (hanging queen?) No, let's make it hanging.

        // Scenario: 
        // FEN: r1bqkbnr/pppppppp/2n5/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1
        // Black plays ...e5
        // White premoves Nf3 (normal).

        // Scenario: Hanging piece.
        // FEN: 8/8/8/4r3/3Q4/8/8/8 b - - 0 1
        // Black to move.
        // Predicted: ...Re8 (move rook away)
        // White premove: Qe4?? (Hanging queen on e4, usually guarded but let's say undefended)
        // If white plays Qe4, and black has a method to capture it? 
        // Wait, evaluatePremove inputs: (fen, opponentUci, ourUci, ourColor)
        // fen is BEFORE opponent move. 

        // Case: White premoves QxP where P is protected.
        // FEN: rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1
        // Black to move.
        // Predicted opp move: ...dxe4 (captures pawn)
        // White premove: Qxe4?? (re-capture/capture). 
        // Wait, start pos:
        // r n b q k b n r
        // p p p . p p p p
        // . . . . . . . .
        // . . . p . . . .
        // . . . . P . . .
        // . . . . . . . .
        // P P P P . P P P
        // R N B Q K B N R
        // Black to move.
        // If predicted is ...dxe4. 
        // White wants to premove Nxe4? No, Knight is at g1.

        // Case 1: Hanging Premove
        // FEN: 4k3/8/8/8/4r3/8/3Q4/4K3 b - - 0 1
        // Black to move. King at e1 is in check? No, Re4 attacks e4.
        // White Q at d2. Black R at e4.
        // Predicted opp move: ...Re5 (safe)
        // White premove: Qd4?? (attacks rook but hangs queen to ...Rxd4 if it moves there? No R is at e5)
        // Let's use a simpler hang.
        // FEN: 8/8/8/8/8/2r5/3Q4/K7 b - - 0 1
        // Black to move.
        // Predicted: ...Rc8 (retreat)
        // White premove: Qb4 (safe) vs Qb2 (safe).
        // Let's try: White premoves Qd7 (if R moved away).
        // But if R stays?

        // Let's use the explicit example from the issue: "Misses simple tactical refutations"
        // FEN: r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3 (White to move)
        // Opponent (White) predicted: Bc4
        // Us (Black) premove: ...Nf6 (Safe)

        // Hanging example:
        // FEN: rn1qkbnr/ppp1pppp/8/3p4/4P1b1/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3
        // White to move.
        // Predicted: exd5
        // Us (Black) premove: ...Qxd5 (SafeRecapture)

        // UNSAFE: 
        // FEN: r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3
        // Predicted: Bc4
        // Us (Black) premove: ...Nxe4? (Takes pawn, but Nxe5 exists? No)

        // Let's test "Hangs Piece":
        // FEN: 8/8/8/4r3/8/8/3Q4/7K b - - 0 1
        // Black (to move) predicted: ...Re6
        // White premove: Qd5 (Forks? No). 
        // White premove: Qxe6? (If black played Re6, QxR is good).
        // But what if black played ...Re8? Then Qxe6 is illegal?
        // evaluatePremove checks legality against predicted move.

        // Test: Premove into a guarded square (Quiesce should see the capture)
        // FEN: 8/8/8/4p3/3P4/8/8/K1k5 b - - 0 1
        // Black to move.
        // Predicted: ...exd4
        // White premove: Kxd4 (Safe).

        // Unsafe:
        // FEN: 8/8/8/4p3/3P4/8/8/K1k5 b - - 0 1
        // Predicted: ...e4 (Push)
        // White premove: Kd2 (Safe)

        // TEST: Quiescence Search Effectiveness
        // Position where taking a piece looks good statically (material up) but leads to immediate loss (recapture).
        // FEN: 8/8/8/3r4/4Q3/8/8/K1k5 b - - 0 1
        // Black to move.
        // Predicted: ...Rd1
        // White premove: Qxe5?? (Wait, e5 is empty?)
        // Let's put a protected pawn on d4.
        // FEN: 8/8/8/3p4/4Q3/3K4/8/8 b - - 0 1
        // Black to move. Pawn at d5. Protected by nothing?
        // Add protector: Black King at c6.
        // FEN: 8/8/2k5/3p4/4Q3/3K4/8/8 b - - 0 1
        // Black predicted: ...Kd6.
        // White premove: Qxd5?? (Captures pawn, but Black King captures back).
        // Static eval: +1 (Pawn). 
        // Quiesce: +1 (Pawn) - 9 (Queen) = -8. 
        // evaluatePremove should block this.

        const fen = "8/8/2k5/3p4/4Q3/3K4/8/8 b - - 0 1";
        const opponentUci = "c6d6"; // ...Kd6
        const ourUci = "e4d5"; // Qxd5
        const ourColor = "w";

        const result = evaluatePremove(fen, opponentUci, ourUci, ourColor);
        console.log('Result:', result);
        expect(result.execute).toBe(false);
    });

    it('should allow safe capture', () => {
        // FEN: 8/8/2k5/3p4/4Q3/3K4/8/8 b - - 0 1
        // Same pos but Pawn is undefended.
        // FEN: 8/8/8/3p4/4Q3/3K4/8/k7 b - - 0 1
        // Black King far away.
        const fen = "8/8/8/3p4/4Q3/3K4/8/k7 b - - 0 1";
        const opponentUci = "a1b1"; // ...Kb1
        const ourUci = "e4d5"; // Qxd5
        const ourColor = "w";

        const result = evaluatePremove(fen, opponentUci, ourUci, ourColor);
        if (!result.execute) console.log('Blocked Reason:', result.blocked, result.reasons);
        expect(result.execute).toBe(true);
    });

    it('should allow conditional premove (illegal in alternate response)', () => {
        // Position: WK a8, WR a1, BK h3 (Moved from h2 to avoid check), BN e4. White to move.
        //
        //  K . . . . . . .   (rank 8)
        //  . . . . . . . .
        //  . . . . . . . .
        //  . . . . . . . .
        //  . . . . n . . .   (rank 4)
        //  . . . . . . . k   (rank 3) <--- King moved here
        //  . . . . . . . .   (rank 2)
        //  R . . . . . . .   (rank 1)
        //
        // Predicted: Ra1-a2 (Safe, no check)
        // Our premove (Black): Ne4-g3
        //
        // Key alternate: Rxe4 captures our knight -> Ng3 is impossible -> This is what makes it "conditional".
        const fen = "K7/8/8/8/4n3/7k/8/R7 w - - 0 1"; // King moved to h3
        const opponentUci = "a1a2";
        const ourUci = "e4g3";
        const ourColor = "b";

        const result = evaluatePremove(fen, opponentUci, ourUci, ourColor);

        // Debugging output if it fails again
        if (!result.execute) console.log('Blocked Reason:', result.blocked, result.reasons);

        expect(result.execute).toBe(true);
    });

    it('should allow forced recapture premove', () => {
        // Position where recapturing is the only sensible move regardless of
        // which opponent move was played — high stability.
        //
        // FEN: 8/8/8/3r4/3R4/4K3/8/7k b - - 0 1
        // White King e3 can recapture on d4.
        // Predicted: ...Rxd4
        // Our premove: Kxd4

        const fen = "8/8/8/3r4/3R4/4K3/8/7k b - - 0 1";
        const opponentUci = "d5d4"; // ...Rxd4
        const ourUci = "e3d4";      // Kxd4
        const ourColor = "w";

        const result = evaluatePremove(fen, opponentUci, ourUci, ourColor);
        console.log('Recapture result:', result);
        // After ...Rxd4, Kxd4 recaptures. Stable across alternatives:
        // If black plays ...Rd8 instead, Kd4 is still fine (king advances, rook still ours)
        // If black plays ...Kg1, Kd4 is fine
        expect(result.execute).toBe(true);
    });
});

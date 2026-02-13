
function fenCharAtSquare(fen, square) {
    const placement = fen.split(' ')[0];
    const ranks = placement.split('/');
    const file = 'abcdefgh'.indexOf(square[0]);
    const rank = parseInt(square[1], 10);
    const row = ranks[8 - rank];

    let currentFile = 0;
    for (const ch of row) {
        if (/\d/.test(ch)) {
            currentFile += parseInt(ch, 10);
        } else {
            if (currentFile === file) return ch;
            currentFile++;
        }
    }
    return null;
}

// Fixed makeSimpleMove implementation
function makeSimpleMove(fen, from, to) {
    const parts = fen.split(' ');
    const placement = parts[0];
    const ranks = placement.split('/');

    const fromFile = 'abcdefgh'.indexOf(from[0]);
    const fromRank = parseInt(from[1], 10);
    const toFile = 'abcdefgh'.indexOf(to[0]);
    const toRank = parseInt(to[1], 10);

    if (fromFile < 0 || toFile < 0 || fromRank < 1 || toRank < 1) return fen;

    const fromRowIdx = 8 - fromRank;
    const toRowIdx = 8 - toRank;

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    // Expand rank string to array
    const expandRank = (rankStr) => {
        let row = [];
        for (const ch of rankStr) {
            if (/\d/.test(ch)) {
                const spaces = parseInt(ch, 10);
                for (let i = 0; i < spaces; i++) row.push('1');
            } else {
                row.push(ch);
            }
        }
        return row;
    };

    // Compress array back to rank string
    const compressRank = (rowArr) => {
        let rankStr = '';
        let emptyCount = 0;
        for (const ch of rowArr) {
            if (ch === '1') {
                emptyCount++;
            } else {
                if (emptyCount > 0) {
                    rankStr += emptyCount;
                    emptyCount = 0;
                }
                rankStr += ch;
            }
        }
        if (emptyCount > 0) rankStr += emptyCount;
        return rankStr;
    };

    // -------------------------------------------------------------------------
    // Core Logic
    // -------------------------------------------------------------------------

    const movingPiece = fenCharAtSquare(fen, from);
    if (!movingPiece) return fen;

    // 1. Expand ranks
    const fromRowArr = expandRank(ranks[fromRowIdx]);
    const toRowArr = (fromRowIdx === toRowIdx)
        ? fromRowArr
        : expandRank(ranks[toRowIdx]);

    // 2. Clear source square
    fromRowArr[fromFile] = '1';

    // 3. Set destination square
    toRowArr[toFile] = movingPiece;

    // 4. Compress/save ranks
    ranks[fromRowIdx] = compressRank(fromRowArr);
    if (fromRowIdx !== toRowIdx) {
        ranks[toRowIdx] = compressRank(toRowArr);
    }

    parts[0] = ranks.join('/');
    return parts.join(' ');
}

// Tests
console.log("Running Tests...");

// Bug A: Same-rank double-placement
try {
    const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    // Moving King (e1) to d1
    const result = makeSimpleMove(startFen, "e1", "d1");
    const resultRank1 = result.split('/')[7].split(' ')[0];

    console.log(`Test A (e1->d1): ${resultRank1}`);
    if (resultRank1 !== "RNBQKBNR" && resultRank1 !== "RNBQ1BNR") { // Expecting RNBQKBNR roughly (K takes Q) or similar valid string
        // The bug produces RNBKK1BNR
        if (resultRank1.length > 8 || resultRank1.includes('KK')) {
            console.error("FAIL: Result seems Corrupt/Double Placement");
        }
    }
} catch (e) {
    console.error("Test A Crash:", e);
}

// Bug B: Digit branch re-entry
try {
    // Construct "2P5" on rank 8 for simplicity of index 0
    const fenB = "2P5/8/8/8/8/8/8/8 w - - 0 1";
    // Move P (c8) to a7 (just to trigger removal on rank 8)
    const resultB = makeSimpleMove(fenB, "c8", "a7");
    const rank8 = resultB.split('/')[0];
    console.log(`Test B (Removal): Got '${rank8}', Expected '8'`);
    if (rank8 === '251' || rank8 === '71') {
        console.error("FAIL: Bug B produced invalid empty mapping");
    }
} catch (e) {
    console.error("Test B Crash:", e);
}

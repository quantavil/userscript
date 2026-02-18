import fs from 'fs';
import path from 'path';
import { LocalEngine } from '../src/engine/local-engine.js';

const EPD_PATH = path.resolve('tests/wac.epd');

function checkSanMatch(engine, uci, san) {
    if (!uci || uci === '(none)') return false;

    // Clean SAN: remove capture 'x', check '+', check '#'
    // But basic cleaning first
    let cleanSan = san.replace(/[+#x]/g, '');

    // Handle castling
    if (cleanSan === 'O-O') return uci === 'e1g1' || uci === 'e8g8';
    if (cleanSan === 'O-O-O') return uci === 'e1c1' || uci === 'e8c8';

    // Parse target square (last 2 chars of clean SAN)
    const targetSq = cleanSan.slice(-2);

    // Parse piece type
    const firstChar = cleanSan[0];
    const isPawn = (firstChar >= 'a' && firstChar <= 'h');
    const pieceType = isPawn ? 'P' : firstChar;

    // Parse source hint (everything between piece and target)
    // e.g. Nbd7 -> 'b'
    // e.g. R1e5 -> '1'
    // e.g. Qh4e1 -> 'h4'
    // e.g. exd5 -> 'e' (Pawn capture)
    // e.g. d5 -> '' (Pawn move)
    let sourceHint = '';
    if (isPawn) {
        // For pawn, usually cleanSan is just target (e4) or file+target (exd5 -> ed5)
        // If length > 2, the first part is source file
        if (cleanSan.length > 2) {
            sourceHint = cleanSan.slice(0, cleanSan.length - 2);
        }
    } else {
        // For pieces, remove first char and last 2 chars
        if (cleanSan.length > 3) {
            sourceHint = cleanSan.slice(1, cleanSan.length - 2);
        }
    }

    const typeMap = { 'N': 2, 'B': 3, 'R': 4, 'Q': 5, 'K': 6, 'P': 1 };
    const requiredPieceParams = typeMap[pieceType];

    // Find the engine move object corresponding to UCI
    // We need to regenerate moves to find the FROM square
    // Ideally engine should provide from/to from UCI, but moveToUci is simple.
    // Let's parse UCI directly: e.g. e2e4 or e7e8q
    const sourceSqName = uci.slice(0, 2);
    const targetSqName = uci.slice(2, 4);
    const promoChar = uci.length > 4 ? uci[4] : '';

    // Check target first
    if (targetSqName !== targetSq) return false;

    // Check promotion
    // If SAN has =Q, cleaning removed =, left Q. 
    // Wait, regex replace /[+#x]/g doesn't remove '='.
    // Standard SAN: a8=Q.
    if (san.includes('=')) {
        const promoSan = san.split('=')[1].replace(/[+#]/g, '').toLowerCase(); // q
        if (promoChar !== promoSan) return false;
    }

    // Now check if piece logic matches (using engine board state would be best, but we moved!)
    // Wait, the engine state is AFTER the move?
    // No, analyze() calls engine.reset(), loadFen(), searches.
    // The engine state is still at the START position (search un-makes moves).
    // So we can check the piece at sourceSq.
    // Wait, verification: `engine.searchRoot` does make/unmake. The board state should be initial.

    // Just in case, let's verify what piece is at sourceSqName.
    const fileMap = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7 };
    const rankMap = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7 };

    const f = fileMap[sourceSqName[0]];
    const r = rankMap[sourceSqName[1]];
    const sq = r * 16 + f;

    const p = Math.abs(engine.board[sq]);

    if (p !== requiredPieceParams) return false;

    // Check source hint
    if (sourceHint) {
        // Hint implies file (a-h) or rank (1-8) or both
        for (const char of sourceHint) {
            if (char >= 'a' && char <= 'h') {
                if (sourceSqName[0] !== char) return false;
            } else if (char >= '1' && char <= '8') {
                if (sourceSqName[1] !== char) return false;
            }
        }
    }

    return true;
}

async function analyze() {
    console.log('--- ♟️ Puzzle Time Sensitivity Analysis (First 5) ---');
    if (!fs.existsSync(EPD_PATH)) {
        console.error(`EPD file not found at ${EPD_PATH}`);
        process.exit(1);
    }

    const lines = fs.readFileSync(EPD_PATH, 'utf8').split('\n').filter(l => l.trim()).slice(0, 5);
    const engine = new LocalEngine();

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split(' bm ');
        const fen = parts[0].trim();
        const movePart = parts[1].split(';')[0].trim();
        const bestMoves = movePart.split(' ').map(m => m.trim()).filter(m => m);
        const idMatch = line.match(/id "([^"]+)"/);
        const puzzleId = idMatch ? idMatch[1] : `Puzzle ${i + 1}`;

        console.log(`\nAnalyzing ${puzzleId}... (${bestMoves.join(', ')})`);

        let solvedAt = null;
        // Optimized time steps for faster scanning (total ~27s max per puzzle)
        const timeSteps = [100, 300, 500, 1000, 2500, 5000, 7500, 10000];

        for (const t of timeSteps) {
            engine.reset();
            engine.loadFen(fen);
            // Assuming searchRoot returns { move, depth, nodes, score }
            const result = engine.searchRoot(20, t);
            const engineMove = result.move ? engine.moveToUci(result.move) : '(none)';

            // Check correctness
            const isCorrect = bestMoves.some(bm => {
                // Direct UCI match (if bm is UCI)
                if (bm === engineMove) return true;
                // SAN match
                return checkSanMatch(engine, engineMove, bm);
            });

            if (isCorrect) {
                solvedAt = t;
                console.log(`  ✅ Solved at ~${t}ms (Depth: ${result.depth}, Nodes: ${result.nodes}) [Move: ${engineMove}]`);
                break;
            } else {
                // Optional: print failed move for debugging
                console.log(`  ❌ Failed at ${t}ms [Move: ${engineMove}]`);
            }
        }

        if (!solvedAt) {
            console.log(`  ❌ Could not solve within 10s.`);
        }
    }
}

analyze().catch(console.error);

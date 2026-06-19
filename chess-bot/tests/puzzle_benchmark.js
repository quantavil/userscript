import fs from 'fs';
import path from 'path';
import { LocalEngine } from '../src/engine/local-engine.js';

/**
 * Chess Engine Puzzle Benchmark (WAC 300)
 * 
 * Usage: node tests/puzzle_benchmark.js [timeLimitMs]
 */

const TIME_LIMIT_PER_PUZZLE = parseInt(process.argv[2]) || 1000;
const EPD_PATH = path.resolve('tests/wac.epd');

async function runBenchmark() {
    console.log('--- ♟️ Chess Engine Puzzle Benchmark (WAC 300) ---');
    console.log(`Time Limit: ${TIME_LIMIT_PER_PUZZLE}ms per puzzle`);

    if (!fs.existsSync(EPD_PATH)) {
        console.error(`EPD file not found at ${EPD_PATH}`);
        process.exit(1);
    }

    const lines = fs.readFileSync(EPD_PATH, 'utf8').split('\n').filter(l => l.trim());
    const engine = new LocalEngine();

    let solved = 0;
    let totalNodes = 0;
    let startTime = Date.now();

    console.log('\nProcessing puzzles...');

    for (const line of lines) {
        // Parse EPD: FEN bm move; id "name";
        // Example: 2rr3k/pp3pp1/1nnqbN1p/3pN3/2pP4/2P3Q1/PPB4P/R4RK1 w - - bm Qg6; id "WAC.001";
        const parts = line.split(' bm ');
        if (parts.length < 2) continue;

        const fen = parts[0].trim();
        const movePart = parts[1].split(';')[0].trim();
        const bestMoves = movePart.split(' '); // Some have multiple best moves
        const idMatch = line.match(/id "([^"]+)"/);
        const puzzleId = idMatch ? idMatch[1] : 'unknown';

        engine.reset();
        engine.loadFen(fen);

        // Search at depth 10 with time limit
        // We use analyze() or searchRoot()? 
        // SearchRoot returns { move, score, pv, depth, nodes }
        const result = engine.searchRoot(10, TIME_LIMIT_PER_PUZZLE);

        const engineMove = result.move ? engine.moveToUci(result.move) : '(none)';
        const isCorrect = bestMoves.some(bm => {
            // BM in EPD can be SAN (Qg6) or UCI (f2f4). 
            // WAC is mostly SAN. We need to handle SAN to UCI or vice-versa.
            // Actually, WAC usually lacks UCI. Let's convert best moves to UCI.

            // To compare SAN to UCI, we find the legal move that matches the SAN.
            return engineMove === bm || checkSanMatch(engine, engineMove, bm);
        });

        if (isCorrect) {
            solved++;
            process.stdout.write('✓');
        } else {
            process.stdout.write('✗');
        }

        totalNodes += result.nodes;

        // Progress update every 10 puzzles
        if ((solved + (lines.indexOf(line) - solved + 1)) % 30 === 0) {
            process.stdout.write(` [${puzzleId}] `);
        }
    }

    const duration = (Date.now() - startTime) / 1000;
    const nps = Math.round(totalNodes / duration);
    const score = ((solved / lines.length) * 100).toFixed(1);

    console.log('\n\n--- Benchmark Results ---');
    console.log(`Solved:    ${solved} / ${lines.length} (${score}%)`);
    console.log(`Time:      ${duration.toFixed(2)}s`);
    console.log(`Avg Nodes: ${Math.round(totalNodes / lines.length)}`);
    console.log(`Total NPS: ${nps.toLocaleString()}`);
    console.log('--------------------------\n');
}

/**
 * Helper to check if a UCI move matches a SAN string in the current position
 */
function checkSanMatch(engine, uci, san) {
    if (!uci || uci === '(none)') return false;

    // Clean SAN: remove capture 'x', check '+', check '#'
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
    let sourceHint = '';
    if (isPawn) {
        if (cleanSan.length > 2) {
            sourceHint = cleanSan.slice(0, cleanSan.length - 2);
        }
    } else {
        if (cleanSan.length > 3) {
            sourceHint = cleanSan.slice(1, cleanSan.length - 2);
        }
    }

    const typeMap = { 'N': 2, 'B': 3, 'R': 4, 'Q': 5, 'K': 6, 'P': 1 };
    const requiredPieceParams = typeMap[pieceType];

    const sourceSqName = uci.slice(0, 2);
    const targetSqName = uci.slice(2, 4);
    const promoChar = uci.length > 4 ? uci[4] : '';

    if (targetSqName !== targetSq) return false;

    // Check promotion
    if (san.includes('=')) {
        const promoSan = san.split('=')[1].replace(/[+#]/g, '').toLowerCase();
        if (promoChar !== promoSan) return false;
    }

    const fileMap = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7 };
    const rankMap = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7 };

    // Check legality and piece type indirectly by verifying source square 
    // We assume the engine move is legal, so we just check if the source/target match the SAN description.
    // However, we don't have easy access to the board state BEFORE the move here without resetting.
    // LUCKILY, checkSanMatch is called inside loop where engine state is STARTING FEN?
    // In runBenchmark: engine.reset(); engine.loadFen(fen); result = search().
    // The engine state AFTER search() is... wait.
    // engine.searchRoot internal logic does make/unmake. 
    // BUT does it leave the board in original state? Yes.
    // So we can check engine.board[sourceSq].

    const f = fileMap[sourceSqName[0]];
    const r = rankMap[sourceSqName[1]];
    const sq = r * 16 + f;

    const p = Math.abs(engine.board[sq]);

    // Safety check: if board piece doesn't match SAN piece type, it's not a match.
    // Note: This relies on engine.board being at root state.
    if (p !== requiredPieceParams) return false;

    // Check source hint
    if (sourceHint) {
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

runBenchmark().catch(console.error);

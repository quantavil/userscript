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

    // Simplistic SAN check: if san is "Qg6", and uci is "h5g6" where piece on h5 is Queen, it might match.
    // Better: generate all legal moves, find the one that results in 'san' representation.
    const legalMoves = engine.generateLegalMoves();
    for (const m of legalMoves) {
        if (engine.moveToUci(m) === uci) {
            // This is our move. Does it match SAN?
            // Since we don't have a SAN generator, we can try to "parse" the SAN.
            // WAC SAN is simple: "Qg6", "Rxb2", "Qc4+", "Ne3".

            const mUci = engine.moveToUci(m);
            if (mUci === san) return true; // Already UCI?

            // Basic SAN parsing
            let cleanSan = san.replace(/[+#x]/g, ''); // Remove check, mate, capture

            // If SAN is e4,UCI should be something like e2e4
            // If SAN is Nf3, UCI should be something like g1f3

            // Let's just use the fact that if we apply the move, we can check if it matches the target sq and piece.
            const targetSq = san.slice(-2);
            if (mUci.endsWith(targetSq)) {
                // Potential match. Check piece.
                const pieceType = san[0];
                if (pieceType >= 'A' && pieceType <= 'Z') {
                    const p = Math.abs(m.piece);
                    const typeMap = { 'N': 2, 'B': 3, 'R': 4, 'Q': 5, 'K': 6 };
                    if (typeMap[pieceType] === p) return true;
                } else {
                    // Pawn move
                    if (Math.abs(m.piece) === 1) return true;
                }
            }
        }
    }
    return false;
}

runBenchmark().catch(console.error);

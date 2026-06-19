import fs from 'fs';
import path from 'path';
import { LocalEngine } from '../src/engine/local-engine.js';

const EPD_PATH = path.resolve('tests/wac.epd');

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

    if (san.includes('=')) {
        const promoSan = san.split('=')[1].replace(/[+#]/g, '').toLowerCase();
        if (promoChar !== promoSan) return false;
    }

    const fileMap = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7 };
    const rankMap = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7 };

    const f = fileMap[sourceSqName[0]];
    const r = rankMap[sourceSqName[1]];
    const sq = r * 16 + f;

    const p = Math.abs(engine.board[sq]);

    if (p !== requiredPieceParams) return false;

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

async function analyze() {
    console.log('--- ♟️ Puzzle Performance Analysis (Top 15) ---');
    if (!fs.existsSync(EPD_PATH)) {
        console.error(`EPD file not found at ${EPD_PATH}`);
        process.exit(1);
    }

    const lines = fs.readFileSync(EPD_PATH, 'utf8').split('\n').filter(l => l.trim()).slice(0, 15);
    const engine = new LocalEngine();

    const timeSteps = [200, 500, 1000];
    const results = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split(' bm ');
        const fen = parts[0].trim();
        const movePart = parts[1].split(';')[0].trim();
        const bestMoves = movePart.split(' ').map(m => m.trim()).filter(m => m);
        const idMatch = line.match(/id "([^"]+)"/);
        const puzzleId = idMatch ? idMatch[1] : `Puzzle ${i + 1}`;

        console.log(`\nAnalyzing ${puzzleId}... (${bestMoves.join(', ')})`);

        const puzzleResults = { id: puzzleId, steps: {} };

        for (const t of timeSteps) {
            engine.reset();
            engine.loadFen(fen);
            const result = engine.searchRoot(20, t);
            const engineMove = result.move ? engine.moveToUci(result.move) : '(none)';

            const isCorrect = bestMoves.some(bm => {
                if (bm === engineMove) return true;
                return checkSanMatch(engine, engineMove, bm);
            });

            puzzleResults.steps[t] = isCorrect;

            if (isCorrect) {
                console.log(`  ✅ [${t}ms]: Solved! [Move: ${engineMove}]`);
            } else {
                console.log(`  ❌ [${t}ms]: Failed [Move: ${engineMove}]`);
            }
        }
        results.push(puzzleResults);
    }

    console.log('\n--- Summary Report ---');
    console.log('ID'.padEnd(15), '| 200ms | 500ms | 1000ms');
    console.log('-'.repeat(45));
    results.forEach(res => {
        const s200 = res.steps[200] ? '✅' : '❌';
        const s500 = res.steps[500] ? '✅' : '❌';
        const s1000 = res.steps[1000] ? '✅' : '❌';
        console.log(`${res.id.padEnd(15)} |   ${s200}   |   ${s500}   |   ${s1000}`);
    });
}

analyze().catch(console.error);

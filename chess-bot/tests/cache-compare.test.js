import { describe, it, expect } from 'vitest';
import { LocalEngine } from '../src/engine/local-engine.js';

const POSITIONS = [
    { name: 'Starting position', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
    { name: 'Italian Game', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4' },
    { name: 'Mate in 2 (Qh4#)', fen: 'rnbqkb1r/pppp1ppp/5n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4' },
    { name: 'Complex middlegame', fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7' },
    { name: 'Endgame (K+P vs K)', fen: '8/8/8/8/4k3/8/4P3/4K3 w - - 0 1' },
];

const DEPTH = 8;
const TIME = 3000;

describe('Cache ON vs OFF Comparison', () => {
    const rows = [];

    for (const pos of POSITIONS) {
        it(`${pos.name}`, () => {
            // WITH CACHE
            const engOn = new LocalEngine();
            const t0 = performance.now();
            const resOn = engOn.analyze(pos.fen, DEPTH, TIME);
            const msOn = Math.round(performance.now() - t0);

            // WITHOUT CACHE — disable TT completely
            const engOff = new LocalEngine();
            engOff.ttProbe = () => null;
            engOff.ttStore = () => { };
            const t1 = performance.now();
            const resOff = engOff.analyze(pos.fen, DEPTH, TIME);
            const msOff = Math.round(performance.now() - t1);

            const speedup = (msOff / msOn).toFixed(1);

            console.log(`\n=== ${pos.name} ===`);
            console.log(`  CACHE ON:  move=${resOn.bestmove}  eval=${resOn.evaluation?.toFixed(2)}  depth=${resOn.depth}  nodes=${resOn.nodes}  time=${msOn}ms`);
            console.log(`  CACHE OFF: move=${resOff.bestmove}  eval=${resOff.evaluation?.toFixed(2)}  depth=${resOff.depth}  nodes=${resOff.nodes}  time=${msOff}ms`);
            console.log(`  Speedup: ${speedup}x`);
            console.log(`  Same move: ${resOn.bestmove === resOff.bestmove ? 'YES' : 'NO (' + resOn.bestmove + ' vs ' + resOff.bestmove + ')'}`);

            rows.push({ pos: pos.name, onMove: resOn.bestmove, offMove: resOff.bestmove, onDepth: resOn.depth, offDepth: resOff.depth, onNodes: resOn.nodes, offNodes: resOff.nodes, onMs: msOn, offMs: msOff, speedup });

            expect(resOn.success).toBe(true);
            expect(resOff.success).toBe(true);
        });
    }

    it('summary', () => {
        console.log('\n========== SUMMARY ==========');
        console.table(rows);
        expect(rows.length).toBe(POSITIONS.length);
    });
});

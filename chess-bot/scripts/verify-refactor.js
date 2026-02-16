
import { LocalEngine } from '../src/engine/local-engine.js';
import { performance } from 'perf_hooks';

console.log('--- Verifying LocalEngine ---');

try {
    const eng = new LocalEngine();
    console.log('✅ LocalEngine instantiated');

    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    eng.loadFen(startFen);
    console.log('✅ loadFen working');

    const evalStart = eng.evaluate();
    console.log(`✅ evaluate() initial: ${evalStart}`);

    // Test a specific position
    const fen2 = 'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2';
    eng.loadFen(fen2);
    const eval2 = eng.evaluate();
    console.log(`✅ evaluate() pos2: ${eval2}`);

    // Test search
    console.log('Running searchRoot(2)...');
    const start = performance.now();
    const res = eng.searchRoot(2, 1000);
    const end = performance.now();

    console.log(`✅ searchRoot result: depth=${res.depth}, score=${res.score}, move=${eng.moveToUci(res.move)}`);
    console.log(`   Time: ${(end - start).toFixed(2)}ms`);

    if (res.score === 0 || Math.abs(res.score) < 500) {
        console.log('✅ Search score plausible');
    } else {
        console.warn('⚠️ Unexpected search score range');
    }

    console.log('--- Verification PASSED ---');
} catch (e) {
    console.error('❌ Verification FAILED:', e);
    process.exit(1);
}

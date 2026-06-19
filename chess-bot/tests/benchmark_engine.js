
import { LocalEngine } from '../src/engine.js';

console.log('--- Engine Benchmark ---');

const engine = new LocalEngine();
engine.loadFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

// 1. Measure Evaluate Speed
console.log('Benchmarking evaluate()...');
const EVAL_ITERS = 1_000_000;
const startEval = performance.now();
let chk = 0;
for (let i = 0; i < EVAL_ITERS; i++) {
    chk += engine.evaluate();
}
const endEval = performance.now();
const evalTime = endEval - startEval;
console.log(`Evaluate: ${EVAL_ITERS} calls in ${evalTime.toFixed(2)}ms`);
console.log(`Speed: ${((evalTime / EVAL_ITERS) * 1000).toFixed(2)} µs/call`);
console.log(`Ops/sec: ${(EVAL_ITERS / (evalTime / 1000)).toFixed(0)}`);

// 2. Measure Search Speed (Depth 6)
console.log('\nBenchmarking search (depth 5)...');
engine.nodes = 0;
const startSearch = performance.now();
const res = engine.searchRoot(5);
const endSearch = performance.now();
const searchTime = endSearch - startSearch;

console.log(`Search Depth 5: ${searchTime.toFixed(2)}ms`);
console.log(`Nodes: ${engine.nodes}`);
console.log(`NPS: ${((engine.nodes / searchTime) * 1000).toFixed(0)}`);
console.log('Result:', res);

// 3. Incremental Update Check
console.log('\nBenchmarking makeMove/unmakeMove + evaluate...');
const UPDATE_ITERS = 200_000;
const moves = engine.generateLegalMoves();
const move = moves[0];
const startUpdate = performance.now();
for (let i = 0; i < UPDATE_ITERS; i++) {
    engine.makeMove(move);
    engine.evaluate();
    engine.unmakeMove(move);
}
const endUpdate = performance.now();
const updateTime = endUpdate - startUpdate;
console.log(`Update+Eval: ${UPDATE_ITERS} cycles in ${updateTime.toFixed(2)}ms`);
console.log(`Speed: ${((updateTime / UPDATE_ITERS) * 1000).toFixed(2)} µs/cycle`);

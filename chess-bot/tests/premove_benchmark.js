import { LocalEngine } from '../src/engine/local-engine.js';
import { evaluatePremove } from '../src/engine/premove.js';

/**
 * Premove quality & speed benchmark
 *
 * Usage:
 *   node tests/premove_benchmark.js [iterations]
 *
 * The script reuses curated premove scenarios from the test suite
 * and reports:
 *   - correctness vs expected ALLOW/BLOCK
 *   - average wall time per `evaluatePremove` call
 */

const ITERATIONS = parseInt(process.argv[2] || '50', 10);

/** @typedef {{label:string, fen:string, opponentUci:string|null, ourUci:string, ourColor:'w'|'b', expectExecute:boolean}} Scenario */

/** @type {Scenario[]} */
const SCENARIOS = [
  // Class 1 — Hanging piece / losing exchange
  {
    label: '1a knight into defended pawn (BLOCK)',
    fen: '4k3/8/8/4p3/8/5N2/8/4K3 b - - 0 1',
    opponentUci: 'e8d7',
    ourUci: 'f3d4',
    ourColor: 'w',
    expectExecute: false,
  },
  {
    label: '1b queen into defended pawn (BLOCK)',
    fen: '4k3/8/2p5/3p4/8/5Q2/8/4K3 b - - 0 1',
    opponentUci: 'e8e7',
    ourUci: 'f3d5',
    ourColor: 'w',
    expectExecute: false,
  },
  {
    label: '1c rook into queen defence (BLOCK)',
    fen: '4k2q/8/8/4p3/8/8/4R3/4K3 b - - 0 1',
    opponentUci: 'e8d7',
    ourUci: 'e2e5',
    ourColor: 'w',
    expectExecute: false,
  },
  {
    label: '1d rook into bishop defence (BLOCK)',
    fen: '7k/8/8/8/8/2b5/4R3/7K b - - 0 1',
    opponentUci: 'h8g7',
    ourUci: 'e2e5',
    ourColor: 'w',
    expectExecute: false,
  },

  // Class 3 — Back-rank and mate threats
  {
    label: '3a g-file rook vacates (BLOCK)',
    fen: '6rk/8/8/8/8/8/8/6RK b - - 0 1',
    opponentUci: 'g8f8',
    ourUci: 'g1g4',
    ourColor: 'w',
    expectExecute: false,
  },
  {
    label: '3b back-rank mate threat (BLOCK)',
    fen: '6rk/8/8/8/8/8/8/6RK b - - 0 1',
    opponentUci: 'g8f8',
    ourUci: 'g1g6',
    ourColor: 'w',
    expectExecute: false,
  },

  // Queen-loss regression scenarios
  {
    label: 'Q-loss game replay Na4+e6 (BLOCK)',
    fen: '2r1kb1r/pp2pppp/1qn2n2/3p1b2/3P4/2N2NP1/PP2PP1P/R2Q1RK1 w - - 0 9',
    opponentUci: 'c3a4',
    ourUci: 'e7e6',
    ourColor: 'b',
    expectExecute: false,
  },
  {
    label: 'knight fork vs queen (BLOCK)',
    fen: '4k3/4p3/1q6/3p4/3P4/2N5/8/6K1 w - - 0 1',
    opponentUci: 'c3d5',
    ourUci: 'e7e6',
    ourColor: 'b',
    expectExecute: false,
  },
  {
    label: 'bishop attacks rook, pawn ignores (BLOCK)',
    fen: '2r1k3/pp3ppp/8/8/8/3B4/5PPP/6K1 w - - 0 1',
    opponentUci: 'd3a6',
    ourUci: 'h7h6',
    ourColor: 'b',
    expectExecute: false,
  },

  // Safe ALLOW cases
  {
    label: 'safe center pawn e4 vs e5 (ALLOW)',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1',
    opponentUci: 'e7e5',
    ourUci: 'e2e4',
    ourColor: 'w',
    expectExecute: true,
  },
  {
    label: 'safe knight development Nf3 (ALLOW)',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    opponentUci: 'e7e5',
    ourUci: 'g1f3',
    ourColor: 'w',
    expectExecute: true,
  },
  {
    label: 'safe queen development Qd1e2 (ALLOW)',
    fen: 'k7/8/8/8/8/8/8/3QK3 b - - 0 1',
    opponentUci: 'a8b8',
    ourUci: 'd1e2',
    ourColor: 'w',
    expectExecute: true,
  },
  {
    label: 'safe e6 when Kh1 (ALLOW)',
    fen: '2r1kb1r/pp2pppp/1qn2n2/3p1b2/3P4/2N2NP1/PP2PP1P/R2Q1RK1 w - - 0 9',
    opponentUci: 'g1h1',
    ourUci: 'e7e6',
    ourColor: 'b',
    expectExecute: true,
  },
];

function runOnce() {
  const engine = new LocalEngine();
  let correct = 0;
  let total = 0;
  let allowed = 0;
  let blocked = 0;
  let totalMs = 0;

  for (const s of SCENARIOS) {
    if (!s.opponentUci || s.opponentUci.length < 4) continue;
    total++;

    const t0 = performance.now();
    const result = evaluatePremove(s.fen, s.opponentUci, s.ourUci, s.ourColor);
    const t1 = performance.now();

    totalMs += t1 - t0;
    if (result.execute) allowed++;
    else blocked++;
    if (result.execute === s.expectExecute) correct++;
  }

  return {
    total,
    correct,
    allowed,
    blocked,
    avgMs: total ? totalMs / total : 0,
  };
}

async function main() {
  console.log('--- ♟️ Premove Benchmark ---');
  console.log(`Scenarios: ${SCENARIOS.length}`);
  console.log(`Iterations: ${ITERATIONS}`);

  let aggTotal = 0;
  let aggCorrect = 0;
  let aggAllowed = 0;
  let aggBlocked = 0;
  let aggMs = 0;

  for (let i = 0; i < ITERATIONS; i++) {
    const r = runOnce();
    aggTotal += r.total;
    aggCorrect += r.correct;
    aggAllowed += r.allowed;
    aggBlocked += r.blocked;
    aggMs += r.avgMs;
  }

  const avgCorrectRate = aggTotal ? (aggCorrect / aggTotal) * 100 : 0;
  const avgCallMs = ITERATIONS ? aggMs / ITERATIONS : 0;

  console.log('\nResults (over all iterations):');
  console.log(`  Total evaluated:   ${aggTotal}`);
  console.log(`  Correct decisions: ${aggCorrect} (${avgCorrectRate.toFixed(1)}%)`);
  console.log(`  Allowed premoves:  ${aggAllowed}`);
  console.log(`  Blocked premoves:  ${aggBlocked}`);
  console.log(`  Avg eval time:     ${avgCallMs.toFixed(3)} ms per evaluatePremove()`);
  console.log('-----------------------------');
}

main().catch(err => {
  console.error('Premove benchmark failed:', err);
  process.exit(1);
});


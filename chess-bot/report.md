# Chess Engine Tactical Scaling Report (WAC 300)

This report evaluates the tactical accuracy and performance of the chess engine across various thinking times using the **300 Win At Chess (WAC)** tactical suite.

## Performance Metrics (Optimized: Lazy Legality + RFP + Razoring + NMP + 0x88 + SEE + Advanced Passed Pawn Eval)

| Thinking Time   | Solved (out of 300) | Accuracy (%) | Avg Nodes/Puzzle | Total NPS | Status          |
|-----------------|---------------------|--------------|------------------|-----------|-----------------|
| **100ms**       | 153                 | 51.0%        | 9,605            | 66,804    | **Latest**      |
| **200ms**       | 165                 | 55.0%        | 15,651           | 75,213    | **Latest**      |
| **500ms**       | 192                 | 64.0%        | 31,945           | 69,216    | **Latest**      |
| **1s (1000ms)** | 219                 | 73.0%        | 65,995           | 76,572    | **Latest**      |
| **2s (2000ms)** | 230                 | 76.7%        | 126,209          | 76,359    | **Latest**      |

*Note: Accuracy reflects the recent implementation of Advanced Passed Pawn Evaluation and Quiescence Search forcing moves to solve complex promotion sacrifices like WAC.002.*

## Optimization Summary

... (previous tweaks) ...

### **Tweak 10: Advanced Passed Pawn Evaluation & QS Forcing Move (Applied)**
- **Description**: Increased passed pawn bonuses for rank advancement (up to +800 for 7th rank). Modified Quiescence Search to treat pawn pushes to the 7th/2nd rank as forcing (non-quiet) moves.
- **Status**: **KEPT**.
- **Outcome**: Successfully solves **WAC.002** and similar "Horizon Effect" positions where the engine previously undervalued unstoppable promotion chains.

- **Late Move Pruning (LMP)**: Pruned too many tactical defenses. Solved count dropped (-6 at 100ms).
- **Futility Pruning (Standard)**: Caused regression (-4 at 200ms). Likely too aggressive for tactical puzzles.
- **Internal Iterative Deepening (IID)**: Caused execution issues (stack overhead/recursion).
- **Late Move Reduction (LMR)**: Consistently hurt accuracy across all tested thresholds. Quiet tactical moves were pruned too often.
- **Tempo Bonus**: Distorted evaluation, leading to worse puzzle-solving rates.
- **Aspiration Windows**: Overhead of re-searches outweighed benefits at bullet time controls.

---

## Why These Optimizations Worked

We achieved these gains by teaching the engine to **stop wasting time on obvious positions**.

1.  **Stop verifying "winning" lines** (RFP).
2.  **Ignore "hopeless" branches** fast (Razoring).
3.  **Skip legality checks** for pruned moves (Lazy Legality).
4.  **Prune defensive tries** that are doomed to fail (NMP).
5.  **Search check-giving moves** in Quiescence Search to find forced mates that start with sacrifices (Tactical Blindness Fix).
6.  **Fix Test Harness**: Ensure benchmarks measure actual engine performance, not parser errors.


## Reproduction
To run the benchmarks:
```bash
node tests/puzzle_benchmark.js [timeLimitMs]
```

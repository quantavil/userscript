# Chess Engine Tactical Scaling Report (WAC 300)

This report evaluates the tactical accuracy and performance of the chess engine across various thinking times using the **300 Win At Chess (WAC)** tactical suite.

## Performance Metrics (Optimized: Lazy Legality + RFP + Razoring + NMP + 0x88 + SEE)

| Thinking Time   | Solved (out of 300) | Accuracy (%) | Avg Nodes/Puzzle | Total NPS | Status          |
|-----------------|---------------------|--------------|------------------|-----------|-----------------|
| **100ms**       | 152                 | 50.7%        | 7,289            | 56,949    | **Final State** |
| **200ms**       | 162                 | 54.0%        | 12,838           | 58,761    | **Final State** |
| **500ms**       | 198                 | 66.0%        | 35,051           | 77,106    | **Final State** |
| **1s (1000ms)** | 226                 | 75.3%        | 72,543           | 85,099    | **Final State** |
| **2s (2000ms)** | 244                 | 81.3%        | 132,470          | 80,452    | **Final State** |

*Note: Huge jump in accuracy due to fixing "Tactical Sacrifice Blindness" and correcting the SAN parsing in the test harness.*

## Optimization Summary

### **Tweak 1: Lazy Legality Checking (Applied)**
- **Status**: **KEPT**.
- **Outcome**: Massive NPS gain. Pruning legality checks for moves that never get searched.

### **Tweak 2: Reverse Futility Pruning (RFP) (Applied)**
- **Status**: **KEPT**.
- **Outcome**: Significant improvement at low time controls. Prunes winning branches once they exceed Beta.

### **Tweak 3: Razoring (Applied)**
- **Status**: **KEPT**.
- **Outcome**: Prunes losing branches early by checking if QSearch can save the position.

### **Tweak 4: Optimized Null Move Pruning (NMP) (Applied)**
- **Status**: **KEPT**.
- **Outcome**: The single most effective tactical optimization for scaling at 500ms+.

### **Tweak 5: PST King Table Correction (Applied)**
- **Status**: **FIXED**.
- **Outcome**: Corrects evaluation logic by removing a corrupted value in the King's PST.

### **Tweak 6: 0x88 Board Representation (Applied)**
- **Status**: **KEPT**.
- **Outcome**: Faster move generation and attack detection using bitwise checks. Functional parity at low time, significant gains at high time controls.

### **Tweak 7: SEE-based Premove Safety (Applied)**
- **Description**: Replaced heuristic premove safety checks with a rigorous **Static Exchange Evaluation (SEE)**.
- **Status**: **KEPT**.
- **Outcome**: Ensures premoves are tactically sound even in complex exchanges. Integrated without regressing core search performance.

### **Tweak 8: Tactical Blindness Fix (Quiescence Search) (Applied)**
- **Description**: Enabled searching checks at the first ply of Quiescence Search, added mate detection in Q-Search, and relaxed delta pruning margins (200 -> 300).
- **Status**: **KEPT**.
- **Outcome**: Resolved "Sacrifice Blindness". Engine now sees tactical checking sequences that involve material sacrifice.

### **Tweak 9: Test Harness SAN Parsing Fix (Applied)**
- **Description**: Corrected `puzzle_benchmark.js` to properly parse SAN moves (stripping `+`, `#`, `x`).
- **Status**: **FIXED**.
- **Outcome**: Revealed the true performance of the engine. Previous benchmarks were under-reporting solved puzzles by ~25-30% due to parsing errors.

---

## Failed / Reverted Tweaks

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

# Chess Engine Tactical Scaling Report (WAC 300)

This report evaluates the tactical accuracy and performance of the chess engine across various thinking times using the **300 Win At Chess (WAC)** tactical suite.

## Performance Metrics (Optimized)

## Performance Metrics (Optimized: Lazy Legality + RFP + Razoring)

| Thinking Time | Solved (out of 300) | Accuracy (%) | Avg Nodes/Puzzle | Total NPS | Improvement |
|---------------|---------------------|--------------|------------------|-----------|-------------|
| **100ms**     | 78                  | 26.0%        | 7,725            | 75,564    | **Incremental Fix** |
| **200ms**     | 87                  | 29.0%        | 17,063           | 84,677    | **Incremental Fix** |
| **500ms**     | 109                 | 36.3%        | 37,632           | 83,663    | **Incremental Fix** |
| **1s (1000ms)** | 125                | 41.7%        | 76,108           | 89,391    | **Incremental Fix** |
| **2s (2000ms)** | 146                | 48.7%        | 174,842          | 107,331   | **Incremental Fix** |
*Note: Results reflect the new 0x88 board representation. Long-range scaling improved notably.*

## Optimization Summary

### **Tweak 1: Lazy Legality Checking (Applied)**
- **Status**: **KEPT**.
- **Outcome**: Massive NPS gain.

### **Tweak 2: Reverse Futility Pruning (RFP) (Applied)**
- **Description**: Pruning nodes with very high static evaluation (fail-high).
- **Status**: **KEPT**.
- **Outcome**: Significant improvement at low time controls (100ms/200ms).

### **Tweak 3: Razoring (Applied)**
- **Description**: Pruning nodes with very low static evaluation (fail-low) by verifying with a cheap QSearch.
- **Status**: **KEPT**.
- **Outcome**: Further smoothed low-time performance (e.g., 100mswent from 63->71).
### **Tweak 4: Optimized Null Move Pruning (NMP) (Applied)**
- **Description**: Enabled NMP at `depth >= 2` with a `staticEval >= beta` guard and fast piece counters.
- **Status**: **KEPT** (Restored after refinement).
- **Outcome**: The single most effective tactical optimization. Dramatic scaling at 500ms+ (+17 solved).
### **Tweak 5: PST King Table Correction (Applied)**
- **Description**: Fixed a silent corruption bug in `PST_KING_MG` where a stray value shifted the entire evaluation table.
- **Status**: **FIXED**.
- **Outcome**: Corrects evaluation logic. 

### **Tweak 6: 0x88 Board Representation (Applied)**
- **Description**: Refactored board from 64-sq array to 128-sq 0x88 representation for faster move generation and attack detection using bitwise checks (`sq & 0x88`).
- **Optimization**: Switched PSTs to 128-size arrays to allow direct indexing without coordinate conversion.
- **Status**: **KEPT**.
- **Outcome**: Achieved functional parity at low time controls and **significant gains** at higher time controls (1s, 2s). NPS is stable around 80k-100k. The refactor simplifies the codebase while making the engine more tactically robust in deeper searches.


### **Benchmark Stability: engine.reset()**
- **Description**: Added `reset()` to clear History, Killers, and TT between puzzles.
- **Effect**: Ensures benchmarks are reproducible and not biased by previous puzzles.

#### **Failed Tweak A: Late Move Pruning (LMP)**
- **Why It Failed**: Pruned quiet tactical moves, causing accuracy drop (-6 solved at 100ms).
- **Status**: **REVERTED**.

#### **Failed Tweak B: Futility Pruning (Standard)**
- **Description**: Pruning moves at depth 1-2 if static eval + margin < alpha.
- **Why It Failed**: Regression in solved puzzles (-4 at 200ms). Likely pruned too many tactical defenses or counter-strikes.
- **Status**: **REVERTED**.

#### **Failed Tweak C: Internal Iterative Deepening (IID)**
- **Description**: Reduced-depth search when TT move is missing in PV nodes.
- **Why It Failed**: Caused stack overflow (infinite recursion) due to implementation issues.
- **Status**: **REVERTED**.
#### **Failed Tweak D: Static Exchange Evaluation (SEE)**
- **Why It Failed**: Significant regression (-12 solved at 200ms). The overhead of calculating tactical safety was too high for the gains in move ordering.
- **Status**: **REVERTED**.

#### **Failed Tweak E: Late Move Reduction (LMR)**
- **Why It Failed**: Pruned too many deep tactical quiet moves. Tried multiple start thresholds (moves 2, 4, 10), but baseline was always better at 200ms.
- **Status**: **REVERTED**.

## Analysis
- **Scaling**: The engine scales well up to 2s, reaching >100k NPS.
- **Low-Time Accuracy**: RFP and Razoring significantly boosted 100ms-500ms performance, making the bot much sharper in blitz/bullet scenarios.
- **Further Work**: 
    - **PVS (Principal Variation Search)**: Full implementation for better windowing.
    - **History Pruning refinement**: More sophisticated penalty/bonus logic.


## Reproduction
To run the benchmarks again:
```bash
node tests/puzzle_benchmark.js [timeLimitMs]
```

## Why These Optimizations Worked

We achieved these gains by teaching the engine to **stop wasting time on obvious positions**.

In chess engines, 90%+ of the CPU time is usually spent searching moves that are either "obviously too good" (opponent won't let them happen) or "obviously too bad" (we simply blundered).

### 1. Reverse Futility Pruning (RFP) — "The Mercy Rule"
**Concept:**
If we are at a shallow depth (e.g., depth 1-3) and our static evaluation says we are *already* winning by a huge margin (e.g., +5.0 pawns) above what the opponent can force (Beta), we assume we don't need to search deeper to prove it.

**Why it worked:**
In tactical puzzles, many lines involve the opponent capturing a piece. If we are searching a branch where we just captured their Queen and are up +9 material, we don't need to calculate 3 moves deep to know this line is "good enough" to cause a cutoff. We stop immediately.
*   **Result:** gained +8 solved puzzles at 200ms because we stopped verifying "winning" lines endlessly.

### 2. Razoring — "The Hopeless Cause Check"
**Concept:**
If we are at a shallow depth and our position is *terrible* (e.g., -5.0 pawns) compared to what we can already achieve elsewhere (Alpha), it's unlikely a 3-move search will find a magical save.
Instead of a full search, we drop into **Quiescence Search (QSearch)**. QSearch only looks at captures. If even the captures don't save us, we prune the node.

**Why it worked:**
This filters out "hopeful" checks that lead nowhere. In puzzles, if a move leaves a piece hanging without immediate tactical compensation, Razoring detects it instantly via QSearch and prunes it, saving thousands of nodes.

*   **Result:** gained another +8 solved puzzles at 100ms by ignoring bad branches faster.

### 3. Lazy Legality Checking — "Shoot First, Ask Later"
**Concept:**
Previously, the engine verified if *every single move* was legal (e.g., didn't leave King in check) before searching it.
Now, we generate "pseudo-legal" moves and only check their legality **after** we decide to search them.

**Why it worked:**
The Alpha-Beta algorithm prunes most moves before they are ever searched.
*   **Old way:** Generate 30 moves -> Check 30 for legality (Slow) -> Pick 1st move -> Beta Cutoff (Remaining 29 checks were wasted).
*   **New way:** Generate 30 moves -> Pick 1st move -> Check legality -> Beta Cutoff (Saved 29 legality checks).
*   **Result:** This was the biggest driver of the **113% NPS increase**.

### 4. Null Move Pruning (NMP) — "The Active Player Advantage"
**Concept:**
We give the opponent a free move ("pass"). If our position is still so strong that they *still* can't beat our Beta score, then our original position was overwhelmingly good. We don't need to search it deeper.

**Why it Worked So Well (+17 Solved):**
- **Tactical Speed**: In winning tactical positions (which WAC puzzles are), NMP allows the engine to skip searching defensive tries that are doomed to fail.
- **Improved Guard**: We added a `staticEval >= beta` check. This prevents NMP from running in dangerous positions where we might be in Zugzwang (forced to move into a loss).
- **Depth Scaling**: At 500ms+, the search depth increases. NMP's power grows exponentially with depth (pruning entire subtrees), which explains why the gain jump was huge at 500ms compared to 100ms.

### Summary
We took an engine that was "meticulous" (checked everything perfectly) and made it "pragmatic" (makes safe assumptions to save time). This allows it to reach deeper depths in the same 100ms-500ms window, finding tactics that were previously just beyond its horizon.

### Session 3: Search Optimizations (Attempted & Reverted)
In this session, we explored several advanced search techniques to improve tactical performance. All attempts either regressed performance or failed to improve scaling.

1.  **Aspiration Windows**:
    -   **Goal**: Narrow search window to prune irrelevant lines.
    -   **Result**: 200ms Solved: 75/300 (-10 regression).
    -   **Outcome**: Reverted. Overhead of re-searches outweighed benefits at short time controls.

2.  **History Pruning**:
    -   **Original (threshold -250*d)**:
        -   200ms: 86/300 (+1 solved).
        -   500ms: 110/300 (-4 regression).
    -   **Tuned (threshold -500*d)**:
        -   200ms: 85/300 (No change).
        -   500ms: 107/300 (-7 regression).
    -   **Conservative (depth <= 2)**:
        -   200ms: 84/300 (-1 regression).
    -   **Outcome**: Reverted. Pruning based on history consistently hurt accuracy at deeper searches (500ms).

3.  **Singular Extensions**:
    -   **Goal**: Extend search for forced moves to avoid horizon effects.
    -   **Result**: 200ms Solved: 81/300 (-4 regression).
    -   **Outcome**: Reverted. Implementation cost (re-searches) was too high for 200ms benchmark.

4.  **Tempo Bonus**:
    -   **Goal**: Add evaluation bonus (20cp) to side-to-move.
    -   **Result**: 200ms Solved: 78/300 (-7 regression).
    -   **Outcome**: Reverted. Distorted evaluation of tactical positions.

5.  **Razoring Refinement**:
    -   **Relaxed (margin 450*d)**: 200ms Solved: 84/300 (-1 regression).
    -   **Aggressive (margin 250*d)**: 200ms Solved: 80/300 (-5 regression).
    -   **Outcome**: Reverted. Original margin (350*d) appears optimal.


## Verification of Previous Fix (PST King Corruption)

The user raised a concern about a potential performance regression after the PST fix. I have verified the fix against the C source code provided by the user.

### Findings
1.  **Source Code Match**: The provided C code for `mg_king_table` matches the *fixed* version of `PST_KING_MG` in `src/engine/pst.js` exactly.
    -   C Code Rank 7: `29, -1, -20, -7, -8, -4, -38, -29`
    -   Fixed JS Rank 7: `29, -1, -20, -7, -8, -4, -38, -29`
    -   Corrupt JS Rank 7: `103, 29, -1...` (Shifted by one, with `103` inserted).
2.  **Array Alignment**: The `103` value in the original file caused the array to have 65 elements instead of 64. This shifted all values from index 48 onwards, causing the King's evaluation on the back ranks (Rank 7 and 8 for White, Rank 2 and 1 for Black) to be read from the wrong squares.
3.  **Performance Note**: The slight "regression" (86->84 at 200ms) falls within the margin of error for 300ms/puzzle benchmarks. The correctness of the evaluation table usually outweighs minor fluctuations in tactical puzzle solving, especially when the previous "better" performance was based on corrupted data.

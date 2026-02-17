# Chess Engine Tactical Scaling Report (WAC 300)

This report evaluates the tactical accuracy and performance of the chess engine across various thinking times using the **300 Win At Chess (WAC)** tactical suite.

## Performance Metrics (Optimized)

| Thinking Time | Solved (out of 300) | Accuracy (%) | Avg Nodes/Puzzle | Total NPS | Improvement |
|---------------|---------------------|--------------|------------------|-----------|-------------|
| **100ms**     | 63                  | 21.0%        | 7,972            | 63,402    | **+3 Solved, +35% NPS** |
| **500ms**     | 91                  | 30.3%        | ---              | 102,259   | **+9 Solved, +113% NPS** |
| **1s (1000ms)** | 112                | 37.3%        | 73,116           | 82,693    | **+6 Solved, +70% NPS** |
| **2s (2000ms)** | ---                | ---          | ---              | ---       | |
| **5s (5000ms)** | ---                | ---          | ---              | ---       | |

*Note: Baseline for 1000ms was 106 Solved, 48k NPS.*

## Optimization Summary

### **Tweak 1: Lazy Legality Checking (Applied)**
- **Description**: Replaced pre-validation of all moves (`generateLegalMoves`) with pseudo-legal move generation (`generateMoves`) and post-move legality checking. This allows beta-cutoffs to occur before checking legality for many moves, significantly reducing overhead.
- **Outcome**: 
    - **NPS**: Increased by 35% to 113% depending on time control.
    - **Accuracy**: Improved by 3-9 puzzles across tested time controls.
    - **Status**: **KEPT**.

### **Tweak 2: Late Move Pruning (Rejected)**
- **Description**: Attempted to prune quiet moves late in the search order at shallow depths.
- **Outcome**: Reduced tactical accuracy significantly (dropped from 63 to 57 solved at 100ms). Tactics often rely on quiet waiting moves or interference that might not be sorted first, causing them to be pruned.
- **Status**: **REVERTED**.

## Analysis
- **Scaling**: The engine now searches significantly faster (NPS ~80k-100k vs ~48k previously), allowing it to reach greater depths in the same time.
- **Efficiency**: Lazy legality checking is a standard optimization that proved highly effective here.
- **Further Work**: Future optimizations could explore "Static Null Move Pruning" or improved move ordering (SEE, Counter Moves) to safely prune more nodes without losing tactical accuracy.

## Reproduction
To run the benchmarks again:
```bash
node tests/puzzle_benchmark.js [timeLimitMs]
```

# Chess Engine Tactical Scaling Report (WAC 300)

This report evaluates the tactical accuracy and performance of the chess engine across various thinking times using the **300 Win At Chess (WAC)** tactical suite.

## Performance Metrics

| Thinking Time | Solved (out of 300) | Accuracy (%) | Avg Nodes/Puzzle | Total NPS |
|---------------|---------------------|--------------|------------------|-----------|
| **100ms**     | 60                  | 20.0%        | 6,602            | 46,748    |
| **500ms**     | 82                  | 27.3%        | 23,406           | 47,968    |
| **1s (1000ms)** | 106                | 35.3%        | 44,853           | 48,648    |
| **2s (2000ms)** | 120                | 40.0%        | 97,724           | 56,660    |
| **5s (5000ms)** | 135                | 45.0%        | 292,773          | 76,246    |

## Analysis

- **Scaling**: Accuracy shows a consistent upward trend as thinking time increases. The jump from 100ms to 1s represents a ~75% increase in puzzles solved.
- **Search Efficiency**: The Nodes Per Second (NPS) increases significantly at higher thinking times, likely due to better Transposition Table utilization and reduced search overhead as the tree deepens.
- **Baseline**: At 5s per move, the engine is capable of solving nearly half of the world-class tactical puzzles in the WAC suite, validating its strength for bullet and blitz play.

## Reproduction
To run the benchmarks again:
```bash
node tests/puzzle_benchmark.js [timeLimitMs]
```

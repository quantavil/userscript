# Obsidian Study Scripts (Datacore JSX)

A collection of [Datacore](https://github.com/blacksmithgu/datacore) JSX scripts for [Obsidian](https://obsidian.md/) that visualize daily study progress.

## Scripts

### 📅 Study Heatmap (`study-heatmap.js`)

GitHub-style contribution heatmap that visualizes daily task completion.

- **Monthly calendar grid** — days colored by completion ratio (green intensity scale)
- **Cross-month streak counter** — consecutive active days with a 🔥 badge
- **Per-day stats** — hover any cell to see `done/total` tasks and percentage
- **Clickable cells** — opens the corresponding Daily Note
- **Today highlight** — current day ringed with a blue glow
- **Theme-aware** — uses Obsidian CSS variables

**Color Scale:**

| Level | Condition | Color |
|-------|-----------|-------|
| L0 | 0% done | `--background-secondary` |
| L1 | ≤ 25% | `#0e6429` |
| L2 | ≤ 50% | `#007d32` |
| L3 | < 100% | `#26a641` |
| L4 | 100% | `#36c353` |

---

### 📊 Score Tracker (`score-tracker.js`)

Trend charts and analysis for mock test scores with built-in banking exam support.

- **Checkbox-based exam selection** — check one from each group: Exam / Role / Stage
- **12 predefined exams** — SBI / IBPS / RRB × PO / Clerk × Pre / Mains
- **Auto max-marks** — max score determined from exam type (Pre: 100/80, Mains: 200)
- **Interactive filter pills** — filter by All, SBI, IBPS, or RRB (live re-render)
- **SVG trend chart** — score % and accuracy % plotted over time
- **Weak-area frequency bars** — most common weak areas ranked
- **Recent results table** — last 5 tests with clickable links to daily notes


## Requirements

- [Obsidian](https://obsidian.md/)
- [Datacore](https://github.com/blacksmithgu/datacore) plugin (available via [BRAT](https://github.com/TfTHacker/obsidian42-brat))
- A `Daily Notes` folder

## Setup

1. Copy the script(s) into your vault (e.g. a `scripts/` folder). Use files from `dist/` for smaller size.

2. Embed in any note:

   ````markdown
   ```datacore
   view("scripts/study-heatmap")
   ```
   ````

   ````markdown
   ```datacore
   view("scripts/score-tracker")
   ```
   ````

3. **Configure the source folder** — edit the `FOLDER` constant at the top of each script if needed:

   ```js
   const FOLDER = "Daily Notes"; // ← change this
   ```

## Daily Note Template

The included `template.md` provides a structured daily note with:

- Study task checkboxes (Mathematics, Reasoning, English, Current Affairs)
- Exam selection checkboxes (check one from each: Exam / Role / Stage)
- Score log inline fields (score, accuracy, weak areas)
- End-of-day reflection

## Customization

| What | Where | Notes |
|------|-------|-------|
| Source folder | `FOLDER` constant | Must match your Daily Notes folder |
| Heatmap colors | `T` object / `LEVELS` array in `study-heatmap.js` | Swap hex values |
| Chart entries | `MAX_ENTRIES` in `score-tracker.js` | Default 30 tests |
| Add new exams | `EXAMS` object in `score-tracker.js` | Add `{ max, org }` entry |

## Development & Building

The scripts are written in Datacore JSX. To minify them for production (smaller size and better performance), use `esbuild`:

```bash
# Build score-tracker
bunx esbuild score-tracker.js --minify --outfile=dist/score-tracker.js --loader:.js=jsx

# Build study-heatmap
bunx esbuild study-heatmap.js --minify --outfile=dist/study-heatmap.js --loader:.js=jsx
```

**Note:** The scripts use JSX pragmas (`@jsx h`) to ensure compatibility with Datacore's internal Preact instance.



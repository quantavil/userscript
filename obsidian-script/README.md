# Obsidian Study Scripts

A collection of [Dataview](https://github.com/blackmarketltd/obsidian-dataview) JS scripts for [Obsidian](https://obsidian.md/) that visualize daily study progress.

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

**Supported Exams & Max Marks:**

| Exam | Pre | Mains |
|------|-----|-------|
| SBI PO | 100 | 200 |
| SBI Clerk | 100 | 200 |
| IBPS PO | 100 | 200 |
| IBPS Clerk | 100 | 200 |
| RRB PO | 80 | 200 |
| RRB Clerk | 80 | 200 |

**Daily Note format** — check one from each group + fill inline fields:

```markdown
Exam:
- [x] SBI
- [ ] IBPS
- [ ] RRB

Role:
- [x] PO
- [ ] Clerk

Stage:
- [x] Pre
- [ ] Mains

- **Score**:: 72
- **Accuracy**:: 85%
- **Weak-Area**:: Algebra, DI
```

## Requirements

- [Obsidian](https://obsidian.md/) with the [Dataview](https://github.com/blackmarketltd/obsidian-dataview) plugin
- Dataview JS queries enabled (`Settings → Dataview → Enable JavaScript Queries`)
- A `Daily Notes` folder

## Setup

1. Copy the script(s) into your vault (e.g. a `scripts/` folder). Use files from `dist/` for smaller size.

2. Embed in any note:

   ````markdown
   ```dataviewjs
   await dv.view("scripts/study-heatmap")
   ```
   ````

   ````markdown
   ```dataviewjs
   await dv.view("scripts/score-tracker")
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
| Heatmap colors | `G` object in `study-heatmap.js` | Swap hex values |
| Chart entries | `MAX_ENTRIES` in `score-tracker.js` | Default 30 tests |
| Add new exams | `EXAMS` object in `score-tracker.js` | Add `{ max, org }` entry |

## File Structure

```
obsidian-script/
├── study-heatmap.js     # Task completion heatmap
├── score-tracker.js     # Score trend & weak-area analysis
├── template.md          # Daily Note template (Templater)
├── dist/
│   ├── study-heatmap.min.js
│   └── score-tracker.min.js
└── README.md
```

// ═══════════════════════════════════════════════════════════════
//  🟩  GITHUB-STYLE STUDY HEATMAP
// ═══════════════════════════════════════════════════════════════

// ── Config ───────────────────────────────────────────────────
const FOLDER = "Daily Notes";

// ── GitHub Dark Palette ──────────────────────────────────────
const G = {
  bg:      "var(--background-primary)",
  border:  "var(--background-modifier-border)",
  text:    "var(--text-normal)",
  muted:   "var(--text-muted)",
  L0:      "var(--background-secondary)",
  L1:      "#0e6429",
  L2:      "#007d32",
  L3:      "#26a641",
  L4:      "#36c353",
  ring:    "#58a6ff",
  fire:    "#ffa657",
};

// ── Date Setup ───────────────────────────────────────────────
const now     = new Date();
const YR      = now.getFullYear();
const MO      = now.getMonth();
const DAY     = now.getDate();
const moName  = now.toLocaleString("default", { month: "long" });
const dow1    = new Date(YR, MO, 1).getDay();
const numDays = new Date(YR, MO + 1, 0).getDate();
const z       = n => String(n).padStart(2, "0");
const isoOf   = d => `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;

// ── Fetch Notes ──────────────────────────────────────────────
const msInYear = 366 * 24 * 60 * 60 * 1000;
const cutoffDate = new Date(now.getTime() - msInYear);

const pages = dv.pages(`"${FOLDER}"`).where(p => {
  if (!p.file.day) return false;
  return p.file.day.toJSDate() >= cutoffDate;
});

const yearMap = {};
const moMap   = {};
const SELECTION_TEXTS = new Set(["SBI","IBPS","RRB","PO","Clerk","Pre","Mains"]);

pages.forEach(p => {
  const tasks = p.file.tasks.where(t => !SELECTION_TEXTS.has(t.text.trim()));
  const done  = tasks.where(t => t.completed).length;
  const total = tasks.length;
  const key   = `${p.file.day.year}-${z(p.file.day.month)}-${z(p.file.day.day)}`;
  yearMap[key] = done;
  if (p.file.day.month === MO + 1 && p.file.day.year === YR) {
    moMap[p.file.day.day] = {
      name: p.file.name, path: p.file.path, done, total
    };
  }
});

// ── Cross-Month Streak ───────────────────────────────────────
let streak = 0;
const cur  = new Date(YR, MO, DAY - 1);        // start from yesterday
for (let i = 0; i < 365; i++) {
  if (yearMap[isoOf(cur)] > 0) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  } else break;
}
if (yearMap[isoOf(new Date(YR, MO, DAY))] > 0) streak++;  // add today if active

// ── Color Picker ─────────────────────────────────────────────
const pick = (done, total) => {
  if (!total || done === 0) return G.L0;
  const r = done / total;
  if (r <= 0.25) return G.L1;
  if (r <= 0.50) return G.L2;
  if (r < 1)     return G.L3;
  return G.L4;
};

// ── Day-of-Week Headers ─────────────────────────────────────
const DOW = [...Array(7)].map((_, i) =>
  new Date(1970, 0, 4 + i).toLocaleString("default", { weekday: "short" })
);
const dowHTML = DOW.map(d => `
  <div style="
    text-align:center;
    font-size:12px;
    color:${G.muted};
    font-weight:600;
    padding-bottom:10px;
    letter-spacing:0.5px;
  ">${d}</div>
`).join("");

// ── Build Grid Cells ─────────────────────────────────────────
let cellsHTML = "";

// Blank offset cells
for (let i = 0; i < dow1; i++) {
  cellsHTML += `<div class="gh-cell"></div>`;
}

// Day cells
for (let d = 1; d <= numDays; d++) {
  const info    = moMap[d];
  const isToday = d === DAY;
  const bg      = info ? pick(info.done, info.total) : G.L0;

  const shadow = isToday
    ? `box-shadow:0 0 0 2px ${G.ring}, 0 0 12px ${G.ring}55;`
    : "";

  const col = isToday          ? G.text
            : info?.done > 0   ? G.text
            : G.muted;

  const pctVal = info?.total
    ? Math.round(info.done / info.total * 100)
    : 0;

  const tip = info
    ? `${moName} ${d} — ${info.done}/${info.total} tasks (${pctVal}%)`
    : `${moName} ${d} — no note`;

  const pctBar = info && info.total > 0 ? `
    <div style="
      font-size:12px;
      color:${G.muted};
      margin-top:1px;
      opacity:0.8;
    ">${pctVal}%</div>
  ` : "";

  const box = `<div class="gh-cell" title="${tip}" style="
    background:${bg};
    ${shadow}
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    font-size:16px;
    color:${col};
    font-weight:${isToday ? 700 : 400};
    cursor:${info ? "pointer" : "default"};
    user-select:none;
  ">
    <span>${d}</span>
    ${pctBar}
  </div>`;

  cellsHTML += info
    ? `<a data-href="${info.name}" href="${info.name}"
         class="internal-link" style="text-decoration:none">${box}</a>`
    : box;
}

// Pad last row
const tail = (numDays + dow1) % 7;
if (tail > 0) {
  for (let i = tail; i < 7; i++) {
    cellsHTML += `<div class="gh-cell"></div>`;
  }
}

// ── Legend ────────────────────────────────────────────────────
const legendHTML = [G.L0, G.L1, G.L2, G.L3, G.L4].map(c =>
  `<div style="
    width:14px;height:14px;border-radius:3px;background:${c};
  "></div>`
).join("");

// ── Stats ────────────────────────────────────────────────────
const act   = Object.keys(moMap).length;
const sDone = Object.values(moMap).reduce((a, x) => a + x.done, 0);
const sAll  = Object.values(moMap).reduce((a, x) => a + x.total, 0);
const pct   = sAll ? Math.round(sDone / sAll * 100) : 0;

// ── Render ───────────────────────────────────────────────────
const root = dv.el("div", "");
root.innerHTML = `

<style>
  .gh-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }
  .gh-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-color: ${G.border};
    flex-wrap: wrap;
    gap: 8px;
  }
  .gh-cell {
    height: 44px;
    border-radius: 6px;
    transition: transform 0.12s ease, box-shadow 0.15s ease;
    position: relative;
  }
  .gh-cell:hover {
    transform: scale(1.12);
    box-shadow: 0 0 10px ${G.L4}73 !important;
    z-index: 10;
  }
  .gh-heatmap a.internal-link:hover {
    text-decoration: none !important;
  }
</style>

<div class="gh-heatmap" style="
  background: ${G.bg};
  border: 1px solid ${G.border};
  border-radius: 12px;
  padding: 20px 24px;
  width: 100%;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
               Helvetica, Arial, sans-serif;
">

  <!-- ── Header ──────────────────────────────── -->
  <div class="gh-bar" style="
    margin-bottom: 16px;
    padding-bottom: 14px;
    border-bottom: 1px solid ${G.border};
  ">
    <span style="font-size:18px; font-weight:700; color:${G.text};">
      📅 ${moName} ${YR}
    </span>
    <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
      <span style="font-size:13px; color:${G.muted};">
        📊 ${act} days · ${sDone}/${sAll} tasks · ${pct}%
      </span>
      <span style="
        font-size:14px; font-weight:700; color:${G.fire};
        background:${G.fire}18;
        padding:4px 12px;
        border-radius:20px;
        border:1px solid ${G.fire}44;
      ">
        🔥 ${streak} day${streak !== 1 ? "s" : ""}
      </span>
    </div>
  </div>

  <!-- ── Day Labels ──────────────────────────── -->
  <div class="gh-grid">${dowHTML}</div>

  <!-- ── Calendar Grid ───────────────────────── -->
  <div class="gh-grid">${cellsHTML}</div>

  <!-- ── Footer ──────────────────────────────── -->
  <div class="gh-bar" style="
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid ${G.border};
  ">
    <div style="
      display:flex; align-items:center; gap:6px;
      font-size:11px; color:${G.muted};
    ">Less&nbsp;${legendHTML}&nbsp;More</div>

    <div style="font-size:11px; color:${G.muted}; font-style:italic;">
      Hover a cell to see details · Click to open note
    </div>
  </div>

</div>`;

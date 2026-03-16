// ═══════════════════════════════════════════════════════════════
//  📊  SCORE TRACKER — Exam Trends & Weak-Area Analysis
// ═══════════════════════════════════════════════════════════════

// ── Config ───────────────────────────────────────────────────
const FOLDER = "Daily Notes";
const MAX_ENTRIES = 30;

// ── Exam Definitions ─────────────────────────────────────────
const EXAMS = {
  "SBI PO Pre":      { max: 100, org: "SBI"  },
  "SBI PO Mains":    { max: 200, org: "SBI"  },
  "SBI Clerk Pre":   { max: 100, org: "SBI"  },
  "SBI Clerk Mains": { max: 200, org: "SBI"  },
  "IBPS PO Pre":     { max: 100, org: "IBPS" },
  "IBPS PO Mains":   { max: 200, org: "IBPS" },
  "IBPS Clerk Pre":  { max: 100, org: "IBPS" },
  "IBPS Clerk Mains":{ max: 200, org: "IBPS" },
  "RRB PO Pre":      { max: 80,  org: "RRB"  },
  "RRB PO Mains":    { max: 200, org: "RRB"  },
  "RRB Clerk Pre":   { max: 80,  org: "RRB"  },
  "RRB Clerk Mains": { max: 200, org: "RRB"  },
};

const ORGS = ["SBI", "IBPS", "RRB"];

// ── Theme ────────────────────────────────────────────────────
const C = {
  bg:     "var(--background-primary)",
  bg2:    "var(--background-secondary)",
  border: "var(--background-modifier-border)",
  text:   "var(--text-normal)",
  muted:  "var(--text-muted)",
  score:  "#58a6ff",
  acc:    "#36c353",
  warn:   "#ffa657",
  grid:   "var(--background-modifier-border)",
  active: "#58a6ff",
};

// ── Exam Selection Sets ──────────────────────────────────────
const ORG_SET   = new Set(ORGS);
const ROLE_SET  = new Set(["PO", "Clerk"]);
const STAGE_SET = new Set(["Pre", "Mains"]);
const SELECTION_TEXTS = new Set([...ORG_SET, ...ROLE_SET, ...STAGE_SET]);

// ── Fetch & Parse ────────────────────────────────────────────
const parseNum = s => {
  if (s == null) return null;
  const n = parseFloat(String(s).replace("%", ""));
  return isNaN(n) ? null : n;
};

const allData = [];
const warnings = [];

dv.pages(`"${FOLDER}"`)
  .where(p => p.file.day && p["Score"] != null)
  .sort(p => p.file.day, "asc")
  .forEach(p => {
    const checked = p.file.tasks
      .where(t => t.completed && SELECTION_TEXTS.has(t.text.trim()));

    const orgs   = checked.filter(t => ORG_SET.has(t.text.trim()));
    const roles  = checked.filter(t => ROLE_SET.has(t.text.trim()));
    const stages = checked.filter(t => STAGE_SET.has(t.text.trim()));

    const label = `${p.file.day.day}/${p.file.day.month}`;
    const issues = [];
    if (orgs.length > 1)   issues.push(`${orgs.length} exams checked`);
    if (roles.length > 1)  issues.push(`${roles.length} roles checked`);
    if (stages.length > 1) issues.push(`${stages.length} stages checked`);
    if (issues.length) {
      warnings.push({ label, name: p.file.name, msg: issues.join(", ") });
      return;
    }

    if (orgs.length === 0 || roles.length === 0 || stages.length === 0) return;

    const examName = `${orgs[0].text.trim()} ${roles[0].text.trim()} ${stages[0].text.trim()}`;
    const exam = EXAMS[examName];
    if (!exam) return;

    const score = parseNum(p["Score"]);
    if (score === null) return;

    const acc = parseNum(p["Accuracy"]);
    const weak = p["Weak-Area"] ? String(p["Weak-Area"]).trim() : null;

    allData.push({
      date: p.file.day,
      label,
      exam: examName,
      org: exam.org,
      score,
      max: exam.max,
      pct: Math.round(score / exam.max * 100),
      acc,
      weak,
      name: p.file.name,
    });
  });

// ── Builder Functions ────────────────────────────────────────
function buildStats(data) {
  const n = data.length;
  if (!n) return `<span style="color:${C.muted};font-style:italic;">No data</span>`;
  const avgPct = Math.round(data.reduce((a, d) => a + d.pct, 0) / n);
  const valid  = data.filter(d => d.acc !== null);
  const avgAcc = valid.length ? Math.round(valid.reduce((a, d) => a + d.acc, 0) / valid.length) : null;
  const best   = Math.max(...data.map(d => d.pct));
  const worst  = Math.min(...data.map(d => d.pct));
  return `
    <span>Avg <b style="color:${C.score};">${avgPct}%</b></span>
    ${avgAcc !== null ? `<span>Accuracy <b style="color:${C.acc};">${avgAcc}%</b></span>` : ""}
    <span>Best <b style="color:${C.acc};">${best}%</b></span>
    <span>Worst <b style="color:${C.warn};">${worst}%</b></span>
    <span style="color:${C.muted};">${n} test${n !== 1 ? "s" : ""}</span>`;
}

const W = 600, H = 200, PAD = { t: 20, r: 20, b: 30, l: 40 };
const cw = W - PAD.l - PAD.r;
const ch = H - PAD.t - PAD.b;
const yScale = v => PAD.t + ch - (v / 100 * ch);

function buildChart(data) {
  const recent = data.slice(-MAX_ENTRIES);
  const n = recent.length;
  if (!n) return `<div style="text-align:center;color:${C.muted};padding:40px 0;font-style:italic;">
    No score data for this filter.</div>`;

  const xScale = i => PAD.l + (n === 1 ? cw / 2 : i / (n - 1) * cw);

  // Grid
  let svg = "";
  for (let v = 0; v <= 100; v += 25) {
    const y = yScale(v);
    svg += `<line x1="${PAD.l}" y1="${y}" x2="${W - PAD.r}" y2="${y}"
              stroke="${C.grid}" stroke-width="0.5" stroke-dasharray="4,3" />`;
    svg += `<text x="${PAD.l - 6}" y="${y + 4}" fill="${C.muted}"
              font-size="10" text-anchor="end">${v}%</text>`;
  }

  // X labels
  const step = Math.max(1, Math.floor(n / 8));
  recent.forEach((d, i) => {
    if (i % step === 0 || i === n - 1) {
      svg += `<text x="${xScale(i)}" y="${H - 4}" fill="${C.muted}"
                font-size="10" text-anchor="middle">${d.label}</text>`;
    }
  });

  // Score line + dots
  const pts = recent.map((d, i) => ({ x: xScale(i), y: yScale(d.pct) }));
  if (pts.length >= 2) {
    svg += `<polyline fill="none" stroke="${C.score}" stroke-width="2" stroke-linejoin="round"
              points="${pts.map(p => `${p.x},${p.y}`).join(" ")}" />`;
  }
  recent.forEach((d, i) => {
    svg += `<circle cx="${pts[i].x}" cy="${pts[i].y}" r="3.5" fill="${C.score}"
              stroke="${C.bg}" stroke-width="1.5">
              <title>${d.exam}: ${d.score}/${d.max} (${d.pct}%) — ${d.label}</title>
            </circle>`;
  });

  // Accuracy line + dots
  const accPts = recent.map((d, i) => d.acc !== null
    ? { x: xScale(i), y: yScale(d.acc), tip: `${d.label}: ${d.acc}% accuracy` }
    : null).filter(Boolean);
  if (accPts.length >= 2) {
    svg += `<polyline fill="none" stroke="${C.acc}" stroke-width="2" stroke-linejoin="round"
              stroke-dasharray="6,3"
              points="${accPts.map(p => `${p.x},${p.y}`).join(" ")}" />`;
  }
  accPts.forEach(p => {
    svg += `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${C.acc}" stroke="${C.bg}" stroke-width="1.5">
              <title>${p.tip}</title>
            </circle>`;
  });

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="overflow:visible;">${svg}</svg>`;
}

function buildWeak(data) {
  const freq = {};
  data.forEach(d => {
    if (!d.weak) return;
    d.weak.split(/[,;&]+/).map(s => s.trim()).filter(Boolean).forEach(w => {
      freq[w] = (freq[w] || 0) + 1;
    });
  });
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (!sorted.length)
    return `<span style="font-size:13px;color:${C.muted};font-style:italic;">No weak areas recorded</span>`;

  const maxF = sorted[0][1];
  return sorted.map(([area, count]) => {
    const pct = Math.round(count / maxF * 100);
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
      <span style="min-width:100px;font-size:13px;color:${C.text};text-align:right;">${area}</span>
      <div style="flex:1;height:16px;background:${C.bg2};border-radius:4px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:${C.warn};border-radius:4px;
                    transition:width 0.3s ease;"></div>
      </div>
      <span style="font-size:12px;color:${C.muted};min-width:20px;">${count}×</span>
    </div>`;
  }).join("");
}

function buildTable(data) {
  const recent = data.slice(-5).reverse();
  if (!recent.length)
    return `<span style="font-size:13px;color:${C.muted};font-style:italic;">No results</span>`;

  const rows = recent.map(d => `
    <tr>
      <td style="padding:6px 10px;">
        <a data-href="${d.name}" href="${d.name}" class="internal-link"
           style="text-decoration:none;color:${C.score};">${d.label}</a>
      </td>
      <td style="padding:6px 10px;">${d.exam}</td>
      <td style="padding:6px 10px;text-align:center;">${d.score}/${d.max}</td>
      <td style="padding:6px 10px;text-align:center;">${d.acc !== null ? d.acc + "%" : "—"}</td>
      <td style="padding:6px 10px;color:${C.warn};">${d.weak || "—"}</td>
    </tr>`).join("");

  return `<table class="st-table">
    <thead><tr>
      <th>Date</th><th>Exam</th><th>Score</th><th>Accuracy</th><th>Weak Area</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// ── Render Shell ─────────────────────────────────────────────
const root = dv.el("div", "");
root.innerHTML = `
<style>
  .st-card {
    background: ${C.bg};
    border: 1px solid ${C.border};
    border-radius: 12px;
    padding: 20px 24px;
    width: 100%;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
                 Helvetica, Arial, sans-serif;
  }
  .st-card a.internal-link:hover { text-decoration: underline !important; }
  .st-label {
    font-size: 13px; font-weight: 700; color: ${C.muted};
    text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px;
  }
  .st-table {
    width: 100%; border-collapse: collapse; font-size: 13px; color: ${C.text};
  }
  .st-table th {
    text-align: left; padding: 6px 10px; border-bottom: 1px solid ${C.border};
    color: ${C.muted}; font-weight: 600; font-size: 12px;
  }
  .st-table tr:hover { background: ${C.bg2}; }
  .st-filter {
    padding: 4px 14px; border-radius: 16px; border: 1px solid ${C.border};
    background: transparent; color: ${C.muted}; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all 0.15s ease;
  }
  .st-filter:hover { border-color: ${C.active}; color: ${C.text}; }
  .st-filter.active {
    background: ${C.active}18; border-color: ${C.active}; color: ${C.active};
  }
  .st-section { margin-top: 20px; }
</style>

<div class="st-card">

  ${warnings.length ? `<div style="
    background:#ffa65718;border:1px solid #ffa65744;border-radius:8px;
    padding:10px 14px;margin-bottom:14px;font-size:12px;color:${C.warn};">
    ⚠️ <b>Skipped ${warnings.length} note${warnings.length > 1 ? 's' : ''}</b> — multiple selections in same group:<br>
    ${warnings.map(w => `<a data-href="${w.name}" href="${w.name}" class="internal-link"
      style="color:${C.warn};">${w.label}</a>: ${w.msg}`).join('<br>')}
  </div>` : ''}

  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;
              padding-bottom:14px;margin-bottom:16px;border-bottom:1px solid ${C.border};">
    <span style="font-size:18px;font-weight:700;color:${C.text};">📊 Score Tracker</span>
    <div class="st-stats-area" style="display:flex;gap:16px;font-size:13px;color:${C.muted};flex-wrap:wrap;"></div>
  </div>

  <div style="display:flex;gap:8px;flex-wrap:wrap;">
    <button class="st-filter active" data-filter="all">All</button>
    ${ORGS.map(o => `<button class="st-filter" data-filter="${o}">${o}</button>`).join("")}
  </div>

  <div class="st-section">
    <div class="st-label">📈 Score & Accuracy Trend</div>
    <div style="display:flex;gap:16px;margin-bottom:8px;">
      <span style="font-size:11px;color:${C.score};">● Score %</span>
      <span style="font-size:11px;color:${C.acc};">── Accuracy %</span>
    </div>
    <div class="st-chart-area"></div>
  </div>

  <div class="st-section">
    <div class="st-label">⚠️ Weak Areas</div>
    <div class="st-weak-area"></div>
  </div>

  <div class="st-section">
    <div class="st-label">🕐 Recent Results</div>
    <div class="st-table-area"></div>
  </div>

  <div style="margin-top:16px;padding-top:14px;border-top:1px solid ${C.border};
              font-size:11px;color:${C.muted};font-style:italic;">
    Hover chart points for details · Click dates to open notes
  </div>

</div>`;

// ── Dynamic Rendering ────────────────────────────────────────
function renderDynamic(filter) {
  const data = filter === "all"
    ? allData
    : allData.filter(d => d.org === filter);

  root.querySelector(".st-stats-area").innerHTML = buildStats(data);
  root.querySelector(".st-chart-area").innerHTML = buildChart(data);
  root.querySelector(".st-weak-area").innerHTML  = buildWeak(data);
  root.querySelector(".st-table-area").innerHTML = buildTable(data);
}

renderDynamic("all");

root.querySelectorAll(".st-filter").forEach(btn => {
  btn.addEventListener("click", () => {
    root.querySelectorAll(".st-filter").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderDynamic(btn.dataset.filter);
  });
});

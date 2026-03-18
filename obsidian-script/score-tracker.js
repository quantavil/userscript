// ═══════════════════════════════════════════════════════════════
//  📊  SCORE TRACKER — Datacore JSX  (v5 · fully revised)
//  Exam Trends & Weak-Area Analysis
//
//  Required frontmatter fields in daily notes:
//    Exam:      "SBI PO Pre" | "IBPS Clerk Mains" | etc.
//    Score:     72
//    Accuracy:  85       (optional, without %)
//    Weak-Area: "quant"  (optional, comma-separated)
// ═══════════════════════════════════════════════════════════════

// ── Configuration (all magic numbers centralised) ────────────

const FOLDER         = "Daily Notes";
const MAX_ENTRIES    = 30;
const RECENT_COUNT   = 5;
const TOP_WEAK_AREAS = 8;
const X_TICK_TARGET  = 8;
const DEBOUNCE_MS    = 300;

const EXAMS = {
  "SBI PO Pre":       { max: 100, org: "SBI"  },
  "SBI PO Mains":     { max: 200, org: "SBI"  },
  "SBI Clerk Pre":    { max: 100, org: "SBI"  },
  "SBI Clerk Mains":  { max: 200, org: "SBI"  },
  "IBPS PO Pre":      { max: 100, org: "IBPS" },
  "IBPS PO Mains":    { max: 200, org: "IBPS" },
  "IBPS Clerk Pre":   { max: 100, org: "IBPS" },
  "IBPS Clerk Mains": { max: 200, org: "IBPS" },
  "RRB PO Pre":       { max: 80,  org: "RRB"  },
  "RRB PO Mains":     { max: 200, org: "RRB"  },
  "RRB Clerk Pre":    { max: 80,  org: "RRB"  },
  "RRB Clerk Mains":  { max: 200, org: "RRB"  },
};

const ORGS = ["SBI", "IBPS", "RRB"];

// ── Alias resolution (single loop, word-boundary safe) ───────

const EXAM_ALIASES = {};

const VARIATIONS = {
  "Pre":   ["Prelim", "Prelims", "Preliminary"],
  "Mains": ["Main"],
};

for (const key of Object.keys(EXAMS)) {
  // Exact lowercase → canonical
  EXAM_ALIASES[key.toLowerCase()] = key;

  // Build variation aliases in the same loop
  for (const [canonical, aliases] of Object.entries(VARIATIONS)) {
    // Use word-boundary-aware check: key must contain the canonical
    // word as a separate token (space-delimited)
    const parts = key.split(" ");
    const idx = parts.findIndex((p) => p === canonical);
    if (idx !== -1) {
      for (const alias of aliases) {
        const variant = [...parts];
        variant[idx] = alias;
        EXAM_ALIASES[variant.join(" ").toLowerCase()] = key;
      }
    }
  }
}

function resolveExam(raw) {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;          // ← handle empty string from blank YAML
  if (EXAMS[trimmed]) return trimmed; // exact match
  return EXAM_ALIASES[trimmed.toLowerCase()] ?? null;
}


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

// ── Chart Geometry ───────────────────────────────────────────

const SVG_W   = 600;
const SVG_H   = 200;
const PAD     = { t: 20, r: 20, b: 30, l: 40 };
const CHART_W = SVG_W - PAD.l - PAD.r;
const CHART_H = SVG_H - PAD.t - PAD.b;
const yScale  = (v) => PAD.t + CHART_H - (v / 100) * CHART_H;


// ── Helpers ──────────────────────────────────────────────────

function parseNum(s) {
  if (s == null) return null;
  const n = parseFloat(String(s).replace("%", "").trim());
  return isNaN(n) ? null : n;
}

/**
 * Read a field from a Datacore page object.
 *
 * Datacore stores frontmatter in page.$frontmatter and provides
 * page.value("field") as the JS accessor (per official quickstart).
 * We try .value() first, then $frontmatter as fallback.
 */
function fm(page, ...keys) {
  for (const k of keys) {
    // 1) Canonical accessor per Datacore docs
    if (typeof page.value === "function") {
      try {
        const v = page.value(k);
        if (v != null) return v;
      } catch (_) { /* field doesn't exist, try next */ }
    }
    // 2) Direct $frontmatter lookup (documented as where user YAML lives)
    const fmVal = page.$frontmatter?.[k];
    if (fmVal !== undefined && fmVal !== null) return fmVal;
  }
  return null;
}

/**
 * Parse a date string safely into a local Date, avoiding
 * timezone-shift bugs with bare YYYY-MM-DD strings.
 */
function safeParseDate(str) {
  const s = String(str);
  const dStr = s.includes("T") ? s : `${s}T00:00:00`;
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return null;
  return {
    day:   d.getDate(),
    month: d.getMonth() + 1,
    year:  d.getFullYear(),
    ts:    d.getTime(),
  };
}

/**
 * Parse date from a Datacore page.
 * Handles: Luxon DateTime objects → raw strings → filename pattern.
 */
function parseDateFromPage(page) {
  const rawDate = fm(page, "date", "Date");

  if (rawDate != null) {
    // Datacore may parse YAML dates into Luxon DateTime objects
    if (typeof rawDate === "object" && typeof rawDate.toJSDate === "function") {
      const d = rawDate.toJSDate();
      if (!isNaN(d.getTime())) {
        return {
          day:   d.getDate(),
          month: d.getMonth() + 1,
          year:  d.getFullYear(),
          ts:    d.getTime(),
        };
      }
    }
    // It might also be a native JS Date already
    if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
      return {
        day:   rawDate.getDate(),
        month: rawDate.getMonth() + 1,
        year:  rawDate.getFullYear(),
        ts:    rawDate.getTime(),
      };
    }
    // String date
    if (typeof rawDate === "string" || typeof rawDate === "number") {
      const parsed = safeParseDate(rawDate);
      if (parsed) return parsed;
    }
  }

  // Fallback: extract from filename e.g. "2026-03-18"
  const name = page.$name ?? "";
  const match = name.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return safeParseDate(`${match[1]}-${match[2]}-${match[3]}`);
  }

  return null;
}


// ── CSS (static, will be memoised in View) ───────────────────

const STYLES = `
  .st4-card {
    background: ${C.bg};
    border: 1px solid ${C.border};
    border-radius: 12px;
    padding: 20px 24px;
    width: 100%;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
                 Helvetica, Arial, sans-serif;
  }
  .st4-label {
    font-size: 13px;
    font-weight: 700;
    color: ${C.muted};
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 10px;
  }
  .st4-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    color: ${C.text};
  }
  .st4-table th {
    text-align: left;
    padding: 6px 10px;
    border-bottom: 1px solid ${C.border};
    color: ${C.muted};
    font-weight: 600;
    font-size: 12px;
  }
  .st4-table tr:hover {
    background: ${C.bg2};
  }
  .st4-table td {
    padding: 6px 10px;
  }
  .st4-filter {
    padding: 4px 14px;
    border-radius: 16px;
    border: 1px solid ${C.border};
    background: transparent;
    color: ${C.muted};
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .st4-filter:hover {
    border-color: ${C.active};
    color: ${C.text};
  }
  .st4-filter.active {
    background: ${C.active}18;
    border-color: ${C.active};
    color: ${C.active};
  }
  .st4-section {
    margin-top: 20px;
  }
`;


// ═════════════════════════════════════════════════════════════
//  Presentation Components
// ═════════════════════════════════════════════════════════════

function Empty({ text }) {
  return (
    <span style={{ fontSize: "13px", color: C.muted, fontStyle: "italic" }}>
      {text}
    </span>
  );
}

function Section({ icon, title, children }) {
  return (
    <div className="st4-section">
      <div className="st4-label">{icon} {title}</div>
      {children}
    </div>
  );
}


function StatsBar({ stats }) {
  if (!stats) return <Empty text="No data" />;

  return (
    <div style={{ display: "flex", gap: "16px", fontSize: "13px", color: C.muted, flexWrap: "wrap" }}>
      <span>Avg <b style={{ color: C.score }}>{stats.avgPct}%</b></span>
      {stats.avgAcc !== null && <span>Accuracy <b style={{ color: C.acc }}>{stats.avgAcc}%</b></span>}
      <span>Best <b style={{ color: C.acc }}>{stats.best}%</b></span>
      <span>Worst <b style={{ color: C.warn }}>{stats.worst}%</b></span>
      <span>{stats.count} test{stats.count !== 1 ? "s" : ""}</span>
    </div>
  );
}

function FilterBar({ active, onFilter }) {
  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      {["all", ...ORGS].map((f) => (
        <button key={f}
          className={`st4-filter${active === f ? " active" : ""}`}
          onClick={() => onFilter(f)}>
          {f === "all" ? "All" : f}
        </button>
      ))}
    </div>
  );
}

function TrendChart({ data }) {
  const recent = data.slice(-MAX_ENTRIES);
  const n = recent.length;

  if (!n) {
    return (
      <div style={{ textAlign: "center", color: C.muted, padding: "40px 0", fontStyle: "italic" }}>
        No score data for this filter.
      </div>
    );
  }

  const xScale    = (i) => PAD.l + (n === 1 ? CHART_W / 2 : (i / (n - 1)) * CHART_W);
  const gridTicks = [0, 25, 50, 75, 100];
  const xStep     = Math.max(1, Math.floor(n / X_TICK_TARGET));

  const scorePts = recent.map((d, i) => ({ x: xScale(i), y: yScale(d.pct), d }));
  const accPts   = recent
    .map((d, i) => d.acc !== null ? { x: xScale(i), y: yScale(d.acc), d } : null)
    .filter(Boolean);

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%"
         style={{ overflow: "visible" }}
         role="img" aria-label="Score and accuracy trend chart">

      {/* Grid lines */}
      {gridTicks.map((v) => (
        <g key={`g-${v}`}>
          <line x1={PAD.l} y1={yScale(v)} x2={SVG_W - PAD.r} y2={yScale(v)}
                stroke={C.grid} strokeWidth={0.5} strokeDasharray="4,3" />
          <text x={PAD.l - 6} y={yScale(v) + 4} fill={C.muted} fontSize={10} textAnchor="end">
            {v}%
          </text>
        </g>
      ))}

      {/* X-axis labels — suppress ticks too close to the forced end label */}
      {recent.map((d, i) => {
        const isLast = i === n - 1;
        const isTick = i % xStep === 0;

        // Suppress standard ticks that would overlap the final label
        if (isTick && !isLast && (n - 1 - i) < (xStep * 0.75)) return null;

        if (isTick || isLast) {
          return (
            <text key={`xl-${i}`} x={xScale(i)} y={SVG_H - 4}
                  fill={C.muted} fontSize={10} textAnchor="middle">{d.label}</text>
          );
        }
        return null;
      })}

      {/* Score line */}
      {scorePts.length >= 2 && (
        <polyline fill="none" stroke={C.score} strokeWidth={2} strokeLinejoin="round"
                  points={scorePts.map((p) => `${p.x},${p.y}`).join(" ")} />
      )}
      {scorePts.map((p, i) => (
        <circle key={`sd-${i}`} cx={p.x} cy={p.y} r={3.5}
                fill={C.score} stroke={C.bg} strokeWidth={1.5}>
          <title>{p.d.exam}: {p.d.score}/{p.d.max} ({p.d.pct}%) — {p.d.label}</title>
        </circle>
      ))}

      {/* Accuracy line */}
      {accPts.length >= 2 && (
        <polyline fill="none" stroke={C.acc} strokeWidth={2} strokeLinejoin="round"
                  strokeDasharray="6,3"
                  points={accPts.map((p) => `${p.x},${p.y}`).join(" ")} />
      )}
      {accPts.map((p, i) => (
        <circle key={`ad-${i}`} cx={p.x} cy={p.y} r={3}
                fill={C.acc} stroke={C.bg} strokeWidth={1.5}>
          <title>{p.d.label}: {p.d.acc}% accuracy</title>
        </circle>
      ))}
    </svg>
  );
}

function WeakAreas({ weakAreas }) {
  if (!weakAreas.length) {
    return <Empty text="No weak areas recorded" />;
  }

  const maxFreq = weakAreas[0][1];
  return (
    <div>
      {weakAreas.map(([area, count]) => (
        <div key={area} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <span style={{ minWidth: "100px", fontSize: "13px", color: C.text, textAlign: "right" }}>{area}</span>
          <div style={{ flex: 1, height: "16px", background: C.bg2, borderRadius: "4px", overflow: "hidden" }}>
            <div style={{
              width: `${Math.round((count / maxFreq) * 100)}%`, height: "100%",
              background: C.warn, borderRadius: "4px", transition: "width 0.3s ease",
            }} />
          </div>
          <span style={{ fontSize: "12px", color: C.muted, minWidth: "20px" }}>{count}×</span>
        </div>
      ))}
    </div>
  );
}

function RecentResults({ data }) {
  if (!data.length) {
    return <Empty text="No results" />;
  }

  return (
    <table className="st4-table" aria-label="Recent exam results">
      <thead>
        <tr><th>Date</th><th>Exam</th><th>Score</th><th>Accuracy</th><th>Weak Area</th></tr>
      </thead>
      <tbody>
        {data.map((d, i) => (
          <tr key={i}>
            <td>
              <dc.Literal value={d.link} />
            </td>
            <td>{d.exam}</td>
            <td style={{ textAlign: "center" }}>{d.score}/{d.max}</td>
            <td style={{ textAlign: "center" }}>{d.acc !== null ? `${d.acc}%` : "—"}</td>
            <td style={{ color: C.warn }}>{d.weak || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}


// ═════════════════════════════════════════════════════════════
//  Root View
// ═════════════════════════════════════════════════════════════

return function View() {

  const [activeFilter, setActiveFilter] = dc.useState("all");

  // Memoize the <style> so it's only created once, not on every render
  const injectedStyles = dc.useMemo(() => <style>{STYLES}</style>, []);

  // Query with exists(Score) to push filtering into Datacore's index
  // and debounce to avoid excessive re-renders on unrelated vault changes
  const pages = dc.useQuery(
    `@page and path("${FOLDER}") and exists(Score) and exists(Exam)`,
    { debounce: DEBOUNCE_MS }
  );

  // ── Single-pass data processing (no double reads) ─────────
  const allData = dc.useMemo(() => {
    if (!pages || !pages.length) return [];

    return pages.reduce((acc, page) => {
      try {
        const day = parseDateFromPage(page);
        if (!day) return acc;

        const score = parseNum(fm(page, "Score", "score"));
        const examName = resolveExam(fm(page, "Exam", "exam"));

        // Skip invalid entries immediately
        if (score === null || !examName) return acc;

        const exam = EXAMS[examName];
        const rawWeak = fm(page, "Weak-Area", "weak-area", "WeakArea", "Weak Area");

        acc.push({
          date:  day,
          label: `${String(day.day).padStart(2, "0")}/${String(day.month).padStart(2, "0")}`,
          exam:  examName,
          org:   exam.org,
          score,
          max:   exam.max,
          pct:   Math.round((score / exam.max) * 100),
          acc:   parseNum(fm(page, "Accuracy", "accuracy")),
          weak:  rawWeak ? String(rawWeak).trim() || null : null,
          path:  page.$path,
          link:  page.$link,   // ← Datacore link object for proper Obsidian navigation
          ts:    day.ts,
        });
      } catch (err) {
        console.warn("[Score Tracker] Skipped:", page.$name, err);
      }

      return acc;
    }, []).sort((a, b) => a.ts - b.ts);
  }, [pages]);

  // ── Filter ────────────────────────────────────────────────
  const data = dc.useMemo(
    () => activeFilter === "all" ? allData : allData.filter((d) => d.org === activeFilter),
    [allData, activeFilter],
  );

  // ── Pre-compute derived data (memoized, not re-computed in children) ──
  const stats = dc.useMemo(() => {
    const n = data.length;
    if (!n) return null;

    const totalPct = data.reduce((s, d) => s + d.pct, 0);
    const withAcc  = data.filter((d) => d.acc !== null);

    let best = -Infinity;
    let worst = Infinity;
    for (const d of data) {
      if (d.pct > best)  best  = d.pct;
      if (d.pct < worst) worst = d.pct;
    }

    return {
      avgPct: Math.round(totalPct / n),
      avgAcc: withAcc.length
        ? Math.round(withAcc.reduce((s, d) => s + d.acc, 0) / withAcc.length)
        : null,
      best,
      worst,
      count: n,
    };
  }, [data]);

  const weakAreas = dc.useMemo(() => {
    const freq = {};
    for (const d of data) {
      if (!d.weak) continue;
      for (const w of d.weak.split(/[,;&]+/).map((s) => s.trim().toLowerCase()).filter(Boolean)) {
        freq[w] = (freq[w] || 0) + 1;
      }
    }
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_WEAK_AREAS);
  }, [data]);

  const recentData = dc.useMemo(
    () => data.slice(-RECENT_COUNT).reverse(),
    [data],
  );

  // ── Render ────────────────────────────────────────────────
  return (
    <div>
      {injectedStyles}
      <div className="st4-card">

        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: "8px", paddingBottom: "14px", marginBottom: "16px",
          borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{ fontSize: "18px", fontWeight: 700, color: C.text }}>📊 Score Tracker</span>
          <StatsBar stats={stats} />
        </div>

        {/* Filter */}
        <FilterBar active={activeFilter} onFilter={setActiveFilter} />

        {/* Chart */}
        <Section icon="📈" title="Score & Accuracy Trend">
          <div style={{ display: "flex", gap: "16px", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", color: C.score }}>● Score %</span>
            <span style={{ fontSize: "11px", color: C.acc }}>── Accuracy %</span>
          </div>
          <TrendChart data={data} />
        </Section>

        {/* Weak areas */}
        <Section icon="⚠️" title="Weak Areas">
          <WeakAreas weakAreas={weakAreas} />
        </Section>

        {/* Recent */}
        <Section icon="🕐" title="Recent Results">
          <RecentResults data={recentData} />
        </Section>

        {/* Footer */}
        <div style={{
          marginTop: "16px", paddingTop: "14px",
          borderTop: `1px solid ${C.border}`,
          fontSize: "11px", color: C.muted, fontStyle: "italic",
        }}>
          Hover chart points for details · Click dates to open notes
        </div>
      </div>
    </div>
  );
};
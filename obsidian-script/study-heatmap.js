/** @jsx h */
/** @jsxFrag Fragment */

// ═══════════════════════════════════════════════════════════════
//  🟩  GITHUB-STYLE STUDY HEATMAP — Datacore Edition (v2 Fixed)
// ═══════════════════════════════════════════════════════════════

// ── Config ───────────────────────────────────────────────────
const CONFIG = {
  folder:         "Daily Notes",
  skipTexts:      new Set(["SBI","IBPS","RRB","PO","Clerk","Pre","Mains"]),
  streakLookback: 366,       // max days to scan backwards for streak
  queryDebounce:  400,       // ms — batches rapid index updates
};

// ── Theme ────────────────────────────────────────────────────
const T = {
  bg:     "var(--background-primary)",
  border: "var(--background-modifier-border)",
  text:   "var(--text-normal)",
  muted:  "var(--text-muted)",
  L0:     "var(--background-secondary)",
  L1:     "#0e6429",
  L2:     "#007d32",
  L3:     "#26a641",
  L4:     "#36c353",
  ring:   "#58a6ff",
  fire:   "#ffa657",
};

const LEVELS = [T.L0, T.L1, T.L2, T.L3, T.L4];

// ── Pure Helpers ─────────────────────────────────────────────
const z = (n) => String(n).padStart(2, "0");

const dateKey = (y, m, d) => `${y}-${z(m)}-${z(d)}`;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const parseName = (name) => {
  const m = DATE_RE.exec(name);
  return m ? { year: +m[1], month: +m[2], day: +m[3] } : null;
};

const levelFor = (done, total) => {
  if (!total || !done) return T.L0;
  const r = done / total;
  return r <= 0.25 ? T.L1 : r <= 0.5 ? T.L2 : r < 1 ? T.L3 : T.L4;
};

const pctOf = (done, total) =>
  total ? Math.round((done / total) * 100) : 0;

const DOW_LABELS = [...Array(7)].map((_, i) =>
  new Date(1970, 0, 4 + i).toLocaleString("default", { weekday: "short" })
);

// ── Static styles (computed once, memoised in View) ──────────
const CSS = `
  .gh-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }
  .gh-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }
  .gh-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    user-select: none;
    height: 44px;
    border-radius: 6px;
    transition: transform .12s ease, box-shadow .15s ease;
    position: relative;
  }
  .gh-heatmap .gh-cell:hover {
    transform: scale(1.12);
    box-shadow: 0 0 10px ${T.L4}73;
    z-index: 10;
  }
  .gh-heatmap a.internal-link:hover {
    text-decoration: none;
  }
`;

// ── Static divider styles ────────────────────────────────────
const dividerBottom = {
  marginBottom: 16, paddingBottom: 14,
  borderBottom: `1px solid ${T.border}`,
};
const dividerTop = {
  marginTop: 16, paddingTop: 14,
  borderTop: `1px solid ${T.border}`,
};

// ── Sub-Components (pure — no hooks, defined outside View) ───

const DowHeaders = () => {
  const style = { textAlign: "center", fontSize: 12, color: T.muted,
    fontWeight: 600, paddingBottom: 10, letterSpacing: "0.5px" };
  return <>{DOW_LABELS.map((d) => <div key={d} style={style}>{d}</div>)}</>;
};

const Legend = () => (
  <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:T.muted }}>
    Less&nbsp;
    {LEVELS.map((c, i) => <div key={i} style={{ width:14, height:14, borderRadius:3, background:c }} />)}
    &nbsp;More
  </div>
);

const StreakBadge = ({ streak }) => (
  <span style={{
    fontSize: 14, fontWeight: 700, color: T.fire,
    background: `${T.fire}18`, padding: "4px 12px",
    borderRadius: 20, border: `1px solid ${T.fire}44`,
  }}>
    🔥 {streak} day{streak !== 1 ? "s" : ""}
  </span>
);

function DayCell({ day, info, isToday, moName }) {
  const bg  = info ? levelFor(info.done, info.total) : T.L0;
  const pct = pctOf(info?.done, info?.total);
  const col = (isToday || info?.done) ? T.text : T.muted;

  const tip = info
    ? `${moName} ${day} — ${info.done}/${info.total} tasks (${pct}%)`
    : `${moName} ${day} — no note`;

  const style = {
    background: bg,
    color: col,
    fontWeight: isToday ? 700 : 400,
    cursor: info ? "pointer" : "default",
    boxShadow: isToday ? `0 0 0 2px ${T.ring}, 0 0 12px ${T.ring}55` : undefined,
  };

  const cell = (
    <div className="gh-cell" title={tip} style={style}>
      <span>{day}</span>
      {info?.total > 0 && (
        <div style={{ fontSize:12, color:T.muted, marginTop:1, opacity:0.8 }}>
          {pct}%
        </div>
      )}
    </div>
  );

  return info
    ? <a data-href={info.name} href={info.name}
         className="internal-link" style={{ textDecoration:"none" }}>{cell}</a>
    : cell;
}

const EmptyCell = () => <div className="gh-cell" />;

// ── Main View ────────────────────────────────────────────────

return function View() {

  const now     = new Date();
  const YR      = now.getFullYear();
  const MO      = now.getMonth();       // 0-based
  const DAY     = now.getDate();
  const moName  = now.toLocaleString("default", { month: "long" });
  const dow1    = new Date(YR, MO, 1).getDay();
  const numDays = new Date(YR, MO + 1, 0).getDate();
  const cutoff  = new Date(YR, MO, DAY - CONFIG.streakLookback);

  // ── Inject CSS once (memoised — never re-created) ─────────
  const injectedStyles = dc.useMemo(() => <style>{CSS}</style>, []);

  // ── Queries (debounced) ── second arg must be options object ─
  const opts = { debounce: CONFIG.queryDebounce };
  const pages = dc.useQuery(`@page and path("${CONFIG.folder}")`, opts);
  const tasks = dc.useQuery(
    `@task and childof(@page and path("${CONFIG.folder}"))`,
    opts
  );

  // ── Early exit: empty state ────────────────────────────────
  if (!pages || pages.length === 0) {
    return (
      <div style={{ color: T.muted, padding: 24, textAlign: "center" }}>
        📭 No daily notes found in "<strong>{CONFIG.folder}</strong>".
      </div>
    );
  }

  // ── Group tasks by parent file (keyed on $file) ────────────
  const tasksByFile = dc.useMemo(() => tasks.reduce((m, t) => {
    const txt = (t.$cleantext ?? t.$text ?? "").trim();
    if (CONFIG.skipTexts.has(txt) || !t.$file) return m;
    const e = m[t.$file] ??= { done: 0, total: 0 };
    e.total++;
    if (t.$completed) e.done++;
    return m;
  }, {}), [tasks]);

  // ── Year map + month map ───────────────────────────────────
  //    yearMap: dateKey → done count  (for streak)
  //    moMap:   day#    → { name, path, done, total }  (for grid)
  const { yearMap, moMap } = dc.useMemo(() => {
    const yM = {}, mM = {};
    for (const p of pages) {
      const d = parseName(p.$name);
      if (!d) continue;

      const js = new Date(d.year, d.month - 1, d.day);
      if (js < cutoff) continue;

      // FIX: use $file consistently — available on all objects
      const c   = tasksByFile[p.$file] ?? { done: 0, total: 0 };
      const key = dateKey(d.year, d.month, d.day);
      yM[key]   = c.done;

      if (d.year === YR && d.month === MO + 1) {
        mM[d.day] = { name: p.$name, path: p.$file, done: c.done, total: c.total };
      }
    }
    return { yearMap: yM, moMap: mM };
  }, [pages, tasksByFile]);

  // ── Streak (starts from today if active, yesterday otherwise) ────────
  const streak = dc.useMemo(() => {
    const cursor = new Date(YR, MO, yearMap[dateKey(YR, MO + 1, DAY)] > 0 ? DAY : DAY - 1);
    let s = 0;
    while (s < CONFIG.streakLookback &&
      yearMap[dateKey(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate())] > 0) {
      s++; cursor.setDate(cursor.getDate() - 1);
    }
    return s;
  }, [yearMap]);

  // ── Month stats (single-pass reduce) ────────────────────────────────
  const { activeDays, monthDone, monthTotal, monthPct } = dc.useMemo(() => {
    const { done: sd, total: sa } = Object.values(moMap)
      .reduce((a, x) => ({ done: a.done + x.done, total: a.total + x.total }), { done: 0, total: 0 });
    return { activeDays: Object.keys(moMap).length, monthDone: sd, monthTotal: sa, monthPct: pctOf(sd, sa) };
  }, [moMap]);

  // ── Grid cells (memoized) ────────────────────────────────────
  const gridCells = dc.useMemo(() => {
    const mk = (n, pfx) => Array.from({ length: n }, (_, i) => <EmptyCell key={`${pfx}${i}`} />);
    const tail = (numDays + dow1) % 7;
    return [
      ...mk(dow1, "b"),
      ...Array.from({ length: numDays }, (_, i) => (
        <DayCell key={i+1} day={i+1} info={moMap[i+1]} isToday={i+1 === DAY} moName={moName} />
      )),
      ...(tail ? mk(7 - tail, "p") : []),
    ];
  }, [moMap, dow1, numDays, DAY, moName]);

  // ── Render ─────────────────────────────────────────────────
  return (
    <div>
    {injectedStyles}
    <div className="gh-heatmap" style={{
      background: T.bg, border: `1px solid ${T.border}`,
      borderRadius: 12, padding: "20px 24px",
      width: "100%", boxSizing: "border-box",
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif",
    }}>

      {/* Header */}
      <div className="gh-bar" style={dividerBottom}>
        <span style={{ fontSize:18, fontWeight:700, color:T.text }}>
          📅 {moName} {YR}
        </span>
        <div style={{ display:"flex", gap:16, alignItems:"center", flexWrap:"wrap" }}>
          <span style={{ fontSize:13, color:T.muted }}>
            📊 {activeDays} days · {monthDone}/{monthTotal} tasks · {monthPct}%
          </span>
          <StreakBadge streak={streak} />
        </div>
      </div>

      {/* Day-of-week row */}
      <div className="gh-grid"><DowHeaders /></div>

      {/* Calendar grid */}
      <div className="gh-grid">{gridCells}</div>

      {/* Footer */}
      <div className="gh-bar" style={dividerTop}>
        <Legend />
        <div style={{ fontSize:11, color:T.muted, fontStyle:"italic" }}>
          Hover a cell to see details · Click to open note
        </div>
      </div>

    </div>
    </div>
  );
};
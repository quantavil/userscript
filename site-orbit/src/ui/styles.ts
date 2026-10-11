export const STYLES = `
:host {
  all: initial;
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  pointer-events: none;
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
* { box-sizing: border-box; }
button, input, select { font: inherit; }
button { cursor: pointer; }

:focus-visible {
  outline: 2px solid #ff7048;
  outline-offset: 2px;
}

.so-panel {
  outline: none;
  --bg: #07130f;
  --surface: #0b1b14;
  --surface-2: #10261a;
  --line: #28523a;
  --ink: #b9f5ce;
  --muted: #8eb39d;
  --signal: #ff7048;
  position: fixed;
  top: 18px;
  right: 18px;
  pointer-events: auto;
  width: min(480px, calc(100vw - 36px));
  height: min(750px, calc(100vh - 36px));
  display: flex;
  flex-direction: column;
  color: var(--ink);
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 6px;
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.65), 0 0 0 1px var(--line);
  font-size: 13px;
  overflow: hidden;
}

.so-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 18px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.so-header-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.so-header-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}
.so-favicon {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  object-fit: contain;
  background: var(--surface);
}
.so-header small, .so-signal-meta, .so-section-title, .so-sparkline-label {
  color: var(--muted);
  font: 10px ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.so-header strong {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -.02em;
  color: var(--ink);
}
.so-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.so-icon-btn {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--muted);
  cursor: pointer;
  padding: 0;
  font-size: 15px;
  line-height: 1;
  transition: all 0.15s ease;
}
.so-icon-btn:not(:disabled):hover {
  border-color: var(--signal);
  color: var(--signal);
}
.so-icon-btn:disabled {
  opacity: .55;
  cursor: default;
}
.so-icon-btn:not(:disabled):active {
  background: var(--signal);
  color: var(--bg);
  border-color: var(--signal);
}
.so-icon-btn svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}
.so-icon-btn.is-spinning svg {
  animation: so-spin 0.8s linear infinite;
}

.so-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.so-tabs button {
  position: relative;
  padding: 10px 16px;
  color: var(--muted);
  background: transparent;
  border: 0;
  border-right: 1px solid var(--line);
  text-align: left;
  font-size: 12px;
}
.so-tabs button:last-child { border-right: 0; }
.so-tabs button[aria-selected="true"] {
  color: var(--ink);
  background: var(--bg);
  font-weight: 500;
}
.so-tabs button[aria-selected="true"]::after {
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: var(--signal);
  content: "";
}

.so-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.so-snapshot, .so-leaderboard {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.so-signal-meta {
  display: flex;
  justify-content: space-between;
  padding: 14px 18px 0;
}
.so-signal-meta span:last-child { color: var(--signal); }

.so-desc {
  padding: 8px 18px 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.4;
  margin: 0;
}

.so-hero-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 18px 18px 12px;
  position: relative;
}
.so-orbit {
  position: relative;
  display: grid;
  place-items: center;
  width: 156px;
  height: 156px;
  margin: 0 auto;
}
.so-orbit>i:first-child {
  position: absolute;
  inset: 0;
  border: 1px dashed #47db7b;
  border-radius: 50%;
  animation: so-spin 20s linear infinite;
}
.so-orbit>i:nth-child(2) {
  position: absolute;
  inset: 18px;
  border: 1px solid var(--signal);
  border-radius: 50%;
  animation: so-spin 12s linear infinite reverse;
}
.so-orbit>div {
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.so-orbit small {
  color: var(--muted);
  font: 10px ui-monospace, monospace;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.so-orbit strong {
  font: 600 28px ui-monospace, monospace;
  letter-spacing: -.05em;
  color: var(--ink);
  margin: 2px 0;
}
.so-orbit em {
  color: var(--signal);
  font: 700 12px ui-monospace, monospace;
}

.so-sparkline-box {
  padding: 0 18px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.so-sparkline-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.so-sparkline-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 30px;
  background: var(--surface);
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 4px;
}
.so-sparkline-bars span {
  flex: 1;
  min-height: 4px;
  background: var(--signal);
  border-radius: 1px;
  opacity: 0.85;
}
.so-sparkline-bars span:hover {
  opacity: 1;
  background: #47db7b;
}

.so-ranks {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-block: 1px solid var(--line);
}
.so-ranks>div { padding: 10px 14px; border-right: 1px solid var(--line); }
.so-ranks>div:last-child { border-right: 0; }
.so-ranks small, .so-ranks em { display: block; color: var(--muted); font: 10px ui-monospace, monospace; }
.so-ranks b { display: block; margin: 3px 0; font: 500 15px ui-monospace, monospace; }

.so-section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px 6px;
}

.so-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 18px 12px;
}
.so-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font: 11px ui-monospace, monospace;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--ink);
}
.so-badge.is-framework { border-color: #47db7b; color: #a3f7c4; }
.so-badge.is-cms { border-color: #58a6ff; color: #a5d6ff; }
.so-badge.is-ui { border-color: #d2a8ff; color: #e2c5ff; }
.so-badge.is-analytics { border-color: #f0883e; color: #ffc69d; }
.so-badge.is-cdn { border-color: #f778ba; color: #ffb8df; }
.so-badge.is-observability { border-color: #79c0ff; color: #cbe6ff; }

.so-telemetry-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 0 18px 12px;
}
.so-telemetry-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.so-telemetry-card small {
  color: var(--muted);
  font: 10px ui-monospace, monospace;
  text-transform: uppercase;
  letter-spacing: .06em;
}
.so-telemetry-card strong {
  color: var(--ink);
  font: 500 13px ui-monospace, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.so-telemetry-card em {
  font: 10px ui-monospace, monospace;
  color: var(--signal);
  font-style: normal;
}

.so-metrics { margin: 0; padding: 0 18px 12px; }
.so-metrics>div { display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px solid var(--line); }
.so-metrics dt { color: var(--muted); }
.so-metrics dd { margin: 0; font-family: ui-monospace, monospace; }

.so-empty { display: grid; place-items: start; gap: 10px; min-height: 180px; padding: 25px 20px; }
.so-empty p { margin: 0; font-size: 14px; }
.so-empty code { color: var(--signal); }
.so-empty-actions { display: flex; align-items: center; gap: 16px; margin-top: 4px; }
.so-btn-link { color: var(--muted); text-decoration: none; font: 11px ui-monospace, monospace; }
.so-btn-link:hover { color: var(--signal); text-decoration: underline; }

.so-tools { display: flex; align-items: end; justify-content: space-between; gap: 12px; padding: 12px 18px 8px; color: var(--muted); font: 10px ui-monospace, monospace; letter-spacing: .07em; text-transform: uppercase; flex-shrink: 0; }
.so-tools label { flex: 1; }
.so-tools input { display: block; width: 100%; margin-top: 4px; padding: 7px 9px; color: var(--ink); background: var(--surface); border: 1px solid var(--line); border-radius: 4px; }
.so-tools input:focus-visible { border-color: var(--signal); }
.so-sort { display: flex; align-items: end; gap: 5px; }
.so-sort label { min-width: 110px; }
.so-sort select { display: block; width: 100%; margin-top: 4px; padding: 6px 18px 6px 8px; color: var(--ink); background: var(--surface); border: 1px solid var(--line); border-radius: 4px; }
.so-sort button { height: 30px; padding: 0 8px; color: var(--signal); background: transparent; border: 1px solid var(--line); border-radius: 4px; }

.so-table { padding: 0 18px; flex: 1; }
.so-tr { display: grid; grid-template-columns: 24px minmax(130px, 1fr) 85px 55px 22px; gap: 8px; align-items: center; min-height: 44px; padding: 3px 5px; border-bottom: 1px solid var(--line); font: 11px ui-monospace, monospace; }
.so-tr>*:nth-child(3), .so-tr>*:nth-child(4) { text-align: right; }
.so-th { min-height: 28px; color: var(--muted); font-size: 10px; text-transform: uppercase; }
.so-th button { color: var(--muted); background: transparent; border: 0; text-align: left; padding: 0; }
.so-th button:nth-child(n+3) { text-align: right; }
.so-tr.is-current { background: var(--surface-2); box-shadow: inset 3px 0 var(--signal); }
.so-domain { display: flex; flex-direction: column; gap: 2px; overflow: hidden; color: var(--ink); background: transparent; border: 0; text-align: left; padding: 0; }
.so-domain small { overflow: hidden; color: var(--muted); font-size: 10px; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
.so-rank-cell { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
.so-rank-cell b { font-weight: 500; }
.so-rank-cell em { color: var(--muted); font-style: normal; font-size: 10px; }
.so-delete { width: 22px; height: 22px; color: var(--muted); background: transparent; border: 0; border-radius: 3px; display: grid; place-items: center; font-size: 14px; padding: 0; }
.so-delete:hover { color: var(--signal); background: rgba(255, 112, 72, 0.1); }
.so-empty-row { margin: 20px 18px; color: var(--muted); }

.so-view-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
  padding: 10px 18px;
  color: var(--muted);
  border-top: 1px solid var(--line);
  background: var(--bg);
  font: 11px ui-monospace, monospace;
  flex-shrink: 0;
}
.so-view-footer div { display: flex; gap: 10px; }
.so-view-footer button, .so-empty button { padding: 3px 8px; color: var(--signal); background: transparent; border: 1px solid var(--line); border-radius: 4px; font-weight: 500; }
.so-view-footer button:hover, .so-empty button:hover { border-color: var(--signal); }
.so-view-footer button:active, .so-empty button:active { background: var(--signal); color: var(--bg); }

@keyframes so-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .so-orbit>i, .so-icon-btn.is-spinning svg { animation: none; } }
@media (max-width: 600px) {
  .so-panel { top: 8px; right: 8px; left: 8px; width: auto; height: calc(100vh - 16px); }
  .so-tr { grid-template-columns: 22px minmax(90px, 1fr) 70px 22px; }
  .so-tr>*:nth-child(4) { display: none; }
  .so-telemetry-grid { grid-template-columns: 1fr; }
}
`;

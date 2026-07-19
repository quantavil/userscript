/** Shadow-root scoped styles for the Form Genie UI. */
export const STYLES = `
:host {
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
  color-scheme: dark;

  --bg: #0e1018;
  --bg-soft: #151827;
  --line: rgba(255,255,255,0.08);
  --line-strong: rgba(255,255,255,0.14);
  --text: #eef0f6;
  --text-dim: #9aa3b8;
  --text-faint: #626b80;
  --accent: #7c6cf6;
  --accent-2: #5b8cfa;
  --accent-soft: rgba(124,108,246,0.16);
  --ok: #34d399;
  --warn: #fbbf24;
  --err: #f87171;
  --radius: 14px;
  --shadow: 0 24px 64px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.35);
  --ease: cubic-bezier(0.32, 0.72, 0, 1);
}
* { box-sizing: border-box; margin: 0; }
button { font: inherit; }

/* ---- FAB ---------------------------------------------------------------- */
.fab {
  position: fixed; z-index: 2147483647;
  display: flex; align-items: center; gap: 8px;
  height: 48px; padding: 0 18px; border-radius: 24px;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
  border: 1px solid rgba(255,255,255,0.18);
  color: #fff; cursor: pointer; user-select: none; touch-action: none;
  font-size: 14px; font-weight: 650; letter-spacing: 0.2px;
  box-shadow: 0 6px 20px rgba(103,92,240,0.45), 0 2px 6px rgba(0,0,0,0.3);
  transition: transform .18s var(--ease), box-shadow .18s var(--ease);
}
.fab:hover { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(103,92,240,0.55), 0 2px 6px rgba(0,0,0,0.3); }
.fab:active { transform: scale(0.96); }
.fab svg { width: 17px; height: 17px; flex-shrink: 0; }

/* ---- Sheet -------------------------------------------------------------- */
.sheet {
  position: fixed; z-index: 2147483647;
  right: 16px; bottom: 76px; width: 380px; max-width: calc(100vw - 24px);
  max-height: 74vh; display: flex; flex-direction: column;
  background: var(--bg);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
  transition: opacity .22s var(--ease), transform .22s var(--ease);
}
.sheet.hidden { opacity: 0; transform: translateY(14px) scale(.97); pointer-events: none; }

@media (max-width: 520px) {
  .sheet {
    left: 0; right: 0; bottom: 0; width: 100%; max-width: 100%;
    max-height: 85vh; border-radius: 18px 18px 0 0; border-bottom: none;
  }
  .sheet::before {
    content: ''; display: block; width: 36px; height: 4px; border-radius: 2px;
    background: var(--line-strong); margin: 8px auto 0;
  }
}

/* ---- Header ------------------------------------------------------------- */
.head {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px 10px;
}
.head .logo {
  width: 28px; height: 28px; border-radius: 9px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #fff;
}
.head .logo svg { width: 15px; height: 15px; }
.head .titles { flex: 1; min-width: 0; }
.head .title { font-size: 14px; font-weight: 700; color: var(--text); }
.head .sub { font-size: 11px; color: var(--text-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.head .close {
  width: 28px; height: 28px; border-radius: 8px; border: none; cursor: pointer;
  background: transparent; color: var(--text-dim); font-size: 18px; line-height: 1;
}
.head .close:hover { background: rgba(255,255,255,0.07); color: var(--text); }

/* ---- Tabs (segmented) --------------------------------------------------- */
.tabs {
  display: flex; gap: 2px; margin: 0 14px 10px;
  padding: 3px; border-radius: 10px;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--line);
}
.tab {
  flex: 1; padding: 7px 0; border: none; border-radius: 8px; cursor: pointer;
  font-size: 12.5px; font-weight: 600; color: var(--text-dim);
  background: transparent; transition: background .15s ease, color .15s ease;
}
.tab.active { color: var(--text); background: var(--bg-soft); box-shadow: 0 1px 3px rgba(0,0,0,0.35); }

/* ---- Body --------------------------------------------------------------- */
.body {
  flex: 1; overflow-y: auto; overscroll-behavior: contain;
  padding: 2px 14px 16px; display: flex; flex-direction: column; gap: 10px;
}
.body::-webkit-scrollbar { width: 5px; }
.body::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 3px; }

/* ---- Buttons ------------------------------------------------------------ */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 11px 16px; border-radius: 10px; cursor: pointer;
  font-size: 13px; font-weight: 650; border: 1px solid transparent;
  transition: filter .15s ease, transform .1s ease, background .15s ease;
}
.btn:active { transform: scale(0.985); }
.btn.primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #fff; box-shadow: 0 2px 10px rgba(103,92,240,0.35);
}
.btn.primary:hover { filter: brightness(1.08); }
.btn.primary:disabled { filter: saturate(0.4) brightness(0.7); cursor: default; }
.btn.ghost { background: rgba(255,255,255,0.05); color: var(--text); border-color: var(--line); }
.btn.ghost:hover { background: rgba(255,255,255,0.09); }
.btn.danger { background: transparent; color: var(--err); border-color: rgba(248,113,113,0.35); }
.btn.danger:hover { background: rgba(248,113,113,0.12); }
.btn.full { width: 100%; }
.btn.sm { padding: 6px 10px; font-size: 12px; border-radius: 8px; }

/* ---- Form fields -------------------------------------------------------- */
.row { display: flex; gap: 8px; align-items: center; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 11px; font-weight: 600; color: var(--text-dim); letter-spacing: .2px; }
.field input, .field select {
  width: 100%; padding: 9px 11px; border-radius: 9px; font-size: 13px;
  background: rgba(255,255,255,0.04); border: 1px solid var(--line);
  color: var(--text); outline: none; appearance: none;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.field input::placeholder { color: var(--text-faint); }
.field input:focus, .field select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.field select { background-image: linear-gradient(45deg, transparent 50%, var(--text-dim) 50%), linear-gradient(135deg, var(--text-dim) 50%, transparent 50%);
  background-position: calc(100% - 16px) 55%, calc(100% - 11px) 55%;
  background-size: 5px 5px; background-repeat: no-repeat; }

input[type='checkbox'] {
  width: 34px; height: 20px; appearance: none; cursor: pointer; flex-shrink: 0;
  border-radius: 10px; background: rgba(255,255,255,0.12); position: relative;
  transition: background .18s ease; outline: none;
}
input[type='checkbox']::after {
  content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px;
  border-radius: 50%; background: #fff; transition: transform .18s var(--ease);
}
input[type='checkbox']:checked { background: var(--accent); }
input[type='checkbox']:checked::after { transform: translateX(14px); }

.section-title {
  font-size: 11px; font-weight: 700; color: var(--text-dim);
  text-transform: uppercase; letter-spacing: .8px; margin-top: 8px;
}
.section-title:first-child { margin-top: 0; }

/* ---- Report ------------------------------------------------------------- */
.count-row {
  display: flex; gap: 6px; flex-wrap: wrap;
}
.count-row span {
  font-size: 11.5px; color: var(--text-dim); background: rgba(255,255,255,0.05);
  border: 1px solid var(--line); border-radius: 999px; padding: 3px 10px;
}
.count-row b { color: var(--text); font-weight: 700; }

.report-item {
  display: flex; gap: 9px; align-items: flex-start;
  padding: 8px 10px; border-radius: 10px; font-size: 12.5px; color: var(--text);
  background: rgba(255,255,255,0.03); border: 1px solid var(--line);
}
.report-item .ico { flex-shrink: 0; font-size: 12px; }
.report-item .meta { color: var(--text-faint); font-size: 11px; margin-top: 1px; word-break: break-word; }
.report-item.act { cursor: pointer; border-color: rgba(251,191,36,0.35); }
.report-item.act:hover { background: rgba(251,191,36,0.08); }

.muted { color: var(--text-dim); font-size: 12px; line-height: 1.5; }

/* ---- Teach & picker ----------------------------------------------------- */
.teach-tag {
  position: fixed; z-index: 2147483646;
  background: var(--accent); color: #fff; font: 700 10px/1.6 monospace;
  padding: 1px 6px; border-radius: 5px; cursor: pointer; pointer-events: auto;
  box-shadow: 0 2px 6px rgba(0,0,0,0.4);
}
.teach-tag:hover { filter: brightness(1.15); }

.picker {
  position: fixed; inset: 0; z-index: 2147483647;
  display: flex; align-items: center; justify-content: center;
  background: rgba(5,6,12,0.6); backdrop-filter: blur(3px);
}
.picker-box {
  width: 330px; max-width: 92vw; max-height: 70vh;
  display: flex; flex-direction: column; overflow: hidden;
  background: var(--bg); border: 1px solid var(--line-strong);
  border-radius: var(--radius); box-shadow: var(--shadow);
}
.picker-box input {
  margin: 12px 12px 8px; padding: 9px 11px; border-radius: 9px; font-size: 13px;
  background: rgba(255,255,255,0.04); border: 1px solid var(--line);
  color: var(--text); outline: none;
}
.picker-box input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.picker-list { overflow-y: auto; padding: 0 8px 10px; display: flex; flex-direction: column; gap: 1px; }
.picker-opt { padding: 8px 10px; border-radius: 8px; font-size: 13px; color: var(--text); cursor: pointer; }
.picker-opt:hover { background: var(--accent-soft); }
.picker-opt .k { font-size: 10px; color: var(--text-faint); font-family: monospace; }

/* ---- Toast -------------------------------------------------------------- */
.toast {
  position: fixed; bottom: 138px; left: 50%; transform: translateX(-50%);
  z-index: 2147483647; padding: 9px 16px; border-radius: 999px;
  background: var(--bg-soft); border: 1px solid var(--line-strong);
  color: var(--text); font-size: 12.5px; font-weight: 600;
  box-shadow: var(--shadow); white-space: nowrap;
  animation: fg-toast .2s var(--ease);
}
@keyframes fg-toast { from { opacity: 0; transform: translate(-50%, 6px); } }
`;

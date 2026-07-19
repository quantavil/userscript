/** Shadow-root scoped styles for the Form Genie UI (liquid-glass aesthetic). */
export const STYLES = `
:host { all: initial; font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color-scheme: dark; }
* { box-sizing: border-box; }

.fab {
  position: fixed; z-index: 2147483647;
  display: flex; align-items: center; gap: 8px;
  height: 44px; padding: 0 16px; border-radius: 22px;
  background: linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #06b6d4 100%);
  border: 1px solid rgba(255,255,255,0.25); color: #fff; cursor: pointer;
  box-shadow: 0 8px 32px rgba(168,85,247,0.35), inset 0 1px 1px rgba(255,255,255,0.3);
  font-size: 14px; font-weight: 700; letter-spacing: 0.3px; user-select: none;
  touch-action: none;
}
.fab:active { transform: scale(0.96); }
.fab svg { width: 18px; height: 18px; flex-shrink: 0; }

.sheet {
  position: fixed; z-index: 2147483647;
  right: 16px; bottom: 72px; width: 360px; max-width: calc(100vw - 24px);
  max-height: 72vh; display: flex; flex-direction: column;
  background: rgba(15,12,30,0.92); backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  border: 1px solid rgba(168,85,247,0.35); border-radius: 20px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5); overflow: hidden;
  transition: opacity .25s ease, transform .25s ease;
}
.sheet.hidden { opacity: 0; transform: translateY(16px) scale(.96); pointer-events: none; }
@media (max-width: 520px) {
  .sheet { left: 0; right: 0; bottom: 0; width: 100%; max-width: 100%;
    max-height: 82vh; border-radius: 20px 20px 0 0; }
}

.head { display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid rgba(168,85,247,0.2);
  background: linear-gradient(to right, rgba(168,85,247,0.12), transparent); }
.head .title { font-size: 15px; font-weight: 800; color: #fff; letter-spacing: .3px; }
.head .close { background: none; border: none; color: #cbd5e1; font-size: 20px; cursor: pointer; line-height: 1; }

.tabs { display: flex; gap: 2px; padding: 8px 10px 0; }
.tab { flex: 1; padding: 8px; text-align: center; font-size: 12px; font-weight: 700;
  color: #94a3b8; background: transparent; border: none; border-radius: 10px 10px 0 0; cursor: pointer; }
.tab.active { color: #fff; background: rgba(168,85,247,0.15); }

.body { flex: 1; overflow-y: auto; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
.body::-webkit-scrollbar { width: 5px; }
.body::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.35); border-radius: 3px; }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px 14px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer;
  border: 1px solid transparent; }
.btn.primary { background: linear-gradient(135deg,#a855f7,#6366f1); color: #fff; }
.btn.primary:active { transform: scale(.98); }
.btn.ghost { background: rgba(255,255,255,0.05); color: #e2e8f0; border-color: rgba(255,255,255,0.1); }
.btn.danger { background: rgba(239,68,68,0.15); color: #fca5a5; border-color: rgba(239,68,68,0.3); }
.btn.full { width: 100%; }
.btn.sm { padding: 6px 10px; font-size: 12px; }

.row { display: flex; gap: 8px; align-items: center; }
.field { display: flex; flex-direction: column; gap: 4px; }
.field label { font-size: 11px; font-weight: 600; color: #94a3b8; }
.field input, .field select {
  width: 100%; padding: 8px 10px; border-radius: 10px; font-size: 13px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: #f1f5f9; outline: none;
}
.field input:focus, .field select:focus { border-color: rgba(168,85,247,0.6); }

.section-title { font-size: 12px; font-weight: 800; color: #c4b5fd; margin: 6px 0 2px;
  text-transform: uppercase; letter-spacing: .6px; }

.report-item { display: flex; gap: 8px; align-items: flex-start; padding: 7px 10px;
  border-radius: 10px; background: rgba(255,255,255,0.03); font-size: 12px; color: #e2e8f0; }
.report-item .ico { flex-shrink: 0; }
.report-item .meta { color: #94a3b8; font-size: 11px; }
.report-item.act { cursor: pointer; border: 1px dashed rgba(245,158,11,0.4); }

.count-row { display: flex; gap: 10px; font-size: 12px; color: #94a3b8; }
.count-row b { color: #fff; }

.muted { color: #94a3b8; font-size: 12px; }
.masked { letter-spacing: 2px; }

.picker { position: fixed; inset: 0; z-index: 2147483647; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.5); }
.picker-box { width: 320px; max-width: 92vw; max-height: 70vh; display: flex; flex-direction: column;
  background: rgba(15,12,30,0.98); border: 1px solid rgba(168,85,247,0.4); border-radius: 16px; overflow: hidden; }
.picker-box input { margin: 10px; padding: 8px 10px; border-radius: 10px; background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.12); color: #fff; outline: none; }
.picker-list { overflow-y: auto; padding: 0 8px 8px; display: flex; flex-direction: column; gap: 2px; }
.picker-opt { padding: 8px 10px; border-radius: 8px; font-size: 13px; color: #e2e8f0; cursor: pointer; }
.picker-opt:hover { background: rgba(168,85,247,0.2); }
.picker-opt .k { font-size: 10px; color: #94a3b8; }

.teach-tag { position: fixed; z-index: 2147483646; background: #6366f1; color: #fff;
  font: 700 10px monospace; padding: 1px 5px; border-radius: 4px; cursor: pointer; pointer-events: auto; }

.toast { position: fixed; bottom: 130px; left: 50%; transform: translateX(-50%); z-index: 2147483647;
  background: rgba(15,12,30,0.95); border: 1px solid rgba(168,85,247,0.4); color: #fff;
  padding: 10px 16px; border-radius: 12px; font-size: 13px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
`;

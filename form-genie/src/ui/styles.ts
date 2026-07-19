/**
 * Shadow-root scoped styles — "Press" theme.
 *
 * An editorial / printed-document aesthetic: warm paper, ink-black type, a
 * single vermilion spot colour, serif masthead, monospace field keys, hairline
 * rules and hard offset (letterpress) shadows. Chosen deliberately against the
 * generic dark-glass default — and because a tool that fills bureaucratic exam
 * forms may as well look like one.
 */
export const STYLES = `
:host {
  all: initial;
  color-scheme: light;

  --paper: #f3efe4;
  --paper-2: #eae3d2;
  --ink: #191712;
  --ink-2: #56503f;
  --ink-3: #8a8168;
  --rule: #cfc6ae;
  --rule-strong: #b3a884;
  --spot: #cc3b1d;
  --ok: #3f7d4f;
  --warn: #b5791a;
  --miss: #cc3b1d;

  --serif: 'Iowan Old Style', Georgia, 'Times New Roman', serif;
  --mono: ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
  --sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  --shadow: 5px 5px 0 rgba(25,23,18,0.16);
  --shadow-sm: 3px 3px 0 rgba(25,23,18,0.20);

  font-family: var(--sans);
  color: var(--ink);
}
* { box-sizing: border-box; margin: 0; }
button { font: inherit; color: inherit; }

/* ---- FAB — an ink stamp ------------------------------------------------- */
.fab {
  position: fixed; z-index: 2147483647;
  display: flex; align-items: center; gap: 9px;
  height: 46px; padding: 0 18px 0 15px;
  background: var(--ink); color: var(--paper);
  border: 2px solid var(--ink); border-left: 5px solid var(--spot);
  border-radius: 2px; box-shadow: var(--shadow-sm);
  cursor: pointer; user-select: none; touch-action: none;
  font-family: var(--mono); font-size: 13px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1.5px;
  transition: transform .08s ease, box-shadow .08s ease;
}
.fab:active { transform: translate(3px, 3px); box-shadow: 0 0 0 rgba(0,0,0,0); }
.fab svg { width: 16px; height: 16px; flex-shrink: 0; }

/* ---- Sheet -------------------------------------------------------------- */
.sheet {
  position: fixed; z-index: 2147483647;
  right: 18px; bottom: 74px; width: 384px; max-width: calc(100vw - 24px);
  max-height: 76vh; display: flex; flex-direction: column;
  background: var(--paper);
  border: 1.5px solid var(--ink); border-radius: 3px;
  box-shadow: var(--shadow);
  overflow: hidden;
  transition: opacity .18s ease, transform .18s ease;
}
.sheet.hidden { opacity: 0; transform: translateY(12px); pointer-events: none; }

@media (max-width: 520px) {
  .sheet {
    left: 0; right: 0; bottom: 0; width: 100%; max-width: 100%;
    max-height: 86vh; border-radius: 4px 4px 0 0; border-bottom: none;
    box-shadow: 0 -4px 0 rgba(25,23,18,0.12);
  }
}

/* ---- Masthead ----------------------------------------------------------- */
.head { position: relative; z-index: 1; padding: 15px 16px 0; }
.head .row1 { display: flex; align-items: flex-start; gap: 11px; }
.head .mono-mark {
  width: 30px; height: 30px; flex-shrink: 0; margin-top: 2px;
  display: flex; align-items: center; justify-content: center;
  background: var(--ink); color: var(--paper); border-radius: 2px;
  font-family: var(--serif); font-weight: 700; font-size: 16px;
}
.head .titles { flex: 1; min-width: 0; }
.head .title {
  font-family: var(--serif); font-size: 22px; font-weight: 700;
  line-height: 1; letter-spacing: -0.4px;
}
.head .sub {
  font-family: var(--mono); font-size: 10.5px; color: var(--ink-2);
  text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.head .close {
  width: 26px; height: 26px; flex-shrink: 0; cursor: pointer;
  background: transparent; border: 1.5px solid var(--rule-strong); border-radius: 2px;
  color: var(--ink-2); font-size: 16px; line-height: 1;
}
.head .close:hover { border-color: var(--ink); color: var(--ink); }
.masthead-rule { height: 3px; margin: 12px 16px 0; background: var(--ink);
  border-bottom: 1px solid var(--ink); box-shadow: 0 3px 0 var(--paper), 0 4px 0 var(--ink); }

/* ---- Tabs — underlined -------------------------------------------------- */
.tabs { position: relative; z-index: 1; display: flex; gap: 20px; padding: 14px 16px 0; }
.tab {
  padding: 0 0 8px; border: none; background: transparent; cursor: pointer;
  font-family: var(--mono); font-size: 11.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 1.2px; color: var(--ink-3);
  border-bottom: 2px solid transparent;
}
.tab:hover { color: var(--ink-2); }
.tab.active { color: var(--ink); border-bottom-color: var(--spot); }

/* ---- Body --------------------------------------------------------------- */
.body {
  position: relative; z-index: 1; flex: 1; overflow-y: auto;
  overscroll-behavior: contain; border-top: 1px solid var(--rule);
  padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 11px;
}
.body::-webkit-scrollbar { width: 6px; }
.body::-webkit-scrollbar-thumb { background: var(--rule-strong); border-radius: 0; }

/* ---- Buttons ------------------------------------------------------------ */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  padding: 11px 16px; border-radius: 2px; cursor: pointer;
  font-family: var(--mono); font-size: 12px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1px;
  border: 1.5px solid var(--ink); transition: transform .08s ease, box-shadow .08s ease, background .12s ease;
}
.btn.primary { background: var(--ink); color: var(--paper); box-shadow: var(--shadow-sm); }
.btn.primary:active { transform: translate(3px,3px); box-shadow: 0 0 0 rgba(0,0,0,0); }
.btn.primary:disabled { opacity: .55; cursor: default; box-shadow: none; }
.btn.ghost { background: var(--paper); color: var(--ink); }
.btn.ghost:hover { background: var(--paper-2); }
.btn.danger { background: var(--paper); color: var(--spot); border-color: var(--spot); }
.btn.danger:hover { background: var(--spot); color: var(--paper); }
.btn.full { width: 100%; }
.btn.sm { padding: 6px 9px; font-size: 11px; letter-spacing: .6px; }

/* ---- Form fields -------------------------------------------------------- */
.row { display: flex; gap: 8px; align-items: center; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field label {
  font-family: var(--mono); font-size: 10px; font-weight: 600; color: var(--ink-2);
  text-transform: uppercase; letter-spacing: .8px;
}
.field input, .field select {
  width: 100%; padding: 9px 11px; border-radius: 2px; font-size: 13.5px;
  font-family: var(--sans); background: #fbf9f3; border: 1.5px solid var(--rule-strong);
  color: var(--ink); outline: none; appearance: none;
  transition: border-color .12s ease;
}
.field input::placeholder { color: var(--ink-3); }
.field input:focus, .field select:focus { border-color: var(--spot); }

input[type='checkbox'] {
  width: 20px; height: 20px; appearance: none; cursor: pointer; flex-shrink: 0;
  border: 1.5px solid var(--ink); border-radius: 2px; background: #fbf9f3;
  position: relative; outline: none;
}
input[type='checkbox']:checked { background: var(--ink); }
input[type='checkbox']:checked::after {
  content: '✓'; position: absolute; inset: 0; display: flex; align-items: center;
  justify-content: center; color: var(--paper); font-size: 13px; font-weight: 700;
}

/* Section title: label with a rule running to the edge */
.section-title {
  display: flex; align-items: center; gap: 10px; margin-top: 10px;
  font-family: var(--mono); font-size: 10.5px; font-weight: 700; color: var(--ink-2);
  text-transform: uppercase; letter-spacing: 1.4px; white-space: nowrap;
}
.section-title::after { content: ''; flex: 1; height: 1px; background: var(--rule); }
.section-title:first-child { margin-top: 0; }

/* ---- Sticky action footer (profile save) -------------------------------- */
.footbar {
  position: sticky; bottom: -16px; margin: 4px -16px -16px; padding: 12px 16px;
  background: var(--paper); border-top: 1.5px solid var(--ink);
}

/* ---- Report — a ledger -------------------------------------------------- */
.count-row { display: flex; gap: 14px; flex-wrap: wrap; padding-bottom: 3px;
  font-family: var(--mono); font-size: 11px; color: var(--ink-2); letter-spacing: .3px; }
.count-row b { color: var(--ink); font-weight: 700; }

.report-item {
  display: flex; gap: 10px; align-items: flex-start; padding: 9px 2px;
  border-bottom: 1px solid var(--rule); font-size: 13px;
}
.report-item:last-child { border-bottom: none; }
.badge {
  flex-shrink: 0; font-family: var(--mono); font-size: 9px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .8px; padding: 2px 5px; border-radius: 2px;
  border: 1.5px solid currentColor; margin-top: 1px;
}
.badge.filled { color: var(--ok); }
.badge.skipped { color: var(--ink-3); }
.badge.suggested { color: var(--warn); }
.badge.unmatched, .badge.error { color: var(--miss); }
.report-item .name { font-family: var(--serif); font-size: 14px; line-height: 1.2; }
.report-item .meta { font-family: var(--mono); color: var(--ink-3); font-size: 10.5px; margin-top: 2px; word-break: break-word; }
.report-item.act { cursor: pointer; }
.report-item.act:hover { background: var(--paper-2); }

.muted { font-family: var(--sans); color: var(--ink-2); font-size: 12.5px; line-height: 1.55; }

/* ---- Teach tags & picker ------------------------------------------------ */
.teach-tag {
  position: fixed; z-index: 2147483646; background: var(--ink); color: var(--paper);
  font-family: var(--mono); font-size: 9px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1px; padding: 2px 6px; border-radius: 2px; cursor: pointer;
  pointer-events: auto; border-left: 3px solid var(--spot); box-shadow: var(--shadow-sm);
}
.picker {
  position: fixed; inset: 0; z-index: 2147483647;
  display: flex; align-items: center; justify-content: center;
  background: rgba(25,23,18,0.35);
}
.picker-box {
  width: 340px; max-width: 92vw; max-height: 70vh; display: flex; flex-direction: column;
  overflow: hidden; background: var(--paper); border: 1.5px solid var(--ink);
  border-radius: 3px; box-shadow: var(--shadow);
}
.picker-main { display: flex; flex-direction: column; width: 100%; }
.picker-box input, .picker-box select {
  width: calc(100% - 24px); margin: 8px 12px; padding: 9px 11px;
  border-radius: 2px; font-size: 13px; font-family: var(--sans);
  background: #fbf9f3; border: 1.5px solid var(--rule-strong);
  color: var(--ink); outline: none; appearance: none;
  transition: border-color .12s ease;
}
.picker-box input:focus, .picker-box select:focus { border-color: var(--spot); }
.picker-create { display: none; flex-direction: column; width: 100%; padding: 12px 0; }
.picker-create.show { display: flex; }
.picker-create-title {
  margin: 0 12px 8px; font-family: var(--mono); font-size: 12px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1px; color: var(--ink-2);
}
.picker-actions { display: flex; gap: 6px; margin: 8px 12px 0; }
.field-error {
  margin: 4px 12px 0; font-family: var(--mono); font-size: 10.5px;
  letter-spacing: .3px; color: var(--spot);
}
.picker-list { overflow-y: auto; padding: 0 8px 10px; display: flex; flex-direction: column; }
.picker-opt { padding: 8px 10px; border-radius: 2px; cursor: pointer; border-bottom: 1px solid var(--rule); }
.picker-opt:last-child { border-bottom: none; }
.picker-opt:hover { background: var(--paper-2); }
.picker-opt .l { font-family: var(--serif); font-size: 14px; }
.picker-opt .k { font-family: var(--mono); font-size: 10px; color: var(--ink-3); }

/* ---- Toast — a rubber stamp --------------------------------------------- */
.toast {
  position: fixed; bottom: 132px; left: 50%; z-index: 2147483647;
  transform: translateX(-50%) rotate(-1.5deg);
  padding: 9px 16px; background: var(--paper); border: 2px solid var(--ink);
  border-radius: 2px; box-shadow: var(--shadow-sm);
  font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--ink);
  text-transform: uppercase; letter-spacing: .8px; white-space: nowrap;
  animation: fg-toast .18s ease;
}
@keyframes fg-toast { from { opacity: 0; transform: translateX(-50%) rotate(-1.5deg) translateY(5px); } }
`;

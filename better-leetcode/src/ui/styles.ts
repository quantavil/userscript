// Styles for the shadow-root UI (modal + toast). Palette follows LeetCode's dark/light themes.
export const CSS = `
:host{all:initial}
.wrap{
  --bg:#ffffff; --layer:#f7f8fa; --border:#e6e8eb; --text:#262626; --muted:#6b7280;
  --accent:#ffa116; --green:#2cbb5d; --red:#ef4743; --hover:rgba(0,0,0,.06); --shadow:0 12px 40px rgba(0,0,0,.25);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  font-size:14px; line-height:1.45; color:var(--text); text-align:left;
}
.wrap[data-theme="dark"]{
  --bg:#282828; --layer:#333333; --border:#3e3e3e; --text:#eff1f6; --muted:#9a9a9a;
  --hover:rgba(255,255,255,.08); --shadow:0 12px 40px rgba(0,0,0,.6);
}
*{box-sizing:border-box}
svg{display:block}

dialog.modal{width:min(460px,calc(100vw - 24px));max-height:calc(100dvh - 24px);margin:auto;padding:0;overflow:hidden;
  color:var(--text);background:var(--bg);border:1px solid var(--border);border-radius:10px;box-shadow:var(--shadow)}
dialog.modal[open]{display:flex;flex-direction:column}
dialog.modal::backdrop{background:rgba(0,0,0,.5)}
.head{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border)}
.head h2{margin:0;font-size:15px;font-weight:600}
.icon-btn{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border:0;border-radius:5px;background:transparent;color:var(--muted);cursor:pointer}
.icon-btn:hover{background:var(--hover);color:var(--text)}
.body{padding:8px 14px 12px;overflow:auto}
.section-title{display:block;margin:8px 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.03em;color:var(--muted)}
.card{background:var(--layer);border-radius:6px;border:1px solid var(--border);overflow:hidden}
.row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 10px;cursor:pointer}
.row:hover{background:var(--hover)}
.row + .row{border-top:1px solid var(--border)}
.row .txt{display:flex;flex-direction:column;min-width:0}
.row .label{font-size:13px;font-weight:500}
.row .desc{font-size:11px;color:var(--muted)}
.switch{appearance:none;-webkit-appearance:none;position:relative;flex:none;width:30px;height:18px;margin:0;border:0;border-radius:999px;background:#8a8a8a66;cursor:pointer;transition:background .15s}
.switch::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:transform .15s}
.switch:checked{background:var(--green)}
.switch:checked::after{transform:translateX(12px)}
.switch:focus-visible,.icon-btn:focus-visible,.btn:focus-visible,.num:focus-visible,textarea:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.num::-webkit-inner-spin-button,.num::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.num{-moz-appearance:textfield;appearance:textfield;width:44px;text-align:center;padding:3px 6px;border-radius:5px;border:1px solid var(--border);background:var(--bg);color:var(--text);font:inherit;font-size:12px}
.num:disabled{opacity:.45;cursor:not-allowed}
textarea{display:block;width:100%;min-height:64px;resize:vertical;padding:6px 8px;border-radius:6px;border:1px solid var(--border);background:var(--layer);color:var(--text);font:12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.hint{margin-top:4px;font-size:11px;color:var(--muted)}
.hint code{background:var(--layer);border:1px solid var(--border);border-radius:4px;padding:0 4px}
.foot{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:8px 14px;border-top:1px solid var(--border)}
.btn{padding:5px 14px;border-radius:6px;border:1px solid var(--border);background:var(--layer);color:var(--text);font:inherit;font-size:13px;font-weight:500;cursor:pointer}
.btn:hover{background:var(--hover)}
.btn.primary{background:var(--green);border-color:var(--green);color:#fff}
.btn.primary:hover{filter:brightness(1.08)}

.toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483647;display:flex;align-items:center;gap:8px;max-width:calc(100vw - 32px);padding:10px 14px;border-radius:10px;background:var(--layer);color:var(--text);border:1px solid var(--border);box-shadow:var(--shadow);animation:in .18s ease-out}
.toast.ok svg{color:var(--green)}
.toast.warn svg{color:var(--accent)}
.toast.error svg{color:var(--red)}
@keyframes in{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;

// Styles for the buttons injected into LeetCode's own DOM.
export const PAGE_CSS = `
.bl-copy{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;margin-left:8px;border:0;border-radius:6px;background:transparent;color:inherit;opacity:.55;cursor:pointer;vertical-align:middle;position:relative;top:-2px;transition:opacity .15s,background .15s,color .15s}
.bl-copy:hover{opacity:1;background:rgba(127,127,127,.2)}
.bl-copy:focus-visible{opacity:1;outline:2px solid #ffa116;outline-offset:1px}
.bl-copy[data-state="busy"]{opacity:.5;cursor:progress}
.bl-copy[data-state="done"]{opacity:1;color:#2cbb5d}
.bl-copy[data-state="error"]{opacity:1;color:#ef4743}
.bl-gear{display:inline-flex;align-items:center;justify-content:center}
@media (prefers-reduced-motion:reduce){.bl-copy{transition:none}}
`;

const cssVars = `
  --sae-bg: #0d0d0d;
  --sae-bg-light: #1a1a1a;
  --sae-bg-hover: #252525;
  --sae-border: rgba(255,255,255,.1);
  --sae-border-light: rgba(255,255,255,.06);
  --sae-border-focus: #4a9eff;
  --sae-text: #fff;
  --sae-text-muted: #888;
  --sae-text-dim: #666;
  --sae-accent: #4a9eff;
  --sae-accent-bg: rgba(74,158,255,.1);
  --sae-success: #22c55e;
  --sae-danger: #ef4444;
  --sae-r: 8px;
  --sae-r-sm: 6px;
  --sae-z: 2147483647;
`

const scroll = `scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.2) transparent`

const field = `
  background: var(--sae-bg-light);
  color: var(--sae-text);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: var(--sae-r);
  font: inherit;
  padding: 8px 10px;
`
const focus = `border-color:var(--sae-border-focus);outline:none;box-shadow:0 0 0 3px rgba(74,158,255,.12)`

export const STYLES = `
  .sae-palette *,.sae-ai-menu *,.sae-toast{box-sizing:border-box}
  :root{${cssVars}}

  /* Toast */
  .sae-toast{
    position:fixed;z-index:var(--sae-z);right:16px;bottom:16px;
    max-width:min(400px,85vw);border-radius:10px;
    background:rgba(17,17,17,.95);backdrop-filter:blur(12px);
    color:var(--sae-text);padding:10px 14px;
    font:13px/1.4 system-ui,sans-serif;
    border:1px solid var(--sae-border);
    box-shadow:0 8px 32px rgba(0,0,0,.3);
    white-space:pre-wrap;
  }

  /* Overlay */
  .sae-palette{
    all:initial;position:fixed;z-index:var(--sae-z);inset:0;
    display:none;align-items:center;justify-content:center;
    backdrop-filter:blur(3px);background:rgba(0,0,0,.4);
    font-family:system-ui,-apple-system,sans-serif;
  }
  .sae-palette.open{display:flex}

  /* Panel */
  .sae-panel{
    width:min(640px,94vw);max-height:80vh;overflow:hidden;
    background:var(--sae-bg);color:var(--sae-text);
    border:1px solid var(--sae-border);border-radius:14px;
    box-shadow:0 24px 80px rgba(0,0,0,.5);
    display:flex;flex-direction:column;font-size:13px;line-height:1.4;
  }
  .sae-panel-header{
    display:flex;align-items:center;gap:8px;
    padding:10px 12px;border-bottom:1px solid var(--sae-border-light);
  }

  /* Fields */
  .sae-search,.sae-input,.sae-textarea,.sae-item.editing input{${field}}
  .sae-search:focus,.sae-input:focus,.sae-textarea:focus,.sae-item.editing input:focus{${focus}}
  .sae-search{flex:1;width:auto}
  .sae-textarea{min-height:70px;resize:vertical;width:100%;max-width:100%}
  .sae-item.editing input{padding:6px 8px;flex:1;min-width:80px;border-radius:var(--sae-r-sm)}

  /* Icon Btn */
  .sae-icon-btn{
    padding:7px;border-radius:var(--sae-r);
    border:1px solid var(--sae-border);background:var(--sae-bg-light);
    color:var(--sae-text);cursor:pointer;display:flex;
    align-items:center;justify-content:center;
    transition:all .15s;flex-shrink:0;
  }
  .sae-icon-btn:hover{background:var(--sae-bg-hover);border-color:var(--sae-border-focus)}
  .sae-icon-btn svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}

  /* List */
  .sae-list{flex:1;overflow:auto;padding:6px;${scroll}}

  /* Item */
  .sae-item{
    display:grid;grid-template-columns:120px 1fr auto;gap:10px;
    padding:8px 10px;border-radius:var(--sae-r);
    border:1px solid transparent;cursor:pointer;
    align-items:center;transition:all .1s;
  }
  .sae-item:hover,.sae-item.active{background:var(--sae-bg-light);border-color:var(--sae-border-light)}
  .sae-key{font-weight:600;color:var(--sae-accent);word-break:break-all;font-size:12px}
  .sae-val{color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px}
  .sae-item-actions{display:flex;gap:4px}
  .sae-item-actions button{
    padding:3px 8px;border-radius:var(--sae-r-sm);
    border:1px solid rgba(255,255,255,.12);background:var(--sae-bg-light);
    color:var(--sae-text);cursor:pointer;font-size:11px;transition:all .1s;
  }
  .sae-item-actions button:hover{background:#2a2a2a;border-color:var(--sae-border-focus)}
  .sae-item.editing{
    background:#0f1a2a;border-color:#2563eb;
    display:flex;flex-wrap:wrap;gap:8px;
  }

  .sae-add-new{padding:10px;text-align:center;border-top:1px solid var(--sae-border-light)}
  .sae-add-new button{
    padding:8px 18px;border-radius:var(--sae-r);
    border:1px solid var(--sae-accent);background:var(--sae-accent-bg);
    color:var(--sae-accent);cursor:pointer;font-weight:600;font-size:12px;
    transition:all .15s;
  }
  .sae-add-new button:hover{background:rgba(74,158,255,.2)}

  .sae-footer{
    padding:8px 12px;border-top:1px solid var(--sae-border-light);
    color:var(--sae-text-dim);font-size:11px;
  }

  /* Settings toggle */
  .sae-panel.settings-open .sae-list,
  .sae-panel.settings-open .sae-add-new,
  .sae-panel.settings-open .sae-search{display:none}
  .sae-settings{display:none;flex:1;overflow:auto;padding:12px 14px;${scroll}}
  .sae-panel.settings-open .sae-settings{display:block}

  /* Settings — card-style sections */
  .sae-s-card{
    background:var(--sae-bg-light);border-radius:10px;
    border:1px solid var(--sae-border-light);
    padding:12px;margin-bottom:8px;
  }
  .sae-s-card:last-child{margin-bottom:0}
  .sae-s-title{
    font-size:11px;color:var(--sae-text-muted);text-transform:uppercase;
    letter-spacing:.4px;margin-bottom:10px;font-weight:600;
  }
  .sae-s-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .sae-s-row+.sae-s-row{margin-top:8px}
  .sae-s-row input{flex:1}
  .sae-s-label{color:var(--sae-text-muted);font-size:12px;min-width:50px}
  .sae-s-hint{font-size:10px;color:var(--sae-text-dim);margin-top:4px}
  .sae-s-sep{height:1px;background:var(--sae-border-light);margin:8px 0}
  .sae-chip{
    display:inline-flex;align-items:center;padding:5px 10px;
    border-radius:var(--sae-r);${field}
    color:#ccc;font-size:12px;border-color:var(--sae-accent);
    min-width:100px;justify-content:center;
  }

  /* Button */
  .sae-btn{
    padding:6px 12px;border-radius:var(--sae-r);
    border:1px solid rgba(255,255,255,.12);background:var(--sae-bg-light);
    color:var(--sae-text);cursor:pointer;font-size:12px;
    transition:all .15s;white-space:nowrap;flex-shrink:0;
  }
  .sae-btn:hover{background:var(--sae-bg-hover);border-color:var(--sae-border-focus)}
  .sae-btn.primary{background:#1d4ed8;border-color:#3b82f6}
  .sae-btn.primary:hover{background:#2563eb}
  .sae-btn.danger{background:#7f1d1d;border-color:var(--sae-danger)}
  .sae-btn.danger:hover{background:#991b1b}
  .sae-btn.sm{padding:4px 8px;font-size:11px}
  .sae-btn:disabled{opacity:.5;cursor:not-allowed}

  /* Prompt list */
  .sae-p-list{display:flex;flex-direction:column;gap:3px}
  .sae-p-item{
    display:flex;align-items:center;gap:6px;padding:6px 8px;
    border-radius:var(--sae-r-sm);border:1px solid rgba(255,255,255,.05);
    transition:background .1s;
  }
  .sae-p-item:hover{background:rgba(255,255,255,.03)}
  .sae-p-item .p-icon{font-size:14px;width:20px;text-align:center;flex-shrink:0}
  .sae-p-item .p-name{font-size:12px;font-weight:500;min-width:70px}
  .sae-p-item .p-text{
    flex:1;color:var(--sae-text-dim);font-size:10px;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  }
  .sae-p-item .p-acts{display:flex;gap:3px;align-items:center;margin-left:auto}
  .sae-p-item.disabled{opacity:.4}
  .sae-p-item.bi{border-left:2px solid rgba(74,158,255,.3)}
  .sae-p-item.editing{flex-direction:column;align-items:stretch;gap:6px;border-color:#3b82f6}

  .sae-p-edit{display:flex;flex-direction:column;gap:6px;width:100%}
  .sae-p-edit-r{display:flex;gap:6px;align-items:center}
  .sae-p-edit-r .icon-input{width:44px;text-align:center;font-size:14px}
  .sae-p-edit-r .label-input{flex:1}
  .sae-p-edit-a{display:flex;gap:6px;justify-content:flex-end}

  /* Toggle */
  .sae-toggle{
    position:relative;width:32px;height:18px;background:#333;
    border-radius:9px;cursor:pointer;transition:background .2s;
    flex-shrink:0;border:1px solid var(--sae-border);
  }
  .sae-toggle.on{background:var(--sae-success);border-color:var(--sae-success)}
  .sae-toggle::after{
    content:'';position:absolute;top:2px;left:2px;
    width:12px;height:12px;background:var(--sae-text);
    border-radius:50%;transition:transform .2s;
  }
  .sae-toggle.on::after{transform:translateX(14px)}

  .sae-empty{
    color:var(--sae-text-dim);padding:10px;text-align:center;font-size:11px;
    border:1px dashed var(--sae-border);border-radius:var(--sae-r);
  }

  /* ── AI Menu ── */
  .sae-ai-menu{
    position:fixed;z-index:var(--sae-z);
    background:var(--sae-bg);border:1px solid rgba(255,255,255,.12);
    border-radius:12px;box-shadow:0 16px 64px rgba(0,0,0,.5);
    padding:8px;font:13px/1.4 system-ui,sans-serif;
    width:320px;max-width:90vw;max-height:80vh;overflow-y:auto;
    opacity:0;pointer-events:none;
    transform:scale(.96) translateY(-4px);
    transition:opacity .15s,transform .15s;
    ${scroll}
  }
  .sae-ai-menu.open{opacity:1;pointer-events:auto;transform:scale(1) translateY(0)}
  .sae-ai-menu.above{transform-origin:bottom center}
  .sae-ai-menu.below{transform-origin:top center}

  .sae-ai-preview{
    padding:6px 8px;margin-bottom:6px;
    background:var(--sae-bg-light);border-radius:var(--sae-r);
    color:#888;font-size:11px;line-height:1.4;
    border:1px solid var(--sae-border-light);
    word-break:break-word;
  }

  .sae-ai-pills{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px}
  .sae-ai-pill{
    display:inline-flex;align-items:center;gap:5px;
    padding:7px 10px;border-radius:var(--sae-r);
    background:var(--sae-bg-light);border:1px solid rgba(255,255,255,.1);
    color:var(--sae-text);cursor:pointer;font-size:12px;
    font-weight:500;transition:all .12s;white-space:nowrap;
  }
  .sae-ai-pill:hover,.sae-ai-pill.active{
    background:var(--sae-bg-hover);border-color:var(--sae-border-focus);
    transform:translateY(-1px);
  }
  .sae-ai-pill .icon{font-size:13px}
  .sae-ai-pill .key{color:var(--sae-accent);font-size:9px;font-weight:700;opacity:.7}

  .sae-ai-divider{height:1px;background:rgba(255,255,255,.06);margin:6px 0}
  .sae-ai-toggle{
    display:flex;align-items:center;justify-content:center;gap:4px;
    padding:5px;color:var(--sae-text-muted);cursor:pointer;font-size:11px;
    border-radius:var(--sae-r);transition:all .15s;border:1px solid transparent;
  }
  .sae-ai-toggle:hover{color:var(--sae-text);background:var(--sae-bg-light);border-color:var(--sae-border)}
  .sae-ai-custom-label{font-size:9px;color:var(--sae-text-dim);padding:3px 6px;text-transform:uppercase;letter-spacing:.5px}

  .sae-ai-menu.loading .sae-ai-pills{opacity:.5;pointer-events:none}
  .sae-ai-loading{display:none;align-items:center;gap:8px;padding:10px;color:var(--sae-accent);justify-content:center;font-size:12px}
  .sae-ai-menu.loading .sae-ai-loading{display:flex}
  .sae-ai-spinner{
    width:14px;height:14px;
    border:2px solid rgba(74,158,255,.3);border-top-color:var(--sae-accent);
    border-radius:50%;animation:sae-spin 1s linear infinite;
  }
  @keyframes sae-spin{to{transform:rotate(360deg)}}
`
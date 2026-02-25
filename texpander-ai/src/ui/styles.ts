const cssVars = `
  --sae-bg: #151517;
  --sae-bg-light: #18181a;
  --sae-bg-hover: rgba(255, 255, 255, 0.04);
  --sae-border: rgba(255, 255, 255, 0.04);
  --sae-border-light: rgba(255, 255, 255, 0.02);
  --sae-border-focus: #84a59d;
  --sae-text: #d4d4d8;
  --sae-text-muted: #a1a1aa;
  --sae-text-dim: #71717a;
  --sae-accent: #84a59d;
  --sae-accent-bg: rgba(132, 165, 157, 0.1);
  --sae-success: #84a59d;
  --sae-danger: #e28484;
  --sae-r: 10px;
  --sae-r-sm: 6px;
  --sae-z: 2147483647;
`

const scroll = `scrollbar-width:none;`

const field = `
  background: rgba(255, 255, 255, 0.03);
  color: var(--sae-text);
  border: 1px solid transparent;
  border-radius: var(--sae-r);
  font: inherit;
  padding: 10px 14px;
`
const focus = `border-color:var(--sae-border-focus);outline:none;background:rgba(255,255,255,0.05)`

export const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Newsreader:ital,opsz,wght@1,6..72,400;1,6..72,500&display=swap');
  
  .sae-palette *,.sae-ai-menu *,.sae-toast{box-sizing:border-box}
  :root{${cssVars}}

  /* Toast */
  .sae-toast{
    position:fixed;z-index:var(--sae-z);right:24px;bottom:24px;
    max-width:min(400px,85vw);border-radius:12px;
    background:rgba(21, 21, 23, 0.95);backdrop-filter:blur(24px);
    color:var(--sae-text);padding:14px 20px;
    font:14px/1.5 'Inter',system-ui,sans-serif;
    border:1px solid var(--sae-border);
    box-shadow:0 10px 40px -10px rgba(0,0,0,0.5);
    white-space:pre-wrap;font-weight:400;letter-spacing:0.3px;
  }

  /* Overlay */
  .sae-palette{
    all:initial;position:fixed;z-index:var(--sae-z);inset:0;
    display:none;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.5);backdrop-filter:blur(5px);
    font-family:'Inter',system-ui,sans-serif;
  }
  .sae-palette.open{display:flex}

  /* Panel */
  .sae-panel{
    width:min(640px,94vw);max-height:85vh;overflow:hidden;
    background:rgba(21, 21, 23, 0.95);backdrop-filter:blur(20px);
    color:var(--sae-text);border:1px solid var(--sae-border);
    border-radius:16px;box-shadow:0 30px 80px -20px rgba(0,0,0,0.7);
    display:flex;flex-direction:column;font-size:14px;line-height:1.5;
  }
  .sae-panel-header{
    display:flex;align-items:center;gap:12px;
    padding:16px 20px;border-bottom:1px solid var(--sae-border-light);
  }
  .sae-icon-btn[data-action="settings"],
  .sae-icon-btn[data-action="back"] {
    margin-left: auto;
  }

  /* Hide scrollbars globally for custom scroll areas */
  .sae-list::-webkit-scrollbar, .sae-settings::-webkit-scrollbar, .sae-ai-menu::-webkit-scrollbar { display: none; }

  /* Fields */
  .sae-search,.sae-input,.sae-textarea,.sae-item.editing input{${field}}
  .sae-search:focus,.sae-input:focus,.sae-textarea:focus,.sae-item.editing input:focus{${focus}}
  .sae-search{flex:1;width:auto;font-size:15px}
  .sae-textarea{min-height:90px;resize:vertical;width:100%;max-width:100%}
  .sae-item.editing input{padding:8px 12px;flex:1;min-width:80px;border-radius:var(--sae-r-sm)}

  /* Icon Btn */
  .sae-icon-btn{
    padding:8px;border-radius:var(--sae-r);
    border:none;background:transparent;
    color:var(--sae-text-dim);cursor:pointer;display:flex;
    align-items:center;justify-content:center;
    transition:all .2s;flex-shrink:0;
  }
  .sae-icon-btn:hover{background:var(--sae-bg-hover);color:var(--sae-text)}
  .sae-icon-btn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}

  /* List */
  .sae-list{flex:1;overflow:auto;padding:12px;${scroll}}

  /* Item */
  .sae-item{
    display:grid;grid-template-columns:140px 1fr auto;gap:16px;
    padding:14px 16px;border-radius:var(--sae-r);
    border:1px solid transparent;cursor:pointer;
    align-items:center;
    margin-bottom:4px;
  }
  .sae-item.active{background:var(--sae-bg-hover)}
  .sae-key{font-weight:500;color:var(--sae-text);word-break:break-all;font-size:13px;letter-spacing:0.2px;}
  .sae-item.active .sae-key{font-weight:600;color:#fff}
  .sae-val{color:var(--sae-text-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px}
  .sae-item-actions{display:flex;gap:8px;opacity:0;transition:opacity .05s}
  .sae-item.active .sae-item-actions{opacity:1}
  .sae-item-actions button{
    padding:4px 10px;border-radius:var(--sae-r-sm);
    border:none;background:var(--sae-bg-light);
    color:var(--sae-text-dim);cursor:pointer;font-size:12px;transition:all .05s;
  }
  .sae-item-actions button:hover{background:var(--sae-bg-hover);color:var(--sae-text)}
  
  .sae-item.editing{
    background:rgba(255,255,255,0.02);border-color:var(--sae-border-light);
    display:flex;flex-wrap:wrap;gap:12px;padding:16px;
  }

  .sae-add-new{padding:16px;text-align:center}
  .sae-add-new button{
    padding:10px 24px;border-radius:var(--sae-r);
    border:1px solid transparent;background:var(--sae-accent-bg);
    color:var(--sae-accent);cursor:pointer;font-weight:500;font-size:13px;
    letter-spacing:0.3px;transition:all .2s;
  }
  .sae-add-new button:hover{background:rgba(132, 165, 157, 0.15)}

  .sae-footer{
    padding:16px 20px;
    color:var(--sae-text-dim);font-size:11px;letter-spacing:1px;
    text-transform:uppercase;text-align:center;
  }

  /* Settings toggle */
  .sae-panel.settings-open .sae-list,
  .sae-panel.settings-open .sae-add-new,
  .sae-panel.settings-open .sae-search{display:none}
  .sae-settings{display:none;flex:1;overflow:auto;padding:24px;${scroll}}
  .sae-panel.settings-open .sae-settings{display:block}

  /* Settings — Neo Zen unboxed sections */
  .sae-s-card{
    background:transparent;border:none;
    padding:0 0 32px 0;margin:0;
  }
  .sae-s-title{
    font-size:10px;color:var(--sae-text-dim);text-transform:uppercase;
    letter-spacing:2px;margin-bottom:16px;font-weight:600;
  }
  .sae-s-row{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
  .sae-s-row+.sae-s-row{margin-top:16px}
  .sae-s-row input{flex:1}
  .sae-s-label{color:var(--sae-text-muted);font-size:13px;min-width:80px}
  .sae-s-hint{font-size:12px;color:var(--sae-text-dim);margin-top:10px;font-style:italic}
  .sae-s-sep{height:1px;background:var(--sae-border-light);margin:32px 0}
  .sae-chip{
    display:inline-flex;align-items:center;padding:8px 16px;
    border-radius:var(--sae-r);${field}
    color:var(--sae-text);font-size:13px;font-family:monospace;letter-spacing:0.5px;
    min-width:120px;justify-content:center;
  }

  /* Button */
  .sae-btn{
    padding:10px 16px;border-radius:var(--sae-r);
    border:none;background:var(--sae-bg-light);
    color:var(--sae-text);cursor:pointer;font-size:13px;font-weight:500;
    transition:all .2s;white-space:nowrap;flex-shrink:0;letter-spacing:0.3px;
  }
  .sae-btn:hover{background:var(--sae-bg-hover)}
  .sae-btn.primary{background:var(--sae-accent-bg);color:var(--sae-accent)}
  .sae-btn.primary:hover{background:rgba(132,165,157,0.2)}
  .sae-btn.danger{background:rgba(226,132,132,0.1);color:var(--sae-danger)}
  .sae-btn.danger:hover{background:rgba(226,132,132,0.2)}
  .sae-btn.sm{padding:6px 12px;font-size:12px}
  .sae-btn:disabled{opacity:.4;cursor:not-allowed}

  /* Prompt list */
  .sae-p-list{display:flex;flex-direction:column;gap:8px}
  .sae-p-item{
    display:flex;align-items:center;gap:16px;padding:12px 16px;
    border-radius:var(--sae-r);border:none;background:rgba(255,255,255,0.015);
    transition:background .2s;
  }
  .sae-p-item:hover{background:var(--sae-bg-hover)}
  .sae-p-item .p-icon{display:none}
  .sae-p-item .p-name{font-size:13px;font-weight:500;min-width:100px;color:var(--sae-text);letter-spacing:0.3px}
  .sae-p-item .p-text{
    flex:1;color:var(--sae-text-dim);font-size:12px;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  }
  .sae-p-item .p-acts{display:flex;gap:12px;align-items:center;margin-left:auto}
  .sae-p-item.disabled{opacity:.4}
  .sae-p-item.editing{flex-direction:column;align-items:stretch;gap:16px;background:rgba(255,255,255,0.03)}

  .sae-p-edit{display:flex;flex-direction:column;gap:12px;width:100%}
  .sae-p-edit-r{display:flex;gap:12px;align-items:center}
  .sae-p-edit-r .icon-input{display:none}
  .sae-p-edit-r .label-input{flex:1}
  .sae-p-edit-a{display:flex;gap:12px;justify-content:flex-end}

  /* Toggle (Neo Zen) */
  .sae-toggle{
    position:relative;width:34px;height:20px;background:rgba(255,255,255,0.1);
    border-radius:10px;cursor:pointer;transition:background .3s;
    flex-shrink:0;border:none;
  }
  .sae-toggle.on{background:var(--sae-success)}
  .sae-toggle::after{
    content:'';position:absolute;top:3px;left:3px;
    width:14px;height:14px;background:var(--sae-bg);
    border-radius:50%;transition:transform .3s cubic-bezier(0.4, 0.0, 0.2, 1);
  }
  .sae-toggle.on::after{transform:translateX(14px);background:var(--sae-bg)}

  .sae-empty{
    color:var(--sae-text-dim);padding:24px;text-align:center;font-size:13px;
    border:none;font-style:italic;
  }

  /* ── AI Menu ── */
  .sae-ai-menu{
    position:fixed;z-index:var(--sae-z);
    background:rgba(24, 24, 26, 0.85);backdrop-filter:blur(24px);
    border:1px solid var(--sae-border-light);
    border-radius:16px;box-shadow:0 24px 60px -10px rgba(0,0,0,0.7);
    padding:12px;font:14px/1.5 'Inter',system-ui,sans-serif;
    width:360px;max-width:90vw;max-height:80vh;overflow-y:auto;
    opacity:0;pointer-events:none;
    transform:scale(.98) translateY(-4px);
    transition:opacity .2s ease-out,transform .2s ease-out;
    ${scroll}
  }
  .sae-ai-menu.open{opacity:1;pointer-events:auto;transform:scale(1) translateY(0)}
  .sae-ai-menu.above{transform-origin:bottom center}
  .sae-ai-menu.below{transform-origin:top center}

  .sae-ai-preview{
    padding:16px 20px;margin:0 -12px 12px -12px;
    background:transparent;
    color:var(--sae-text);font-size:15px;line-height:1.6;
    border-bottom:1px solid var(--sae-border-light);
    word-break:break-word;font-family:'Newsreader',serif;font-style:italic;
    letter-spacing:0.2px;
  }

  .sae-ai-pills{display:flex;flex-direction:column;gap:2px;margin-bottom:8px}
  .sae-ai-pill{
    display:flex;align-items:center;justify-content:space-between;
    padding:10px 14px;border-radius:var(--sae-r);
    background:transparent;border:none;
    color:var(--sae-text);cursor:pointer;font-size:13px;
    font-weight:400;
  }
  .sae-ai-pill.active{
    background:rgba(255,255,255,0.03);
  }
  .sae-ai-pill .icon{display:none} /* Hide emojis */
  .sae-ai-pill .label-text{letter-spacing:0.4px;}
  .sae-ai-pill.active .label-text{font-weight:600;color:#fff;}
  .sae-ai-pill .key{
    color:var(--sae-text-dim);font-size:10px;font-family:monospace;
    font-weight:500;opacity:0;transition:opacity .05s;
  }
  .sae-ai-pill.active .key{opacity:1;color:var(--sae-text-muted)}

  .sae-ai-divider{height:1px;background:var(--sae-border-light);margin:12px 0}
  .sae-ai-toggle{
    display:flex;align-items:center;justify-content:center;
    padding:10px;color:var(--sae-text-dim);cursor:pointer;font-size:11px;
    border-radius:var(--sae-r);transition:all .2s;border:none;
    text-transform:uppercase;letter-spacing:1px;
  }
  .sae-ai-toggle:hover{color:var(--sae-text)}
  .sae-ai-custom-label{font-size:9px;color:var(--sae-text-dim);padding:0 14px 8px 14px;text-transform:uppercase;letter-spacing:2px}

  .sae-ai-menu.loading .sae-ai-pills{opacity:.4;pointer-events:none}
  .sae-ai-loading{display:none;align-items:center;gap:12px;padding:16px;color:var(--sae-text-muted);justify-content:center;font-size:13px;letter-spacing:0.5px}
  .sae-ai-menu.loading .sae-ai-loading{display:flex}
  .sae-ai-spinner{
    width:16px;height:16px;
    border:2px solid transparent;border-top-color:var(--sae-text-muted);border-left-color:var(--sae-text-muted);
    border-radius:50%;animation:sae-spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  }
`
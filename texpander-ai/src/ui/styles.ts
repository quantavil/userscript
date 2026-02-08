export const STYLES = `
  .sae-palette *,.sae-ai-menu *,.sae-toast{box-sizing:border-box}
  .sae-toast{position:fixed;z-index:2147483647;max-width:min(480px,85vw);box-shadow:0 8px 32px rgba(0,0,0,.28);border-radius:12px;background:rgba(17,17,17,.95);backdrop-filter:blur(12px);color:#fff;padding:12px 16px;font:13px/1.4 system-ui,-apple-system,sans-serif;white-space:pre-wrap;border:1px solid rgba(255,255,255,.08)}
  .sae-palette{all:initial;position:fixed;z-index:2147483647;inset:0;display:none;align-items:center;justify-content:center;backdrop-filter:blur(3px);background:rgba(0,0,0,.4);font-family:system-ui,-apple-system,sans-serif}
  .sae-palette.open{display:flex}
  .sae-panel{width:min(680px,94vw);max-height:80vh;overflow:hidden;background:#0d0d0d;color:#fff;border:1px solid rgba(255,255,255,.1);border-radius:14px;box-shadow:0 24px 80px rgba(0,0,0,.5);display:flex;flex-direction:column;font-size:13px;line-height:1.4}
  .sae-panel-header{display:flex;align-items:center;gap:8px;padding:12px;border-bottom:1px solid rgba(255,255,255,.06)}
  .sae-search{flex:1;background:#1a1a1a;color:#fff;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:10px 12px;outline:none;font:inherit}
  .sae-search:focus{border-color:#4a9eff;box-shadow:0 0 0 3px rgba(74,158,255,.15)}
  .sae-icon-btn{padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:#1a1a1a;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0}
  .sae-icon-btn:hover{background:#252525;border-color:#4a9eff}
  .sae-icon-btn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .sae-list{flex:1;overflow:auto;padding:8px}
  .sae-item{display:grid;grid-template-columns:140px 1fr auto;gap:12px;padding:10px 12px;border-radius:8px;border:1px solid transparent;cursor:pointer;align-items:center;transition:all .1s}
  .sae-item:hover,.sae-item.active{background:#1a1a1a;border-color:rgba(255,255,255,.06)}
  .sae-key{font-weight:600;color:#4a9eff;word-break:break-all}
  .sae-val{color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sae-item-actions{display:flex;gap:4px}
  .sae-item-actions button{padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.15);background:#1a1a1a;color:#fff;cursor:pointer;font-size:11px;transition:all .1s}
  .sae-item-actions button:hover{background:#2a2a2a;border-color:#4a9eff}
  .sae-item.editing{background:#0f1a2a;border-color:#2563eb;display:flex;flex-wrap:wrap;gap:8px}
  .sae-item.editing input{background:#0a0a0a;color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:6px;padding:6px 8px;font:inherit;flex:1;min-width:100px}
  .sae-item.editing input:focus{border-color:#4a9eff;outline:none}
  .sae-add-new{padding:12px;text-align:center;border-top:1px solid rgba(255,255,255,.06)}
  .sae-add-new button{padding:10px 20px;border-radius:8px;border:1px solid #4a9eff;background:rgba(74,158,255,.1);color:#4a9eff;cursor:pointer;font-weight:600;transition:all .15s}
  .sae-add-new button:hover{background:rgba(74,158,255,.2)}
  .sae-footer{padding:10px 12px;border-top:1px solid rgba(255,255,255,.06);color:#666;font-size:12px}
  .sae-panel.settings-open .sae-list,.sae-panel.settings-open .sae-add-new,.sae-panel.settings-open .sae-search{display:none}
  .sae-settings{display:none;flex:1;overflow:auto;padding:16px}
  .sae-panel.settings-open .sae-settings{display:block}
  .sae-hrow{padding:16px 0;border-bottom:1px solid rgba(255,255,255,.06)}
  .sae-hrow:last-child{border-bottom:none}
  .sae-hrow-label{color:#fff;font-weight:600;font-size:14px;margin-bottom:10px}
  .sae-hrow-content{display:flex;flex-direction:column;gap:10px}
  .sae-input,.sae-textarea{background:#1a1a1a;color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:10px 12px;font:inherit;width:100%;max-width:100%}
  .sae-input:focus,.sae-textarea:focus{border-color:#4a9eff;outline:none;box-shadow:0 0 0 3px rgba(74,158,255,.15)}
  .sae-textarea{min-height:80px;resize:vertical}
  .sae-help{font-size:11px;color:#666;margin-top:4px}
  .sae-btn{padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:#1a1a1a;color:#fff;cursor:pointer;font-size:13px;transition:all .15s;white-space:nowrap;flex-shrink:0}
  .sae-btn:hover{background:#252525;border-color:#4a9eff}
  .sae-btn.primary{background:#1d4ed8;border-color:#3b82f6;color:#fff}
  .sae-btn.primary:hover{background:#2563eb}
  .sae-btn.success{background:#166534;border-color:#22c55e}
  .sae-btn.danger{background:#7f1d1d;border-color:#ef4444}
  .sae-btn.danger:hover{background:#991b1b}
  .sae-btn.sm{padding:6px 10px;font-size:12px}
  .sae-btn:disabled{opacity:.5;cursor:not-allowed}
  .sae-chip{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;background:#1a1a1a;border:1px solid rgba(255,255,255,.15);color:#ddd;font-size:13px}
  .sae-btn-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .sae-hk-row{display:flex;gap:16px;flex-wrap:wrap;align-items:center}
  .sae-hk-item{display:flex;align-items:center;gap:8px}
  .sae-hk-item .sae-chip{border-color:#4a9eff;min-width:140px;justify-content:center}
  .sae-inline-row{display:flex;align-items:center;gap:12px}
  .sae-inline-row input[type="number"]{width:80px;text-align:center}
  .sae-prompt-section{margin-top:8px}
  .sae-prompt-section-title{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,.06)}
  .sae-prompt-list{display:flex;flex-direction:column;gap:6px}
  .sae-prompt-item{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#1a1a1a;border-radius:8px;border:1px solid rgba(255,255,255,.08)}
  .sae-prompt-item .icon{font-size:18px;width:28px;text-align:center;flex-shrink:0}
  .sae-prompt-item .label{font-weight:500;min-width:100px;color:#fff}
  .sae-prompt-item .prompt-text{flex:1;color:#666;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sae-prompt-item .actions{display:flex;gap:6px;align-items:center;margin-left:auto}
  .sae-prompt-item.disabled{opacity:.5}
  .sae-prompt-item.builtin{border-color:rgba(74,158,255,.2)}
  .sae-prompt-item.builtin .label::after{content:'Built-in';font-size:9px;background:#1d4ed8;color:#fff;padding:2px 6px;border-radius:4px;margin-left:8px;font-weight:400}
  .sae-prompt-item.editing{flex-direction:column;align-items:stretch;gap:10px;border-color:#3b82f6}
  .sae-prompt-edit-form{display:flex;flex-direction:column;gap:10px;width:100%}
  .sae-prompt-edit-row{display:flex;gap:8px;align-items:center}
  .sae-prompt-edit-row .icon-input{width:60px;text-align:center;font-size:16px}
  .sae-prompt-edit-row .label-input{flex:1}
  .sae-prompt-edit-actions{display:flex;gap:8px;justify-content:flex-end}
  .sae-toggle{position:relative;width:44px;height:24px;background:#333;border-radius:12px;cursor:pointer;transition:background .2s;flex-shrink:0;border:1px solid rgba(255,255,255,.1)}
  .sae-toggle.on{background:#22c55e;border-color:#22c55e}
  .sae-toggle::after{content:'';position:absolute;top:2px;left:2px;width:18px;height:18px;background:#fff;border-radius:50%;transition:transform .2s}
  .sae-toggle.on::after{transform:translateX(20px)}
  .sae-empty{color:#666;padding:16px;text-align:center;background:#1a1a1a;border-radius:8px;border:1px dashed rgba(255,255,255,.1)}
  .sae-ai-menu{position:fixed;z-index:2147483647;background:#0d0d0d;border:1px solid rgba(255,255,255,.12);border-radius:14px;box-shadow:0 16px 64px rgba(0,0,0,.5);padding:10px;font:13px/1.4 system-ui,-apple-system,sans-serif;min-width:200px;max-width:90vw;opacity:0;transform:scale(.96) translateY(-4px);transition:opacity .15s,transform .15s}
  .sae-ai-menu.open{opacity:1;transform:scale(1) translateY(0)}
  .sae-ai-menu.above{transform-origin:bottom center}
  .sae-ai-menu.below{transform-origin:top center}
  .sae-ai-preview{padding:10px 12px;margin-bottom:8px;background:#1a1a1a;border-radius:10px;color:#999;font-size:12px;line-height:1.5;border:1px solid rgba(255,255,255,.06);word-break:break-word;max-width:500px}
  .sae-ai-pills{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
  .sae-ai-pill{display:inline-flex;align-items:center;gap:6px;padding:10px 14px;border-radius:10px;background:#1a1a1a;border:1px solid rgba(255,255,255,.1);color:#fff;cursor:pointer;font-size:13px;font-weight:500;transition:all .12s;white-space:nowrap}
  .sae-ai-pill:hover,.sae-ai-pill.active{background:#252525;border-color:#4a9eff;transform:translateY(-1px)}
  .sae-ai-pill .icon{font-size:15px}
  .sae-ai-pill .key{color:#4a9eff;font-size:10px;font-weight:700;opacity:.7}
  .sae-ai-divider{height:1px;background:rgba(255,255,255,.08);margin:8px 0}
  .sae-ai-toggle{display:flex;align-items:center;justify-content:center;gap:4px;padding:8px;color:#888;cursor:pointer;font-size:12px;border-radius:8px;transition:all .15s;border:1px solid transparent}
  .sae-ai-toggle:hover{color:#fff;background:#1a1a1a;border-color:rgba(255,255,255,.1)}
  .sae-ai-custom-label{font-size:10px;color:#666;padding:4px 8px;text-transform:uppercase;letter-spacing:.5px}
  .sae-ai-menu.loading .sae-ai-pills{opacity:.5;pointer-events:none}
  .sae-ai-loading{display:none;align-items:center;gap:8px;padding:12px;color:#4a9eff;justify-content:center}
  .sae-ai-menu.loading .sae-ai-loading{display:flex}
  .sae-ai-spinner{width:16px;height:16px;border:2px solid rgba(74,158,255,.3);border-top-color:#4a9eff;border-radius:50%;animation:sae-spin 1s linear infinite}
  @keyframes sae-spin{to{transform:rotate(360deg)}}
`
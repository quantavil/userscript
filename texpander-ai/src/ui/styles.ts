// ─────────────────────────────────────────────────────────────
// CSS Variables & Shared Styles
// ─────────────────────────────────────────────────────────────

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
  --sae-radius-sm: 6px;
  --sae-radius: 8px;
  --sae-radius-lg: 12px;
  --sae-radius-xl: 14px;
  --sae-shadow: 0 8px 32px rgba(0,0,0,.28);
  --sae-shadow-lg: 0 24px 80px rgba(0,0,0,.5);
  --sae-z: 2147483647;
  --sae-font: 13px/1.4 system-ui,-apple-system,sans-serif;
`

// Reusable scrollbar mixin
const scrollbar = `
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,.2) transparent;
  &::-webkit-scrollbar { width: 6px }
  &::-webkit-scrollbar-track { background: transparent }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,.2); border-radius: 3px }
  &::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.3) }
`

// ─────────────────────────────────────────────────────────────
// Exported Styles
// ─────────────────────────────────────────────────────────────

export const STYLES = `
  .sae-palette *,.sae-ai-menu *,.sae-toast { box-sizing: border-box }
  
  :root { ${cssVars} }
  
  /* Utility classes */
  .sae-mt-sm { margin-top: 10px }
  .sae-mt-md { margin-top: 16px }
  .sae-row-flex { display: flex; gap: 8px }
  .sae-row-flex > input { flex: 1 }
  
  /* Toast */
  .sae-toast {
    position: fixed;
    z-index: var(--sae-z);
    right: 16px;
    bottom: 16px;
    max-width: min(480px, 85vw);
    box-shadow: var(--sae-shadow);
    border-radius: var(--sae-radius-lg);
    background: rgba(17,17,17,.95);
    backdrop-filter: blur(12px);
    color: var(--sae-text);
    padding: 12px 16px;
    font: var(--sae-font);
    white-space: pre-wrap;
    border: 1px solid var(--sae-border);
  }
  
  /* Palette Overlay */
  .sae-palette {
    all: initial;
    position: fixed;
    z-index: var(--sae-z);
    inset: 0;
    display: none;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(3px);
    background: rgba(0,0,0,.4);
    font-family: system-ui,-apple-system,sans-serif;
  }
  .sae-palette.open { display: flex }
  
  /* Panel */
  .sae-panel {
    width: min(680px, 94vw);
    max-height: 80vh;
    overflow: hidden;
    background: var(--sae-bg);
    color: var(--sae-text);
    border: 1px solid var(--sae-border);
    border-radius: var(--sae-radius-xl);
    box-shadow: var(--sae-shadow-lg);
    display: flex;
    flex-direction: column;
    font-size: 13px;
    line-height: 1.4;
  }
  
  .sae-panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border-bottom: 1px solid var(--sae-border-light);
  }
  
  /* Search */
  .sae-search {
    flex: 1;
    background: var(--sae-bg-light);
    color: var(--sae-text);
    border: 1px solid var(--sae-border);
    border-radius: var(--sae-radius);
    padding: 10px 12px;
    outline: none;
    font: inherit;
  }
  .sae-search:focus {
    border-color: var(--sae-border-focus);
    box-shadow: 0 0 0 3px rgba(74,158,255,.15);
  }
  
  /* Icon Button */
  .sae-icon-btn {
    padding: 8px;
    border-radius: var(--sae-radius);
    border: 1px solid var(--sae-border);
    background: var(--sae-bg-light);
    color: var(--sae-text);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all .15s;
    flex-shrink: 0;
  }
  .sae-icon-btn:hover {
    background: var(--sae-bg-hover);
    border-color: var(--sae-border-focus);
  }
  .sae-icon-btn svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  
  /* List */
  .sae-list {
    flex: 1;
    overflow: auto;
    padding: 8px;
    ${scrollbar}
  }
  
  /* Item */
  .sae-item {
    display: grid;
    grid-template-columns: 140px 1fr auto;
    gap: 12px;
    padding: 10px 12px;
    border-radius: var(--sae-radius);
    border: 1px solid transparent;
    cursor: pointer;
    align-items: center;
    transition: all .1s;
  }
  .sae-item:hover, .sae-item.active {
    background: var(--sae-bg-light);
    border-color: var(--sae-border-light);
  }
  .sae-key {
    font-weight: 600;
    color: var(--sae-accent);
    word-break: break-all;
  }
  .sae-val {
    color: #aaa;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  /* Item Actions */
  .sae-item-actions {
    display: flex;
    gap: 4px;
  }
  .sae-item-actions button {
    padding: 4px 10px;
    border-radius: var(--sae-radius-sm);
    border: 1px solid rgba(255,255,255,.15);
    background: var(--sae-bg-light);
    color: var(--sae-text);
    cursor: pointer;
    font-size: 11px;
    transition: all .1s;
  }
  .sae-item-actions button:hover {
    background: #2a2a2a;
    border-color: var(--sae-border-focus);
  }
  
  /* Editing State */
  .sae-item.editing {
    background: #0f1a2a;
    border-color: #2563eb;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .sae-item.editing input {
    background: #0a0a0a;
    color: var(--sae-text);
    border: 1px solid rgba(255,255,255,.15);
    border-radius: var(--sae-radius-sm);
    padding: 6px 8px;
    font: inherit;
    flex: 1;
    min-width: 100px;
  }
  .sae-item.editing input:focus {
    border-color: var(--sae-border-focus);
    outline: none;
  }
  
  /* Add New */
  .sae-add-new {
    padding: 12px;
    text-align: center;
    border-top: 1px solid var(--sae-border-light);
  }
  .sae-add-new button {
    padding: 10px 20px;
    border-radius: var(--sae-radius);
    border: 1px solid var(--sae-accent);
    background: var(--sae-accent-bg);
    color: var(--sae-accent);
    cursor: pointer;
    font-weight: 600;
    transition: all .15s;
  }
  .sae-add-new button:hover {
    background: rgba(74,158,255,.2);
  }
  
  /* Footer */
  .sae-footer {
    padding: 10px 12px;
    border-top: 1px solid var(--sae-border-light);
    color: var(--sae-text-dim);
    font-size: 12px;
  }
  
  /* Settings Panel Toggle */
  .sae-panel.settings-open .sae-list,
  .sae-panel.settings-open .sae-add-new,
  .sae-panel.settings-open .sae-search { display: none }
  
  .sae-settings {
    display: none;
    flex: 1;
    overflow: auto;
    padding: 16px;
    ${scrollbar}
  }
  .sae-panel.settings-open .sae-settings { display: block }
  
  /* Settings Rows */
  .sae-hrow {
    padding: 16px 0;
    border-bottom: 1px solid var(--sae-border-light);
  }
  .sae-hrow:last-child { border-bottom: none }
  .sae-hrow-label {
    color: var(--sae-text);
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 10px;
  }
  .sae-hrow-content {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  /* Inputs */
  .sae-input, .sae-textarea {
    background: var(--sae-bg-light);
    color: var(--sae-text);
    border: 1px solid rgba(255,255,255,.15);
    border-radius: var(--sae-radius);
    padding: 10px 12px;
    font: inherit;
    width: 100%;
    max-width: 100%;
  }
  .sae-input:focus, .sae-textarea:focus {
    border-color: var(--sae-border-focus);
    outline: none;
    box-shadow: 0 0 0 3px rgba(74,158,255,.15);
  }
  .sae-textarea {
    min-height: 80px;
    resize: vertical;
  }
  .sae-help {
    font-size: 11px;
    color: var(--sae-text-dim);
    margin-top: 4px;
  }
  
  /* Buttons */
  .sae-btn {
    padding: 8px 14px;
    border-radius: var(--sae-radius);
    border: 1px solid rgba(255,255,255,.15);
    background: var(--sae-bg-light);
    color: var(--sae-text);
    cursor: pointer;
    font-size: 13px;
    transition: all .15s;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .sae-btn:hover {
    background: var(--sae-bg-hover);
    border-color: var(--sae-border-focus);
  }
  .sae-btn.primary { background: #1d4ed8; border-color: #3b82f6; color: var(--sae-text) }
  .sae-btn.primary:hover { background: #2563eb }
  .sae-btn.success { background: #166534; border-color: var(--sae-success) }
  .sae-btn.danger { background: #7f1d1d; border-color: var(--sae-danger) }
  .sae-btn.danger:hover { background: #991b1b }
  .sae-btn.sm { padding: 6px 10px; font-size: 12px }
  .sae-btn:disabled { opacity: .5; cursor: not-allowed }
  
  /* Chip & Rows */
  .sae-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: var(--sae-radius);
    background: var(--sae-bg-light);
    border: 1px solid rgba(255,255,255,.15);
    color: #ddd;
    font-size: 13px;
  }
  .sae-btn-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center }
  .sae-hk-row { display: flex; gap: 16px; flex-wrap: wrap; align-items: center }
  .sae-hk-item { display: flex; align-items: center; gap: 8px }
  .sae-hk-item .sae-chip { border-color: var(--sae-accent); min-width: 140px; justify-content: center }
  .sae-hk-label { color: var(--sae-text-muted) }
  .sae-inline-row { display: flex; align-items: center; gap: 12px }
  .sae-inline-row input[type="number"] { width: 80px; text-align: center }
  .sae-inline-row .sae-help { margin: 0 }
  
  /* Prompt Section */
  .sae-prompt-section { margin-top: 8px }
  .sae-prompt-section-title {
    font-size: 11px;
    color: var(--sae-text-dim);
    text-transform: uppercase;
    letter-spacing: .5px;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--sae-border-light);
  }
  .sae-prompt-list { display: flex; flex-direction: column; gap: 6px }
  
  /* Prompt Item */
  .sae-prompt-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: var(--sae-bg-light);
    border-radius: var(--sae-radius);
    border: 1px solid rgba(255,255,255,.08);
  }
  .sae-prompt-item .icon { font-size: 18px; width: 28px; text-align: center; flex-shrink: 0 }
  .sae-prompt-item .label { font-weight: 500; min-width: 100px; color: var(--sae-text) }
  .sae-prompt-item .prompt-text {
    flex: 1;
    color: var(--sae-text-dim);
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sae-prompt-item .actions { display: flex; gap: 6px; align-items: center; margin-left: auto }
  .sae-prompt-item.disabled { opacity: .5 }
  .sae-prompt-item.builtin { border-color: rgba(74,158,255,.2) }
  .sae-prompt-item.builtin .label::after {
    content: 'Built-in';
    font-size: 9px;
    background: #1d4ed8;
    color: var(--sae-text);
    padding: 2px 6px;
    border-radius: 4px;
    margin-left: 8px;
    font-weight: 400;
  }
  .sae-prompt-item.editing {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    border-color: #3b82f6;
  }
  
  /* Prompt Edit Form */
  .sae-prompt-edit-form { display: flex; flex-direction: column; gap: 10px; width: 100% }
  .sae-prompt-edit-row { display: flex; gap: 8px; align-items: center }
  .sae-prompt-edit-row .icon-input { width: 60px; text-align: center; font-size: 16px }
  .sae-prompt-edit-row .label-input { flex: 1 }
  .sae-prompt-edit-actions { display: flex; gap: 8px; justify-content: flex-end }
  
  /* Toggle */
  .sae-toggle {
    position: relative;
    width: 44px;
    height: 24px;
    background: #333;
    border-radius: 12px;
    cursor: pointer;
    transition: background .2s;
    flex-shrink: 0;
    border: 1px solid var(--sae-border);
  }
  .sae-toggle.on { background: var(--sae-success); border-color: var(--sae-success) }
  .sae-toggle::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    background: var(--sae-text);
    border-radius: 50%;
    transition: transform .2s;
  }
  .sae-toggle.on::after { transform: translateX(20px) }
  
  /* Empty State */
  .sae-empty {
    color: var(--sae-text-dim);
    padding: 16px;
    text-align: center;
    background: var(--sae-bg-light);
    border-radius: var(--sae-radius);
    border: 1px dashed var(--sae-border);
  }
  
  /* AI Menu */
  .sae-ai-menu {
    position: fixed;
    z-index: var(--sae-z);
    background: var(--sae-bg);
    border: 1px solid rgba(255,255,255,.12);
    border-radius: var(--sae-radius-xl);
    box-shadow: 0 16px 64px rgba(0,0,0,.5);
    padding: 10px;
    font: var(--sae-font);
    min-width: 200px;
    max-width: 90vw;
    max-height: 80vh;
    overflow-y: auto;
    opacity: 0;
    pointer-events: none;
    transform: scale(.96) translateY(-4px);
    transition: opacity .15s, transform .15s;
    ${scrollbar}
  }
  .sae-ai-menu.open {
    opacity: 1;
    pointer-events: auto;
    transform: scale(1) translateY(0);
  }
  .sae-ai-menu.above { transform-origin: bottom center }
  .sae-ai-menu.below { transform-origin: top center }
  
  /* AI Preview */
  .sae-ai-preview-wrap { margin-bottom: 8px }
  .sae-ai-preview {
    padding: 10px 12px;
    background: var(--sae-bg-light);
    border-radius: 10px;
    color: #999;
    font-size: 12px;
    line-height: 1.5;
    border: 1px solid var(--sae-border-light);
    word-break: break-word;
    max-height: 60px;
    overflow: hidden;
    transition: max-height .2s ease;
  }
  .sae-ai-preview.expanded {
    max-height: 300px;
    overflow-y: auto;
    ${scrollbar}
  }
  .sae-ai-preview-toggle {
    background: none;
    border: none;
    color: var(--sae-accent);
    cursor: pointer;
    font-size: 11px;
    padding: 4px 8px;
    margin-top: 4px;
  }
  .sae-ai-preview-toggle:hover { text-decoration: underline }
  
  /* AI Pills */
  .sae-ai-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px }
  .sae-ai-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 14px;
    border-radius: 10px;
    background: var(--sae-bg-light);
    border: 1px solid var(--sae-border);
    color: var(--sae-text);
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all .12s;
    white-space: nowrap;
  }
  .sae-ai-pill:hover, .sae-ai-pill.active {
    background: var(--sae-bg-hover);
    border-color: var(--sae-border-focus);
    transform: translateY(-1px);
  }
  .sae-ai-pill .icon { font-size: 15px }
  .sae-ai-pill .key { color: var(--sae-accent); font-size: 10px; font-weight: 700; opacity: .7 }
  
  /* AI Menu Elements */
  .sae-ai-divider { height: 1px; background: rgba(255,255,255,.08); margin: 8px 0 }
  .sae-ai-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 8px;
    color: var(--sae-text-muted);
    cursor: pointer;
    font-size: 12px;
    border-radius: var(--sae-radius);
    transition: all .15s;
    border: 1px solid transparent;
  }
  .sae-ai-toggle:hover {
    color: var(--sae-text);
    background: var(--sae-bg-light);
    border-color: var(--sae-border);
  }
  .sae-ai-custom-label {
    font-size: 10px;
    color: var(--sae-text-dim);
    padding: 4px 8px;
    text-transform: uppercase;
    letter-spacing: .5px;
  }
  
  /* AI Loading State */
  .sae-ai-menu.loading .sae-ai-pills { opacity: .5; pointer-events: none }
  .sae-ai-loading {
    display: none;
    align-items: center;
    gap: 8px;
    padding: 12px;
    color: var(--sae-accent);
    justify-content: center;
  }
  .sae-ai-menu.loading .sae-ai-loading { display: flex }
  .sae-ai-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(74,158,255,.3);
    border-top-color: var(--sae-accent);
    border-radius: 50%;
    animation: sae-spin 1s linear infinite;
  }
  @keyframes sae-spin { to { transform: rotate(360deg) } }
`
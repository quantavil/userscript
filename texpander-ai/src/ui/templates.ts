import { escHtml } from '../core'
import type { AIPrompt } from '../types'

// ─────────────────────────────────────────────────────────────
// Settings Templates
// ─────────────────────────────────────────────────────────────

export const settingsHTML = (
  apiKey: string,
  paletteHk: string,
  aiMenuHk: string
): string => `
  <div class="sae-hrow">
    <div class="sae-hrow-label">API Key(s)</div>
    <div class="sae-hrow-content">
      <div class="sae-row-flex">
        <input class="sae-input" id="sae-api" type="password" placeholder="key1;key2..." value="${escHtml(apiKey)}" />
        <button class="sae-btn primary" id="sae-verify">Verify</button>
      </div>
      <div class="sae-help">Multiple keys (;) rotate on rate limits</div>
    </div>
  </div>
  <div class="sae-hrow">
    <div class="sae-hrow-label">Hotkeys</div>
    <div class="sae-hrow-content">
      <div class="sae-hk-row">
        <div class="sae-hk-item">
          <span class="sae-hk-label">Palette:</span>
          <span class="sae-chip">${paletteHk}</span>
          <button class="sae-btn sm" data-hk="palette">Change</button>
        </div>
        <div class="sae-hk-item">
          <span class="sae-hk-label">AI Menu:</span>
          <span class="sae-chip">${aiMenuHk}</span>
          <button class="sae-btn sm" data-hk="aiMenu">Change</button>
        </div>
      </div>
    </div>
  </div>

    <div class="sae-hrow-label">AI Prompts</div>
    <div class="sae-hrow-content">
      <div class="sae-prompt-section">
        <div class="sae-prompt-section-title">Built-in</div>
        <div class="sae-prompt-list" id="sae-builtins" role="list"></div>
      </div>
      <div class="sae-prompt-section sae-mt-md">
        <div class="sae-prompt-section-title">Custom</div>
        <div class="sae-prompt-list" id="sae-customs" role="list"></div>
        <button class="sae-btn primary sae-mt-sm" id="sae-add-prompt">+ Add Custom Prompt</button>
      </div>
    </div>
  </div>
  <div class="sae-hrow">
    <div class="sae-hrow-label">Dictionary</div>
    <div class="sae-hrow-content">
      <div class="sae-btn-row">
        <button class="sae-btn" id="sae-export">Export</button>
        <button class="sae-btn" id="sae-import">Import</button>
        <button class="sae-btn danger" id="sae-reset">Reset</button>
      </div>
    </div>
  </div>
`

// ─────────────────────────────────────────────────────────────
// Prompt Item Templates
// ─────────────────────────────────────────────────────────────

export const promptItemHTML = (
  p: AIPrompt,
  idx: number,
  isBuiltin: boolean,
  enabled: boolean
): string => {
  const classes = [
    'sae-prompt-item',
    isBuiltin ? 'builtin' : '',
    enabled ? '' : 'disabled'
  ].filter(Boolean).join(' ')

  const dataAttr = isBuiltin ? `data-id="${p.id}"` : `data-idx="${idx}"`

  return `
    <div class="${classes}" ${dataAttr} role="listitem">
      <span class="icon">${p.icon || '⚡'}</span>
      <span class="label">${escHtml(p.label)}</span>
      <span class="prompt-text">${escHtml(p.prompt)}</span>
      <div class="actions">
        <div class="sae-toggle${enabled ? ' on' : ''}" data-toggle role="switch" aria-checked="${enabled}" tabindex="0"></div>
        ${!isBuiltin ? '<button class="sae-btn sm" data-edit>Edit</button><button class="sae-btn sm danger" data-del>Del</button>' : ''}
      </div>
    </div>
  `
}

export const promptEditFormHTML = (icon: string, label: string, prompt: string): string => `
  <div class="sae-prompt-edit-form">
    <div class="sae-prompt-edit-row">
      <input class="sae-input icon-input" value="${escHtml(icon)}" maxlength="2" id="pi" aria-label="Icon" />
      <input class="sae-input label-input" placeholder="Name" value="${escHtml(label)}" id="pl" aria-label="Label" />
    </div>
    <textarea class="sae-textarea" placeholder="Prompt instructions..." id="pp" aria-label="Prompt">${escHtml(prompt)}</textarea>
    <div class="sae-prompt-edit-actions">
      <button class="sae-btn" id="pc">Cancel</button>
      <button class="sae-btn primary" id="ps">Save</button>
    </div>
  </div>
`

// ─────────────────────────────────────────────────────────────
// Palette Template
// ─────────────────────────────────────────────────────────────

export const paletteHTML = (): string => `
  <div class="sae-panel" role="dialog" aria-label="Text Expander Palette">
    <div class="sae-panel-header">
      <input class="sae-search" type="search" placeholder="Search abbreviations..." aria-label="Search abbreviations" />
      <button class="sae-icon-btn" data-action="settings" title="Settings" aria-label="Settings">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      </button>
      <button class="sae-icon-btn" data-action="back" title="Back" aria-label="Back" style="display:none">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button class="sae-icon-btn" data-action="close" title="Close" aria-label="Close">
        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="sae-list" role="listbox" aria-label="Abbreviations list"></div>
    <div class="sae-settings"></div>
    <div class="sae-add-new"><button data-action="add">+ Add Abbreviation</button></div>
    <div class="sae-footer">Shift+Space to expand · Alt+G for AI actions</div>
  </div>
`

// ─────────────────────────────────────────────────────────────
// AI Menu Template
// ─────────────────────────────────────────────────────────────

export const aiMenuHTML = (): string => `
  <div class="sae-ai-preview-wrap">
    <div class="sae-ai-preview"></div>
    <button class="sae-ai-preview-toggle" style="display:none">Show more</button>
  </div>
  <div class="sae-ai-pills primary" role="menu"></div>
  <div class="sae-ai-more" style="display:none">
    <div class="sae-ai-divider"></div>
    <div class="sae-ai-pills secondary" role="menu"></div>
    <div class="sae-ai-custom" style="display:none">
      <div class="sae-ai-divider"></div>
      <div class="sae-ai-custom-label">My Prompts</div>
      <div class="sae-ai-pills custom" role="menu"></div>
    </div>
  </div>
  <div class="sae-ai-toggle" role="button" tabindex="0">▾ More</div>
  <div class="sae-ai-loading" aria-live="polite"><div class="sae-ai-spinner"></div><span>Processing...</span></div>
`
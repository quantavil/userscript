import { escHtml } from '../core'
import type { AIPrompt } from '../types'

export const settingsHTML = (
  apiKey: string,
  paletteHk: string,
  aiMenuHk: string,
  inlineCount: number
): string => `
  <div class="sae-hrow">
    <div class="sae-hrow-label">API Key(s)</div>
    <div class="sae-hrow-content">
      <div style="display:flex;gap:8px">
        <input class="sae-input" id="sae-api" type="password" placeholder="key1;key2..." value="${escHtml(apiKey)}" style="flex:1" />
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
          <span style="color:#888">Palette:</span>
          <span class="sae-chip">${paletteHk}</span>
          <button class="sae-btn sm" data-hk="palette">Change</button>
        </div>
        <div class="sae-hk-item">
          <span style="color:#888">AI Menu:</span>
          <span class="sae-chip">${aiMenuHk}</span>
          <button class="sae-btn sm" data-hk="aiMenu">Change</button>
        </div>
      </div>
    </div>
  </div>
  <div class="sae-hrow">
    <div class="sae-hrow-label">AI Menu Display</div>
    <div class="sae-hrow-content">
      <div class="sae-inline-row">
        <label>Show inline:</label>
        <input class="sae-input" type="number" id="sae-inline" min="1" max="20" value="${inlineCount}" />
        <span class="sae-help" style="margin:0">prompts (rest in "More")</span>
      </div>
    </div>
  </div>
  <div class="sae-hrow">
    <div class="sae-hrow-label">AI Prompts</div>
    <div class="sae-hrow-content">
      <div class="sae-prompt-section">
        <div class="sae-prompt-section-title">Built-in</div>
        <div class="sae-prompt-list" id="sae-builtins"></div>
      </div>
      <div class="sae-prompt-section" style="margin-top:16px">
        <div class="sae-prompt-section-title">Custom</div>
        <div class="sae-prompt-list" id="sae-customs"></div>
        <button class="sae-btn primary" id="sae-add-prompt" style="margin-top:10px">+ Add Custom Prompt</button>
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

export const promptItemHTML = (
  p: AIPrompt,
  idx: number,
  isBuiltin: boolean,
  enabled: boolean
): string => `
  <div class="sae-prompt-item${isBuiltin ? ' builtin' : ''}${enabled ? '' : ' disabled'}" data-${isBuiltin ? 'id' : 'idx'}="${isBuiltin ? p.id : idx}">
    <span class="icon">${p.icon || '⚡'}</span>
    <span class="label">${escHtml(p.label)}</span>
    <span class="prompt-text">${escHtml(p.prompt)}</span>
    <div class="actions">
      <div class="sae-toggle${enabled ? ' on' : ''}" data-toggle></div>
      ${!isBuiltin ? '<button class="sae-btn sm" data-edit>Edit</button><button class="sae-btn sm danger" data-del>Del</button>' : ''}
    </div>
  </div>
`

export const promptEditFormHTML = (icon: string, label: string, prompt: string): string => `
  <div class="sae-prompt-edit-form">
    <div class="sae-prompt-edit-row">
      <input class="sae-input icon-input" value="${escHtml(icon)}" maxlength="2" id="pi" />
      <input class="sae-input label-input" placeholder="Name" value="${escHtml(label)}" id="pl" />
    </div>
    <textarea class="sae-textarea" placeholder="Prompt instructions..." id="pp">${escHtml(prompt)}</textarea>
    <div class="sae-prompt-edit-actions">
      <button class="sae-btn" id="pc">Cancel</button>
      <button class="sae-btn primary" id="ps">Save</button>
    </div>
  </div>
`

export const paletteHTML = (): string => `
  <div class="sae-panel" role="dialog">
    <div class="sae-panel-header">
      <input class="sae-search" type="search" placeholder="Search abbreviations..." />
      <button class="sae-icon-btn" data-action="settings" title="Settings">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      </button>
      <button class="sae-icon-btn" data-action="back" title="Back" style="display:none">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button class="sae-icon-btn" data-action="close" title="Close">
        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="sae-list"></div>
    <div class="sae-settings"></div>
    <div class="sae-add-new"><button data-action="add">+ Add Abbreviation</button></div>
    <div class="sae-footer">Shift+Space to expand · Alt+G for AI actions</div>
  </div>
`

export const aiMenuHTML = (): string => `
  <div class="sae-ai-preview"></div>
  <div class="sae-ai-pills primary"></div>
  <div class="sae-ai-more" style="display:none">
    <div class="sae-ai-divider"></div>
    <div class="sae-ai-pills secondary"></div>
    <div class="sae-ai-custom" style="display:none">
      <div class="sae-ai-divider"></div>
      <div class="sae-ai-custom-label">My Prompts</div>
      <div class="sae-ai-pills custom"></div>
    </div>
  </div>
  <div class="sae-ai-toggle">▾ More</div>
  <div class="sae-ai-loading"><div class="sae-ai-spinner"></div><span>Processing...</span></div>
`
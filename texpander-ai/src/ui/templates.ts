import { escHtml } from '../core'
import type { AIPrompt } from '../types'

export const settingsHTML = (
  apiKey: string,
  paletteHk: string,
  aiMenuHk: string
): string => `
  <div class="sae-s-card">
    <div class="sae-s-title">API Key</div>
    <div class="sae-s-row">
      <input class="sae-input" id="sae-api" type="password" placeholder="key1;key2..." value="${escHtml(apiKey)}" />
      <button class="sae-btn primary" id="sae-verify">Verify</button>
    </div>
    <div class="sae-s-hint">Semicolon-separated keys rotate on rate limits</div>
  </div>
  <div class="sae-s-card">
    <div class="sae-s-title">Hotkeys</div>
    <div class="sae-s-row">
      <span class="sae-s-label">Palette</span>
      <span class="sae-chip">${paletteHk}</span>
      <button class="sae-btn sm" data-hk="palette">Change</button>
    </div>
    <div class="sae-s-row">
      <span class="sae-s-label">AI Menu</span>
      <span class="sae-chip">${aiMenuHk}</span>
      <button class="sae-btn sm" data-hk="aiMenu">Change</button>
    </div>
  </div>
  <div class="sae-s-card">
    <div class="sae-s-title">Prompts</div>
    <div class="sae-p-list" id="sae-builtins"></div>
    <div class="sae-s-sep"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <span style="font-size:10px;color:var(--sae-text-dim);text-transform:uppercase;letter-spacing:.4px">Custom</span>
      <button class="sae-btn sm primary" id="sae-add-prompt">+ Add</button>
    </div>
    <div class="sae-p-list" id="sae-customs"></div>
  </div>
  <div class="sae-s-card">
    <div class="sae-s-title">Dictionary</div>
    <div class="sae-s-row">
      <button class="sae-btn" id="sae-export">Export</button>
      <button class="sae-btn" id="sae-import">Import</button>
      <button class="sae-btn danger" id="sae-reset">Reset</button>
    </div>
  </div>`

export const promptItemHTML = (
  p: AIPrompt, idx: number, builtin: boolean, on: boolean
): string => `
  <div class="sae-p-item${builtin ? ' bi' : ''}${on ? '' : ' disabled'}" ${builtin ? `data-id="${escHtml(p.id)}"` : `data-idx="${idx}"`}>
    <span class="p-icon">${escHtml(p.icon || '⚡')}</span>
    <span class="p-name">${escHtml(p.label)}</span>
    <span class="p-text">${escHtml(p.prompt)}</span>
    <div class="p-acts">
      <div class="sae-toggle${on ? ' on' : ''}" data-toggle role="switch" tabindex="0"></div>
      ${builtin ? '' : '<button class="sae-btn sm" data-edit>Edit</button><button class="sae-btn sm danger" data-del>×</button>'}
    </div>
  </div>`

export const promptEditFormHTML = (icon: string, label: string, prompt: string): string => `
  <div class="sae-p-edit">
    <div class="sae-p-edit-r">
      <input class="sae-input icon-input" value="${escHtml(icon)}" maxlength="2" id="pi"/>
      <input class="sae-input label-input" placeholder="Name" value="${escHtml(label)}" id="pl"/>
    </div>
    <textarea class="sae-textarea" placeholder="Prompt..." id="pp">${escHtml(prompt)}</textarea>
    <div class="sae-p-edit-a">
      <button class="sae-btn" id="pc">Cancel</button>
      <button class="sae-btn primary" id="ps">Save</button>
    </div>
  </div>`

export const paletteHTML = (): string => `
  <div class="sae-panel" role="dialog" aria-label="Text Expander Palette">
    <div class="sae-panel-header">
      <input class="sae-search" type="search" placeholder="Search..." aria-label="Search"/>
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
    <div class="sae-list" role="listbox"></div>
    <div class="sae-settings"></div>
    <div class="sae-add-new"><button data-action="add">+ Add Abbreviation</button></div>
    <div class="sae-footer">Shift+Space expand · Alt+G AI</div>
  </div>`

export const aiMenuHTML = (): string => `
  <div class="sae-ai-preview"></div>
  <div class="sae-ai-pills primary" role="menu"></div>
  <div class="sae-ai-more" style="display:none">
    <div class="sae-ai-divider"></div>
    <div class="sae-ai-pills secondary" role="menu"></div>
    <div class="sae-ai-custom" style="display:none">
      <div class="sae-ai-divider"></div>
      <div class="sae-ai-custom-label">Custom</div>
      <div class="sae-ai-pills custom" role="menu"></div>
    </div>
  </div>
  <div class="sae-ai-toggle" role="button" tabindex="0">▾ More</div>
  <div class="sae-ai-loading"><div class="sae-ai-spinner"></div><span>Processing...</span></div>`
// ==UserScript==
// @name         My Prompt
// @namespace    https://github.com/quantavil
// @version      2.4
// @description  Save and use your prompts quickly and easily with one click! Compatible with ChatGPT, DeepSeek, Gemini, Claude, Kimi, Qwen, LMArena, Z.ai, Google AI Studio, and Grok.
// @author       quantavil
// @homepage     https://github.com/0H4S
// @icon         https://cdn-icons-png.flaticon.com/512/4997/4997543.png
// @license      MIT
// @match        https://aistudio.google.com/*
// @match        https://gemini.google.com/*
// @match        https://chat.deepseek.com/*
// @match        https://www.kimi.com/*
// @match        https://chat.qwen.ai/*
// @match        https://chatgpt.com/*
// @match        https://lmarena.ai/*
// @match        https://chat.z.ai/*
// @match        https://claude.ai/*
// @match        https://grok.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  // =========================
  // Globals & Constants
  // =========================
  const STR = {
    prompt: 'Prompt',
    prompts: 'Prompts',
    newPrompt: 'New Prompt',
    editPrompt: 'Edit Prompt',
    title: 'Title',
    text: 'Prompt',
    save: 'Save',
    close: 'Close',
    edit: 'Edit',
    delete: 'Delete',
    noSavedPrompts: 'No saved prompts.',
    addPrompt: 'Add prompt',
    import: 'Import',
    export: 'Export',
    confirmDelete: 'Delete prompt "{title}"?',
    noPromptsToExport: 'No prompts to export.',
    promptsImported: '{count} prompts imported successfully!',
    errorImporting: 'Error importing file: {error}',
    requiredFields: 'Title and prompt are required.',
    editorNotFound: 'Could not find the text area for {platform}.',
    fillPlaceholders: 'Fill in the Information',
    insert: 'Insert',
    enablePlaceholders: 'Enable interactive placeholders: [...]',
    fileName: 'My_Prompts.json',
    settings: 'Settings',
    insertionMode: 'Insertion mode',
    modeInsert: 'Insert at cursor',
    modeAppend: 'Append to end',
    modeReplace: 'Replace all'
  };

  const ICON_MENU = `
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 5h12M4 10h12M4 15h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;
  const ICON_EDIT = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M14.06 6.19l3.75 3.75" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  const ICON_DELETE = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M3 6h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;

  const PROMPT_STORAGE_KEY = 'Prompts';
  const SETTINGS_KEY = 'Settings';
  const DEFAULT_SETTINGS = { insertMode: 'insert' }; // 'insert' | 'append' | 'replace'

  // Consolidated state
  const state = {
    platform: null, // { name, editorSelector, mount(), getEditor? }
    elements: {
      wrapper: null,
      button: null,
      menu: null,
      modal: null,
      placeholderModal: null,
    },
    observers: {
      page: null,
      platform: [], // per-platform observers
    },
    flags: { initializing: false },
  };

  // TrustedTypes for static HTML
  const policy = window.trustedTypes
    ? window.trustedTypes.createPolicy('MyPromptPolicy', { createHTML: s => s })
    : null;
  const setHTML = (el, html) => { if (el) el.innerHTML = policy ? policy.createHTML(html) : html; };

  // Storage helpers
  const getAll = async () => await GM_getValue(PROMPT_STORAGE_KEY, []);
  const setAll = async (arr) => await GM_setValue(PROMPT_STORAGE_KEY, arr);
  const addItem = async (item) => { const arr = await getAll(); arr.unshift(item); await setAll(arr); };
  const updateItem = async (index, item) => { const arr = await getAll(); if (arr[index]) { arr[index] = item; await setAll(arr); } };
  const removeItem = async (index) => { const arr = await getAll(); arr.splice(index, 1); await setAll(arr); };

  const getSettings = async () => {
    const s = await GM_getValue(SETTINGS_KEY, {});
    return { ...DEFAULT_SETTINGS, ...s };
  };
  const setSettings = async (patch) => {
    const s = await getSettings();
    const next = { ...s, ...patch };
    await GM_setValue(SETTINGS_KEY, next);
    return next;
  };

  // Utils
  const debounce = (fn, wait = 200) => {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  };
  function waitFor(selector, timeout = 8000) {
    return new Promise((resolve, reject) => {
      const found = document.querySelector(selector);
      if (found) return resolve(found);
      let obs;
      const timer = setTimeout(() => { try { obs?.disconnect(); } catch (_) {} reject(`Timeout waiting for ${selector}`); }, timeout);
      obs = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearTimeout(timer);
          obs.disconnect();
          resolve(el);
        }
      });
      const startObs = () => obs.observe(document.body, { childList: true, subtree: true });
      if (document.body) startObs(); else document.addEventListener('DOMContentLoaded', startObs);
    });
  }
  const addPlatformObserver = (obs) => { state.observers.platform.push(obs); return obs; };

  function injectGlobalStyles() {
    const styleId = 'my-prompt-styles';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    setHTML(style, `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      :root {
        --mp-font-family-base: 'Inter', sans-serif;
        --mp-bg-primary: #fff;
        --mp-bg-secondary: #f8f9fa;
        --mp-bg-tertiary: #f1f3f5;
        --mp-bg-overlay: rgba(10, 10, 10, .5);
        --mp-text-primary: #212529;
        --mp-text-secondary: #495057;
        --mp-text-tertiary: #868e96;
        --mp-border-primary: #dee2e6;
        --mp-border-secondary: #ced4da;
        --mp-accent-primary: #7071fc;
        --mp-accent-primary-hover: #595ac9;
        --mp-accent-yellow: #fab005;
        --mp-accent-yellow-hover: #f08c00;
        --mp-accent-red: #f03e3e;
        --mp-accent-red-hover: #c92a2a;
        --mp-shadow-lg: 0 10px 30px rgba(0, 0, 0, .1);
        --mp-border-radius-sm: 4px;
        --mp-border-radius-md: 8px;
        --mp-border-radius-lg: 16px;
        --mp-transition-fast: .2s cubic-bezier(.25, 1, .5, 1)
      }
      @media (prefers-color-scheme:dark) {
        :root {
          --mp-bg-primary: #212529;
          --mp-bg-secondary: #2c2c30;
          --mp-bg-tertiary: #343a40;
          --mp-bg-overlay: rgba(0, 0, 0, .6);
          --mp-text-primary: #f8f9fa;
          --mp-text-secondary: #e9ecef;
          --mp-text-tertiary: #adb5bd;
          --mp-border-primary: #495057;
          --mp-border-secondary: #868e96;
          --mp-shadow-lg: 0 10px 30px rgba(0, 0, 0, .3)
        }
      }
      .mp-hidden{display:none!important}
      .mp-overlay { position: fixed; inset: 0; background: var(--mp-bg-overlay);
        z-index: 2147483647; display: flex; justify-content: center; align-items: center;
        backdrop-filter: blur(4px); opacity: 0; visibility: hidden;
        transition: opacity var(--mp-transition-fast), visibility var(--mp-transition-fast); }
      .mp-overlay.visible { opacity: 1; visibility: visible; }
      .mp-modal-box { font-family: var(--mp-font-family-base); background: var(--mp-bg-primary); color: var(--mp-text-primary);
        border-radius: var(--mp-border-radius-lg); padding: 24px; box-shadow: var(--mp-shadow-lg);
        width: min(90vw, 520px); border: 1px solid var(--mp-border-primary);
        transform: scale(.95) translateY(10px); opacity: 0;
        transition: transform var(--mp-transition-fast), opacity var(--mp-transition-fast); position: relative; }
      .mp-overlay.visible .mp-modal-box { transform: scale(1) translateY(0); opacity: 1; }
      .mp-modal-close-btn { position: absolute; top: 12px; right: 12px; background: none; border: none; color: var(--mp-text-tertiary);
        font-size: 22px; cursor: pointer; width: 32px; height: 32px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center; transition: transform .3s ease, color .3s ease, background-color .3s ease; }
      .mp-modal-close-btn:hover { transform: rotate(90deg); color: var(--mp-accent-red); background-color: color-mix(in srgb, var(--mp-accent-red) 15%, transparent); }

      .prompt-menu { position: fixed; min-width: 320px; max-width: 420px; background: var(--mp-bg-primary);
        border: 1px solid var(--mp-border-primary); border-radius: var(--mp-border-radius-lg);
        box-shadow: var(--mp-shadow-lg); z-index: 2147483647; display: flex; flex-direction: column; overflow: hidden;
        color: var(--mp-text-primary); font-family: var(--mp-font-family-base); opacity: 0; visibility: hidden; transform: scale(.95);
        transform-origin: top left; transition: opacity .2s ease, transform .2s ease, visibility 0s linear .2s; }
      .prompt-menu.visible { opacity: 1; visibility: visible; transform: scale(1); transition-delay: 0s; }
      .prompt-menu-list { max-height: 220px; overflow-y: auto; padding: 4px; }
      .prompt-item-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: var(--mp-border-radius-md);
        cursor: pointer; transition: background-color .15s; }
      .prompt-item-row:hover { background: var(--mp-bg-tertiary); }
      .prompt-title { font-size: 14px; font-weight: 500; flex: 1; padding-right: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--mp-text-secondary); }
      .prompt-item-row:hover .prompt-title { color: var(--mp-text-primary); }
      .prompt-actions { display: flex; align-items: center; gap: 4px; }

      .action-btn { background: none; border: none; cursor: pointer; padding: 4px; width: 28px; height: 28px; border-radius: var(--mp-border-radius-sm);
        display: inline-flex; align-items: center; justify-content: center; color: var(--mp-text-secondary); transition: background-color .15s, color .15s; }
      .action-btn svg { width: 16px; height: 16px; }
      .action-btn.edit { color: var(--mp-accent-yellow); }
      .action-btn.edit:hover { background: color-mix(in srgb, var(--mp-accent-yellow) 18%, transparent); color: var(--mp-bg-primary); }
      .action-btn.delete { color: var(--mp-accent-red); }
      .action-btn.delete:hover { background: color-mix(in srgb, var(--mp-accent-red) 18%, transparent); color: var(--mp-bg-primary); }

      .menu-header { display: flex; align-items: center; justify-content: space-between; padding: 8px; border-bottom: 1px solid var(--mp-border-primary); }
      .menu-title { font-size: 14px; font-weight: 600; color: var(--mp-text-secondary); }
      .menu-icons { display: flex; align-items: center; gap: 6px; }
      .icon-btn { width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; border: none; background: transparent; color: var(--mp-text-tertiary);
        border-radius: var(--mp-border-radius-md); cursor: pointer; transition: background-color .15s ease, color .15s ease; }
      .icon-btn:hover { background: var(--mp-bg-tertiary); color: var(--mp-text-primary); }
      .settings-panel { padding: 4px; border-top: 1px solid var(--mp-border-primary); }
      .menu-button { display: flex; align-items: center; justify-content: center; padding: 8px 12px; cursor: pointer; color: var(--mp-text-secondary);
        border-radius: var(--mp-border-radius-md); font-size: 14px; font-weight: 500; transition: background-color .15s ease; }
      .menu-button:hover { background: var(--mp-bg-tertiary); color: var(--mp-text-primary); }
      .import-export-container { display: flex; }
      .import-export-container .menu-button { flex: 1; }
      .divider { border-left: 1px solid var(--mp-border-primary); height: 24px; align-self: center; }
      .empty-state { padding: 24px 16px; text-align: center; color: var(--mp-text-tertiary); font-size: 14px; }

      .form-group { display: flex; flex-direction: column; gap: 8px; padding: 6px; }
      .form-label { font-size: 13px; font-weight: 600; color: var(--mp-text-secondary); }
      .radio-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
      .radio-row label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; color: var(--mp-text-secondary); }
      .form-input, .form-textarea {
        background: var(--mp-bg-secondary); color: var(--mp-text-primary); border: 1px solid var(--mp-border-primary)!important;
        border-radius: var(--mp-border-radius-md); padding: 10px; width: 100%; box-sizing: border-box; outline: 0!important;
        font-family: var(--mp-font-family-base); font-size: 14px; transition: border-color .2s, box-shadow .2s;
      }
      .form-textarea { height: 140px; resize: vertical; }
      .form-input:focus,.form-textarea:focus { border-color: var(--mp-accent-primary)!important; box-shadow: 0 0 0 3px color-mix(in srgb, var(--mp-accent-primary) 25%, transparent)!important; }
      .modal-title { font-size: 18px; font-weight: 600; margin: 0 0 24px; text-align: center; color: var(--mp-text-primary); }
      .modal-footer { display: flex; justify-content: flex-end; }
      .save-button { padding: 10px 28px; border-radius: var(--mp-border-radius-md); background: var(--mp-accent-primary); color: #fff; border: none; font-weight: 600; cursor: pointer; transition: all .2s; font-family: var(--mp-font-family-base);}
      .save-button:hover { background: var(--mp-accent-primary-hover); transform: translateY(-1px); }

      /* Small hover fix for Google AI Studio */
      button[data-testid="composer-button-prompts"]:hover { background-color: rgba(60,64,67,0.08) !important; }
      @media (prefers-color-scheme: dark) {
        button[data-testid="composer-button-prompts"]:hover { background-color: rgba(232,234,237,0.08) !important; }
      }
    `);
    document.head.appendChild(style);
  }

  // =========================
  // UI Elements
  // =========================
  function createButton({
    tag = 'button',
    className = '',
    label = null,
    labelClass = '',
    iconClass = '',
    size = 32,
    iconSize = 20,
    attrs = {},
    style = {},
    title = STR.prompts,
    icon = ICON_MENU,
  } = {}) {
    const el = document.createElement(tag);
    if (tag === 'button') el.type = 'button';
    el.setAttribute('data-testid', 'composer-button-prompts');
    el.setAttribute('title', title);
    if (className) el.className = className;
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    Object.assign(el.style, {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      ...(size ? { width: `${size}px`, height: `${size}px` } : {}),
      ...style,
    });
    setHTML(el, icon || '');
    const svg = el.querySelector('svg');
    if (svg) {
      if (iconClass) svg.classList.add(iconClass);
      if (iconSize) { svg.setAttribute('width', String(iconSize)); svg.setAttribute('height', String(iconSize)); }
    }
    if (label) {
      const span = document.createElement('span');
      if (labelClass) span.className = labelClass;
      span.textContent = label;
      if (!className.includes('gap') && !labelClass) span.style.marginLeft = '6px';
      el.appendChild(span);
    }
    return el;
  }
  const createIconButton = (opts = {}) => createButton({ size: 32, iconSize: 20, ...opts });
  const createLabeledButton = (label, className = '', opts = {}) => createButton({ label, className, size: undefined, ...opts });

  function createPromptMenu() {
    const menu = document.createElement('div');
    menu.className = 'prompt-menu';
    menu.id = 'prompt-menu-container';

    // Header
    const header = document.createElement('div'); header.className = 'menu-header';
    const title = document.createElement('div'); title.className = 'menu-title'; title.textContent = STR.prompts;
    const icons = document.createElement('div'); icons.className = 'menu-icons';

    const btnAdd = document.createElement('button');
    btnAdd.className = 'icon-btn'; btnAdd.id = 'mp-btn-add';
    btnAdd.setAttribute('aria-label', STR.addPrompt); btnAdd.setAttribute('title', STR.addPrompt);
    setHTML(btnAdd, `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`);
    const btnSettings = document.createElement('button');
    btnSettings.className = 'icon-btn'; btnSettings.id = 'mp-btn-settings';
    btnSettings.setAttribute('aria-label', STR.settings); btnSettings.setAttribute('title', STR.settings);
    setHTML(btnSettings, `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M11.983 13.893a1.893 1.893 0 1 0 0-3.786 1.893 1.893 0 0 0 0 3.786Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M20.5 12a8.5 8.5 0 0 1-.09 1.227l1.498 1.164a.75.75 0 0 1 .18.969l-1.42 2.46a.75.75 0 0 1-.902.344l-1.764-.588a8.46 8.46 0 0 1-1.06.616l-.267 1.844a.75.75 0 0 1-.744.636h-2.84a.75.75 0 0 1-.744-.636l-.267-1.844a8.46 8.46 0 0 1-1.06-.616l-1.764.588a.75.75 0 0 1-.902.345l-1.42-2.46a.75.75 0 0 1-.18.968l-1.498 1.164c.06.399.09.804.09 1.217Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `);
    icons.append(btnAdd, btnSettings);
    header.append(title, icons);

    // List
    const list = document.createElement('div'); list.className = 'prompt-menu-list'; list.id = 'mp-list';

    // Settings panel
    const settingsPanel = document.createElement('div'); settingsPanel.className = 'settings-panel mp-hidden'; settingsPanel.id = 'mp-settings-panel';

    const ie = document.createElement('div'); ie.className = 'import-export-container';
    const exportBtn = document.createElement('div'); exportBtn.className = 'menu-button'; exportBtn.id = 'mp-btn-export'; exportBtn.textContent = STR.export;
    const divider = document.createElement('div'); divider.className = 'divider';
    const importBtn = document.createElement('div'); importBtn.className = 'menu-button'; importBtn.id = 'mp-btn-import'; importBtn.textContent = STR.import;
    ie.append(exportBtn, divider, importBtn);

    // Insertion mode controls
    const modeGroup = document.createElement('div'); modeGroup.className = 'form-group';
    const modeLabel = document.createElement('div'); modeLabel.className = 'form-label'; modeLabel.textContent = STR.insertionMode;
    const radioRow = document.createElement('div'); radioRow.className = 'radio-row';
    radioRow.innerHTML = `
      <label><input type="radio" name="mp-insert-mode" value="insert"> ${STR.modeInsert}</label>
      <label><input type="radio" name="mp-insert-mode" value="append"> ${STR.modeAppend}</label>
      <label><input type="radio" name="mp-insert-mode" value="replace"> ${STR.modeReplace}</label>
    `;
    modeGroup.append(modeLabel, radioRow);

    settingsPanel.append(modeGroup, ie);
    menu.append(header, list, settingsPanel);
    return menu;
  }

  function createPromptModal() {
    const overlay = document.createElement('div');
    overlay.className = 'mp-overlay mp-hidden';
    overlay.id = '__ap_modal_overlay';

    const box = document.createElement('div');
    box.className = 'mp-modal-box';
    box.onclick = e => e.stopPropagation();

    setHTML(box, `
      <button id="__ap_close_prompt" class="mp-modal-close-btn" aria-label="${STR.close}">✕</button>
      <h2 class="modal-title">${STR.newPrompt}</h2>
      <div class="form-group">
        <label for="__ap_title" class="form-label">${STR.title}</label>
        <input id="__ap_title" class="form-input" />
      </div>
      <div class="form-group">
        <label for="__ap_text" class="form-label">${STR.text}</label>
        <textarea id="__ap_text" class="form-textarea"></textarea>
      </div>
      <div class="form-group" style="margin-top: -4px;">
        <label class="form-label">
          <input type="checkbox" id="__ap_use_placeholders" />
          ${STR.enablePlaceholders}
        </label>
      </div>
      <div class="modal-footer">
        <button id="__ap_save" class="save-button">${STR.save}</button>
      </div>
    `);

    overlay.appendChild(box);
    return overlay;
  }

  function createPlaceholderModal() {
    const overlay = document.createElement('div');
    overlay.className = 'mp-overlay mp-hidden';
    overlay.id = '__ap_placeholder_modal_overlay';

    const box = document.createElement('div');
    box.className = 'mp-modal-box';
    box.onclick = e => e.stopPropagation();

    setHTML(box, `
      <button id="__ap_close_placeholder" class="mp-modal-close-btn" aria-label="${STR.close}">✕</button>
      <h2 class="modal-title">${STR.fillPlaceholders}</h2>
      <div id="__ap_placeholders_container"></div>
      <div class="modal-footer"><button id="__ap_insert_prompt" class="save-button">${STR.insert}</button></div>
    `);

    overlay.appendChild(box);
    return overlay;
  }

  function showModal(modal) { if (modal) { modal.classList.remove('mp-hidden'); setTimeout(() => modal.classList.add('visible'), 10); } }
  function hideModal(modal) { if (modal) { modal.classList.remove('visible'); setTimeout(() => modal.classList.add('mp-hidden'), 200); } }

  function openPromptModal(item = null, index = -1) {
    if (!state.elements.modal) return;
    const isEditing = !!item;
    state.elements.modal.dataset.index = index;
    state.elements.modal.querySelector('.modal-title').textContent = isEditing ? STR.editPrompt : STR.newPrompt;
    document.getElementById('__ap_title').value = item?.title || '';
    document.getElementById('__ap_text').value = item?.text || '';
    document.getElementById('__ap_use_placeholders').checked = item?.usePlaceholders || false;
    showModal(state.elements.modal);
    setTimeout(() => document.getElementById('__ap_title').focus(), 100);
  }

  function openPlaceholderModal(item, index, placeholders) {
    if (!state.elements.placeholderModal) return;
    const container = document.getElementById('__ap_placeholders_container');
    setHTML(container, '');
    state.elements.placeholderModal.dataset.prompt = JSON.stringify(item);
    state.elements.placeholderModal.dataset.index = index;

    const unique = [...new Map(placeholders.map(p => [p[1], p])).values()];
    unique.forEach(match => {
      const ph = match[1];
      const group = document.createElement('div');
      group.className = 'form-group';
      const label = document.createElement('label');
      label.className = 'form-label';
      label.textContent = ph;
      const textarea = document.createElement('textarea');
      textarea.className = 'form-input';
      textarea.dataset.placeholder = ph;
      textarea.rows = 1;
      textarea.style.resize = 'vertical';
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('__ap_insert_prompt').click(); }
      });
      group.appendChild(label);
      group.appendChild(textarea);
      container.appendChild(group);
    });

    showModal(state.elements.placeholderModal);
    setTimeout(() => container.querySelector('textarea')?.focus(), 100);
  }

  // =========================
  // Helpers
  // =========================
  function closeMenu() {
    if (state.elements.menu?.classList.contains('visible')) state.elements.menu.classList.remove('visible');
  }

  function positionMenu(menu, buttonEl) {
    const btnRect = buttonEl.getBoundingClientRect();
    const menuHeight = menu.offsetHeight;
    const menuWidth = menu.offsetWidth;
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const m = 8;

    const spaceBelow = vh - btnRect.bottom - m;
    const spaceAbove = btnRect.top - m;
    let top = spaceBelow >= menuHeight ? (btnRect.bottom + m) : (spaceAbove >= menuHeight ? (btnRect.top - menuHeight - m) : Math.max(m, vh - menuHeight - m));

    const spaceRight = vw - btnRect.left - m;
    const spaceLeft = btnRect.right - m;
    let left = spaceRight >= menuWidth ? btnRect.left : (spaceLeft >= menuWidth ? (btnRect.right - menuWidth) : (vw - menuWidth) / 2);

    menu.style.top = `${Math.max(m, Math.min(top, vh - menuHeight - m))}px`;
    menu.style.left = `${Math.max(m, Math.min(left, vw - menuWidth - m))}px`;
  }

  const editorIsContentEditable = (editor) => editor && editor.nodeType === 1 && editor.isContentEditable;

  function setContentEditableText(editor, text) {
    editor.focus();
    // Clear and rebuild as safe text nodes with <p>/<br>
    editor.innerHTML = '';
    const lines = String(text).split('\n');
    lines.forEach(line => {
      const p = document.createElement('p');
      if (line.trim() === '') p.appendChild(document.createElement('br'));
      else p.textContent = line;
      editor.appendChild(p);
    });
    editor.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  // Insert helpers with mode: 'insert' | 'append' | 'replace'
  function insertIntoTextInput(el, text, mode = 'insert') {
    const old = String(el.value ?? '');
    let start = typeof el.selectionStart === 'number' ? el.selectionStart : old.length;
    let end = typeof el.selectionEnd === 'number' ? el.selectionEnd : old.length;

    if (mode === 'append') { start = end = old.length; }
    if (mode === 'replace') { start = 0; end = old.length; }

    const next = old.slice(0, start) + text + old.slice(end);
    const tag = (el.tagName || '').toUpperCase();
    const proto = tag === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    setter ? setter.call(el, next) : (el.value = next);

    const caret = start + text.length;
    el.selectionStart = el.selectionEnd = caret;
    el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  function insertPlainTextFragment(text) {
    const frag = document.createDocumentFragment();
    const parts = String(text).split('\n');
    parts.forEach((line, i) => {
      if (i) frag.appendChild(document.createElement('br'));
      frag.appendChild(document.createTextNode(line));
    });
    return frag;
  }

  function getRangeInsideEditor(editor, preferEnd = false) {
    const sel = window.getSelection();
    let range = document.createRange();
    if (sel && sel.rangeCount && editor.contains(sel.anchorNode)) {
      range = sel.getRangeAt(0);
    } else {
      range.selectNodeContents(editor);
      range.collapse(preferEnd); // false: start, true: end
      sel.removeAllRanges();
      sel.addRange(range);
    }
    return { sel, range };
  }

  function insertIntoContentEditable(editor, text, mode = 'insert') {
    editor.focus();
    if (mode === 'replace') {
      setContentEditableText(editor, text);
      // Caret to end
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      sel.removeAllRanges(); sel.addRange(range);
      return;
    }

    const preferEnd = mode === 'append';
    const { sel, range } = getRangeInsideEditor(editor, preferEnd);

    // Try paste path first (rich editors handle better)
    try {
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      const ok = editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      if (ok) return;
    } catch (_) { /* Firefox blocks synthetic; fallback */ }

    // Plain text insertion
    const frag = insertPlainTextFragment(text);
    range.deleteContents();
    range.insertNode(frag);
    range.collapse(false);
    sel.removeAllRanges(); sel.addRange(range);

    editor.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  function moveCursorToEnd(editor) {
    try {
      if (editorIsContentEditable(editor)) {
        const range = document.createRange();
        range.selectNodeContents(editor); range.collapse(false);
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
        editor.scrollTop = editor.scrollHeight;
      } else if (editor && typeof editor.value === 'string') {
        const len = editor.value.length;
        editor.selectionStart = editor.selectionEnd = len;
        editor.scrollTop = editor.scrollHeight;
      } else {
        editor?.focus();
      }
    } catch (_) { /* noop */ }
  }

  // =========================
  // Menu Renderer
  // =========================
  async function refreshMenu() {
    if (!state.elements.menu) return;
    const list = state.elements.menu.querySelector('#mp-list') || (() => {
      const l = document.createElement('div'); l.className = 'prompt-menu-list'; l.id = 'mp-list'; state.elements.menu.appendChild(l); return l;
    })();

    setHTML(list, '');
    const items = await getAll();

    if (!items.length) {
      setHTML(list, `<div class="empty-state">${STR.noSavedPrompts}</div>`);
      return;
    }

    items.forEach((p, index) => {
      const row = document.createElement('div');
      row.className = 'prompt-item-row';

      const titleDiv = document.createElement('div');
      titleDiv.className = 'prompt-title';
      titleDiv.textContent = p.title;

      titleDiv.onclick = (e) => {
        e.stopPropagation();
        if (p.usePlaceholders) {
          const placeholderRegex = /\[([^\]]+)\]/g;
          const matches = [...p.text.matchAll(placeholderRegex)];
          if (matches.length > 0) openPlaceholderModal(p, index, matches);
          else insertPrompt(p, index);
        } else insertPrompt(p, index);
        closeMenu();
      };

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'prompt-actions';

      const btnE = document.createElement('button');
      btnE.className = 'action-btn edit';
      btnE.setAttribute('aria-label', STR.edit);
      btnE.setAttribute('title', STR.edit);
      setHTML(btnE, ICON_EDIT);
      btnE.onclick = (e) => { e.stopPropagation(); openPromptModal(p, index); };

      const btnD = document.createElement('button');
      btnD.className = 'action-btn delete';
      btnD.setAttribute('aria-label', STR.delete);
      btnD.setAttribute('title', STR.delete);
      setHTML(btnD, ICON_DELETE);
      btnD.onclick = (e) => {
        e.stopPropagation();
        if (confirm(STR.confirmDelete.replace('{title}', p.title))) removeItem(index).then(refreshMenu);
      };

      actionsDiv.append(btnE, btnD);
      row.append(titleDiv, actionsDiv);
      list.appendChild(row);
    });
  }

  // =========================
  // Import / Export
  // =========================
  async function exportPrompts() {
    const prompts = await getAll();
    if (prompts.length === 0) { alert(STR.noPromptsToExport); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(prompts, null, 2)], { type: 'application/json' }));
    a.download = STR.fileName;
    a.click();
    URL.revokeObjectURL(a.href);
    closeMenu();
  }

  function importPrompts() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          if (!Array.isArray(imported)) throw new Error('Not an array.');
          const current = await getAll();
          const newPrompts = imported.map(p => ({
            title: p.title || 'No Title',
            text: p.text || '',
            usePlaceholders: !!p.usePlaceholders
          }));
          await setAll([...current, ...newPrompts]);
          await refreshMenu();
          alert(STR.promptsImported.replace('{count}', String(newPrompts.length)));
        } catch (err) {
          alert(STR.errorImporting.replace('{error}', err.message));
        }
      };
      reader.readAsText(file);
    };
    input.click();
    closeMenu();
  }

  // =========================
  // Insertion Logic
  // =========================
  const resolveEditor = () => {
    if (state.platform?.getEditor) {
      const e = state.platform.getEditor();
      if (e) return e;
    }
    if (state.platform?.editorSelector) return document.querySelector(state.platform.editorSelector);
    return null;
  };

  async function insertPrompt(promptItem, index) {
    const editor = resolveEditor();

    if (!editor) { alert(STR.editorNotFound.replace('{platform}', state.platform?.name || 'this platform')); return; }
    const { insertMode } = await getSettings();

    editor.focus();
    setTimeout(() => {
      const isCE = editorIsContentEditable(editor);
      const isTextInput = typeof editor.value === 'string';

      if (isCE) {
        insertIntoContentEditable(editor, promptItem.text, insertMode);
      } else if (isTextInput) {
        insertIntoTextInput(editor, promptItem.text, insertMode);
      } else {
        // Exotic editors: best-effort paste
        try {
          const dt = new DataTransfer();
          dt.setData('text/plain', promptItem.text);
          editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
        } catch (_) {
          // If replace requested but paste failed, last resort: try to move cursor end (no destructive clear)
          if (insertMode !== 'insert') moveCursorToEnd(editor);
        }
      }
    }, 30);

    // Move used prompt to top
    const prompts = await getAll();
    if (index > 0) {
      const item = prompts.splice(index, 1)[0];
      prompts.unshift(item);
      await setAll(prompts);
    }
  }

  // =========================
  // Platform Integrations
  // =========================
  const PLATFORMS = [
    {
      name: 'chatgpt',
      test: () => location.hostname.includes('chatgpt.com'),
      editorSelector: '#prompt-textarea',
      mount: async () => {
        const container = await waitFor('div[class*="[grid-area:leading]"]');
        Object.assign(container.style, { display: 'flex', alignItems: 'center' });
        const btn = createIconButton({ className: 'composer-btn' });
        container.appendChild(btn);
        return { wrapper: btn, clickable: btn };
      },
    },
    {
      name: 'deepseek',
      test: () => location.hostname.includes('deepseek.com'),
      editorSelector: 'textarea.ds-scroll-area',
      mount: async () => {
        const container = (await waitFor('div:has(> input[type="file"])')).parentElement;
        const refButtons = Array.from(container.querySelectorAll('button:not([data-testid="composer-button-prompts"])'));
        const ref = refButtons[refButtons.length - 1];
        const btn = createLabeledButton(
          STR.prompt,
          ref ? ref.className : '',
          { attrs: { role: 'button', 'aria-disabled': 'false', tabindex: '0' }, size: 32, iconSize: 20 }
        );
        ref?.insertAdjacentElement('afterend', btn);
        return { wrapper: container, clickable: btn };
      },
    },
    {
      name: 'googlestudio',
      test: () => location.hostname.includes('aistudio.google.com'),
      editorSelector: 'ms-autosize-textarea textarea',
      mount: async () => {
        const insertionPoint = (await waitFor('ms-add-chunk-menu', 5000)).closest('.button-wrapper');
        const wrapper = document.createElement('div'); wrapper.className = 'button-wrapper';
        const btn = createIconButton({ size: 48 });
        wrapper.appendChild(btn);
        insertionPoint.parentElement?.appendChild(wrapper);
        const parent = insertionPoint.closest('.prompt-input-wrapper-container');
        if (parent) { parent.style.alignItems = 'center'; }
        return { wrapper, clickable: btn };
      },
    },
    {
      name: 'qwen',
      test: () => location.hostname.includes('chat.qwen.ai'),
      editorSelector: 'textarea#chat-input',
      mount: async () => {
        const ref = await waitFor('button.websearch_button', 5000);
        const container = ref.parentElement;
        const btn = createLabeledButton(STR.prompt, 'chat-input-feature-btn', { iconClass: 'chat-input-feature-btn-icon' });
        container.prepend(btn);
        const obs = addPlatformObserver(new MutationObserver(() => {
          const myBtn = container.querySelector('button[data-testid="composer-button-prompts"]');
          if (myBtn && container.firstElementChild !== myBtn) container.prepend(myBtn);
        }));
        obs.observe(container, { childList: true });
        return { wrapper: container, clickable: btn };
      },
    },
    {
      name: 'zai',
      test: () => location.hostname.includes('chat.z.ai'),
      editorSelector: 'textarea#chat-input',
      mount: async () => {
        const referenceElement = await waitFor('button[data-autothink="true"]', 8000);
        const container = referenceElement.closest('div');
        const btn = createLabeledButton(
          STR.prompt,
          'px-2 @xl:px-3 py-1.5 flex gap-1.5 items-center text-sm rounded-lg border transition-colors duration-300 focus:outline-hidden max-w-full overflow-hidden bg-transparent dark:text-gray-300 border-[#E5E5E5] dark:border-[#3C3E3F] hover:bg-black/5 dark:hover:bg-white/5'
        );
        container.appendChild(btn);
        return { wrapper: container, clickable: btn };
      },
    },
    {
      name: 'gemini',
      test: () => location.hostname.includes('gemini.google.com'),
      editorSelector: 'div.ql-editor[contenteditable="true"]',
      mount: async () => {
        const ref = await waitFor('uploader', 8000);
        const btn = createIconButton({
          className: 'mdc-icon-button mat-mdc-icon-button mat-mdc-button-base mat-primary mat-mdc-tooltip-trigger',
          size: 40, iconSize: 24,
        });
        ref.parentNode.insertBefore(btn, ref.nextSibling);
        const wrapper = ref.parentElement;
        if (wrapper) {
          wrapper.style.display = 'flex';
          wrapper.style.alignItems = 'center';
          wrapper.style.gap = '3px';
        }
        return { wrapper, clickable: btn };
      },
    },
    {
      name: 'lmarena',
      test: () => location.hostname.includes('lmarena.ai'),
      editorSelector: 'textarea[name="message"]',
      mount: async () => {
        const container = await waitFor('div[data-sentry-component="SelectChatModality"]', 8000);
        const btn = createIconButton({
          className: 'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium focus-visible:outline-none focus-visible:ring-2 ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-interactive-active border border-border-faint bg-transparent hover:text-interactive-normal active:text-text-tertiary h-8 w-8 p-2 rounded-md active:scale-[0.96] transition-colors duration-150 ease-out hover:shadow-sm hover:bg-interactive-normal/10 hover:border-interactive-normal/10',
        });
        container.appendChild(btn);
        return { wrapper: container, clickable: btn };
      },
    },
    {
      name: 'kimi',
      test: () => location.hostname.includes('kimi.com'),
      editorSelector: 'div.chat-input-editor[contenteditable="true"]',
      mount: async () => {
        const container = await waitFor('div.left-area', 8000);
        const btn = createLabeledButton(STR.prompt, 'deep-research-switch normal');
        const ensure = () => { if (!container.contains(btn)) container.appendChild(btn); };
        ensure();
        const obs = addPlatformObserver(new MutationObserver(ensure));
        obs.observe(container, { childList: true });
        return { wrapper: container, clickable: btn };
      },
    },
    {
      name: 'claude',
      test: () => location.hostname.includes('claude.ai'),
      editorSelector: 'div.ProseMirror[contenteditable="true"]',
      mount: async () => {
        const ref = await waitFor('button[data-testid="input-menu-plus"]', 8000);
        const mountEl = ref.closest('div.relative.shrink-0');
        const btn = createIconButton({
          className: 'border-0.5 transition-all h-8 min-w-8 rounded-lg flex items-center px-[7.5px] group !pointer-events-auto !outline-offset-1 text-text-300 border-border-300 hover:text-text-200/90 hover:bg-bg-100 active:scale-[0.98]',
          iconSize: 16,
        });
        mountEl.parentNode.insertBefore(btn, mountEl.nextSibling);
        return { wrapper: btn, clickable: btn };
      },
    },
    {
      name: 'grok',
      test: () => location.hostname.includes('grok.com'),
      editorSelector: 'div.tiptap.ProseMirror[contenteditable="true"]',
      mount: async () => {
        const attachBtn = await waitFor('button[aria-label="Attach"]', 8000);
        const bar = attachBtn.parentElement;
        const btn = createIconButton({ size: 40, iconSize: 20 });
        bar.appendChild(btn);
        return { wrapper: bar, clickable: btn };
      },
      getEditor: () => document.querySelector('div.tiptap.ProseMirror[contenteditable="true"]'),
    },
  ];

  // =========================
  // Init & Observers
  // =========================
  function detectPlatform() { for (const p of PLATFORMS) if (p.test()) return p; return null; }

  async function initUI() {
    cleanup();
    state.platform = detectPlatform();
    if (!state.platform) return;

    try {
      const { wrapper, clickable } = await state.platform.mount();
      if (!wrapper || !clickable) return;
      state.elements.wrapper = wrapper;
      state.elements.button = clickable;

      state.elements.menu = createPromptMenu();
      state.elements.modal = createPromptModal();
      state.elements.placeholderModal = createPlaceholderModal();
      document.body.append(state.elements.menu, state.elements.modal, state.elements.placeholderModal);

      // Settings init
      const settingsBtn = state.elements.menu.querySelector('#mp-btn-settings');
      const settingsPanel = state.elements.menu.querySelector('#mp-settings-panel');
      const addBtnTop = state.elements.menu.querySelector('#mp-btn-add');
      const importBtn = state.elements.menu.querySelector('#mp-btn-import');
      const exportBtn = state.elements.menu.querySelector('#mp-btn-export');

      // Wire menu header buttons
      addBtnTop?.addEventListener('click', (e) => { e.stopPropagation(); openPromptModal(); });
      settingsBtn?.addEventListener('click', (e) => { e.stopPropagation(); settingsPanel?.classList.toggle('mp-hidden'); });
      importBtn?.addEventListener('click', (e) => { e.stopPropagation(); importPrompts(); });
      exportBtn?.addEventListener('click', (e) => { e.stopPropagation(); exportPrompts(); });

      // Wire insertion mode radios
      const radios = state.elements.menu.querySelectorAll('input[name="mp-insert-mode"]');
      const s = await getSettings();
      radios.forEach(r => {
        r.checked = r.value === s.insertMode;
        r.addEventListener('change', async () => { if (r.checked) await setSettings({ insertMode: r.value }); });
      });

      // Open/close menu
      state.elements.button.addEventListener('click', (e) => {
        e.stopPropagation(); e.preventDefault();
        if (state.elements.menu.classList.contains('visible')) { closeMenu(); return; }
        refreshMenu().then(() => {
          state.elements.menu.querySelector('#mp-settings-panel')?.classList.add('mp-hidden');
          positionMenu(state.elements.menu, state.elements.button);
          state.elements.menu.classList.add('visible');
        });
      });

      // Modal events
      state.elements.modal.querySelector('#__ap_save').onclick = async (e) => {
        e.stopPropagation();
        const index = parseInt(state.elements.modal.dataset.index, 10);
        const title = document.getElementById('__ap_title').value.trim();
        const text = document.getElementById('__ap_text').value.trim();
        const usePlaceholders = document.getElementById('__ap_use_placeholders').checked;
        if (!title || !text) { alert(STR.requiredFields); return; }
        const op = index > -1 ? updateItem(index, { title, text, usePlaceholders }) : addItem({ title, text, usePlaceholders });
        op.then(() => { hideModal(state.elements.modal); refreshMenu(); });
      };
      state.elements.modal.querySelector('#__ap_close_prompt').onclick = (e) => { e.stopPropagation(); hideModal(state.elements.modal); };

      state.elements.placeholderModal.querySelector('#__ap_insert_prompt').onclick = async (e) => {
        e.stopPropagation();
        const item = JSON.parse(state.elements.placeholderModal.dataset.prompt);
        const idx = parseInt(state.elements.placeholderModal.dataset.index, 10);
        let completedText = item.text;
        const fields = state.elements.placeholderModal.querySelectorAll('#__ap_placeholders_container textarea');
        fields.forEach(t => {
          const ph = t.dataset.placeholder;
          const userValue = t.value;
          const regex = new RegExp(`\\[${ph.replace(/[\.\+\*?\[\^\]\$\(\)\{\}\=\!<>\|\:\-]/g, '\\$&')}\\]`, 'g');
          completedText = completedText.replace(regex, userValue);
        });
        await insertPrompt({ ...item, text: completedText }, idx);
        hideModal(state.elements.placeholderModal);
      };
      state.elements.placeholderModal.querySelector('#__ap_close_placeholder').onclick = (e) => { e.stopPropagation(); hideModal(state.elements.placeholderModal); };
    } catch (_) {
      cleanup();
    } finally {
      setupPageObserver();
    }
  }

  const debouncedTryInit = debounce(tryInit, 400);

  function setupPageObserver() {
    if (state.observers.page) state.observers.page.disconnect();
    state.observers.page = new MutationObserver(() => {
      if (state.elements.wrapper && !document.body.contains(state.elements.wrapper)) debouncedTryInit();
    });
    state.observers.page.observe(document.body, { childList: true, subtree: true });
  }

  function setupGlobalListeners() {
    document.addEventListener('click', (ev) => {
      if (!state.elements.menu || !state.elements.button) return;
      const settingsPanel = document.getElementById('mp-settings-panel');
      if (settingsPanel && !ev.target.closest('#mp-settings-panel, #mp-btn-settings')) {
        settingsPanel.classList.add('mp-hidden');
      }
      if (ev.target.closest('#prompt-menu-container, [data-testid="composer-button-prompts"]')) return;
      closeMenu();
    });
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        closeMenu();
        document.getElementById('mp-settings-panel')?.classList.add('mp-hidden');
        if (state.elements.modal?.classList.contains('visible')) hideModal(state.elements.modal);
        if (state.elements.placeholderModal?.classList.contains('visible')) hideModal(state.elements.placeholderModal);
      }
    });
    window.addEventListener('resize', debounce(() => {
      if (state.elements.menu?.classList.contains('visible') && state.elements.button) positionMenu(state.elements.menu, state.elements.button);
    }, 120));
  }

  function tryInit() {
    if (state.flags.initializing) return;
    state.flags.initializing = true;
    initUI().finally(() => { state.flags.initializing = false; });
  }

  function cleanup() {
    // Disconnect observers first
    try { state.observers.page?.disconnect(); } catch (_) {}
    state.observers.page = null;
    if (state.observers.platform?.length) {
      state.observers.platform.forEach(o => { try { o.disconnect(); } catch (_) {} });
      state.observers.platform = [];
    }
    // Remove DOM
    state.elements.wrapper?.remove(); state.elements.wrapper = null;
    state.elements.menu?.remove(); state.elements.menu = null;
    state.elements.modal?.remove(); state.elements.modal = null;
    state.elements.placeholderModal?.remove(); state.elements.placeholderModal = null;
    state.elements.button = null;
  }

  // =========================
  // Start
  // =========================
  function start() { injectGlobalStyles(); setupGlobalListeners(); tryInit(); }
  start();
})();
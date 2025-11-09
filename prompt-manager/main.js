// ==UserScript==
// @name         My Prompt
// @namespace    https://github.com/quantavil
// @version      2.0
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
// @require      https://update.greasyfork.org/scripts/549920.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
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
    fileName: 'My_Prompts.json'
  };

  const SCRIPT_CONFIG = {
    notificationsUrl: 'https://gist.github.com/0H4S/b2f9a9f92259deadc35bdccb11cd9a75',
    scriptVersion: '2.0',
  };
  const notifier = new ScriptNotifier(SCRIPT_CONFIG);
  notifier.run();

  const PROMPT_STORAGE_KEY = 'Prompts';

  let currentPlatform = null;     // { name, editorSelector, insertButton() }
  let currentButtonEl = null;     // The element inserted (wrapper or button) used for presence checks
  let clickableButton = null;     // The actual clickable button element
  let currentMenu = null;
  let currentModal = null;
  let currentPlaceholderModal = null;
  let pageObserver = null;
  let isInitializing = false;

  const policy = window.trustedTypes
    ? window.trustedTypes.createPolicy('MyPromptPolicy', { createHTML: s => s })
    : null;

  const setHTML = (el, html) => { if (el) el.innerHTML = policy ? policy.createHTML(html) : html; };

  const debounce = (fn, wait) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };

  function waitFor(selector, timeout = 8000) {
    return new Promise((resolve, reject) => {
      const found = document.querySelector(selector);
      if (found) return resolve(found);

      const timer = setTimeout(() => {
        obs.disconnect();
        reject(`Timeout waiting for ${selector}`);
      }, timeout);

      const obs = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearTimeout(timer);
          obs.disconnect();
          resolve(el);
        }
      });

      const startObs = () => obs.observe(document.body, { childList: true, subtree: true });
      if (document.body) startObs();
      else document.addEventListener('DOMContentLoaded', startObs);
    });
  }

  // =========================
  // Storage
  // =========================
  const getAll = async () => await GM_getValue(PROMPT_STORAGE_KEY, []);
  const setAll = async (arr) => await GM_setValue(PROMPT_STORAGE_KEY, arr);
  const addItem = async (item) => { const arr = await getAll(); arr.unshift(item); await setAll(arr); };
  const updateItem = async (index, item) => { const arr = await getAll(); if (arr[index]) { arr[index] = item; await setAll(arr); } };
  const removeItem = async (index) => { const arr = await getAll(); arr.splice(index, 1); await setAll(arr); };

  // =========================
  // Styles
  // =========================
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
      .mp-overlay {
        position: fixed; inset: 0; background: var(--mp-bg-overlay);
        z-index: 2147483647; display: flex; justify-content: center; align-items: center;
        backdrop-filter: blur(4px); opacity: 0; visibility: hidden;
        transition: opacity var(--mp-transition-fast), visibility var(--mp-transition-fast);
      }
      .mp-overlay.visible { opacity: 1; visibility: visible; }
      .mp-modal-box {
        font-family: var(--mp-font-family-base);
        background: var(--mp-bg-primary); color: var(--mp-text-primary);
        border-radius: var(--mp-border-radius-lg); padding: 24px; box-shadow: var(--mp-shadow-lg);
        width: min(90vw, 520px); border: 1px solid var(--mp-border-primary);
        transform: scale(.95) translateY(10px); opacity: 0;
        transition: transform var(--mp-transition-fast), opacity var(--mp-transition-fast);
        position: relative;
      }
      .mp-overlay.visible .mp-modal-box { transform: scale(1) translateY(0); opacity: 1; }
      .mp-modal-close-btn {
        position: absolute; top: 12px; right: 12px; background: none; border: none; color: var(--mp-text-tertiary);
        font-size: 22px; cursor: pointer; width: 32px; height: 32px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center; line-height: 1;
        transition: transform .3s ease, color .3s ease, background-color .3s ease;
      }
      .mp-modal-close-btn:hover { transform: rotate(90deg); color: var(--mp-accent-red); background-color: color-mix(in srgb, var(--mp-accent-red) 15%, transparent); }

      .prompt-menu {
        position: fixed; min-width: 320px; max-width: 420px; background: var(--mp-bg-primary);
        border: 1px solid var(--mp-border-primary); border-radius: var(--mp-border-radius-lg);
        box-shadow: var(--mp-shadow-lg); z-index: 2147483647; display: flex; flex-direction: column; overflow: hidden;
        color: var(--mp-text-primary); font-family: var(--mp-font-family-base);
        opacity: 0; visibility: hidden; transform: scale(.95); transform-origin: top left;
        transition: opacity .2s ease, transform .2s ease, visibility 0s linear .2s;
      }
      .prompt-menu.visible { opacity: 1; visibility: visible; transform: scale(1); transition-delay: 0s; }
      .prompt-menu-list { max-height: 220px; overflow-y: auto; padding: 4px; }
      .prompt-item-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: var(--mp-border-radius-md); cursor: pointer; transition: background-color .15s; }
      .prompt-item-row:hover { background: var(--mp-bg-tertiary); }
      .prompt-title { font-size: 14px; font-weight: 500; flex: 1; padding-right: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--mp-text-secondary); }
      .prompt-item-row:hover .prompt-title { color: var(--mp-text-primary); }
      .prompt-actions { display: flex; align-items: center; gap: 4px; }
      .action-btn { background: none; border: none; cursor: pointer; font-size: 13px; font-weight: 500; padding: 4px 8px; border-radius: var(--mp-border-radius-sm); }
      .action-btn.edit { color: var(--mp-accent-yellow); } .action-btn.edit:hover { background: var(--mp-accent-yellow); color: var(--mp-bg-primary); }
      .action-btn.delete{ color: var(--mp-accent-red); } .action-btn.delete:hover{ background: var(--mp-accent-red); color: var(--mp-bg-primary); }
      .menu-section, .menu-footer { border-top: 1px solid var(--mp-border-primary); padding: 4px; }
      .menu-button { display: flex; align-items: center; justify-content: center; padding: 8px 12px; cursor: pointer; color: var(--mp-text-secondary); border-radius: var(--mp-border-radius-md); font-size: 14px; font-weight: 500; transition: background-color .15s ease; }
      .menu-button:hover { background: var(--mp-bg-tertiary); color: var(--mp-text-primary); }
      .menu-button svg { margin-right: 8px; }
      .import-export-container { display: flex; }
      .import-export-container .menu-button { flex: 1; }
      .divider { border-left: 1px solid var(--mp-border-primary); height: 24px; align-self: center; }
      .empty-state { padding: 24px 16px; text-align: center; color: var(--mp-text-tertiary); font-size: 14px; }
      .form-group { display: flex; flex-direction: column; margin-bottom: 16px; }
      .form-label { margin-bottom: 6px; font-size: 13px; font-weight: 500; color: var(--mp-text-secondary); }
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
      .form-checkbox-group { display: flex; align-items: center; gap: 10px; margin-top: -8px; margin-bottom: 20px; }
      .form-checkbox-group label { font-size: 13px; font-weight: 500; color: var(--mp-text-secondary); cursor: pointer; margin-bottom: 0; }
      .form-checkbox-group input[type="checkbox"] { cursor: pointer; width: 16px; height: 16px; accent-color: var(--mp-accent-primary); }

      .mp-tooltip {
        position: fixed; z-index: 2147483647; border-radius: var(--mp-border-radius-sm); padding: 6px 12px; pointer-events: none; white-space: nowrap;
        font-family: var(--mp-font-family-base); font-size: 14px; font-weight: 500;
        background: var(--mp-text-primary); color: var(--mp-bg-primary); border: 1px solid var(--mp-bg-tertiary);
        opacity: 0; transform: scale(0.95); transition: opacity 150ms cubic-bezier(0.4,0,0.2,1), transform 150ms cubic-bezier(0.4,0,0.2,1);
      }
      .mp-tooltip.visible { opacity: 1; transform: scale(1); }

      #__ap_placeholders_container { max-height: 350px; overflow-y: auto; padding-right: 12px; margin-right: -12px; scrollbar-width: thin; scrollbar-color: var(--mp-border-secondary) var(--mp-bg-tertiary); }
      #__ap_placeholders_container::-webkit-scrollbar { width: 10px; height: 10px; }
      #__ap_placeholders_container::-webkit-scrollbar-track { background: var(--mp-bg-tertiary); border-radius: 10px; }
      #__ap_placeholders_container::-webkit-scrollbar-thumb { background: var(--mp-border-secondary); border-radius: 10px; border: 2px solid var(--mp-bg-primary); }
      #__ap_placeholders_container::-webkit-scrollbar-thumb:hover { background: var(--mp-text-tertiary); }

      /* New header and settings panel */
      .menu-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 8px; border-bottom: 1px solid var(--mp-border-primary);
      }
      .menu-title { font-size: 14px; font-weight: 600; color: var(--mp-text-secondary); }
      .menu-icons { display: flex; align-items: center; gap: 6px; }
      .icon-btn {
        width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center;
        border: none; background: transparent; color: var(--mp-text-tertiary);
        border-radius: var(--mp-border-radius-md); cursor: pointer;
        transition: background-color .15s ease, color .15s ease;
      }
      .icon-btn:hover { background: var(--mp-bg-tertiary); color: var(--mp-text-primary); }
      .settings-panel { padding: 4px; border-top: 1px solid var(--mp-border-primary); }
    `);
    document.head.appendChild(style);
  }

  // =========================
  // Tooltip
  // =========================
  function createTooltip(button, text, position = 'top') {
    let tt = null;
    const show = () => {
      if (tt) return;
      tt = document.createElement('div');
      tt.className = 'mp-tooltip';
      tt.textContent = text;
      document.body.appendChild(tt);
      const b = button.getBoundingClientRect();
      const r = tt.getBoundingClientRect();
      const margin = 8;
      let top = position === 'bottom' ? b.bottom + margin : b.top - r.height - margin;
      if (top < 0) top = b.bottom + margin;
      let left = b.left + b.width / 2 - r.width / 2;
      left = Math.max(margin, Math.min(left, window.innerWidth - r.width - margin));
      tt.style.left = `${left}px`;
      tt.style.top = `${top}px`;
      requestAnimationFrame(() => tt.classList.add('visible'));
    };
    const hide = () => {
      if (!tt) return;
      const el = tt; tt = null;
      el.classList.remove('visible');
      setTimeout(() => el.remove(), 150);
    };
    button.addEventListener('mouseenter', show);
    button.addEventListener('mouseleave', hide);
    button.addEventListener('mousedown', hide);
  }

  // =========================
  // UI Elements
  // =========================
  function createPromptMenu() {
    const menu = document.createElement('div');
    menu.className = 'prompt-menu';
    menu.id = 'prompt-menu-container';

    // Header
    const header = document.createElement('div');
    header.className = 'menu-header';

    const title = document.createElement('div');
    title.className = 'menu-title';
    title.textContent = STR.prompts;

    const icons = document.createElement('div');
    icons.className = 'menu-icons';

    const btnAdd = document.createElement('button');
    btnAdd.className = 'icon-btn';
    btnAdd.id = 'mp-btn-add';
    btnAdd.setAttribute('aria-label', STR.addPrompt);
    setHTML(btnAdd, `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `);

    const btnSettings = document.createElement('button');
    btnSettings.className = 'icon-btn';
    btnSettings.id = 'mp-btn-settings';
    btnSettings.setAttribute('aria-label', 'Settings');
    setHTML(btnSettings, `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M11.983 13.893a1.893 1.893 0 1 0 0-3.786 1.893 1.893 0 0 0 0 3.786Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M20.5 12a8.5 8.5 0 0 1-.09 1.227l1.498 1.164a.75.75 0 0 1 .18.969l-1.42 2.46a.75.75 0 0 1-.902.344l-1.764-.588a8.46 8.46 0 0 1-1.06.616l-.267 1.844a.75.75 0 0 1-.744.636h-2.84a.75.75 0 0 1-.744-.636l-.267-1.844a8.46 8.46 0 0 1-1.06-.616l-1.764.588a.75.75 0 0 1-.902-.345l-1.42-2.46a.75.75 0 0 1 .18-.968l1.498-1.164A8.5 8.5 0 0 1 3.5 12c0-.413.031-.818.09-1.217L2.092 9.619a.75.75 0 0 1-.18-.968l1.42-2.46a.75.75 0 0 1 .902-.345l1.764.588c.333-.227.691-.43 1.06-.616l.267-1.844A.75.75 0 0 1 8.067 3h2.84a.75.75 0 0 1 .744.636l.267 1.844c.369.186.727.389 1.06.616l1.764-.588a.75.75 0 0 1 .902.345l1.42 2.46a.75.75 0 0 1-.18.968l-1.498 1.164c.06.399.09.804.09 1.217Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `);

    icons.append(btnAdd, btnSettings);
    header.append(title, icons);

    // List container
    const list = document.createElement('div');
    list.className = 'prompt-menu-list';
    list.id = 'mp-list';

    // Settings panel (hidden by default)
    const settingsPanel = document.createElement('div');
    settingsPanel.className = 'settings-panel mp-hidden';
    settingsPanel.id = 'mp-settings-panel';

    const ie = document.createElement('div');
    ie.className = 'import-export-container';

    const exportBtn = document.createElement('div');
    exportBtn.className = 'menu-button';
    exportBtn.id = 'mp-btn-export';
    exportBtn.textContent = STR.export;

    const importBtn = document.createElement('div');
    importBtn.className = 'menu-button';
    importBtn.id = 'mp-btn-import';
    importBtn.textContent = STR.import;

    const divider = document.createElement('div');
    divider.className = 'divider';

    ie.append(exportBtn, divider, importBtn);
    settingsPanel.appendChild(ie);

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
      <div class="form-checkbox-group">
        <input type="checkbox" id="__ap_use_placeholders" />
        <label for="__ap_use_placeholders">${STR.enablePlaceholders}</label>
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

  function showModal(modal) {
    if (!modal) return;
    modal.classList.remove('mp-hidden');
    setTimeout(() => modal.classList.add('visible'), 10);
  }
  function hideModal(modal) {
    if (!modal) return;
    modal.classList.remove('visible');
    setTimeout(() => modal.classList.add('mp-hidden'), 200);
  }

  function openPromptModal(item = null, index = -1) {
    if (!currentModal) return;
    const isEditing = !!item;
    currentModal.dataset.index = index;
    currentModal.querySelector('.modal-title').textContent = isEditing ? STR.editPrompt : STR.newPrompt;
    document.getElementById('__ap_title').value = item?.title || '';
    document.getElementById('__ap_text').value = item?.text || '';
    document.getElementById('__ap_use_placeholders').checked = item?.usePlaceholders || false;
    showModal(currentModal);
    setTimeout(() => document.getElementById('__ap_title').focus(), 100);
  }

  function openPlaceholderModal(item, index, placeholders) {
    if (!currentPlaceholderModal) return;
    const container = document.getElementById('__ap_placeholders_container');
    setHTML(container, '');
    currentPlaceholderModal.dataset.prompt = JSON.stringify(item);
    currentPlaceholderModal.dataset.index = index;

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
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          document.getElementById('__ap_insert_prompt').click();
        }
      });
      group.appendChild(label);
      group.appendChild(textarea);
      container.appendChild(group);
    });

    showModal(currentPlaceholderModal);
    setTimeout(() => container.querySelector('textarea')?.focus(), 100);
  }

  // =========================
  // Helpers
  // =========================
  function closeMenu() {
    if (currentMenu?.classList.contains('visible')) currentMenu.classList.remove('visible');
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

  function createIconButtonBase() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-testid', 'composer-button-prompts');
    setHTML(btn, `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M4 5h12M4 10h12M4 15h12" stroke="currentColor" stroke-width="2"/></svg>`);
    return btn;
  }

  function createMenuButtonWrapper(withTooltip = true, position = 'top') {
    const btn = createIconButtonBase();
    btn.style.background = 'transparent';
    btn.style.border = 'none';
    btn.style.boxShadow = 'none';
    btn.style.borderRadius = '50%';
    btn.style.width = '32px';
    btn.style.height = '32px';
    btn.style.padding = '0';
    btn.style.margin = '0';
    btn.style.cursor = 'pointer';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.transition = 'background-color 150ms ease-in-out';
    if (withTooltip) createTooltip(btn, STR.prompts, position);
    return btn;
  }

  function editorIsContentEditable(editor) {
    return editor && editor.nodeType === 1 && editor.isContentEditable;
  }

  function setContentEditableText(editor, text) {
    editor.focus();
    setHTML(editor, '');
    const lines = String(text).split('\n');
    lines.forEach(line => {
      const p = document.createElement('p');
      if (line.trim() === '') p.appendChild(document.createElement('br'));
      else p.textContent = line;
      editor.appendChild(p);
    });
    editor.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  function moveCursorToEnd(editor) {
    setTimeout(() => {
      try {
        if (editorIsContentEditable(editor)) {
          const range = document.createRange();
          range.selectNodeContents(editor);
          range.collapse(false);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          editor.scrollTop = editor.scrollHeight;
        } else if (editor && typeof editor.value === 'string') {
          const len = editor.value.length;
          editor.selectionStart = editor.selectionEnd = len;
          editor.scrollTop = editor.scrollHeight;
        } else {
          editor?.focus();
        }
      } catch (_) { /* noop */ }
    }, 10);
  }

  // =========================
  // Menu Renderer
  // =========================
  async function refreshMenu() {
    if (!currentMenu) return;
    const list = currentMenu.querySelector('#mp-list') || (() => {
      const l = document.createElement('div');
      l.className = 'prompt-menu-list';
      l.id = 'mp-list';
      currentMenu.appendChild(l);
      return l;
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
      btnE.textContent = STR.edit;
      btnE.className = 'action-btn edit';
      btnE.onclick = (e) => { e.stopPropagation(); openPromptModal(p, index); };

      const btnD = document.createElement('button');
      btnD.textContent = STR.delete;
      btnD.className = 'action-btn delete';
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
  async function insertPrompt(promptItem, index) {
    // Get editor
    let editor = null;
    if (currentPlatform?.getEditor) editor = currentPlatform.getEditor();
    if (!editor && currentPlatform?.editorSelector) editor = document.querySelector(currentPlatform.editorSelector);

    if (!editor) { alert(STR.editorNotFound.replace('{platform}', currentPlatform?.name || 'this platform')); return; }

    editor.focus();
    setTimeout(() => {
      const ua = navigator.userAgent.toLowerCase();
      const isFirefox = ua.includes('firefox');
      const isCE = editorIsContentEditable(editor);

      if (isCE) {
        // Standard contenteditable handling (ProseMirror/Tiptap/Gemini/Claude/Kimi/Grok)
        setContentEditableText(editor, promptItem.text);
      } else if (isFirefox && currentPlatform?.name === 'chatgpt') {
        // Firefox + ChatGPT contenteditable used to require special handling; ChatGPT now uses textarea
        editor.value = promptItem.text;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        // Try paste event (covers most)
        try {
          const dt = new DataTransfer();
          dt.setData('text/plain', promptItem.text);
          editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
        } catch (_) { /* fallback below */ }

        // Fallback for textarea-like editors
        if (typeof editor.value === 'string' && editor.value !== promptItem.text) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
          setter ? setter.call(editor, promptItem.text) : (editor.value = promptItem.text);
          editor.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      moveCursorToEnd(editor);
    }, 50);

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
  function createChatGPTButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-testid', 'composer-button-prompts');
    btn.className = 'composer-btn';
    setHTML(btn, `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M4 5h12M4 10h12M4 15h12" stroke="currentColor" stroke-width="2"/></svg>`);
    createTooltip(btn, STR.prompts);
    return btn;
  }
  function createDeepSeekButton() {
    const btn = document.createElement('button');
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-disabled', 'false');
    btn.setAttribute('tabindex', '0');
    btn.style.transform = 'translateZ(0px)';
    btn.setAttribute('data-testid', 'composer-button-prompts');
    setHTML(btn, `
      <div style="font-size:14px;width:14px;height:14px;color:var(--dsw-alias-label-primary);margin-right:0;">
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path d="M4 5h12M4 10h12M4 15h12" stroke="currentColor" stroke-width="2"></path></svg>
      </div>
      <span><span>${STR.prompt}</span></span>
    `);
    return btn;
  }
  function createGoogleStudioButton() {
    const styleId = 'my-prompt-gstudio-hover-fix';
    if (!document.getElementById(styleId)) {
      const s = document.createElement('style');
      s.id = styleId;
      setHTML(s, `
        button[data-testid="composer-button-prompts"]:hover { background-color: rgba(60,64,67,0.08) !important; }
        @media (prefers-color-scheme: dark) {
          button[data-testid="composer-button-prompts"]:hover { background-color: rgba(232,234,237,0.08) !important; }
        }
      `);
      document.head.appendChild(s);
    }
    const btn = createMenuButtonWrapper(true);
    btn.style.width = '48px';
    btn.style.height = '48px';
    return btn;
  }
  function createQwenButton() {
    const btn = document.createElement('button');
    btn.className = 'chat-input-feature-btn';
    btn.setAttribute('data-testid', 'composer-button-prompts');
    setHTML(btn, `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" class="chat-input-feature-btn-icon" style="font-size:16px;"><path d="M4 5h12M4 10h12M4 15h12" stroke="currentColor" stroke-width="2"/></svg><span class="chat-input-feature-btn-text">${STR.prompt}</span>`);
    return btn;
  }
  function createZaiButton() {
    const wrap = document.createElement('div');
    setHTML(wrap, `<button type="button" class="px-2 @xl:px-3 py-1.5 flex gap-1.5 items-center text-sm rounded-lg border transition-colors duration-300 focus:outline-hidden max-w-full overflow-hidden bg-transparent dark:text-gray-300 border-[#E5E5E5] dark:border-[#3C3E3F] hover:bg-black/5 dark:hover:bg-white/5"><svg class="size-4" stroke-width="2" viewBox="0 0 24 24" fill="none"><path d="M9 17L3 12L9 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M15 17L21 12L15 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg><span class="hidden @sm:block whitespace-nowrap overflow-hidden text-ellipsis translate-y-[0.5px] mr-0.5">${STR.prompt}</span></button>`);
    const btn = wrap.firstElementChild;
    btn.setAttribute('data-testid', 'composer-button-prompts');
    return btn;
  }
  function createGeminiButton() {
    const btn = document.createElement('button');
    btn.setAttribute('data-testid', 'composer-button-prompts');
    btn.className = 'mdc-icon-button mat-mdc-icon-button mat-mdc-button-base mat-primary mat-mdc-tooltip-trigger';
    setHTML(btn, `<span class="mat-mdc-button-persistent-ripple mdc-icon-button__ripple"></span><span class="mat-icon" style="display:inline-flex;align-items:center;justify-content:center;"><svg style="width:24px;height:24px;" viewBox="0 0 20 20" fill="currentColor"><path d="M4 5h12M4 10h12M4 15h12" stroke="currentColor" stroke-width="2"></path></svg></span><span class="mat-focus-indicator"></span><span class="mat-mdc-button-touch-target"></span><span class="mat-ripple mat-mdc-button-ripple"></span>`);
    createTooltip(btn, STR.prompt, 'bottom');
    return btn;
  }
  function createLmarenaButton() {
    const btn = document.createElement('button');
    btn.setAttribute('data-testid', 'composer-button-prompts');
    btn.className = 'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium focus-visible:outline-none focus-visible:ring-2 ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-interactive-active border border-border-faint bg-transparent hover:text-interactive-normal active:text-text-tertiary h-8 w-8 p-2 rounded-md active:scale-[0.96] transition-colors duration-150 ease-out hover:shadow-sm hover:bg-interactive-normal/10 hover:border-interactive-normal/10';
    btn.type = 'button';
    setHTML(btn, `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path d="M4 5h12M4 10h12M4 15h12" stroke="currentColor" stroke-width="2"/></svg>`);
    createTooltip(btn, STR.prompt);
    return btn;
  }
  function createKimiButton() {
    const ref = document.querySelector('.deep-research-switch.normal');
    if (!ref) return null;
    const btn = ref.cloneNode(true);
    btn.setAttribute('data-testid', 'composer-button-prompts');
    const oldSvg = btn.querySelector('svg');
    const textSpan = btn.querySelector('span');
    const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    if (oldSvg) newSvg.setAttribute('class', oldSvg.getAttribute('class'));
    newSvg.setAttribute('width', '1em');
    newSvg.setAttribute('height', '1em');
    newSvg.setAttribute('viewBox', '0 0 20 20');
    newSvg.setAttribute('fill', 'currentColor');
    setHTML(newSvg, `<path d="M4 5h12M4 10h12M4 15h12" stroke="currentColor" stroke-width="2"/>`);
    if (oldSvg) oldSvg.replaceWith(newSvg);
    if (textSpan) textSpan.textContent = STR.prompt;
    return btn;
  }
  function createClaudeButton() {
    const wrapper = document.createElement('div');
    wrapper.className = 'relative shrink-0';
    setHTML(wrapper, `<button class="border-0.5 transition-all h-8 min-w-8 rounded-lg flex items-center px-[7.5px] group !pointer-events-auto !outline-offset-1 text-text-300 border-border-300 hover:text-text-200/90 hover:bg-bg-100 active:scale-[0.98]" data-testid="composer-button-prompts" type="button"><div class="flex flex-row items-center justify-center gap-1"><div style="transform:none;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path d="M4 5h12M4 10h12M4 15h12" stroke="currentColor" stroke-width="2"></path></svg></div></div></button>`);
    const btn = wrapper.querySelector('button');
    createTooltip(btn, STR.prompts);
    return wrapper;
  }

  // New: Grok (grok.com) button
  function createGrokButton() {
    const btn = createMenuButtonWrapper(true);
    btn.style.width = '40px';
    btn.style.height = '40px';
    return btn;
  }

  const PLATFORMS = [
    {
      name: 'chatgpt',
      test: () => location.hostname.includes('chatgpt.com'),
      editorSelector: '#prompt-textarea',
      insertButton: async () => {
        const container = await waitFor('div[class*="[grid-area:leading]"]');
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        const btn = createChatGPTButton();
        container.appendChild(btn);
        return { wrapper: btn, clickable: btn };
      },
    },
    {
      name: 'deepseek',
      test: () => location.hostname.includes('deepseek.com'),
      editorSelector: 'textarea.ds-scroll-area',
      insertButton: async () => {
        const container = (await waitFor('div:has(> input[type="file"])')).parentElement;
        const refButtons = Array.from(container.querySelectorAll('button:not([data-testid="composer-button-prompts"])'));
        const ref = refButtons[refButtons.length - 1];
        const btn = createDeepSeekButton();
        if (ref) btn.className = ref.className;
        ref?.insertAdjacentElement('afterend', btn);
        return { wrapper: container, clickable: btn };
      },
    },
    {
      name: 'googlestudio',
      test: () => location.hostname.includes('aistudio.google.com'),
      editorSelector: 'ms-autosize-textarea textarea',
      insertButton: async () => {
        const insertionPoint = (await waitFor('ms-add-chunk-menu', 5000)).closest('.button-wrapper');
        const wrapper = document.createElement('div');
        wrapper.className = 'button-wrapper';
        const btn = createGoogleStudioButton();
        wrapper.appendChild(btn);
        insertionPoint.parentElement?.appendChild(wrapper);
        const parent = insertionPoint.closest('.prompt-input-wrapper-container');
        if (parent) parent.style.alignItems = 'center';
        return { wrapper, clickable: btn };
      },
    },
    {
      name: 'qwen',
      test: () => location.hostname.includes('chat.qwen.ai'),
      editorSelector: 'textarea#chat-input',
      insertButton: async () => {
        const ref = await waitFor('button.websearch_button', 5000);
        const container = ref.parentElement;
        const btn = createQwenButton();
        container.prepend(btn);
        // Keep it first
        const obs = new MutationObserver(() => {
          const myBtn = container.querySelector('button[data-testid="composer-button-prompts"]');
          if (myBtn && container.firstElementChild !== myBtn) container.prepend(myBtn);
        });
        obs.observe(container, { childList: true });
        return { wrapper: container, clickable: btn };
      },
    },
    {
      name: 'zai',
      test: () => location.hostname.includes('chat.z.ai'),
      editorSelector: 'textarea#chat-input',
      insertButton: async () => {
        const referenceElement = await waitFor('button[data-autothink="true"]', 8000);
        const container = referenceElement.closest('div');
        const btn = createZaiButton();
        container.appendChild(btn);
        return { wrapper: container, clickable: btn };
      },
    },
    {
      name: 'gemini',
      test: () => location.hostname.includes('gemini.google.com'),
      editorSelector: 'div.ql-editor[contenteditable="true"]',
      insertButton: async () => {
        const ref = await waitFor('uploader', 8000);
        const btn = createGeminiButton();
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
      insertButton: async () => {
        const container = await waitFor('div[data-sentry-component="SelectChatModality"]', 8000);
        const btn = createLmarenaButton();
        container.appendChild(btn);
        return { wrapper: container, clickable: btn };
      },
    },
    {
      name: 'kimi',
      test: () => location.hostname.includes('kimi.com'),
      editorSelector: 'div.chat-input-editor[contenteditable="true"]',
      insertButton: async () => {
        const container = await waitFor('div.left-area', 8000);
        const btn = createKimiButton();
        if (!btn) return { wrapper: container, clickable: null };
        const ensure = () => { if (!container.contains(btn)) container.appendChild(btn); };
        ensure();
        const obs = new MutationObserver(ensure);
        obs.observe(container, { childList: true });
        return { wrapper: container, clickable: btn };
      },
    },
    {
      name: 'claude',
      test: () => location.hostname.includes('claude.ai'),
      editorSelector: 'div.ProseMirror[contenteditable="true"]',
      insertButton: async () => {
        const ref = await waitFor('button[data-testid="input-menu-plus"]', 8000);
        const mount = ref.closest('div.relative.shrink-0');
        const wrapper = createClaudeButton();
        mount.parentNode.insertBefore(wrapper, mount.nextSibling);
        const btn = wrapper.querySelector('button');
        return { wrapper, clickable: btn };
      },
    },
    {
      name: 'grok',
      test: () => location.hostname.includes('grok.com'),
      editorSelector: 'div.tiptap.ProseMirror[contenteditable="true"]',
      insertButton: async () => {
        // Attach next to the "Attach" button in the bottom controls
        const attachBtn = await waitFor('button[aria-label="Attach"]', 8000);
        const bar = attachBtn.parentElement;
        const btn = createGrokButton();
        bar.appendChild(btn);
        return { wrapper: bar, clickable: btn };
      },
      // Optional: if DOM is dynamic and editor is nested, provide a getter:
      getEditor: () => document.querySelector('div.tiptap.ProseMirror[contenteditable="true"]'),
    },
  ];

  // =========================
  // Init & Observers
  // =========================
  function detectPlatform() {
    for (const p of PLATFORMS) if (p.test()) return p;
    return null;
  }

  async function initUI() {
    cleanup();
    currentPlatform = detectPlatform();
    if (!currentPlatform) return;

    try {
      const { wrapper, clickable } = await currentPlatform.insertButton();
      if (!wrapper || !clickable) return;
      currentButtonEl = wrapper;
      clickableButton = clickable;

      currentMenu = createPromptMenu();
      currentModal = createPromptModal();
      currentPlaceholderModal = createPlaceholderModal();
      document.body.append(currentMenu, currentModal, currentPlaceholderModal);

      // Wire top header buttons once
      const addBtnTop = currentMenu.querySelector('#mp-btn-add');
      const settingsBtn = currentMenu.querySelector('#mp-btn-settings');
      const settingsPanel = currentMenu.querySelector('#mp-settings-panel');
      const importBtn = currentMenu.querySelector('#mp-btn-import');
      const exportBtn = currentMenu.querySelector('#mp-btn-export');

      if (addBtnTop) {
        createTooltip(addBtnTop, STR.addPrompt);
        addBtnTop.addEventListener('click', (e) => {
          e.stopPropagation();
          openPromptModal();
        });
      }
      if (settingsBtn) {
        createTooltip(settingsBtn, 'Settings');
        settingsBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          settingsPanel?.classList.toggle('mp-hidden');
        });
      }
      if (importBtn) {
        importBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          importPrompts();
        });
      }
      if (exportBtn) {
        exportBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          exportPrompts();
        });
      }

      // Open/close menu
      clickableButton.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (currentMenu.classList.contains('visible')) { closeMenu(); return; }
        refreshMenu().then(() => {
          // collapse settings each open
          currentMenu.querySelector('#mp-settings-panel')?.classList.add('mp-hidden');
          positionMenu(currentMenu, clickableButton);
          currentMenu.classList.add('visible');
        });
      });

      // Modal events
      currentModal.querySelector('#__ap_save').onclick = async (e) => {
        e.stopPropagation();
        const index = parseInt(currentModal.dataset.index, 10);
        const title = document.getElementById('__ap_title').value.trim();
        const text = document.getElementById('__ap_text').value.trim();
        const usePlaceholders = document.getElementById('__ap_use_placeholders').checked;
        if (!title || !text) { alert(STR.requiredFields); return; }
        const op = index > -1 ? updateItem(index, { title, text, usePlaceholders }) : addItem({ title, text, usePlaceholders });
        op.then(() => { hideModal(currentModal); refreshMenu(); });
      };
      currentModal.querySelector('#__ap_close_prompt').onclick = (e) => { e.stopPropagation(); hideModal(currentModal); };

      currentPlaceholderModal.querySelector('#__ap_insert_prompt').onclick = async (e) => {
        e.stopPropagation();
        const item = JSON.parse(currentPlaceholderModal.dataset.prompt);
        const idx = parseInt(currentPlaceholderModal.dataset.index, 10);
        let completedText = item.text;
        const fields = currentPlaceholderModal.querySelectorAll('#__ap_placeholders_container textarea');
        fields.forEach(t => {
          const ph = t.dataset.placeholder;
          const userValue = t.value;
          const regex = new RegExp(`\\[${ph.replace(/[\.\+\*?\[\^\]\$\(\)\{\}\=\!<>\|\:\-]/g, '\\$&')}\\]`, 'g');
          completedText = completedText.replace(regex, userValue);
        });
        await insertPrompt({ ...item, text: completedText }, idx);
        hideModal(currentPlaceholderModal);
      };
      currentPlaceholderModal.querySelector('#__ap_close_placeholder').onclick = (e) => { e.stopPropagation(); hideModal(currentPlaceholderModal); };
    } catch (_) {
      cleanup();
    } finally {
      setupPageObserver();
    }
  }

  const debouncedTryInit = debounce(tryInit, 400);

  function setupPageObserver() {
    if (pageObserver) pageObserver.disconnect();
    pageObserver = new MutationObserver(() => {
      if (currentButtonEl && !document.body.contains(currentButtonEl)) debouncedTryInit();
    });
    pageObserver.observe(document.body, { childList: true, subtree: true });
  }

  function setupGlobalListeners() {
    document.addEventListener('click', (ev) => {
      if (!currentMenu || !clickableButton) return;

      // Close settings panel if clicking outside it and its toggle
      const settingsPanel = document.getElementById('mp-settings-panel');
      if (settingsPanel && !ev.target.closest('#mp-settings-panel, #mp-btn-settings')) {
        settingsPanel.classList.add('mp-hidden');
      }

      // Close menu if clicking outside
      if (ev.target.closest('#prompt-menu-container, [data-testid="composer-button-prompts"]')) return;
      closeMenu();
    });
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        closeMenu();
        document.getElementById('mp-settings-panel')?.classList.add('mp-hidden');
        if (currentModal?.classList.contains('visible')) hideModal(currentModal);
        if (currentPlaceholderModal?.classList.contains('visible')) hideModal(currentPlaceholderModal);
      }
    });
    window.addEventListener('resize', debounce(() => {
      if (currentMenu?.classList.contains('visible') && clickableButton) positionMenu(currentMenu, clickableButton);
    }, 120));
  }

  function tryInit() {
    if (isInitializing) return;
    isInitializing = true;
    initUI().finally(() => { isInitializing = false; });
  }

  function cleanup() {
    if (currentButtonEl) { currentButtonEl.remove(); currentButtonEl = null; }
    if (currentMenu) { currentMenu.remove(); currentMenu = null; }
    if (currentModal) { currentModal.remove(); currentModal = null; }
    if (currentPlaceholderModal) { currentPlaceholderModal.remove(); currentPlaceholderModal = null; }
  }

  // =========================
  // Start
  // =========================
  function start() {
    injectGlobalStyles();
    setupGlobalListeners();
    tryInit();
  }
  start();
})();
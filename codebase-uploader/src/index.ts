declare function GM_registerMenuCommand(name: string, callback: () => void): void;

import { STYLESHEET } from './constants';
import { state, $, el, showToast, formatSize } from './state';
import { renderTree } from './tree';
import { ingestFiles, run, registerCopyModal } from './uploader';
import { DroppedFile } from './types';
import { settings, saveSettings, resetSettings } from './settings';
import { icon } from './icons';

let isOpen = false;
let isSettingsOpen = false;

const isMac = typeof navigator !== 'undefined' && (/Mac|iPhone|iPad|iPod/i.test(navigator.platform) || /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent));
const MAX_DRAG_FILES = 5000;

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: any = null;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── Open / Close ───

function openPanel() {
  isOpen = true;
  const overlay = $('cu-overlay');
  if (overlay) {
    overlay.classList.add('open');
    renderTree();
  }
}

function closePanel() {
  isOpen = false;
  const overlay = $('cu-overlay');
  if (overlay) overlay.classList.remove('open');
}

function togglePanel() { isOpen ? closePanel() : openPanel(); }

// ─── Folder picking ───

function pickFolder() {
  const input = document.createElement('input');
  input.type = 'file';
  input.webkitdirectory = true;
  input.multiple = true;
  input.addEventListener('change', e => {
    const target = e.target as HTMLInputElement;
    if (target.files) {
      if (target.files.length > MAX_DRAG_FILES) {
        if (!confirm(`You are selecting ${target.files.length} files. This may freeze the browser.\n\nAre you sure you want to proceed?`)) {
          return;
        }
      }
      ingestFiles(Array.from(target.files).map(f => ({ file: f, path: f.webkitRelativePath || f.name })));
      renderTree();
    }
  });
  input.click();
}

// ─── Drag & Drop ───

async function handleDrop(e: DragEvent, treePane: Element) {
  e.preventDefault();
  treePane.classList.remove('drag-over');
  if (!e.dataTransfer) return;
  const droppedFiles: DroppedFile[] = [];
  let fileCount = 0;
  let aborted = false;

  async function traverse(entry: any, prefix = '') {
    if (aborted) return;
    if (entry.isFile) {
      fileCount++;
      if (fileCount > MAX_DRAG_FILES) {
        aborted = true;
        if (confirm(`You are uploading more than ${MAX_DRAG_FILES} files. This might be a mistake (e.g., dropping a root directory or node_modules).\n\nDo you want to cancel the upload?`)) {
          droppedFiles.length = 0;
          return;
        } else {
          aborted = false;
        }
      }
      const file = await new Promise<File>(r => entry.file(r));
      if (aborted) return;
      droppedFiles.push({ file, path: prefix + file.name });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      let entries: any[] = [], batch: any[];
      do {
        batch = await new Promise<any[]>(r => reader.readEntries(r));
        entries = entries.concat(batch);
      } while (batch.length > 0 && !aborted);
      for (const child of entries) {
        if (aborted) break;
        await traverse(child, prefix + entry.name + '/');
      }
    }
  }

  await Promise.all(
    [...e.dataTransfer.items].filter(i => i.kind === 'file').map(i => i.webkitGetAsEntry?.()).filter(Boolean).map(entry => traverse(entry))
  );
  if (droppedFiles.length > 0) {
    ingestFiles(droppedFiles);
    renderTree();
  }
}

// ─── Tag Editor Component (Imperative, Trusted Types Safe) ───

function buildTagEditor(initialValue: string, onUpdate: (val: string) => void): HTMLElement {
  const container = el('div', { cls: 'cu-tag-editor' });
  const chips = el('div', { cls: 'cu-chips' });
  const input = el('input', { cls: 'cu-chip-input', type: 'text', placeholder: 'Add tag + Enter...' }) as HTMLInputElement;

  let tags = initialValue.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  const renderChips = () => {
    chips.textContent = '';
    tags.forEach(tag => {
      const chip = el('div', { cls: 'cu-chip', txt: tag });
      const remove = el('span', { cls: 'cu-chip-x' });
      remove.appendChild(icon('x', 10));
      remove.addEventListener('click', () => {
        tags = tags.filter(t => t !== tag);
        onUpdate(tags.join(','));
        renderChips();
      });
      chip.appendChild(remove);
      chips.appendChild(chip);
    });
  };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = input.value.trim().toLowerCase();
      if (val && !tags.includes(val)) {
        tags.push(val);
        onUpdate(tags.join(','));
        renderChips();
      }
      input.value = '';
    }
  });

  renderChips();
  container.append(chips, input);
  return container;
}

// ─── Update Shortcut Hint ───

function updateShortcutHint() {
  const hint = $('cu-kbd-hint');
  if (hint) {
    const key = (settings.shortcutKey || 'u').toUpperCase();
    hint.textContent = `${isMac ? '⌥⇧' : 'Alt+Shift+'}${key}`;
  }
}

// ─── Settings Panel Controller ───

function buildSettingsPane(): HTMLElement {
  const pane = el('div', { id: 'cu-settings-pane' });

  // Section 1: Limits & Hotkey
  pane.appendChild(el('div', { cls: 'cu-setting-section', txt: 'Limits & Shortcut' }));
  
  const limitRow = el('div', { cls: 'cu-setting-row' }, [
    el('label', { txt: 'Max uploads / chunks' }),
    el('input', { id: 'cu-set-maxChunks', type: 'number', value: String(settings.maxChunks) }),
  ]);
  limitRow.querySelector('input')?.addEventListener('change', e => {
    settings.maxChunks = Number((e.target as HTMLInputElement).value) || settings.maxChunks;
    saveSettings();
  });

  const sizeLabel = el('label', { txt: 'Max file size (bytes)' });
  const sizeHelper = el('span', { id: 'cu-size-helper', txt: ` (${formatSize(settings.maxFileBytes)})`, style: 'color: var(--accent-strong); font-size: 11.5px; margin-left: 6px;' });
  sizeLabel.appendChild(sizeHelper);

  const sizeRow = el('div', { cls: 'cu-setting-row' }, [
    sizeLabel,
    el('input', { id: 'cu-set-maxFileBytes', type: 'number', value: String(settings.maxFileBytes) }),
  ]);
  const sizeInput = sizeRow.querySelector('input');
  sizeInput?.addEventListener('input', e => {
    const bytes = Number((e.target as HTMLInputElement).value) || 0;
    sizeHelper.textContent = ` (${formatSize(bytes)})`;
  });
  sizeInput?.addEventListener('change', e => {
    settings.maxFileBytes = Number((e.target as HTMLInputElement).value) || settings.maxFileBytes;
    saveSettings();
  });

  const charRow = el('div', { cls: 'cu-setting-row' }, [
    el('label', { txt: 'Max characters per chunk' }),
    el('input', { id: 'cu-set-maxChunkChars', type: 'number', value: String(settings.maxChunkChars) }),
  ]);
  charRow.querySelector('input')?.addEventListener('change', e => {
    settings.maxChunkChars = Number((e.target as HTMLInputElement).value) || settings.maxChunkChars;
    saveSettings();
  });

  const shortcutRow = el('div', { cls: 'cu-setting-row' }, [
    el('label', { txt: 'Hotkey Letter (Alt+Shift+Key)' }),
    el('input', { id: 'cu-set-shortcutKey', type: 'text', value: settings.shortcutKey || 'u', maxLength: 1 }),
  ]);
  shortcutRow.querySelector('input')?.addEventListener('input', e => {
    const val = (e.target as HTMLInputElement).value.trim().toLowerCase();
    settings.shortcutKey = val || 'u';
    saveSettings();
    updateShortcutHint();
  });

  // Group inputs inline side-by-side (two items per grid row)
  const limitsGrid1 = el('div', { cls: 'cu-setting-grid' }, [limitRow, sizeRow]);
  const limitsGrid2 = el('div', { cls: 'cu-setting-grid' }, [charRow, shortcutRow]);

  pane.append(limitsGrid1, limitsGrid2);

  // Section 2: Filtering & Ingestion
  pane.appendChild(el('div', { cls: 'cu-setting-section', txt: 'Ignored Folders & Extensions' }));

  const folderLabel = el('label', { txt: 'Ignored folders' });
  const folderEditor = buildTagEditor(settings.ignoreFolders, val => {
    settings.ignoreFolders = val;
    saveSettings();
  });
  const extLabel = el('label', { txt: 'Ignored extensions' });
  const extEditor = buildTagEditor(settings.ignoreExts, val => {
    settings.ignoreExts = val;
    saveSettings();
  });

  pane.append(
    el('div', { cls: 'cu-setting-row' }, [folderLabel, folderEditor]),
    el('div', { cls: 'cu-setting-row' }, [extLabel, extEditor])
  );

  // Section 3: Options
  pane.appendChild(el('div', { cls: 'cu-setting-section', txt: 'Inclusion Options' }));

  const skipHiddenRow = el('div', { cls: 'cu-setting-row row-cb' }, [
    el('input', { id: 'cu-set-skipHidden', type: 'checkbox' }),
    el('label', { txt: 'Skip hidden files & folders' }),
  ]);
  const skipHiddenCb = skipHiddenRow.querySelector('input') as HTMLInputElement;
  skipHiddenCb.checked = settings.skipHidden;
  skipHiddenCb.addEventListener('change', () => {
    settings.skipHidden = skipHiddenCb.checked;
    saveSettings();
  });

  const includeBinRow = el('div', { cls: 'cu-setting-row row-cb' }, [
    el('input', { id: 'cu-set-includeBinary', type: 'checkbox' }),
    el('label', { txt: 'Include binary files (images, zip, etc.)' }),
  ]);
  const includeBinCb = includeBinRow.querySelector('input') as HTMLInputElement;
  includeBinCb.checked = settings.includeBinary;
  includeBinCb.addEventListener('change', () => {
    settings.includeBinary = includeBinCb.checked;
    saveSettings();
  });

  // Group checkboxes inline side-by-side using the same setting-grid class
  const optionsGrid = el('div', { cls: 'cu-setting-grid' }, [skipHiddenRow, includeBinRow]);
  pane.appendChild(optionsGrid);

  // Section 4: Custom Manifest Prompt
  pane.appendChild(el('div', { cls: 'cu-setting-section', txt: 'Custom Manifest Prompt' }));

  const promptRow = el('div', { cls: 'cu-setting-row' }, [
    el('label', { txt: 'Instructions prepended to manifest' }),
    el('textarea', { id: 'cu-set-customPrompt', placeholder: 'e.g. Please analyze this codebase for memory leaks...', rows: 3 }),
  ]);
  const promptTextarea = promptRow.querySelector('textarea') as HTMLTextAreaElement;
  promptTextarea.value = settings.customPrompt || '';
  promptTextarea.addEventListener('change', () => {
    settings.customPrompt = promptTextarea.value;
    saveSettings();
  });

  pane.appendChild(promptRow);

  // Reset Button
  const resetBtn = el('button', { cls: 'cu-reset-btn', txt: 'Reset to Defaults' });
  resetBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      resetSettings();
      updateShortcutHint();
      const parent = pane.parentElement;
      if (parent) {
        pane.remove();
        const newPane = buildSettingsPane();
        newPane.classList.add('open');
        parent.insertBefore(newPane, $('cu-footer'));
      }
      showToast('Settings reset to defaults.');
    }
  });
  pane.appendChild(el('div', { cls: 'cu-settings-footer' }, [resetBtn]));

  return pane;
}

function toggleSettings() {
  const treePane = $('cu-tree-pane');
  const toolbar = $('cu-toolbar');
  const actions = $('cu-actions');
  const settingsToggle = $('cu-settings-toggle');

  if (!treePane || !settingsToggle || !toolbar || !actions) return;

  const shadow = state.shadowRoot;
  if (!shadow) return;

  let settingsPane = $('cu-settings-pane');
  isSettingsOpen = !isSettingsOpen;

  if (isSettingsOpen) {
    if (!settingsPane) {
      settingsPane = buildSettingsPane();
      const footer = $('cu-footer');
      if (footer) footer.parentElement?.insertBefore(settingsPane, footer);
    }
    
    treePane.style.display = 'none';
    toolbar.style.display = 'none';
    actions.style.display = 'none';
    settingsPane.classList.add('open');
    settingsToggle.textContent = '';
    settingsToggle.appendChild(icon('arrowLeft', 16));
    settingsToggle.title = 'Back to Files';
  } else {
    treePane.style.display = 'block';
    toolbar.style.display = 'flex';
    actions.style.display = 'flex';
    if (settingsPane) settingsPane.classList.remove('open');
    settingsToggle.textContent = '';
    settingsToggle.appendChild(icon('settings', 16));
    settingsToggle.title = 'Settings';
    renderTree();
  }
}

// ─── Build UI (imperative DOM ── no innerHTML for Google Trusted Types) ───

function buildUI() {
  if (document.getElementById('codebase-uploader-root')) return;

  const $host = document.createElement('div');
  $host.id = 'codebase-uploader-root';
  $host.style.cssText = 'all:initial;position:fixed!important;top:0;left:0;width:0;height:0;z-index:2147483647!important;pointer-events:none;';

  const shadow = $host.attachShadow({ mode: 'open' });
  state.shadowRoot = shadow;

  const style = document.createElement('style');
  style.textContent = STYLESHEET;
  shadow.appendChild(style);

  // ── Header ──
  const closeBtn = el('button', { cls: 'cu-icon-btn', id: 'cu-close', title: 'Close (Esc)' });
  closeBtn.appendChild(icon('x', 16));

  const settingsBtn = el('button', { cls: 'cu-icon-btn', id: 'cu-settings-toggle', title: 'Settings' });
  settingsBtn.appendChild(icon('settings', 16));

  const kbdHint = el('span', { id: 'cu-kbd-hint', cls: 'cu-kbd', txt: `${isMac ? '⌥⇧' : 'Alt+Shift+'}U` });
  const header = el('div', { id: 'cu-header' }, [
    el('h3', { txt: 'Codebase Uploader' }),
    kbdHint,
    settingsBtn,
    closeBtn,
  ]);

  // ── Toolbar ──
  const searchInput = el('input', { id: 'cu-search', type: 'text', placeholder: 'Filter files…', autocomplete: 'off', spellcheck: false }) as HTMLInputElement;
  const addFolderBtn = el('button', { cls: 'cu-btn', id: 'cu-add-folder', txt: ' Folder' });
  addFolderBtn.insertBefore(icon('plus', 14), addFolderBtn.firstChild);
  const toolbar = el('div', { id: 'cu-toolbar' }, [searchInput, addFolderBtn]);

  // ── Action Bar (grouped buttons) ──
  const selAll = el('button', { cls: 'cu-btn', txt: 'All' });
  const selNone = el('button', { cls: 'cu-btn', txt: 'None' });
  const selectionGroup = el('div', { cls: 'cu-action-group' }, [selAll, selNone]);

  const expandAll = el('button', { cls: 'cu-btn', txt: 'Expand' });
  const collapseAll = el('button', { cls: 'cu-btn', txt: 'Collapse' });
  const viewGroup = el('div', { cls: 'cu-action-group' }, [expandAll, collapseAll]);

  const clearBtn = el('button', { cls: 'cu-btn cu-btn-danger', id: 'cu-clear', txt: 'Clear' });

  const actions = el('div', { id: 'cu-actions' }, [selectionGroup, viewGroup, clearBtn]);

  // ── Tree ──
  const dropzoneBtn = el('button', { cls: 'cu-btn cu-btn-primary', txt: 'Choose Folder' });
  const dropIcon = icon('folderOpen', 48);
  dropIcon.setAttribute('class', 'cu-drop-icon');

  const dropzone = el('div', { id: 'cu-dropzone' }, [
    dropIcon,
    el('strong', { txt: 'Drop a folder or click below' }),
    el('div', { cls: 'hint', txt: 'Text → markdown chunks · Binary → raw attachments' }),
    dropzoneBtn,
  ]);
  const treeList = el('div', { id: 'cu-tree-list' });
  const treeContent = el('div', { id: 'cu-tree-content' }, [dropzone, treeList]);
  const treePane = el('div', { id: 'cu-tree-pane', cls: 'cu-empty' }, [treeContent]);

  // ── Footer ──
  const stats = el('div', { id: 'cu-stats', txt: 'No files loaded.' });
  const chunkEstimate = el('div', { id: 'cu-chunk-estimate', txt: '—' });
  
  const downloadBtn = el('button', { cls: 'cu-btn', id: 'cu-download-btn', txt: ' Download' });
  downloadBtn.insertBefore(icon('download', 14), downloadBtn.firstChild);

  const copyBtn = el('button', { cls: 'cu-btn', id: 'cu-copy-btn', txt: ' Copy' });
  copyBtn.insertBefore(icon('copy', 14), copyBtn.firstChild);

  const uploadBtn = el('button', { cls: 'cu-btn cu-btn-primary', id: 'cu-upload-btn', txt: ' Upload' });
  uploadBtn.insertBefore(icon('zap', 14), uploadBtn.firstChild);

  const footer = el('div', { id: 'cu-footer' }, [stats, chunkEstimate, downloadBtn, copyBtn, uploadBtn]);

  // ── Assemble ──
  const panel = el('div', { id: 'cu-panel' }, [header, toolbar, actions, treePane, footer]);
  const overlay = el('div', { id: 'cu-overlay', role: 'dialog', 'aria-modal': 'true' }, [panel]);
  shadow.appendChild(overlay);

  document.documentElement.appendChild($host);

  // ─── Events ───
  closeBtn.addEventListener('click', closePanel);
  overlay.addEventListener('click', e => { if (e.target === overlay) closePanel(); });

  // Clear with double-tap confirm
  let clearTimer: any = null;
  clearBtn.addEventListener('click', () => {
    if (clearBtn.textContent === 'Clear') {
      clearBtn.textContent = 'Confirm?';
      clearTimer = setTimeout(() => { clearBtn.textContent = 'Clear'; }, 2500);
    } else {
      clearTimeout(clearTimer);
      clearBtn.textContent = 'Clear';
      state.allFiles = [];
      renderTree();
      showToast('Cleared.');
    }
  });

  settingsBtn.addEventListener('click', toggleSettings);
  addFolderBtn.addEventListener('click', pickFolder);
  dropzoneBtn.addEventListener('click', pickFolder);

  const onSearchInput = debounce(() => {
    state.searchQ = searchInput.value.trim().toLowerCase();
    renderTree();
  }, 150);
  searchInput.addEventListener('input', onSearchInput);

  selAll.addEventListener('click', () => { state.allFiles.forEach(f => (f.selected = true)); renderTree(); });
  selNone.addEventListener('click', () => { state.allFiles.forEach(f => (f.selected = false)); renderTree(); });

  expandAll.addEventListener('click', () => {
    state.allFiles.forEach(f => {
      const parts = f.path.split('/').slice(0, -1);
      let current = '';
      for (const part of parts) {
        current = current ? `${current}/${part}` : part;
        state.openFolders.add(current);
      }
    });
    renderTree();
  });
  collapseAll.addEventListener('click', () => { state.openFolders.clear(); renderTree(); });

  uploadBtn.addEventListener('click', () => run('upload'));
  copyBtn.addEventListener('click', () => run('copy'));
  downloadBtn.addEventListener('click', () => run('download'));

  // Drag & drop
  treePane.addEventListener('dragover', e => { e.preventDefault(); treePane.classList.add('drag-over'); });
  treePane.addEventListener('dragleave', () => treePane.classList.remove('drag-over'));
  treePane.addEventListener('drop', e => handleDrop(e as DragEvent, treePane));

  if (isOpen) openPanel();
  updateShortcutHint();

  // Re-attach if removed by SPA navigation
  new MutationObserver(() => {
    if (!document.getElementById('codebase-uploader-root')) buildUI();
  }).observe(document.documentElement, { childList: true });
}

function buildCopySidePane(chunks: File[]): HTMLElement {
  const pane = el('div', { id: 'cu-copy-side-pane' });

  const closeBtn = el('button', { cls: 'cu-icon-btn', id: 'cu-copy-side-pane-close', title: 'Close side panel' });
  closeBtn.appendChild(icon('x', 14));
  closeBtn.addEventListener('click', () => pane.remove());

  const header = el('div', { id: 'cu-copy-side-pane-header' }, [
    el('h3', { txt: 'Copy Parts' }),
    closeBtn
  ]);

  const body = el('div', { id: 'cu-copy-side-pane-body' });

  chunks.forEach((chunk, index) => {
    const info = el('div', { cls: 'cu-chunk-info' }, [
      el('span', { cls: 'cu-chunk-title', txt: `Part ${index + 1}: ${chunk.name}` }),
      el('span', { cls: 'cu-chunk-stats', txt: formatSize(chunk.size) })
    ]);

    const copyBtn = el('button', { cls: 'cu-chunk-copy-btn', txt: `Copy Part ${index + 1}` });
    copyBtn.insertBefore(icon('copy', 13), copyBtn.firstChild);

    copyBtn.addEventListener('click', async () => {
      try {
        const text = await chunk.text();
        await navigator.clipboard.writeText(text);
        
        copyBtn.textContent = ' Copied!';
        copyBtn.insertBefore(icon('zap', 13), copyBtn.firstChild);
        copyBtn.classList.add('copied');
        showToast(`Copied codebase Part ${index + 1}!`);
        
        setTimeout(() => {
          copyBtn.textContent = ` Copy Part ${index + 1}`;
          copyBtn.insertBefore(icon('copy', 13), copyBtn.firstChild);
          copyBtn.classList.remove('copied');
        }, 2000);
      } catch (err) {
        showToast('Failed to copy.', 'error');
      }
    });

    const row = el('div', { cls: 'cu-chunk-row' }, [info, copyBtn]);
    body.appendChild(row);
  });

  pane.appendChild(header);
  pane.appendChild(body);
  return pane;
}

registerCopyModal((chunks) => {
  const treePane = $('cu-tree-pane');
  if (treePane) {
    const existing = $('cu-copy-side-pane');
    if (existing) {
      existing.remove();
    } else {
      treePane.appendChild(buildCopySidePane(chunks));
    }
  }
});

// ─── Init ───
buildUI();

// Keyboard: Alt+Shift+Shortcut (e.g. Alt+Shift+U) to toggle, Escape to close
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && isOpen) {
    const active = state.shadowRoot?.activeElement || document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      (active as HTMLElement).blur();
      e.preventDefault();
      return;
    }
    closePanel();
    e.preventDefault();
  }
  const targetKey = (settings.shortcutKey || 'u').toLowerCase();
  if (e.altKey && e.shiftKey && e.key.toLowerCase() === targetKey) {
    togglePanel();
    e.preventDefault();
  }
});

GM_registerMenuCommand('📂 Toggle Codebase Uploader', togglePanel);

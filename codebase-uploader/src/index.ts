declare function GM_registerMenuCommand(name: string, callback: () => void): void;

import { STYLESHEET } from './constants';
import { state, $, el, showToast } from './state';
import { renderTree, invalidateTreeCache } from './tree';
import { ingestFiles, run } from './uploader';
import { DroppedFile } from './types';
import { settings, saveSettings } from './settings';

let $host: HTMLDivElement;
let isOpen = false;
let isSettingsOpen = false;

// --- Modal open/close ---

function openModal() {
  isOpen = true;
  const overlay = $('cu-overlay');
  if (overlay) {
    overlay.classList.add('open');
    renderTree();
  }
}

// --- Folder picking ---

function pickFolder() {
  const input = document.createElement('input');
  input.type = 'file';
  input.webkitdirectory = true;
  input.multiple = true;
  input.addEventListener('change', e => {
    const target = e.target as HTMLInputElement;
    if (target.files) {
      ingestFiles(Array.from(target.files).map(f => ({ file: f, path: f.webkitRelativePath || f.name })));
      renderTree();
    }
  });
  input.click();
}

function closeModal() {
  isOpen = false;
  const overlay = $('cu-overlay');
  if (overlay) overlay.classList.remove('open');
}

// --- Drag & Drop ---

async function handleDrop(e: DragEvent, treePane: Element) {
  e.preventDefault();
  treePane.classList.remove('drag-over');
  if (!e.dataTransfer) return;
  const droppedFiles: DroppedFile[] = [];

  async function traverse(entry: any, prefix = '') {
    if (entry.isFile) {
      const file = await new Promise<File>(r => entry.file(r));
      droppedFiles.push({ file, path: prefix + file.name });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      let entries: any[] = [], batch: any[];
      do { batch = await new Promise<any[]>(r => reader.readEntries(r)); entries = entries.concat(batch); } while (batch.length > 0);
      for (const child of entries) await traverse(child, prefix + entry.name + '/');
    }
  }

  await Promise.all(
    [...e.dataTransfer.items].filter(i => i.kind === 'file').map(i => i.webkitGetAsEntry?.()).filter(Boolean).map(entry => traverse(entry))
  );
  ingestFiles(droppedFiles);
  renderTree();
}

// --- Settings UI controller ---

function renderSettingsPane() {
  const treePane = $('cu-tree-pane');
  const toolbar = $('cu-toolbar');
  const subbar = $('cu-subbar');
  const settingsPane = $('cu-settings-pane');
  const settingsToggle = $('cu-settings-toggle');

  if (!treePane || !settingsPane || !settingsToggle || !toolbar || !subbar) return;

  if (isSettingsOpen) {
    treePane.style.display = 'none';
    toolbar.style.display = 'none';
    subbar.style.display = 'none';
    settingsPane.style.display = 'flex';
    settingsToggle.textContent = '📁';
    settingsToggle.title = 'Back to Files';

    ($('cu-set-max-chunks') as HTMLInputElement).value = String(settings.maxChunks);
    ($('cu-set-max-file-bytes') as HTMLInputElement).value = String(settings.maxFileBytes);
    ($('cu-set-max-chunk-chars') as HTMLInputElement).value = String(settings.maxChunkChars);
    ($('cu-set-ignore-folders') as HTMLInputElement).value = settings.ignoreFolders;
    ($('cu-set-ignore-exts') as HTMLInputElement).value = settings.ignoreExts;
    ($('cu-set-skip-hidden') as HTMLInputElement).checked = settings.skipHidden;
    ($('cu-set-include-binary') as HTMLInputElement).checked = settings.includeBinary;
    ($('cu-set-show-fab') as HTMLInputElement).checked = settings.showFab;
  } else {
    treePane.style.display = 'block';
    toolbar.style.display = 'flex';
    subbar.style.display = 'flex';
    settingsPane.style.display = 'none';
    settingsToggle.textContent = '⚙';
    settingsToggle.title = 'Settings';

    settings.maxChunks = Number(($('cu-set-max-chunks') as HTMLInputElement).value) || 10;
    settings.maxFileBytes = Number(($('cu-set-max-file-bytes') as HTMLInputElement).value) || 2000000;
    settings.maxChunkChars = Number(($('cu-set-max-chunk-chars') as HTMLInputElement).value) || 480000;
    settings.ignoreFolders = ($('cu-set-ignore-folders') as HTMLInputElement).value;
    settings.ignoreExts = ($('cu-set-ignore-exts') as HTMLInputElement).value;
    settings.skipHidden = ($('cu-set-skip-hidden') as HTMLInputElement).checked;
    settings.includeBinary = ($('cu-set-include-binary') as HTMLInputElement).checked;
    settings.showFab = ($('cu-set-show-fab') as HTMLInputElement).checked;
    saveSettings();

    const fab = $('cu-fab');
    if (fab) fab.style.display = settings.showFab ? 'flex' : 'none';

    invalidateTreeCache();
    renderTree();
  }
}

// --- Build UI (programmatic, no innerHTML — bypasses Trusted Types on Google sites) ---

function buildUI() {
  if (document.getElementById('codebase-uploader-root')) return;

  $host = document.createElement('div');
  $host.id = 'codebase-uploader-root';
  $host.style.cssText = 'all:initial;position:fixed!important;top:0;left:0;width:0;height:0;z-index:2147483647!important;pointer-events:none;';
  
  // Use open shadow DOM
  const shadow = $host.attachShadow({ mode: 'open' });
  state.shadowRoot = shadow;

  // Inject STYLESHEET
  const style = document.createElement('style');
  style.textContent = STYLESHEET;
  shadow.appendChild(style);

  // FAB
  const fab = el('button', { id: 'cu-fab', title: 'Codebase Uploader', txt: '📂' });
  fab.style.display = settings.showFab ? 'flex' : 'none';
  shadow.appendChild(fab);

  // Overlay + Modal
  const closeBtn = el('button', { cls: 'cu-icon-btn', id: 'cu-close', title: 'Close', txt: '✕' });
  const settingsToggleBtn = el('button', { cls: 'cu-icon-btn', id: 'cu-settings-toggle', title: 'Settings', txt: '⚙' });
  const clearBtn = el('button', { cls: 'cu-btn cu-btn-sm cu-btn-danger', id: 'cu-clear', txt: 'Clear' });
  const header = el('div', { id: 'cu-header' }, [
    el('h3', { txt: '⚡ Codebase Uploader' }), clearBtn, settingsToggleBtn, closeBtn
  ]);

  const searchInput = el('input', { id: 'cu-search', type: 'text', placeholder: '🔍  Filter files…', autocomplete: 'off', spellcheck: false }) as HTMLInputElement;
  const addFolderBtn = el('button', { cls: 'cu-btn cu-btn-sm', id: 'cu-add-folder', txt: '📁 Add Folder' });
  const toolbar = el('div', { id: 'cu-toolbar' }, [searchInput, addFolderBtn]);

  const selAll = el('button', { cls: 'cu-btn cu-btn-sm', id: 'cu-sel-all', txt: '✔ All' });
  const selNone = el('button', { cls: 'cu-btn cu-btn-sm', id: 'cu-sel-none', txt: '✗ None' });
  const selText = el('button', { cls: 'cu-btn cu-btn-sm', id: 'cu-sel-text', txt: '📝 Text only' });
  const selBin = el('button', { cls: 'cu-btn cu-btn-sm', id: 'cu-sel-bin', txt: '📎 Binary only' });
  const expandAll = el('button', { cls: 'cu-btn cu-btn-sm', id: 'cu-expand-all', txt: '▾ Expand' });
  const collapseAll = el('button', { cls: 'cu-btn cu-btn-sm', id: 'cu-collapse-all', txt: '▸ Collapse' });
  const subbar = el('div', { id: 'cu-subbar' }, [selAll, selNone, selText, selBin, expandAll, collapseAll]);

  const dropzoneBtn = el('button', { cls: 'cu-btn cu-btn-primary', id: 'cu-dropzone-btn', txt: 'Choose Folder' });
  const dropzone = el('div', { id: 'cu-dropzone' }, [
    el('div', { cls: 'icon', txt: '📂' }),
    el('strong', { txt: 'Add a folder to get started' }),
    el('div', { cls: 'hint', txt: 'Drag & drop a folder here, or click below. Text files → markdown chunks; binary files → raw attachments.' }),
    dropzoneBtn
  ]);
  const treeList = el('div', { id: 'cu-tree-list' });
  const treePane = el('div', { id: 'cu-tree-pane', cls: 'cu-empty' }, [dropzone, treeList]);

  // Settings Panel Inputs
  const settingsPane = el('div', { id: 'cu-settings-pane' }, [
    el('div', { cls: 'cu-setting-row' }, [
      el('label', { txt: 'Max Chunks / Uploads Limit' }),
      el('input', { id: 'cu-set-max-chunks', type: 'number' })
    ]),
    el('div', { cls: 'cu-setting-row' }, [
      el('label', { txt: 'Max File Size (Bytes)' }),
      el('input', { id: 'cu-set-max-file-bytes', type: 'number' })
    ]),
    el('div', { cls: 'cu-setting-row' }, [
      el('label', { txt: 'Max Characters Per Chunk' }),
      el('input', { id: 'cu-set-max-chunk-chars', type: 'number' })
    ]),
    el('div', { cls: 'cu-setting-row' }, [
      el('label', { txt: 'Ignore Folders (comma-separated)' }),
      el('input', { id: 'cu-set-ignore-folders', type: 'text' })
    ]),
    el('div', { cls: 'cu-setting-row' }, [
      el('label', { txt: 'Ignore Extensions (comma-separated)' }),
      el('input', { id: 'cu-set-ignore-exts', type: 'text' })
    ]),
    el('div', { cls: 'cu-setting-row row-cb' }, [
      el('input', { id: 'cu-set-skip-hidden', type: 'checkbox' }),
      el('label', { txt: 'Skip hidden files & folders' })
    ]),
    el('div', { cls: 'cu-setting-row row-cb' }, [
      el('input', { id: 'cu-set-include-binary', type: 'checkbox' }),
      el('label', { txt: 'Include binary files' })
    ]),
    el('div', { cls: 'cu-setting-row row-cb' }, [
      el('input', { id: 'cu-set-show-fab', type: 'checkbox' }),
      el('label', { txt: 'Show Floating Action Button (FAB)' })
    ])
  ]);

  const stats = el('div', { id: 'cu-stats', txt: 'No files selected.' });
  const chunkEstimate = el('div', { id: 'cu-chunk-estimate', txt: '—' });
  const downloadBtn = el('button', { cls: 'cu-btn cu-btn-sm', id: 'cu-download-btn', txt: '⬇ Download' });
  const uploadBtn = el('button', { cls: 'cu-btn cu-btn-sm cu-btn-primary', id: 'cu-upload-btn', txt: '⚡ Upload' });
  const footer = el('div', { id: 'cu-footer' }, [stats, chunkEstimate, downloadBtn, uploadBtn]);

  const modal = el('div', { id: 'cu-modal' }, [header, toolbar, subbar, treePane, settingsPane, footer]);
  const overlay = el('div', { id: 'cu-overlay', role: 'dialog', 'aria-modal': 'true' }, [modal]);
  shadow.appendChild(overlay);

  document.documentElement.appendChild($host);

  // --- Event listeners ---
  fab.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  // Custom Double-click Clear Confirmation
  let clearTimer: any = null;
  clearBtn.addEventListener('click', () => {
    if (clearBtn.textContent === 'Clear') {
      clearBtn.textContent = 'Confirm?';
      clearBtn.classList.add('confirm-state');
      clearTimer = setTimeout(() => {
        clearBtn.textContent = 'Clear';
        clearBtn.classList.remove('confirm-state');
      }, 3000);
    } else {
      clearTimeout(clearTimer);
      clearBtn.textContent = 'Clear';
      clearBtn.classList.remove('confirm-state');
      state.allFiles = [];
      invalidateTreeCache();
      renderTree();
      showToast('Cleared codebase ingestion.');
    }
  });

  settingsToggleBtn.addEventListener('click', () => {
    isSettingsOpen = !isSettingsOpen;
    renderSettingsPane();
  });

  addFolderBtn.addEventListener('click', pickFolder);
  dropzoneBtn.addEventListener('click', pickFolder);

  searchInput.addEventListener('input', () => {
    state.searchQ = searchInput.value.trim().toLowerCase();
    renderTree();
  });

  selAll.addEventListener('click', () => { state.allFiles.forEach(f => (f.selected = true)); renderTree(); });
  selNone.addEventListener('click', () => { state.allFiles.forEach(f => (f.selected = false)); renderTree(); });
  selText.addEventListener('click', () => { state.allFiles.forEach(f => (f.selected = !f.isBinary)); renderTree(); });
  selBin.addEventListener('click', () => { state.allFiles.forEach(f => (f.selected = f.isBinary)); renderTree(); });

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

  uploadBtn.addEventListener('click', () => run(false));
  downloadBtn.addEventListener('click', () => run(true));

  treePane.addEventListener('dragover', e => { e.preventDefault(); treePane.classList.add('drag-over'); });
  treePane.addEventListener('dragleave', () => treePane.classList.remove('drag-over'));
  treePane.addEventListener('drop', e => handleDrop(e as DragEvent, treePane));

  if (isOpen) openModal();
}

function toggleFab() {
  settings.showFab = !settings.showFab;
  saveSettings();
  const fab = $('cu-fab');
  if (fab) {
    fab.style.display = settings.showFab ? 'flex' : 'none';
  }
}

// --- Init ---
buildUI();

window.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.removedNodes) {
      if (node === $host || (node instanceof HTMLElement && node.id === 'codebase-uploader-root')) { buildUI(); return; }
    }
  }
}).observe(document.documentElement, { childList: true });

GM_registerMenuCommand('📂 Toggle Codebase Uploader', () => { isOpen ? closeModal() : openModal(); });
GM_registerMenuCommand('⚙ Toggle Floating Button (FAB)', toggleFab);

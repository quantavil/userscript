declare function GM_registerMenuCommand(name: string, callback: () => void): void;

import { STYLESHEET } from './constants';
import { state, $, el, showToast, formatSize } from './state';
import { renderTree } from './tree';
import { ingestFiles, run, registerCopyModal, copyFileToClipboard } from './uploader';
import { DroppedFile } from './types';
import { settings, saveSettings, resetSettings } from './settings';
import { icon } from './icons';

let isOpen = false;
let isSettingsOpen = false;
let previouslyFocusedElement: HTMLElement | null = null;

const isMac = typeof navigator !== 'undefined' && (/Mac|iPhone|iPad|iPod/i.test(navigator.platform) || /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent));
const MAX_DRAG_FILES = 5000;

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: any = null;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── Open / Close & Focus Trap [UX-01] ───

function handleFocusTrap(e: KeyboardEvent) {
  if (!isOpen || !state.shadowRoot) return;
  const overlay = $('cu-overlay');
  if (!overlay || !overlay.classList.contains('open')) return;

  const selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const candidates = Array.from(state.shadowRoot.querySelectorAll<HTMLElement>(selector));
  const focusables = candidates.filter(el => el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0);

  if (focusables.length === 0) {
    e.preventDefault();
    return;
  }

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = state.shadowRoot.activeElement as HTMLElement | null;

  if (e.shiftKey) {
    if (!active || active === first || !overlay.contains(active)) {
      e.preventDefault();
      last.focus();
    }
  } else {
    if (!active || active === last || !overlay.contains(active)) {
      e.preventDefault();
      first.focus();
    }
  }
}

function openPanel() {
  isOpen = true;
  previouslyFocusedElement = document.activeElement as HTMLElement | null;
  const overlay = $('cu-overlay');
  if (overlay) {
    overlay.classList.add('open');
    renderTree();
    requestAnimationFrame(() => {
      const search = $('cu-search') as HTMLElement | null;
      if (search) {
        search.focus();
      } else {
        const closeBtn = $('cu-close') as HTMLElement | null;
        closeBtn?.focus();
      }
    });
  }
}

function closePanel() {
  isOpen = false;
  const overlay = $('cu-overlay');
  if (overlay) overlay.classList.remove('open');
  if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
    previouslyFocusedElement.focus();
    previouslyFocusedElement = null;
  }
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
      const remove = el('span', { cls: 'cu-chip-x', tabindex: '0', role: 'button', 'aria-label': `Remove ${tag} tag` });
      remove.appendChild(icon('x', 10));
      const handleRemoveTag = () => {
        tags = tags.filter(t => t !== tag);
        onUpdate(tags.join(','));
        renderChips();
      };
      remove.addEventListener('click', handleRemoveTag);
      remove.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleRemoveTag();
        }
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
        parent.appendChild(newPane);
      }
      showToast('Settings reset to defaults.');
    }
  });
  pane.appendChild(el('div', { cls: 'cu-settings-footer' }, [resetBtn]));

  return pane;
}

function toggleSettings() {
  const workspacePane = $('cu-workspace-pane');
  const settingsToggle = $('cu-settings-toggle');
  const commandLayout = $('cu-command-layout');

  if (!workspacePane || !settingsToggle || !commandLayout || !state.shadowRoot) return;

  let settingsPane = $('cu-settings-pane');
  isSettingsOpen = !isSettingsOpen;

  if (isSettingsOpen) {
    if (!settingsPane) {
      settingsPane = buildSettingsPane();
      commandLayout.appendChild(settingsPane);
    }
    
    workspacePane.style.display = 'none';
    settingsPane.classList.add('open');
    settingsToggle.textContent = '';
    settingsToggle.appendChild(icon('arrowLeft', 16));
    settingsToggle.title = 'Back to Workspace';
  } else {
    workspacePane.style.display = 'flex';
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

  const dotIcon = icon('dot', 12);
  dotIcon.style.color = '#3CD070';
  const statusBadge = el('span', { id: 'cu-status-online', cls: 'cu-status-online' }, [
    dotIcon,
    document.createTextNode('ONLINE')
  ]);
  const titleHeading = el('h3', {}, [
    document.createTextNode('[ CODEBASE_UPLOADER // SYS_REV_1.4.0 ] '),
    statusBadge
  ]);
  const headerSpace = el('div', { id: 'cu-header-space' });
  const kbdHint = el('span', { id: 'cu-kbd-hint', cls: 'cu-kbd', txt: `${isMac ? '⌥⇧' : 'Alt+Shift+'}U` });
  const header = el('div', { id: 'cu-header' }, [
    titleHeading,
    headerSpace,
    kbdHint,
    settingsBtn,
    closeBtn,
  ]);

  // ── Telemetry HUD ──
  const hudHeader = el('div', { cls: 'cu-setting-section', txt: '[ TELEMETRY // HUD ]' });
  const asciiMeter = el('div', { id: 'cu-ascii-meter', cls: 'cu-ascii-meter', txt: '[............] 0%' });

  const filesCard = el('div', { cls: 'cu-metric-card' }, [
    el('span', { cls: 'cu-metric-label', txt: 'Total Files' }),
    el('span', { id: 'cu-stat-files', cls: 'cu-metric-value', txt: '0 / 0' })
  ]);
  const chunksCard = el('div', { cls: 'cu-metric-card' }, [
    el('span', { cls: 'cu-metric-label', txt: 'Text Chunks' }),
    el('span', { id: 'cu-stat-chunks', cls: 'cu-metric-value', txt: '0' })
  ]);
  const payloadCard = el('div', { cls: 'cu-metric-card' }, [
    el('span', { cls: 'cu-metric-label', txt: 'Payload Size' }),
    el('span', { id: 'cu-stat-payload', cls: 'cu-metric-value', txt: '0 B' })
  ]);
  const dataReadouts = el('div', { id: 'cu-data-readouts', style: 'display: flex; flex-direction: column; gap: 8px;' }, [
    filesCard, chunksCard, payloadCard
  ]);

  const presetAll = el('button', { cls: 'cu-preset-chip', txt: '[ALL]' });
  const presetCode = el('button', { cls: 'cu-preset-chip', txt: '[CODE]' });
  const presetDocs = el('button', { cls: 'cu-preset-chip', txt: '[DOCS]' });
  const presetsBar = el('div', { id: 'cu-presets-bar', style: 'display: flex; gap: 6px; flex-wrap: wrap;' }, [
    presetAll, presetCode, presetDocs
  ]);

  const dropzoneBtn = el('button', { cls: 'cu-btn cu-btn-primary', style: 'width: 100%; margin-top: 8px;' }, [
    el('span', { txt: '+ DROP FOLDER MATRIX HERE' })
  ]);
  const industrialDropzone = el('div', { id: 'cu-dropzone-box', style: 'margin-top: auto; padding: 14px 10px; border: 1px dashed #222638; background: #06070a; border-radius: 2px; text-align: center;' }, [
    el('div', { cls: 'hint', txt: 'Drag folder matrix or click below', style: 'font-size: 11px; margin-bottom: 8px; color: var(--text-tertiary); font-family: var(--font-mono);' }),
    dropzoneBtn
  ]);

  const telemetryPane = el('div', { id: 'cu-telemetry-pane' }, [
    hudHeader,
    asciiMeter,
    dataReadouts,
    el('div', { cls: 'cu-setting-section', txt: '[ PRESETS ]', style: 'margin-top: 8px;' }),
    presetsBar,
    industrialDropzone
  ]);

  // ── Workspace ──
  const searchInput = el('input', { id: 'cu-search', type: 'text', placeholder: 'FILTER_QUERY: ', autocomplete: 'off', spellcheck: false }) as HTMLInputElement;
  const matchCounter = el('span', { id: 'cu-match-counter', cls: 'cu-kbd', txt: '[MATCHES: 0]' });
  const toolbar = el('div', { id: 'cu-toolbar' }, [searchInput, matchCounter]);

  const selAll = el('button', { cls: 'cu-btn', txt: '[ALL]' });
  const selNone = el('button', { cls: 'cu-btn', txt: '[NONE]' });
  const selectionGroup = el('div', { cls: 'cu-action-group' }, [selAll, selNone]);

  const expandAll = el('button', { cls: 'cu-btn', txt: '[EXPAND]' });
  const collapseAll = el('button', { cls: 'cu-btn', txt: '[COLLAPSE]' });
  const viewGroup = el('div', { cls: 'cu-action-group' }, [expandAll, collapseAll]);

  const clearBtn = el('button', { cls: 'cu-btn cu-btn-danger', id: 'cu-clear', txt: '[RESET]' });

  const actions = el('div', { id: 'cu-actions' }, [selectionGroup, viewGroup, clearBtn]);

  const dropzoneIconBadge = el('span', { cls: 'cu-btn-icon-badge' }, [icon('folderOpen', 13)]);
  const mainChooseBtn = el('button', { cls: 'cu-btn cu-btn-primary' }, [
    el('span', { txt: 'Select Directory' }),
    dropzoneIconBadge
  ]);
  const dropIcon = icon('folderOpen', 48);
  dropIcon.setAttribute('class', 'cu-drop-icon');

  const dropzone = el('div', { id: 'cu-dropzone' }, [
    dropIcon,
    el('strong', { txt: 'MATRIX EMPTY — NO DATA LOADED' }),
    el('div', { cls: 'hint', txt: 'Text files → markdown chunks · Binary → raw attachments' }),
    mainChooseBtn,
  ]);
  const treeList = el('div', { id: 'cu-tree-list' });
  const treeContent = el('div', { id: 'cu-tree-content' }, [dropzone, treeList]);
  const treePane = el('div', { id: 'cu-tree-pane', cls: 'cu-empty' }, [treeContent]);

  const saveIcon = icon('save', 13);
  const downloadBtn = el('button', { cls: 'cu-btn cu-btn-tactical', id: 'cu-download-btn' }, [
    saveIcon,
    document.createTextNode(' [SAVE BUNDLE]')
  ]);

  const copyIcon = icon('copy', 13);
  const copyBtn = el('button', { cls: 'cu-btn cu-btn-tactical', id: 'cu-copy-btn', style: 'background: transparent; border: 1px solid #00E5FF; color: #00E5FF;' }, [
    copyIcon,
    document.createTextNode(' [COPY CHUNKS]')
  ]);

  const uploadIcon = icon('upload', 13);
  const uploadBtn = el('button', { cls: 'cu-btn cu-btn-primary', id: 'cu-upload-btn', style: 'background: #FF3333; border-color: #FF3333; color: #FFFFFF; box-shadow: 0 0 12px rgba(255, 51, 51, 0.4);' }, [
    uploadIcon,
    document.createTextNode(' [EXECUTE UPLOAD]')
  ]);

  const footer = el('div', { id: 'cu-footer', style: 'display: flex; gap: 8px; justify-content: flex-end; align-items: center;' }, [downloadBtn, copyBtn, uploadBtn]);

  const workspacePane = el('div', { id: 'cu-workspace-pane', style: 'display: flex; flex-direction: column; flex: 1; height: 100%; overflow: hidden;' }, [
    toolbar, actions, treePane, footer
  ]);

  const commandLayout = el('div', { id: 'cu-command-layout' }, [telemetryPane, workspacePane]);
  const panel = el('div', { id: 'cu-panel' }, [header, commandLayout]);
  const overlay = el('div', { id: 'cu-overlay', role: 'dialog', 'aria-modal': 'true' }, [panel]);
  shadow.appendChild(overlay);

  document.documentElement.appendChild($host);

  // ─── Events ───
  closeBtn.addEventListener('click', closePanel);
  overlay.addEventListener('click', e => { if (e.target === overlay) closePanel(); });
  overlay.addEventListener('keydown', e => { if (e.key === 'Tab') handleFocusTrap(e); });

  // Clear with double-tap confirm
  let clearTimer: any = null;
  clearBtn.addEventListener('click', () => {
    if (clearBtn.textContent === '[RESET]') {
      clearBtn.textContent = 'CONFIRM?';
      clearTimer = setTimeout(() => { clearBtn.textContent = '[RESET]'; }, 2500);
    } else {
      clearTimeout(clearTimer);
      clearBtn.textContent = '[RESET]';
      state.allFiles = [];
      renderTree();
      showToast('Cleared.');
    }
  });

  settingsBtn.addEventListener('click', toggleSettings);
  dropzoneBtn.addEventListener('click', pickFolder);
  mainChooseBtn.addEventListener('click', pickFolder);

  presetAll.addEventListener('click', () => { state.allFiles.forEach(f => (f.selected = true)); renderTree(); });

  const DOC_EXTS = new Set(['.md', '.mdx', '.markdown', '.txt', '.doc', '.docx', '.pdf', '.rst']);
  const DOC_NAMES = new Set(['readme', 'changelog', 'license', 'contributing', 'notice']);

  presetDocs.addEventListener('click', () => {
    state.allFiles.forEach(f => {
      const filename = f.path.split('/').pop()!.toLowerCase();
      const dotIdx = filename.lastIndexOf('.');
      const ext = dotIdx >= 0 ? filename.slice(dotIdx) : '';
      const isDoc = DOC_EXTS.has(ext) || DOC_NAMES.has(filename);
      f.selected = isDoc;
    });
    renderTree();
  });

  presetCode.addEventListener('click', () => {
    state.allFiles.forEach(f => {
      const filename = f.path.split('/').pop()!.toLowerCase();
      const dotIdx = filename.lastIndexOf('.');
      const ext = dotIdx >= 0 ? filename.slice(dotIdx) : '';
      const isDoc = DOC_EXTS.has(ext) || DOC_NAMES.has(filename);
      f.selected = !f.isBinary && !isDoc;
    });
    renderTree();
  });

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

  // Drag & drop on telemetry and tree panes
  [telemetryPane, treePane].forEach(pane => {
    pane.addEventListener('dragover', e => { e.preventDefault(); pane.classList.add('drag-over'); });
    pane.addEventListener('dragleave', () => pane.classList.remove('drag-over'));
    pane.addEventListener('drop', e => handleDrop(e as DragEvent, pane));
  });

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
    el('h3', { txt: '[ COPY PARTS ]' }),
    closeBtn
  ]);

  const body = el('div', { id: 'cu-copy-side-pane-body' });

  chunks.forEach((chunk, index) => {
    const isChunk = chunk.name.startsWith('codebase_part_');
    const label = isChunk ? `Part ${chunk.name.match(/_part_(\d+)/)?.[1] || index + 1}` : chunk.name;
    const title = isChunk ? `Text Chunk (${label})` : chunk.name;

    const info = el('div', { cls: 'cu-chunk-info' }, [
      el('span', { cls: 'cu-chunk-title', txt: title }),
      el('span', { cls: 'cu-chunk-stats', txt: formatSize(chunk.size) })
    ]);

    const copyBtn = el('button', { cls: 'cu-chunk-copy-btn', txt: ` Copy` });
    copyBtn.insertBefore(icon('copy', 13), copyBtn.firstChild);

    copyBtn.addEventListener('click', async () => {
      try {
        const type = await copyFileToClipboard(chunk);
        const msg = type === 'base64' ? 'image Base64' : label;
        showToast(`Copied ${msg}!`);
        
        copyBtn.textContent = ' Copied!';
        copyBtn.insertBefore(icon('zap', 13), copyBtn.firstChild);
        copyBtn.classList.add('copied');
        
        setTimeout(() => {
          copyBtn.textContent = ` Copy`;
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
    if (existing) existing.remove();
    treePane.appendChild(buildCopySidePane(chunks));
  }
});

// ─── Init ───
buildUI();

// Keyboard: Alt+Shift+Shortcut (e.g. Alt+Shift+U) to toggle, Escape to close, Tab for focus trap
window.addEventListener('keydown', e => {
  if (isOpen && e.key === 'Tab') {
    handleFocusTrap(e);
    return;
  }
  if (e.key === 'Escape' && isOpen) {
    const active = state.shadowRoot?.activeElement || document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      (active as HTMLElement).blur();
      e.preventDefault();
      return;
    }
    closePanel();
    e.preventDefault();
    return;
  }
  const targetKey = (settings.shortcutKey || 'u').toLowerCase();
  if (e.altKey && e.shiftKey && e.key.toLowerCase() === targetKey) {
    togglePanel();
    e.preventDefault();
  }
});

GM_registerMenuCommand('Toggle Codebase Uploader', togglePanel);

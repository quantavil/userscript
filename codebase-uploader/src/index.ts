import { css, html } from './constants';
import { settings, loadSettings, saveSettings, resetSettings } from './settings';
import { allFiles, clearAllFiles, setSearchQ, clearOpenFolders, addOpenFolder, setShadowRoot, $ } from './state';
import { renderTree } from './tree';
import { ingestFiles, run } from './uploader';
import { DroppedFile } from './types';

// Safeguard: clean up existing uploader container if it exists
const existingContainer = document.getElementById('codebase-uploader-root');
if (existingContainer) {
  existingContainer.remove();
}

// Create shadow host container
const container = document.createElement('div');
container.id = 'codebase-uploader-root';
document.body.appendChild(container);

// Create open shadow root
const shadowRoot = container.attachShadow({ mode: 'open' });
setShadowRoot(shadowRoot);

// Inject styles and HTML into Shadow DOM
shadowRoot.innerHTML = `<style>${css}</style>${html}`;

// Element references (scoped to Shadow DOM)
const fab = $('cu-fab');
const overlay = $('cu-overlay');
const treePane = $('cu-tree-pane');
const searchInput = $('cu-search') as HTMLInputElement;
const settingsPanel = $('cu-settings-panel');

// Load settings initially
loadSettings();

// Open / Close Modal
const openModal = () => {
  overlay.classList.add('open');
  renderTree();
};

const closeModal = () => {
  overlay.classList.remove('open');
};

fab.addEventListener('click', openModal);
$('cu-close').addEventListener('click', closeModal);
overlay.addEventListener('click', e => {
  if (e.target === overlay) closeModal();
});
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// Settings UI Management
function openSettings() {
  ($('cu-set-maxchunks') as HTMLInputElement).value = String(settings.maxChunks);
  ($('cu-set-maxsize') as HTMLInputElement).value = String(settings.maxFileBytes);
  ($('cu-set-maxchars') as HTMLInputElement).value = String(settings.maxChunkChars);
  ($('cu-set-folders') as HTMLTextAreaElement).value = settings.ignoreFolders;
  ($('cu-set-exts') as HTMLTextAreaElement).value = settings.ignoreExts;
  ($('cu-set-hidden') as HTMLInputElement).checked = settings.skipHidden;
  ($('cu-set-binary') as HTMLInputElement).checked = settings.includeBinary;
  ($('cu-set-fence') as HTMLInputElement).checked = settings.fenceLangFromExt;
  settingsPanel.classList.add('open');
}

function closeSettings() {
  settingsPanel.classList.remove('open');
}

$('cu-open-settings').addEventListener('click', openSettings);
$('cu-settings-close').addEventListener('click', closeSettings);

$('cu-set-save').addEventListener('click', () => {
  settings.maxChunks = Math.max(1, parseInt(($('cu-set-maxchunks') as HTMLInputElement).value) || 10);
  settings.maxFileBytes = Math.max(1000, parseInt(($('cu-set-maxsize') as HTMLInputElement).value) || 2_000_000);
  settings.maxChunkChars = Math.max(10000, parseInt(($('cu-set-maxchars') as HTMLInputElement).value) || 480_000);
  settings.ignoreFolders = ($('cu-set-folders') as HTMLTextAreaElement).value.trim();
  settings.ignoreExts = ($('cu-set-exts') as HTMLTextAreaElement).value.trim();
  settings.skipHidden = ($('cu-set-hidden') as HTMLInputElement).checked;
  settings.includeBinary = ($('cu-set-binary') as HTMLInputElement).checked;
  settings.fenceLangFromExt = ($('cu-set-fence') as HTMLInputElement).checked;
  saveSettings();
  closeSettings();
  renderTree(); // refresh stats/tree representation
});

$('cu-set-reset').addEventListener('click', () => {
  if (!confirm('Reset all settings to defaults?')) return;
  resetSettings();
  openSettings(); // refresh form inputs
});

// Drag & Drop Handlers
treePane.addEventListener('dragover', e => {
  e.preventDefault();
  treePane.classList.add('drag-over');
});

treePane.addEventListener('dragleave', () => {
  treePane.classList.remove('drag-over');
});

treePane.addEventListener('drop', async e => {
  e.preventDefault();
  treePane.classList.remove('drag-over');
  if (!e.dataTransfer) return;

  const items = [...e.dataTransfer.items];
  const droppedFiles: DroppedFile[] = [];

  async function traverse(entry: any, prefix = '') {
    if (entry.isFile) {
      const file = await new Promise<File>(r => entry.file(r));
      droppedFiles.push({ file, path: prefix + file.name });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      let entries: any[] = [];
      let batch: any[];
      do {
        batch = await new Promise<any[]>(r => reader.readEntries(r));
        entries = entries.concat(batch);
      } while (batch.length > 0);
      for (const child of entries) {
        await traverse(child, prefix + entry.name + '/');
      }
    }
  }

  const promises = items
    .filter(i => i.kind === 'file')
    .map(i => i.webkitGetAsEntry?.())
    .filter(Boolean)
    .map(entry => traverse(entry));

  await Promise.all(promises);
  ingestFiles(droppedFiles);
  renderTree();
});

// Folder Ingestion Trigger
function pickFolder() {
  const input = document.createElement('input');
  input.type = 'file';
  input.webkitdirectory = true;
  input.multiple = true;
  input.addEventListener('change', e => {
    const target = e.target as HTMLInputElement;
    if (target.files) {
      const files = Array.from(target.files).map(f => ({
        file: f,
        path: f.webkitRelativePath || f.name,
      }));
      ingestFiles(files);
      renderTree();
    }
  });
  input.click();
}

$('cu-add-folder').addEventListener('click', pickFolder);
$('cu-dropzone-btn').addEventListener('click', pickFolder);
$('cu-clear').addEventListener('click', () => {
  clearAllFiles();
  renderTree();
});

// Selection & Tree Collapse Filters
searchInput.addEventListener('input', () => {
  setSearchQ(searchInput.value.trim().toLowerCase());
  renderTree();
});

$('cu-sel-all').addEventListener('click', () => {
  allFiles.forEach(f => (f.selected = true));
  renderTree();
});

$('cu-sel-none').addEventListener('click', () => {
  allFiles.forEach(f => (f.selected = false));
  renderTree();
});

$('cu-sel-text').addEventListener('click', () => {
  allFiles.forEach(f => (f.selected = !f.isBinary));
  renderTree();
});

$('cu-sel-bin').addEventListener('click', () => {
  allFiles.forEach(f => (f.selected = f.isBinary));
  renderTree();
});

$('cu-expand-all').addEventListener('click', () => {
  allFiles.forEach(f => {
    const parts = f.path.split('/').slice(0, -1);
    let current = '';
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      addOpenFolder(current);
    }
  });
  renderTree();
});

$('cu-collapse-all').addEventListener('click', () => {
  clearOpenFolders();
  renderTree();
});

// Run Upload / Download Commands
$('cu-upload-btn').addEventListener('click', () => run(false));
$('cu-download-btn').addEventListener('click', () => run(true));

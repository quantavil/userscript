import { Settings } from './types';

export const TOAST_DURATION = 2500;
export const TOAST_FADE_MS = 300;
export const TREE_INDENT_PX = 20;
export const LIMIT_WARNING_THRESHOLD = 0.7;
export const CHUNK_OVERHEAD_CHARS = 100;
export const REVOCATION_DELAY_MS = 10000;

export const DEFAULT_SETTINGS: Settings = {
  maxChunks: 10,
  maxFileBytes: 2_000_000,
  maxChunkChars: 480_000,
  ignoreFolders: 'node_modules,__pycache__,dist,build,venv,.next,.nuxt,.idea,.vscode,coverage,.git,out,tmp,temp,.cache,.parcel-cache,vendor,Pods,target,bin,obj,.angular,.svelte-kit',
  ignoreExts: '.pyc,.pyo,.log,.lock,.map,.DS_Store,.min.js,.min.css,.exe,.dll,.so,.dylib,.bin,.o,.obj,.class',
  skipHidden: true,
  includeBinary: false,
  customPrompt: '',
  shortcutKey: 'u',
};

export const TEXT_EXTS = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.rb', '.go', '.rs',
  '.java', '.kt', '.kts', '.swift', '.c', '.h', '.cpp', '.cc', '.cxx', '.hpp', '.hxx', '.cs', '.php',
  '.html', '.htm', '.css', '.scss', '.sass', '.less', '.styl', '.json', '.jsonc', '.json5',
  '.yaml', '.yml', '.toml', '.xml', '.md', '.mdx', '.markdown', '.txt', '.csv', '.tsv',
  '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd', '.sql', '.graphql', '.gql',
  '.vue', '.svelte', '.astro', '.env', '.ini', '.cfg', '.conf', '.config', '.properties',
  '.r', '.lua', '.pl', '.pm', '.scala', '.clj', '.cljs', '.edn', '.ex', '.exs',
  '.elm', '.hs', '.lhs', '.ml', '.mli', '.fs', '.fsx', '.fsi', '.dart', '.gradle',
  '.proto', '.thrift', '.prisma', '.tf', '.tfvars', '.hcl', '.nim', '.cr', '.d', '.zig', '.v', '.sv', '.svh',
  '.gitignore', '.dockerignore', '.npmignore', '.editorconfig',
  '.gitattributes', '.gitmodules', '.babelrc', '.stylelintrc', '.rspec', '.nvmrc',
]);

export const BINARY_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp', '.tiff', '.tif', '.heic', '.heif', '.avif',
  '.mp4', '.mp3', '.wav', '.avi', '.mov', '.mkv', '.flv', '.webm', '.ogg', '.oga', '.m4a', '.aac', '.flac',
  '.zip', '.gz', '.tar', '.tgz', '.rar', '.7z', '.bz2', '.xz', '.lz', '.zst',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp',
  '.exe', '.dll', '.so', '.dylib', '.a', '.lib', '.wasm', '.node', '.jar', '.war',
  '.woff', '.woff2', '.ttf', '.eot', '.otf', '.fon',
  '.sqlite', '.db', '.sqlite3', '.mdb', '.dbf', '.pickle', '.pkl',
]);

export const TEXT_FILENAMES = new Set([
  'dockerfile', 'makefile', 'justfile', 'rakefile', 'gemfile', 'brewfile',
  'procfile', 'vagrantfile', 'license', 'licence', 'readme', 'changelog',
  'contributing', 'authors', 'thanks', 'todo', 'notice',
  '.env', '.eslintrc', '.prettierrc', '.node-version', '.python-version', '.ruby-version',
]);

export const SITE_SELECTORS = [
  'input[data-testid="file-upload-input"]',
  'input[data-testid="upload-file-input"]',
  'input.chat-upload__input',
  'input[type="file"][accept*="text"]',
  'input[type="file"][multiple]',
  'input[type="file"]',
];

export const STYLESHEET = `
  /* ─── Design Tokens ─── */
  :host {
    all: initial;
    position: fixed !important;
    top: 0; left: 0; width: 0; height: 0;
    z-index: 2147483647 !important;
    pointer-events: none;

    --glass-bg: rgba(22, 22, 28, 0.78);
    --glass-bg-hover: rgba(32, 32, 42, 0.88);
    --glass-border: rgba(255, 255, 255, 0.09);
    --glass-border-highlight: rgba(255, 255, 255, 0.16);
    --glass-blur: 30px;
    --glass-saturate: 190%;

    --surface-0: rgba(12, 12, 16, 0.88);
    --surface-1: rgba(24, 24, 30, 0.8);
    --surface-2: rgba(36, 36, 44, 0.65);

    --text-primary: #f5f5f9;
    --text-secondary: #a8a8b8;
    --text-tertiary: #6c6c7c;

    --accent: #8FA0FF;
    --accent-glow: rgba(143, 160, 255, 0.22);
    --accent-strong: #a3b2ff;
    --danger: #FF6B6B;
    --danger-glow: rgba(255, 107, 107, 0.2);
    --success: #63FFB4;
    
    /* Apple colored folder & file accents */
    --folder-color: #FFAE19;
    --folder-open-color: #FFC107;
    --file-color: #5BA2FF;
    --bin-color: #3CD070;

    --radius-sm: 8px;
    --radius-md: 14px;
    --radius-lg: 22px;

    --ease-out: cubic-bezier(0.16, 1, 0.3, 1);

    --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif;
    --font-mono: "SF Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

    font-family: var(--font-sans);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  svg { pointer-events: none; display: block; flex-shrink: 0; }

  /* ─── Overlay ─── */
  #cu-overlay {
    pointer-events: none;
    position: fixed; inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(5px) saturate(130%);
    -webkit-backdrop-filter: blur(5px) saturate(130%);
    z-index: 2147483647;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-sans);
    opacity: 0;
    transition: opacity 0.3s var(--ease-out);
  }
  #cu-overlay.open { opacity: 1; pointer-events: auto; }

  /* ─── Panel (Liquid Glass) ─── */
  #cu-panel {
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
    color: var(--text-primary);
    border: 1px solid var(--glass-border);
    border-top-color: var(--glass-border-highlight);
    border-left-color: var(--glass-border-highlight);
    border-radius: var(--radius-lg);
    width: min(860px, 94vw);
    height: min(82vh, 820px);
    display: flex; flex-direction: column;
    position: relative; overflow: hidden;
    box-shadow:
      0 0 0 0.5px rgba(255, 255, 255, 0.05),
      0 2px 4px rgba(0, 0, 0, 0.25),
      0 16px 44px rgba(0, 0, 0, 0.55),
      0 44px 88px rgba(0, 0, 0, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      inset 0 0 60px rgba(143, 160, 255, 0.02);
    transform: translateY(12px) scale(0.98);
    opacity: 0;
    transition: transform 0.35s var(--ease-out), opacity 0.3s ease;
  }
  #cu-overlay.open #cu-panel { transform: translateY(0) scale(1); opacity: 1; }

  /* ─── Header ─── */
  #cu-header {
    padding: 15px 22px;
    border-bottom: 1px solid var(--glass-border);
    display: flex; align-items: center; gap: 12px;
    background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%);
    flex-shrink: 0;
  }
  #cu-header h3 {
    margin: 0; font-size: 16px; font-weight: 600;
    color: var(--text-primary);
    flex: 1; letter-spacing: 0.2px;
  }
  .cu-kbd {
    font-size: 12px; color: var(--accent-strong);
    background: rgba(143, 160, 255, 0.1);
    border: 1px solid rgba(143, 160, 255, 0.2);
    border-radius: 6px; padding: 4px 10px;
    font-family: var(--font-mono);
    font-weight: 600;
    letter-spacing: 0.8px;
    box-shadow: 0 2px 6px rgba(143, 160, 255, 0.08);
  }

  /* ─── Colored Header Controls ─── */
  #cu-close {
    color: var(--danger);
    background: rgba(255, 107, 107, 0.06);
    border: 1px solid rgba(255, 107, 107, 0.12);
  }
  #cu-close:hover {
    background: rgba(255, 107, 107, 0.16);
    border-color: rgba(255, 107, 107, 0.3);
    color: #FFAAAB;
    box-shadow: 0 0 8px var(--danger-glow);
  }
  #cu-settings-toggle {
    color: var(--accent);
    background: rgba(143, 160, 255, 0.06);
    border: 1px solid rgba(143, 160, 255, 0.12);
  }
  #cu-settings-toggle:hover {
    background: rgba(143, 160, 255, 0.16);
    border-color: rgba(143, 160, 255, 0.3);
    color: var(--accent-strong);
    box-shadow: 0 0 8px var(--accent-glow);
  }

  .cu-icon-btn {
    background: none; border: none;
    cursor: pointer; padding: 7px 9px;
    border-radius: var(--radius-sm);
    transition: all 0.2s var(--ease-out);
    display: flex; align-items: center; justify-content: center;
  }
  .cu-icon-btn:active { transform: scale(0.92); }

  /* ─── Toolbar ─── */
  #cu-toolbar {
    padding: 12px 20px;
    display: flex; gap: 8px; align-items: center;
    border-bottom: 1px solid var(--glass-border);
    flex-shrink: 0;
  }
  #cu-search {
    flex: 1; padding: 9px 13px; border-radius: var(--radius-sm);
    border: 1px solid var(--glass-border);
    background: var(--surface-0);
    color: var(--text-primary);
    font-size: 13.5px; font-family: var(--font-sans);
    outline: none;
    transition: all 0.2s var(--ease-out);
  }
  #cu-search:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
    background: rgba(6, 6, 10, 0.92);
  }
  #cu-search::placeholder { color: var(--text-tertiary); }

  /* ─── Buttons ─── */
  .cu-btn {
    padding: 7px 14px; border-radius: var(--radius-sm);
    border: 1px solid var(--glass-border);
    cursor: pointer; font-weight: 500; font-size: 13px;
    background: var(--surface-2); color: var(--text-secondary);
    white-space: nowrap; font-family: var(--font-sans);
    transition: all 0.2s var(--ease-out);
    display: inline-flex; align-items: center; gap: 6px;
  }
  .cu-btn:hover {
    background: var(--glass-bg-hover);
    color: var(--text-primary);
    border-color: var(--glass-border-highlight);
  }
  .cu-btn:active { transform: scale(0.96); }
  .cu-btn-primary {
    background: linear-gradient(135deg, rgba(143,160,255,0.22), rgba(143,160,255,0.12));
    color: var(--accent-strong); border-color: rgba(143,160,255,0.24);
    box-shadow: 0 2px 8px var(--accent-glow);
  }
  .cu-btn-primary:hover {
    background: linear-gradient(135deg, rgba(143,160,255,0.32), rgba(143,160,255,0.18));
    box-shadow: 0 4px 16px var(--accent-glow);
    border-color: rgba(143, 160, 255, 0.4);
  }
  .cu-btn-danger {
    color: var(--danger); border-color: rgba(255,107,107,0.18);
    background: rgba(255,107,107,0.08);
  }
  .cu-btn-danger:hover {
    background: rgba(255,107,107,0.14);
    border-color: rgba(255,107,107,0.35);
  }

  /* ─── Action Bar ─── */
  #cu-actions {
    padding: 8px 20px; display: flex; gap: 8px;
    border-bottom: 1px solid var(--glass-border);
    flex-shrink: 0;
    background: rgba(0,0,0,0.12);
  }
  .cu-action-group {
    display: flex; gap: 1px;
    background: var(--glass-border);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }
  .cu-action-group .cu-btn {
    border: none; border-radius: 0;
    background: var(--surface-1);
    font-size: 12.5px; padding: 6px 12px;
  }
  .cu-action-group .cu-btn:hover { background: var(--glass-bg-hover); }
  .cu-action-group .cu-btn:first-child { border-radius: var(--radius-sm) 0 0 var(--radius-sm); }
  .cu-action-group .cu-btn:last-child { border-radius: 0 var(--radius-sm) var(--radius-sm) 0; }

  /* ─── Tree Pane ─── */
  #cu-tree-pane {
    flex: 1; overflow-y: auto; padding: 14px 20px;
    font-family: var(--font-mono);
    font-size: 13.5px; position: relative;
    background: var(--surface-0);
  }
  #cu-tree-pane.drag-over {
    background: rgba(143, 160, 255, 0.03);
    outline: 2px dashed rgba(143, 160, 255, 0.35);
    outline-offset: -6px;
  }
  #cu-tree-pane::-webkit-scrollbar { width: 5px; }
  #cu-tree-pane::-webkit-scrollbar-track { background: transparent; }
  #cu-tree-pane::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 3px; }
  #cu-tree-pane::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.15); }

  /* ─── Dropzone ─── */
  #cu-dropzone {
    display: none; flex-direction: column; align-items: center; justify-content: center;
    gap: 18px; height: 100%; color: var(--text-tertiary);
    font-size: 14.5px; text-align: center; padding: 40px 20px;
    font-family: var(--font-sans);
  }
  #cu-tree-pane.cu-empty #cu-dropzone { display: flex; }
  #cu-dropzone .cu-drop-icon {
    color: var(--accent-strong);
    filter: drop-shadow(0 8px 18px var(--accent-glow));
    animation: cu-float 3s ease-in-out infinite;
  }
  @keyframes cu-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  #cu-dropzone strong { color: var(--text-secondary); font-size: 16px; font-weight: 500; }
  #cu-dropzone .hint { max-width: 380px; line-height: 1.6; color: var(--text-tertiary); font-size: 13.5px; }

  /* ─── Tree Rows ─── */
  #cu-tree-list { display: flex; flex-direction: column; gap: 2px; }
  .tr {
    display: flex; align-items: center; gap: 8px;
    padding: 5px 8px; border-radius: var(--radius-sm);
    cursor: default;
    transition: background 0.15s ease;
  }
  .tr:hover { background: rgba(255, 255, 255, 0.035); }
  .tr input[type=checkbox] {
    accent-color: var(--accent);
    cursor: pointer; flex-shrink: 0;
    width: 15px; height: 15px; outline: none;
  }
  .tr .caret {
    width: 16px; text-align: center; color: var(--text-secondary);
    cursor: pointer; flex-shrink: 0;
    display: inline-flex; align-items: center; justify-content: center;
    transition: color 0.15s, transform 0.1s;
  }
  .tr .caret:hover { color: var(--text-primary); }
  .tr .caret.spacer { visibility: hidden; }
  
  .tr .t-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .tr .t-icon.folder { color: var(--folder-color); }
  .tr .t-icon.folderOpen { color: var(--folder-open-color); }
  .tr .t-icon.file { color: var(--file-color); }
  .tr .t-icon.bin { color: var(--bin-color); }

  .tr .t-label {
    flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    color: var(--text-secondary); cursor: pointer; font-size: 13.5px;
    transition: color 0.12s;
    margin-left: 2px;
  }
  .tr:hover .t-label { color: var(--text-primary); }
  .tr .t-label mark {
    background: var(--accent-glow); color: var(--accent-strong);
    border-radius: 3px; padding: 0 2px;
  }
  .tr .t-size {
    color: var(--text-tertiary); font-size: 11.5px; flex-shrink: 0;
    font-family: var(--font-mono);
  }
  .tr .t-badge {
    font-size: 9px; padding: 2px 6px; border-radius: 4px;
    background: rgba(255, 255, 255, 0.05); color: var(--text-tertiary);
    flex-shrink: 0; text-transform: uppercase; letter-spacing: .5px; font-weight: 600;
  }
  .tr .t-badge.bin { background: rgba(99, 255, 180, 0.08); color: var(--success); }
  .tr .t-remove {
    opacity: 0; color: var(--text-secondary); cursor: pointer;
    display: flex; align-items: center;
    padding: 3px; border-radius: 4px;
    transition: all 0.15s;
  }
  .tr:hover .t-remove { opacity: 0.7; }
  .tr .t-remove:hover { opacity: 1; background: rgba(255,107,107,0.12); color: var(--danger); }
  .tr-children {
    margin-left: ${TREE_INDENT_PX}px;
    border-left: 1px solid rgba(255, 255, 255, 0.04);
    padding-left: 10px;
    display: flex; flex-direction: column; gap: 2px;
  }

  /* ─── Settings Pane ─── */
  #cu-settings-pane {
    display: none; flex-direction: column; gap: 14px; padding: 22px;
    overflow-y: auto; background: var(--surface-0);
    font-family: var(--font-sans);
  }
  #cu-settings-pane.open { display: flex; flex: 1; }

  .cu-setting-section {
    font-size: 11px; font-weight: 600; color: var(--accent-strong);
    text-transform: uppercase; letter-spacing: 1.5px;
    margin-top: 14px; margin-bottom: 4px; padding-bottom: 6px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .cu-setting-section:first-child { margin-top: 0; }

  /* Grid Layout for inline inputs */
  .cu-setting-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .cu-setting-row { display: flex; flex-direction: column; gap: 6px; }
  .cu-setting-row.row-cb { flex-direction: row; align-items: center; gap: 10px; }
  .cu-setting-row label {
    font-size: 13.5px; font-weight: 500; color: var(--text-secondary);
  }
  .cu-setting-row input[type="text"],
  .cu-setting-row input[type="number"],
  .cu-setting-row textarea {
    padding: 9px 13px; border-radius: var(--radius-sm);
    border: 1px solid var(--glass-border);
    background: var(--surface-1); color: var(--text-primary);
    font-size: 13.5px; font-family: var(--font-mono);
    outline: none; transition: all 0.2s;
  }
  .cu-setting-row textarea {
    font-family: var(--font-sans);
    resize: vertical; min-height: 80px; line-height: 1.5;
  }
  
  /* Hide number input spinners (up/down arrows) */
  .cu-setting-row input[type="number"]::-webkit-inner-spin-button,
  .cu-setting-row input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .cu-setting-row input[type="number"] {
    -moz-appearance: textfield;
  }

  .cu-setting-row input:focus,
  .cu-setting-row textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
    background: rgba(6, 6, 10, 0.95);
  }
  .cu-setting-row input[type="checkbox"] {
    accent-color: var(--accent);
    width: 16px; height: 16px; cursor: pointer;
  }

  /* ─── Tag Chips ─── */
  .cu-tag-editor {
    display: flex; flex-direction: column; gap: 8px;
  }
  .cu-chips {
    display: flex; flex-wrap: wrap; gap: 6px;
  }
  .cu-chip {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 9px 5px 12px; border-radius: 6px;
    background: rgba(143, 160, 255, 0.08);
    border: 1px solid rgba(143, 160, 255, 0.18);
    color: var(--accent-strong);
    font-size: 12.5px; font-family: var(--font-mono);
    transition: all 0.15s;
  }
  .cu-chip:hover { border-color: rgba(143, 160, 255, 0.35); background: rgba(143, 160, 255, 0.12); }
  .cu-chip-x {
    cursor: pointer; color: var(--text-secondary);
    display: flex; align-items: center;
    border-radius: 3px; padding: 2px;
    transition: all 0.15s;
  }
  .cu-chip-x:hover { color: var(--danger); background: rgba(255,107,107,0.12); }
  .cu-chip-input {
    padding: 8px 12px; border-radius: var(--radius-sm);
    border: 1px dashed var(--glass-border);
    background: transparent;
    color: var(--text-primary);
    font-size: 13px; font-family: var(--font-mono);
    outline: none; width: 100%;
    transition: all 0.2s;
  }
  .cu-chip-input::placeholder { color: var(--text-tertiary); }
  .cu-chip-input:focus {
    border-style: solid;
    border-color: var(--accent);
    background: var(--surface-0);
    box-shadow: 0 0 0 2px var(--accent-glow);
  }

  /* ─── Settings Footer ─── */
  .cu-settings-footer {
    display: flex; justify-content: flex-end;
    margin-top: 14px; padding-top: 14px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  .cu-reset-btn {
    background: none; border: none; color: var(--text-tertiary);
    font-size: 12.5px; cursor: pointer; font-family: var(--font-sans);
    padding: 5px 10px; border-radius: 6px;
    transition: all 0.15s;
  }
  .cu-reset-btn:hover { color: var(--danger); background: rgba(255,107,107,0.08); }

  /* ─── Footer ─── */
  #cu-footer {
    padding: 14px 22px;
    border-top: 1px solid var(--glass-border);
    display: flex;
    align-items: center;
    gap: 16px;
    background: rgba(0, 0, 0, 0.15);
    flex-shrink: 0;
  }
  #cu-stats {
    flex: 1;
    font-size: 13px;
    color: var(--text-secondary);
    font-family: var(--font-sans);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  #cu-chunk-estimate {
    font-size: 12.5px;
    font-family: var(--font-mono);
    color: var(--text-tertiary);
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--glass-border);
    border-radius: 6px;
    padding: 3px 8px;
    font-weight: 500;
  }
  #cu-chunk-estimate.warn {
    color: #FFC107;
    background: rgba(255, 193, 7, 0.08);
    border-color: rgba(255, 193, 7, 0.18);
  }
  #cu-chunk-estimate.danger {
    color: var(--danger);
    background: rgba(255, 107, 107, 0.08);
    border-color: rgba(255, 107, 107, 0.18);
  }

  /* ─── Toast ─── */
  #cu-toast {
    position: fixed; top: 16px; left: 50%;
    transform: translateX(-50%) translateY(-16px);
    background: var(--glass-bg);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    padding: 8px 18px;
    border-radius: 999px;
    border: 1px solid var(--glass-border);
    font-size: 13px; font-weight: 500;
    box-shadow: 0 8px 24px rgba(0,0,0,0.45);
    pointer-events: none; opacity: 0;
    transition: all 0.3s var(--ease-out);
    z-index: 2147483647;
    font-family: var(--font-sans);
    color: var(--text-primary);
  }
  #cu-toast.success {
    color: var(--success);
    border-color: rgba(99, 255, 180, 0.25);
    box-shadow: 0 8px 24px rgba(99, 255, 180, 0.1);
  }
  #cu-toast.error {
    color: var(--danger);
    border-color: rgba(255, 107, 107, 0.25);
    box-shadow: 0 8px 24px rgba(255, 107, 107, 0.1);
  }
  #cu-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

  /* ─── Copy Parts Modal ─── */
  #cu-copy-modal {
    position: absolute; inset: 0;
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
    display: flex; flex-direction: column;
    z-index: 100;
  }
  #cu-copy-modal-header {
    padding: 18px 24px;
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid var(--glass-border);
  }
  #cu-copy-modal-header h3 {
    font-size: 15px; font-weight: 600; color: var(--text-primary);
  }
  #cu-copy-modal-body {
    flex: 1; overflow-y: auto; padding: 24px;
    display: flex; flex-direction: column; gap: 14px;
  }
  .cu-chunk-row {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    padding: 14px 20px;
    display: flex; justify-content: space-between; align-items: center;
    gap: 16px; transition: all 0.2s var(--ease-out);
  }
  .cu-chunk-row:hover {
    background: rgba(255, 255, 255, 0.045);
    border-color: var(--glass-border-highlight);
  }
  .cu-chunk-info {
    display: flex; flex-direction: column; gap: 4px;
  }
  .cu-chunk-title {
    font-size: 13.5px; font-weight: 500; color: var(--text-primary);
  }
  .cu-chunk-stats {
    font-size: 11.5px; color: var(--text-secondary);
    font-family: var(--font-mono);
  }
  .cu-chunk-copy-btn {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 16px; border-radius: var(--radius-sm);
    border: none; font-size: 12.5px; font-weight: 500;
    cursor: pointer; transition: all 0.2s var(--ease-out);
    background: var(--accent); color: #0c0c10;
  }
  .cu-chunk-copy-btn:hover {
    background: var(--accent-strong);
    box-shadow: 0 0 12px var(--accent-glow);
  }
  .cu-chunk-copy-btn.copied {
    background: var(--success) !important;
    color: #0c0c10 !important;
  }

  /* ─── Reduced Motion ─── */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

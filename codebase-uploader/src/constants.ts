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
  /* ─── Swiss Industrial Telemetry & CRT Command Matrix System ─── */
  :host {
    all: initial;
    position: fixed !important;
    top: 0; left: 0; width: 0; height: 0;
    z-index: 2147483647 !important;
    pointer-events: none;

    --bg-base: #08090d;
    --glass-bg: rgba(8, 9, 13, 0.96);
    --glass-bg-hover: rgba(18, 20, 30, 0.95);
    --glass-border: #1e2230;
    --glass-border-highlight: #2e3448;
    --glass-blur: 0px;
    --glass-saturate: 100%;

    --surface-0: #06070a;
    --surface-1: #0b0c12;
    --surface-2: #12141d;
    --surface-3: #181b28;

    --text-primary: #f0f2f8;
    --text-secondary: #82889a;
    --text-tertiary: #525866;

    --accent: #00E5FF;
    --accent-glow: rgba(0, 229, 255, 0.35);
    --accent-strong: #00E5FF;
    --danger: #FF3333;
    --danger-glow: rgba(255, 51, 51, 0.22);
    --success: #3CD070;

    --folder-color: #FFB800;
    --folder-open-color: #FFC107;
    --file-color: #00E5FF;
    --bin-color: #3CD070;

    --radius-sm: 2px;
    --radius-md: 2px;
    --radius-inner: 2px;
    --radius-outer: 2px;
    --radius-pill: 2px;

    --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);

    --font-mono: 'JetBrains Mono', 'Space Mono', 'SF Mono', ui-monospace, Menlo, Consolas, monospace;
    --font-sans: 'JetBrains Mono', 'Space Mono', 'SF Mono', ui-monospace, Menlo, Consolas, monospace;

    font-family: var(--font-mono);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; border-radius: 2px !important; }
  svg { pointer-events: none; display: block; flex-shrink: 0; }

  /* ─── Unified Focus System (Single Ring, Zero Double-Outline Conflict) ─── */
  *:focus,
  *:focus-visible {
    outline: none !important;
  }

  #cu-search:focus,
  #cu-search:focus-visible,
  input:focus,
  input:focus-visible,
  textarea:focus,
  textarea:focus-visible,
  .cu-btn:focus-visible,
  .cu-icon-btn:focus-visible,
  .cu-chip-x:focus-visible,
  .cu-chunk-copy-btn:focus-visible,
  .tr input[type="checkbox"]:focus-visible,
  input[type="checkbox"]:focus-visible,
  .cu-reset-btn:focus-visible,
  .cu-chip-input:focus,
  .cu-chip-input:focus-visible,
  .cu-btn-tactical:focus-visible,
  .cu-preset-chip:focus-visible {
    border-color: #00E5FF !important;
    box-shadow: 0 0 14px rgba(0, 229, 255, 0.35) !important;
    background: #06070a !important;
  }

  /* ─── Micro-interactions & Tactile Feedback ─── */
  .cu-btn,
  .cu-icon-btn,
  .cu-chip-x,
  .cu-chunk-copy-btn,
  .cu-reset-btn,
  .cu-btn-tactical,
  .cu-preset-chip {
    transition: transform 0.15s var(--ease-spring),
                background-color 0.15s var(--ease-spring),
                border-color 0.15s var(--ease-spring),
                box-shadow 0.15s var(--ease-spring),
                color 0.15s var(--ease-spring);
  }

  .cu-btn:active,
  .cu-icon-btn:active,
  .cu-chip-x:active,
  .cu-chunk-copy-btn:active,
  .cu-reset-btn:active,
  .cu-btn-tactical:active,
  .cu-preset-chip:active {
    transform: scale(0.97) !important;
  }

  /* Button-in-button icon badge animation */
  .cu-btn-icon-badge {
    width: 20px; height: 20px;
    border-radius: 2px;
    background: rgba(0, 229, 255, 0.15);
    color: #00E5FF;
    display: inline-flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: transform 0.2s var(--ease-spring), background-color 0.15s var(--ease-spring);
  }

  .cu-btn-primary:hover .cu-btn-icon-badge {
    transform: scale(1.1);
    background: rgba(0, 229, 255, 0.28);
  }

  #cu-close:hover svg {
    transform: rotate(90deg);
  }

  #cu-settings-toggle:hover svg {
    transform: rotate(45deg);
  }

  /* ─── Overlay ─── */
  #cu-overlay {
    pointer-events: none;
    position: fixed; inset: 0;
    background: rgba(4, 5, 8, 0.85);
    z-index: 2147483647;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-mono);
    opacity: 0;
    transition: opacity 0.25s var(--ease-spring);
  }
  #cu-overlay.open { opacity: 1; pointer-events: auto; }

  /* ─── Panel (Industrial CRT Command Matrix Chassis) ─── */
  #cu-panel {
    background: #08090d;
    color: var(--text-primary);
    border: 1px solid #1e2230;
    border-top: 1px solid #2e3448;
    border-left: 1px solid #2e3448;
    border-radius: 2px;
    padding: 6px;
    width: min(1120px, 96vw);
    height: min(88vh, 880px);
    display: flex; flex-direction: column;
    position: relative; overflow: hidden;
    box-shadow:
      0 0 0 1px #12141d,
      0 12px 32px rgba(0, 0, 0, 0.85),
      0 40px 96px rgba(0, 0, 0, 0.95),
      inset 0 0 40px rgba(0, 229, 255, 0.02);
    transform: translateY(10px) scale(0.99);
    opacity: 0;
    transition: transform 0.25s var(--ease-spring), opacity 0.25s var(--ease-spring);
  }
  #cu-overlay.open #cu-panel { transform: translateY(0) scale(1); opacity: 1; }

  /* ─── Header ─── */
  #cu-header {
    padding: 12px 18px;
    border-bottom: 1px solid #1e2230;
    display: flex; align-items: center; gap: 12px;
    background: #0b0c12;
    flex-shrink: 0;
  }
  #cu-header h3 {
    margin: 0; font-size: 15px; font-weight: 700;
    color: var(--text-primary);
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: -0.04em;
    display: flex; align-items: center; gap: 10px;
  }
  .cu-version-badge {
    font-size: 10px; font-weight: 700; font-family: var(--font-mono);
    color: #00E5FF; background: rgba(0, 229, 255, 0.1);
    border: 1px solid rgba(0, 229, 255, 0.25);
    padding: 2px 6px; border-radius: 2px;
    letter-spacing: 0.5px; text-transform: uppercase;
  }
  .cu-status-online {
    font-size: 10px; font-weight: 700; font-family: var(--font-mono);
    color: #3CD070; background: rgba(60, 208, 112, 0.12);
    border: 1px solid rgba(60, 208, 112, 0.25);
    padding: 2px 6px; border-radius: 2px;
    letter-spacing: 0.5px; text-transform: uppercase;
  }
  #cu-header-space { flex: 1; }
  .cu-kbd {
    font-size: 11px; color: #00E5FF;
    background: rgba(0, 229, 255, 0.08);
    border: 1px solid rgba(0, 229, 255, 0.25);
    border-radius: 2px; padding: 4px 10px;
    font-family: var(--font-mono);
    font-weight: 600;
    letter-spacing: -0.02em;
  }

  /* ─── Header Controls ─── */
  #cu-close {
    color: var(--text-secondary);
    background: #12141d;
    border: 1px solid #222638;
    border-radius: 2px;
  }
  #cu-close:hover {
    background: #1c2030;
    border-color: #00E5FF;
    color: var(--text-primary);
  }
  #cu-settings-toggle {
    color: #00E5FF;
    background: rgba(0, 229, 255, 0.08);
    border: 1px solid rgba(0, 229, 255, 0.2);
    border-radius: 2px;
  }
  #cu-settings-toggle:hover {
    background: rgba(0, 229, 255, 0.18);
    border-color: #00E5FF;
    color: #00E5FF;
    box-shadow: 0 0 10px rgba(0, 229, 255, 0.25);
  }

  .cu-icon-btn {
    background: none; border: none;
    cursor: pointer; padding: 6px 8px;
    border-radius: 2px;
    display: flex; align-items: center; justify-content: center;
  }

  /* ─── Toolbar ─── */
  #cu-toolbar {
    padding: 10px 16px;
    display: flex; gap: 10px; align-items: center;
    border-bottom: 1px solid #1e2230;
    background: #08090d;
    flex-shrink: 0;
  }
  #cu-search {
    flex: 1; padding: 8px 12px; border-radius: 2px;
    border: 1px solid #1e2230;
    background: #06070a;
    color: var(--text-primary);
    font-size: 13px; font-family: var(--font-mono);
    transition: border-color 0.15s var(--ease-spring), box-shadow 0.15s var(--ease-spring), background-color 0.15s var(--ease-spring);
  }
  #cu-search::placeholder { color: var(--text-tertiary); }

  /* ─── Buttons ─── */
  .cu-btn {
    padding: 7px 15px; border-radius: 2px;
    border: 1px solid #222638;
    cursor: pointer; font-weight: 600; font-size: 12px;
    background: #12141d; color: var(--text-secondary);
    white-space: nowrap; font-family: var(--font-mono);
    text-transform: uppercase; letter-spacing: -0.02em;
    display: inline-flex; align-items: center; gap: 8px;
  }
  .cu-btn:hover {
    background: #181b28;
    color: var(--text-primary);
    border-color: #383e58;
  }
  .cu-btn-primary {
    background: #00E5FF;
    color: #08090d; border: 1px solid #00E5FF;
    box-shadow: 0 0 12px rgba(0, 229, 255, 0.3);
    font-weight: 700;
  }
  .cu-btn-primary:hover {
    background: #33ebff;
    border-color: #33ebff;
    box-shadow: 0 0 16px rgba(0, 229, 255, 0.45);
    color: #040508;
  }
  .cu-btn-danger {
    color: #FF3333; border-color: rgba(255, 51, 51, 0.3);
    background: rgba(255, 51, 51, 0.08);
  }
  .cu-btn-danger:hover {
    background: rgba(255, 51, 51, 0.18);
    border-color: #FF3333;
    box-shadow: 0 0 10px rgba(255, 51, 51, 0.25);
  }

  /* ─── Action Bar ─── */
  #cu-actions {
    padding: 8px 16px; display: flex; gap: 10px;
    border-bottom: 1px solid #1e2230;
    flex-shrink: 0;
    background: #06070a;
  }
  .cu-action-group {
    display: flex; gap: 1px;
    background: #1e2230;
    border-radius: 2px;
    overflow: hidden; padding: 1px;
  }
  .cu-action-group .cu-btn {
    border: none; border-radius: 2px;
    background: #0b0c12;
    font-size: 11.5px; padding: 5px 12px;
    color: var(--text-secondary);
  }
  .cu-action-group .cu-btn:hover {
    background: #141722;
    color: var(--text-primary);
  }

  /* ─── Tree Pane ─── */
  #cu-tree-pane {
    flex: 1; display: flex; flex-direction: row;
    overflow: hidden; position: relative;
    background: #06070a;
    border-radius: 2px;
    border: 1px solid #1c2030;
    margin: 6px 12px;
  }
  #cu-tree-content {
    flex: 1; overflow-y: auto; padding: 12px 16px;
    display: flex; flex-direction: column;
    height: 100%;
    font-family: var(--font-mono);
  }
  #cu-tree-pane.drag-over {
    background: rgba(0, 229, 255, 0.04);
    border-color: #00E5FF;
    box-shadow: inset 0 0 14px rgba(0, 229, 255, 0.2);
  }
  #cu-tree-content::-webkit-scrollbar { width: 5px; }
  #cu-tree-content::-webkit-scrollbar-track { background: #06070a; }
  #cu-tree-content::-webkit-scrollbar-thumb { background: #1c2030; border-radius: 2px; }
  #cu-tree-content::-webkit-scrollbar-thumb:hover { background: #00E5FF; }

  /* ─── Dropzone ─── */
  #cu-dropzone {
    display: none; flex-direction: column; align-items: center; justify-content: center;
    gap: 16px; height: 100%; color: var(--text-tertiary);
    font-size: 13.5px; text-align: center; padding: 40px 20px;
    font-family: var(--font-mono);
  }
  #cu-tree-pane.cu-empty #cu-dropzone { display: flex; }
  #cu-dropzone .cu-drop-icon {
    color: #00E5FF;
    filter: drop-shadow(0 0 12px rgba(0, 229, 255, 0.4));
    animation: cu-float 3s ease-in-out infinite;
  }
  @keyframes cu-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
  #cu-dropzone strong { color: var(--text-secondary); font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: -0.02em; }
  #cu-dropzone .hint { max-width: 380px; line-height: 1.5; color: var(--text-tertiary); font-size: 12.5px; }

  /* ─── Tree Rows ─── */
  #cu-tree-list { display: flex; flex-direction: column; gap: 2px; }
  .tr {
    display: flex; align-items: center; gap: 8px;
    padding: 5px 8px; border-radius: 0px;
    cursor: default; border: 1px solid transparent;
    transition: background 0.12s var(--ease-spring), border-color 0.12s var(--ease-spring);
  }
  .tr-matrix-row {
    border-radius: 0px !important;
    font-family: var(--font-mono);
    font-size: 12px;
    border-left: 2px solid transparent;
  }
  .tr-matrix-row:hover {
    border-left-color: #00E5FF;
    background: #0d101a;
    border-color: #1c2030;
  }
  .tr:hover {
    background: #0e1018;
    border-color: #1c2030;
  }
  .tr:active { transform: scale(0.995); }
  .tr input[type=checkbox] {
    accent-color: #00E5FF;
    cursor: pointer; flex-shrink: 0;
    width: 14px; height: 14px;
    border-radius: 0px;
  }
  .tr .caret {
    width: 22px; text-align: center; color: #00E5FF;
    cursor: pointer; flex-shrink: 0;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 0px; font-family: var(--font-mono); font-weight: 700; font-size: 11px;
    transition: color 0.12s var(--ease-spring), transform 0.15s var(--ease-spring);
  }
  .tr .caret:hover { color: #33ebff; transform: scale(1.15); }
  .tr .caret.spacer { visibility: hidden; }
  
  .tr .t-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .tr .t-icon.folder { color: #FFB800; }
  .tr .t-icon.folderOpen { color: #FFC107; }
  .tr .t-icon.file { color: #00E5FF; }
  .tr .t-icon.bin { color: #3CD070; }

  .tr .t-label {
    flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    color: var(--text-secondary); cursor: pointer; font-size: 13px;
    font-family: var(--font-mono);
    transition: color 0.12s var(--ease-spring);
    margin-left: 2px;
  }
  .tr:hover .t-label { color: var(--text-primary); }
  .tr .t-label mark {
    background: rgba(0, 229, 255, 0.2); color: #00E5FF;
    border-radius: 0px; padding: 0 3px;
  }
  .tr .t-size {
    color: var(--text-tertiary); font-size: 11px; flex-shrink: 0;
    font-family: var(--font-mono);
  }
  .tr .t-badge {
    font-size: 9px; padding: 2px 6px; border-radius: 0px;
    background: #141722; color: var(--text-tertiary);
    flex-shrink: 0; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;
    border: 1px solid #222638; font-family: var(--font-mono);
  }
  .tr .t-badge.dir { background: rgba(255, 174, 25, 0.12); color: #FFAE19; border-color: rgba(255, 174, 25, 0.25); }
  .tr .t-badge.code { background: rgba(0, 229, 255, 0.12); color: #00E5FF; border-color: rgba(0, 229, 255, 0.25); }
  .tr .t-badge.bin { background: rgba(60, 208, 112, 0.12); color: #3CD070; border-color: rgba(60, 208, 112, 0.25); }
  .tr .t-remove {
    opacity: 0; color: var(--text-secondary); cursor: pointer;
    display: flex; align-items: center;
    padding: 3px; border-radius: 2px;
    transition: opacity 0.12s var(--ease-spring), background 0.12s var(--ease-spring);
  }
  .tr:hover .t-remove { opacity: 0.7; }
  .tr .t-remove:hover { opacity: 1; background: rgba(255, 51, 51, 0.15); color: #FF3333; }
  .tr-children {
    margin-left: ${TREE_INDENT_PX}px;
    border-left: 1px solid #1c2030;
    padding-left: 8px;
    display: flex; flex-direction: column; gap: 2px;
  }

  /* ─── Settings Pane ─── */
  #cu-settings-pane {
    display: none; flex-direction: column; gap: 14px; padding: 20px;
    overflow-y: auto; background: #06070a;
    border-radius: 2px;
    border: 1px solid #1c2030;
    margin: 6px 12px;
    font-family: var(--font-mono);
  }
  #cu-settings-pane.open { display: flex; flex: 1; }

  .cu-setting-section {
    font-size: 11px; font-weight: 700; color: #00E5FF;
    font-family: var(--font-mono);
    text-transform: uppercase; letter-spacing: -0.04em;
    margin-top: 12px; margin-bottom: 4px; padding-bottom: 6px;
    border-bottom: 1px solid #1c2030;
  }
  .cu-setting-section:first-child { margin-top: 0; }

  .cu-setting-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .cu-setting-row { display: flex; flex-direction: column; gap: 6px; }
  .cu-setting-row.row-cb { flex-direction: row; align-items: center; gap: 10px; }
  .cu-setting-row label {
    font-size: 12.5px; font-weight: 600; color: var(--text-secondary);
    font-family: var(--font-mono);
  }
  .cu-setting-row input[type="text"],
  .cu-setting-row input[type="number"],
  .cu-setting-row textarea {
    padding: 8px 12px; border-radius: 2px;
    border: 1px solid #1e2230;
    background: #0b0c12; color: var(--text-primary);
    font-size: 13px; font-family: var(--font-mono);
    transition: border-color 0.15s var(--ease-spring), box-shadow 0.15s var(--ease-spring), background-color 0.15s var(--ease-spring);
  }
  .cu-setting-row textarea {
    font-family: var(--font-mono);
    resize: vertical; min-height: 80px; line-height: 1.5;
  }
  
  .cu-setting-row input[type="number"]::-webkit-inner-spin-button,
  .cu-setting-row input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .cu-setting-row input[type="number"] {
    -moz-appearance: textfield;
  }

  .cu-setting-row input[type="checkbox"] {
    accent-color: #00E5FF;
    width: 15px; height: 15px; cursor: pointer;
    border-radius: 2px;
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
    padding: 4px 8px 4px 10px; border-radius: 2px;
    background: rgba(0, 229, 255, 0.08);
    border: 1px solid rgba(0, 229, 255, 0.22);
    color: #00E5FF;
    font-size: 12px; font-family: var(--font-mono);
    transition: all 0.15s var(--ease-spring);
  }
  .cu-chip:hover { border-color: #00E5FF; background: rgba(0, 229, 255, 0.15); }
  .cu-chip-x {
    cursor: pointer; color: var(--text-secondary);
    display: flex; align-items: center;
    border-radius: 2px; padding: 2px;
  }
  .cu-chip-x:hover { color: #FF3333; background: rgba(255, 51, 51, 0.15); }
  .cu-chip-input {
    padding: 7px 10px; border-radius: 2px;
    border: 1px dashed #1e2230;
    background: transparent;
    color: var(--text-primary);
    font-size: 12.5px; font-family: var(--font-mono);
    width: 100%;
    transition: all 0.15s var(--ease-spring);
  }
  .cu-chip-input::placeholder { color: var(--text-tertiary); }

  /* ─── Settings Footer ─── */
  .cu-settings-footer {
    display: flex; justify-content: flex-end;
    margin-top: 12px; padding-top: 12px;
    border-top: 1px solid #1c2030;
  }
  .cu-reset-btn {
    background: none; border: 1px solid transparent; color: var(--text-tertiary);
    font-size: 12px; cursor: pointer; font-family: var(--font-mono);
    padding: 5px 10px; border-radius: 2px; text-transform: uppercase;
  }
  .cu-reset-btn:hover { color: #FF3333; background: rgba(255, 51, 51, 0.1); border-color: rgba(255, 51, 51, 0.25); }

  /* ─── Footer ─── */
  #cu-footer {
    padding: 12px 18px;
    border-top: 1px solid #1e2230;
    display: flex;
    align-items: center;
    gap: 14px;
    background: #0b0c12;
    flex-shrink: 0;
  }
  #cu-stats {
    flex: 1;
    font-size: 12.5px;
    color: var(--text-secondary);
    font-family: var(--font-mono);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  #cu-chunk-estimate {
    font-size: 12px;
    font-family: var(--font-mono);
    color: var(--text-tertiary);
    background: #06070a;
    border: 1px solid #1e2230;
    border-radius: 2px;
    padding: 3px 10px;
    font-weight: 600;
  }
  #cu-chunk-estimate.warn {
    color: #FFB800;
    background: rgba(255, 184, 0, 0.1);
    border-color: rgba(255, 184, 0, 0.25);
  }
  #cu-chunk-estimate.danger {
    color: #FF3333;
    background: rgba(255, 51, 51, 0.1);
    border-color: rgba(255, 51, 51, 0.25);
  }

  /* ─── Toast ─── */
  #cu-toast {
    position: fixed; top: 16px; left: 50%;
    transform: translateX(-50%) translateY(-16px);
    background: #0b0c12;
    padding: 8px 20px;
    border-radius: 2px;
    border: 1px solid #1e2230;
    font-size: 12.5px; font-weight: 600;
    font-family: var(--font-mono);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
    pointer-events: none; opacity: 0;
    transition: all 0.25s var(--ease-spring);
    z-index: 2147483647;
    color: var(--text-primary);
  }
  #cu-toast.success {
    color: #3CD070;
    border-color: rgba(60, 208, 112, 0.4);
    box-shadow: 0 8px 24px rgba(60, 208, 112, 0.15);
  }
  #cu-toast.error {
    color: #FF3333;
    border-color: rgba(255, 51, 51, 0.4);
    box-shadow: 0 8px 24px rgba(255, 51, 51, 0.15);
  }
  #cu-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

  /* ─── Copy Parts Side Pane ─── */
  #cu-copy-side-pane {
    width: 320px;
    border-left: 1px solid #1e2230;
    border-radius: 2px;
    display: flex;
    flex-direction: column;
    background: #08090d;
    flex-shrink: 0;
    height: 100%;
    animation: cu-slide-in 0.2s var(--ease-spring);
  }
  @keyframes cu-slide-in {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  #cu-copy-side-pane-header {
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #1e2230;
    background: #0b0c12;
  }
  #cu-copy-side-pane-header h3 {
    font-size: 13px;
    font-weight: 700;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: -0.04em;
    color: var(--text-primary);
  }
  #cu-copy-side-pane-close {
    color: var(--text-secondary);
    background: #12141d;
    border: 1px solid #222638;
    padding: 5px;
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  #cu-copy-side-pane-close:hover {
    background: #1c2030;
    border-color: #00E5FF;
    color: var(--text-primary);
  }
  #cu-copy-side-pane-body {
    flex: 1;
    overflow-y: auto;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  #cu-copy-side-pane-body::-webkit-scrollbar { width: 5px; }
  #cu-copy-side-pane-body::-webkit-scrollbar-track { background: #06070a; }
  #cu-copy-side-pane-body::-webkit-scrollbar-thumb { background: #1c2030; border-radius: 2px; }
  #cu-copy-side-pane-body::-webkit-scrollbar-thumb:hover { background: #00E5FF; }

  .cu-chunk-row {
    background: #06070a;
    border: 1px solid #1c2030;
    border-radius: 2px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: all 0.15s var(--ease-spring);
  }
  .cu-chunk-row:hover {
    background: #0e1018;
    border-color: #2e3448;
  }
  .cu-chunk-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .cu-chunk-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
    font-family: var(--font-mono);
    word-break: break-all;
  }
  .cu-chunk-stats {
    font-size: 11px;
    color: var(--text-secondary);
    font-family: var(--font-mono);
  }
  .cu-chunk-copy-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 2px;
    border: 1px solid #00E5FF;
    font-size: 11.5px;
    font-weight: 700;
    font-family: var(--font-mono);
    text-transform: uppercase;
    cursor: pointer;
    background: #00E5FF;
    color: #08090d;
  }
  .cu-chunk-copy-btn:hover {
    background: #33ebff;
    box-shadow: 0 0 12px rgba(0, 229, 255, 0.4);
  }
  .cu-chunk-copy-btn.copied {
    background: #3CD070 !important;
    border-color: #3CD070 !important;
    color: #08090d !important;
  }

  /* ─── Dual-Pane Layout & Tactical Telemetry System ─── */
  #cu-command-layout {
    display: grid;
    grid-template-columns: 340px 1fr;
    gap: 12px;
    height: 100%;
    width: 100%;
    overflow: hidden;
  }

  #cu-telemetry-pane {
    background: #0b0c12;
    border: 1px solid #1e2230;
    border-radius: 2px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
  }

  .cu-metric-card {
    background: #0f111a;
    border: 1px solid #1c2030;
    border-radius: 2px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .cu-metric-card .cu-metric-label {
    font-size: 10px;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: -0.02em;
    color: #82889a;
  }
  .cu-metric-card .cu-metric-value {
    font-size: 16px;
    font-family: var(--font-mono);
    font-weight: 700;
    color: #f0f2f8;
  }

  .cu-ascii-meter {
    font-family: var(--font-mono);
    background: #06070a;
    color: #00E5FF;
    border: 1px solid #1c2030;
    padding: 6px 10px;
    border-radius: 2px;
    font-size: 11px;
    letter-spacing: 1px;
    white-space: pre;
  }

  .cu-preset-chip {
    border-radius: 2px;
    background: #12141d;
    border: 1px solid #222638;
    color: #f0f2f8;
    font-family: var(--font-mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: -0.02em;
    padding: 5px 10px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .cu-preset-chip:hover {
    border-color: #00E5FF;
    color: #00E5FF;
    background: rgba(0, 229, 255, 0.08);
  }

  .cu-btn-tactical {
    border-radius: 2px;
    background: #141722;
    border: 1px solid #282e44;
    color: #f0f2f8;
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: -0.02em;
    padding: 8px 14px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .cu-btn-tactical:hover {
    border-color: #00E5FF;
    color: #00E5FF;
    background: #0c1017;
    box-shadow: 0 0 10px rgba(0, 229, 255, 0.2);
  }
  .cu-btn-tactical:active {
    transform: scale(0.98);
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

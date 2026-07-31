// ==UserScript==
// @name         Codebase Uploader
// @namespace    http://tampermonkey.net/
// @version      1.2.0
// @author       quantavil
// @description  An elegant, zero-dependency userscript that packages directories and codebases for AI chats. Features smart markdown chunking, customizable ignore patterns, binary file uploads, and a premium Liquid Glass interface.
// @license      MIT
// @homepage     https://github.com/quantavil/userscript
// @homepageURL  https://github.com/quantavil/userscript
// @match        *://*.kimi.com/*
// @match        *://*.qwen.ai/*
// @match        *://arena.lmsys.org/*
// @match        *://*.z.ai/*
// @match        *://chatgpt.com/*
// @match        *://claude.ai/*
// @match        *://gemini.google.com/*
// @match        *://aistudio.google.com/*
// @match        *://*.deepseek.com/*
// @match        *://*.perplexity.ai/*
// @match        *://*.grok.com/*
// @match        *://chat.mistral.ai/*
// @match        *://copilot.microsoft.com/*
// @match        *://huggingface.co/chat/*
// @match        *://*.groq.com/*
// @match        *://openrouter.ai/*
// @match        *://*.meta.ai/*
// @match        *://*.arena.ai/*
// @match        *://aistudio.xiaomimimo.com/*
// @match        *://agent.minimax.io/*
// @grant        GM_registerMenuCommand
// @run-at       document-start
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  const TOAST_DURATION = 2500;
  const TOAST_FADE_MS = 300;
  const TREE_INDENT_PX = 20;
  const LIMIT_WARNING_THRESHOLD = 0.7;
  const CHUNK_OVERHEAD_CHARS = 100;
  const REVOCATION_DELAY_MS = 1e4;
  const DEFAULT_SETTINGS = {
    maxChunks: 10,
    maxFileBytes: 2e6,
    maxChunkChars: 48e4,
    ignoreFolders: "node_modules,__pycache__,dist,build,venv,.next,.nuxt,.idea,.vscode,coverage,.git,out,tmp,temp,.cache,.parcel-cache,vendor,Pods,target,bin,obj,.angular,.svelte-kit",
    ignoreExts: ".pyc,.pyo,.log,.lock,.map,.DS_Store,.min.js,.min.css,.exe,.dll,.so,.dylib,.bin,.o,.obj,.class",
    skipHidden: true,
    includeBinary: false,
    customPrompt: "",
    shortcutKey: "u"
  };
  const TEXT_EXTS = /* @__PURE__ */ new Set([
    ".js",
    ".mjs",
    ".cjs",
    ".ts",
    ".tsx",
    ".jsx",
    ".py",
    ".rb",
    ".go",
    ".rs",
    ".java",
    ".kt",
    ".kts",
    ".swift",
    ".c",
    ".h",
    ".cpp",
    ".cc",
    ".cxx",
    ".hpp",
    ".hxx",
    ".cs",
    ".php",
    ".html",
    ".htm",
    ".css",
    ".scss",
    ".sass",
    ".less",
    ".styl",
    ".json",
    ".jsonc",
    ".json5",
    ".yaml",
    ".yml",
    ".toml",
    ".xml",
    ".md",
    ".mdx",
    ".markdown",
    ".txt",
    ".csv",
    ".tsv",
    ".sh",
    ".bash",
    ".zsh",
    ".fish",
    ".ps1",
    ".bat",
    ".cmd",
    ".sql",
    ".graphql",
    ".gql",
    ".vue",
    ".svelte",
    ".astro",
    ".env",
    ".ini",
    ".cfg",
    ".conf",
    ".config",
    ".properties",
    ".r",
    ".lua",
    ".pl",
    ".pm",
    ".scala",
    ".clj",
    ".cljs",
    ".edn",
    ".ex",
    ".exs",
    ".elm",
    ".hs",
    ".lhs",
    ".ml",
    ".mli",
    ".fs",
    ".fsx",
    ".fsi",
    ".dart",
    ".gradle",
    ".proto",
    ".thrift",
    ".prisma",
    ".tf",
    ".tfvars",
    ".hcl",
    ".nim",
    ".cr",
    ".d",
    ".zig",
    ".v",
    ".sv",
    ".svh",
    ".gitignore",
    ".dockerignore",
    ".npmignore",
    ".editorconfig",
    ".gitattributes",
    ".gitmodules",
    ".babelrc",
    ".stylelintrc",
    ".rspec",
    ".nvmrc"
  ]);
  const BINARY_EXTS = /* @__PURE__ */ new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
    ".ico",
    ".bmp",
    ".tiff",
    ".tif",
    ".heic",
    ".heif",
    ".avif",
    ".mp4",
    ".mp3",
    ".wav",
    ".avi",
    ".mov",
    ".mkv",
    ".flv",
    ".webm",
    ".ogg",
    ".oga",
    ".m4a",
    ".aac",
    ".flac",
    ".zip",
    ".gz",
    ".tar",
    ".tgz",
    ".rar",
    ".7z",
    ".bz2",
    ".xz",
    ".lz",
    ".zst",
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".odt",
    ".ods",
    ".odp",
    ".exe",
    ".dll",
    ".so",
    ".dylib",
    ".a",
    ".lib",
    ".wasm",
    ".node",
    ".jar",
    ".war",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".otf",
    ".fon",
    ".sqlite",
    ".db",
    ".sqlite3",
    ".mdb",
    ".dbf",
    ".pickle",
    ".pkl"
  ]);
  const TEXT_FILENAMES = /* @__PURE__ */ new Set([
    "dockerfile",
    "makefile",
    "justfile",
    "rakefile",
    "gemfile",
    "brewfile",
    "procfile",
    "vagrantfile",
    "license",
    "licence",
    "readme",
    "changelog",
    "contributing",
    "authors",
    "thanks",
    "todo",
    "notice",
    ".env",
    ".eslintrc",
    ".prettierrc",
    ".node-version",
    ".python-version",
    ".ruby-version"
  ]);
  const SITE_SELECTORS = [
    'input[data-testid="file-upload-input"]',
    'input[data-testid="upload-file-input"]',
    "input.chat-upload__input",
    'input[type="file"][accept*="text"]',
    'input[type="file"][multiple]',
    'input[type="file"]'
  ];
  const STYLESHEET = `
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
    color: var(--text-secondary);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--glass-border);
  }
  #cu-close:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--glass-border-highlight);
    color: var(--text-primary);
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
    flex: 1; display: flex; flex-direction: row;
    overflow: hidden; position: relative;
    background: var(--surface-0);
  }
  #cu-tree-content {
    flex: 1; overflow-y: auto; padding: 14px 20px;
    display: flex; flex-direction: column;
    height: 100%;
  }
  #cu-tree-pane.drag-over {
    background: rgba(143, 160, 255, 0.03);
    outline: 2px dashed rgba(143, 160, 255, 0.35);
    outline-offset: -6px;
  }
  #cu-tree-content::-webkit-scrollbar { width: 5px; }
  #cu-tree-content::-webkit-scrollbar-track { background: transparent; }
  #cu-tree-content::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 3px; }
  #cu-tree-content::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.15); }

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

  /* ─── Copy Parts Side Pane ─── */
  #cu-copy-side-pane {
    width: 320px;
    border-left: 1px solid var(--glass-border);
    display: flex;
    flex-direction: column;
    background: rgba(0, 0, 0, 0.12);
    flex-shrink: 0;
    height: 100%;
    animation: cu-slide-in 0.2s var(--ease-out);
  }
  @keyframes cu-slide-in {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  #cu-copy-side-pane-header {
    padding: 14px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--glass-border);
  }
  #cu-copy-side-pane-header h3 {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-primary);
  }
  #cu-copy-side-pane-close {
    color: var(--text-secondary);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--glass-border);
    padding: 6px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s var(--ease-out);
  }
  #cu-copy-side-pane-close:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--glass-border-highlight);
    color: var(--text-primary);
  }
  #cu-copy-side-pane-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  #cu-copy-side-pane-body::-webkit-scrollbar { width: 5px; }
  #cu-copy-side-pane-body::-webkit-scrollbar-track { background: transparent; }
  #cu-copy-side-pane-body::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 3px; }
  #cu-copy-side-pane-body::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.15); }

  .cu-chunk-row {
    background: rgba(255, 255, 255, 0.015);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: all 0.2s var(--ease-out);
  }
  .cu-chunk-row:hover {
    background: rgba(255, 255, 255, 0.035);
    border-color: var(--glass-border-highlight);
  }
  .cu-chunk-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .cu-chunk-title {
    font-size: 12.5px;
    font-weight: 500;
    color: var(--text-primary);
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
    border-radius: var(--radius-sm);
    border: none;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s var(--ease-out);
    background: var(--accent);
    color: #0c0c10;
  }
  .cu-chunk-copy-btn:hover {
    background: var(--accent-strong);
    box-shadow: 0 0 10px var(--accent-glow);
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
  const state = {
    allFiles: [],
    openFolders: /* @__PURE__ */ new Set(),
    searchQ: "",
    shadowRoot: null
  };
  function $(id) {
    if (!state.shadowRoot) return null;
    return state.shadowRoot.getElementById(id);
  }
  const DOM_PROPS = /* @__PURE__ */ new Set(["id", "title", "type", "placeholder", "autocomplete", "rows", "spellcheck"]);
  function el(tag, props = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "cls") e.className = v;
      else if (k === "txt") e.textContent = v;
      else if (DOM_PROPS.has(k)) e[k] = v;
      else e.setAttribute(k, v);
    }
    for (const c of children) if (c) e.appendChild(c);
    return e;
  }
  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  }
  function showToast(msg, type = "success") {
    if (!state.shadowRoot) return;
    const existing = state.shadowRoot.getElementById("cu-toast");
    if (existing) existing.remove();
    const toast = el("div", { id: "cu-toast", txt: msg });
    toast.classList.add(type);
    state.shadowRoot.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), TOAST_FADE_MS);
    }, TOAST_DURATION);
  }
  let settings = { ...DEFAULT_SETTINGS };
  let ignoreFoldersSet = /* @__PURE__ */ new Set();
  let ignoreExtsSet = /* @__PURE__ */ new Set();
  function updateCachedSettings() {
    ignoreFoldersSet = new Set(settings.ignoreFolders.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
    ignoreExtsSet = new Set(settings.ignoreExts.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
  }
  function loadSettings() {
    try {
      const raw = localStorage.getItem("cu-settings");
      if (raw) settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch (e) {
      console.warn("[Codebase Uploader] Failed to load settings:", e);
    }
    updateCachedSettings();
  }
  function saveSettings() {
    try {
      localStorage.setItem("cu-settings", JSON.stringify(settings));
    } catch (e) {
      console.warn("[Codebase Uploader] Failed to save settings:", e);
    }
    updateCachedSettings();
  }
  function resetSettings() {
    settings = { ...DEFAULT_SETTINGS };
    saveSettings();
  }
  loadSettings();
  let copyModalCallback = null;
  function registerCopyModal(cb) {
    copyModalCallback = cb;
  }
  async function copyFileToClipboard(file) {
    if (file.type.startsWith("image/") && file.type !== "image/svg+xml") {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ [file.type]: file })
        ]);
        return "image";
      } catch (err) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async () => {
            if (typeof reader.result === "string") {
              try {
                await navigator.clipboard.writeText(reader.result);
                resolve("base64");
              } catch (e) {
                reject(e);
              }
            } else {
              reject(new Error("Invalid read result"));
            }
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
      }
    } else {
      const text = await file.text();
      await navigator.clipboard.writeText(text);
      return "text";
    }
  }
  function isBinaryFile(name) {
    const filename = (name || "").split("/").pop().toLowerCase();
    const dotIdx = filename.lastIndexOf(".");
    const ext = dotIdx > 0 ? filename.slice(dotIdx) : "";
    return BINARY_EXTS.has(ext);
  }
  function shouldSkip(path, size) {
    const segs = path.split("/");
    if (settings.skipHidden) {
      if (segs.slice(0, -1).some((s) => s.startsWith("."))) return true;
      const filename = segs[segs.length - 1].toLowerCase();
      if (filename.startsWith(".")) {
        const dotIdx = filename.lastIndexOf(".");
        const ext = dotIdx >= 0 ? filename.slice(dotIdx) : "";
        if (!TEXT_FILENAMES.has(filename) && !TEXT_EXTS.has(ext) && !BINARY_EXTS.has(ext)) return true;
      }
    }
    if (segs.some((s) => ignoreFoldersSet.has(s.toLowerCase()))) return true;
    const name = segs[segs.length - 1].toLowerCase();
    if (ignoreExtsSet.has(name)) return true;
    for (const ignoreExt of ignoreExtsSet) {
      if (ignoreExt.startsWith(".") && name.endsWith(ignoreExt)) return true;
    }
    if (size > settings.maxFileBytes) return true;
    return false;
  }
  function ingestFiles(fileObjs) {
    const existingPaths = new Set(state.allFiles.map((f) => f.path));
    let added = 0, skipped = 0;
    const newFiles = [...state.allFiles];
    for (const { file, path } of fileObjs) {
      if (shouldSkip(path, file.size)) {
        skipped++;
        continue;
      }
      if (existingPaths.has(path)) continue;
      existingPaths.add(path);
      const isBin = isBinaryFile(path);
      if (isBin && !settings.includeBinary) {
        skipped++;
        continue;
      }
      newFiles.push({ file, path, selected: true, isBinary: isBin });
      added++;
    }
    if (added > 0 || newFiles.length !== state.allFiles.length) {
      state.allFiles = newFiles;
    }
    const statsEl = $("cu-stats");
    if (statsEl) {
      if (added > 0 && skipped > 0) statsEl.textContent = `Added ${added} file(s), skipped ${skipped}.`;
      else if (added > 0) statsEl.textContent = `Added ${added} file(s).`;
      else if (skipped > 0) statsEl.textContent = `Skipped ${skipped} file(s).`;
    }
  }
  async function buildChunks(textFiles, binaryFiles = []) {
    const chunks = [];
    let chunkNum = 1;
    let parts = [];
    let currentChars = 0;
    const flush = () => {
      if (!parts.length) return;
      chunks.push(new File([`# Codebase Context — Part ${chunkNum}

` + parts.join("")], `codebase_part_${chunkNum}.md`, { type: "text/markdown" }));
      chunkNum++;
      parts = [];
      currentChars = 0;
    };
    for (const { file, path } of textFiles) {
      let content;
      try {
        content = await file.text();
      } catch (e) {
        console.warn(`[Codebase Uploader] Failed to read text file ${path}:`, e);
        content = `[binary or unreadable — skipped]`;
      }
      const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
      const maxContentSize = Math.max(1e3, settings.maxChunkChars - 300);
      let offset = 0;
      let partNum = 1;
      const isLarge = content.length > maxContentSize;
      while (offset < content.length || offset === 0 && content.length === 0) {
        const chunkContent = content.slice(offset, offset + maxContentSize);
        const displayPath = isLarge ? `${path} (Part ${partNum})` : path;
        const block = `## File: \`${displayPath}\`

\`\`\`${ext}
${chunkContent}
\`\`\`

`;
        if (parts.length > 0 && currentChars + block.length > settings.maxChunkChars) {
          flush();
        }
        parts.push(block);
        currentChars += block.length;
        offset += chunkContent.length;
        partNum++;
        if (chunkContent.length === 0) break;
      }
    }
    flush();
    const fileLines = [
      ...textFiles.map((f) => `- \`${f.path}\``),
      ...binaryFiles.map((f) => `- \`${f.path}\` (binary)`)
    ];
    const customPromptSection = settings.customPrompt ? `${settings.customPrompt.trim()}

` : "";
    const manifest = `# Codebase Manifest
${customPromptSection}- **Total files:** ${textFiles.length + binaryFiles.length}
- **Chunks:** ${chunks.length}

## File list
${fileLines.join("\n")}`;
    chunks.unshift(new File([manifest], "codebase_manifest.md", { type: "text/markdown" }));
    return chunks;
  }
  function findInShadows(selectors, root = document) {
    for (const sel of selectors) {
      const elElement = root.querySelector(sel);
      if (elElement instanceof HTMLElement) return elElement;
    }
    const elements = root.querySelectorAll("*");
    for (const elNode of elements) {
      if (elNode.shadowRoot) {
        const found = findInShadows(selectors, elNode.shadowRoot);
        if (found) return found;
      }
    }
    return null;
  }
  function findFileInput() {
    return findInShadows(SITE_SELECTORS);
  }
  function findChatInput() {
    const chatSelectors = [
      "#prompt-textarea",
      "textarea",
      '[contenteditable="true"]',
      'input[type="text"]'
    ];
    return findInShadows(chatSelectors);
  }
  function dispatchDrop(target, dt) {
    try {
      target.dispatchEvent(new DragEvent("dragenter", { bubbles: true, cancelable: true, dataTransfer: dt }));
      target.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }));
      target.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
      return true;
    } catch (e) {
      return false;
    }
  }
  function injectToChat(files) {
    if (window.location.hostname.includes("qwen.ai")) return false;
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    const fileInput = findFileInput();
    if (fileInput) {
      try {
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));
        fileInput.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      } catch (e) {
        console.error("[Codebase Uploader] File input injection failed:", e);
      }
    }
    const chatInput = findChatInput();
    if (chatInput && dispatchDrop(chatInput, dt)) return true;
    return dispatchDrop(document.body, dt);
  }
  function downloadFiles(files) {
    files.forEach((f) => {
      const url = URL.createObjectURL(f);
      const a = Object.assign(document.createElement("a"), { href: url, download: f.name });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), REVOCATION_DELAY_MS);
    });
  }
  function updateStats() {
    const statsEl = $("cu-stats");
    const chunkEstimate = $("cu-chunk-estimate");
    if (!statsEl || !chunkEstimate) return;
    const visible = state.allFiles.filter((f) => !shouldSkip(f.path, f.file.size));
    const active = visible.filter((f) => f.selected);
    const textActive = active.filter((f) => !f.isBinary);
    const binActive = active.filter((f) => f.isBinary);
    const totalBytes = active.reduce((a, f) => a + f.file.size, 0);
    statsEl.textContent = `${active.length}/${visible.length} files · ${textActive.length} text, ${binActive.length} bin · ${formatSize(totalBytes)}`;
    if (!active.length) {
      chunkEstimate.textContent = "—";
      chunkEstimate.className = "";
      return;
    }
    const estChunks = Math.max(1, Math.ceil((textActive.reduce((a, f) => a + f.file.size, 0) + textActive.length * CHUNK_OVERHEAD_CHARS) / settings.maxChunkChars));
    const estTotal = estChunks + binActive.length;
    chunkEstimate.textContent = `~${estTotal} upload${estTotal !== 1 ? "s" : ""}`;
    chunkEstimate.className = estTotal > settings.maxChunks ? "danger" : estTotal > settings.maxChunks * LIMIT_WARNING_THRESHOLD ? "warn" : "";
  }
  async function run(mode = "upload") {
    const statsEl = $("cu-stats");
    const overlay = $("cu-overlay");
    const visible = state.allFiles.filter((f) => !shouldSkip(f.path, f.file.size));
    const files = visible.filter((f) => f.selected);
    if (!files.length) {
      showToast("Select at least one file first.", "error");
      return;
    }
    const textFiles = files.filter((f) => !f.isBinary);
    const binaryFiles = files.filter((f) => f.isBinary);
    if (statsEl) statsEl.textContent = `Building ${textFiles.length} chunks…`;
    const chunks = textFiles.length || binaryFiles.length ? await buildChunks(textFiles, binaryFiles) : [];
    const rawFiles = binaryFiles.map((f) => f.file);
    const allUploads = [...chunks, ...rawFiles];
    if (!allUploads.length) {
      if (statsEl) statsEl.textContent = "Nothing to upload.";
      return;
    }
    const doDownload = () => {
      const mdFiles = allUploads.filter((f) => f.name.endsWith(".md"));
      const others = allUploads.filter((f) => !f.name.endsWith(".md"));
      const downloads = mdFiles.length ? [new File(mdFiles.flatMap((f, i) => i ? ["\n\n---\n\n", f] : [f]), "codebase_combined.md", { type: "text/markdown" }), ...others] : others;
      downloadFiles(downloads);
      showToast(`Downloaded ${downloads.length} file(s).`);
      if (statsEl) statsEl.textContent = `Downloaded ${downloads.length} file(s).`;
    };
    const doCopy = async () => {
      if (allUploads.length > 1 && copyModalCallback) {
        copyModalCallback(allUploads);
        return;
      }
      const file = allUploads[0];
      try {
        const type = await copyFileToClipboard(file);
        const msg = type === "base64" ? "image Base64 data URL" : file.name;
        showToast(`Copied ${msg} to clipboard!`, "success");
        if (statsEl) statsEl.textContent = `Copied ${msg} to clipboard.`;
        if (overlay) overlay.classList.remove("open");
      } catch (err) {
        console.error("[Codebase Uploader] Failed to copy to clipboard:", err);
        showToast("Clipboard block — downloading files instead.", "error");
        doDownload();
      }
    };
    if (allUploads.length > settings.maxChunks) {
      if (confirm(`${allUploads.length} uploads exceeds limit of ${settings.maxChunks}.

Download combined files instead?`)) {
        doDownload();
      } else if (statsEl) {
        statsEl.textContent = `Too many uploads (${allUploads.length}). Deselect some or raise the limit.`;
      }
      return;
    }
    if (mode === "download") {
      doDownload();
      return;
    }
    if (mode === "copy") {
      await doCopy();
      return;
    }
    const injected = injectToChat(allUploads);
    if (injected) {
      if (overlay) overlay.classList.remove("open");
      showToast(`Uploaded ${allUploads.length} item(s)!`);
      if (statsEl) statsEl.textContent = `Uploaded ${allUploads.length} item(s).`;
    } else {
      await doCopy();
    }
  }
  const NS = "http://www.w3.org/2000/svg";
  function svg(size) {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("width", String(size));
    s.setAttribute("height", String(size));
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("fill", "none");
    s.setAttribute("stroke", "currentColor");
    s.setAttribute("stroke-width", "1.75");
    s.setAttribute("stroke-linecap", "round");
    s.setAttribute("stroke-linejoin", "round");
    return s;
  }
  function p(parent, d) {
    const el2 = document.createElementNS(NS, "path");
    el2.setAttribute("d", d);
    parent.appendChild(el2);
  }
  const PATHS = {
    folder: [
      "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"
    ],
    folderOpen: [
      "M6 14l1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v1"
    ],
    file: [
      "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z",
      "M14 2v6h6"
    ],
    paperclip: [
      "m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
    ],
    x: [
      "M18 6 6 18",
      "M6 6l12 12"
    ],
    chevronRight: [
      "m9 18 6-6-6-6"
    ],
    chevronDown: [
      "m6 9 6 6 6-6"
    ],
    arrowLeft: [
      "M19 12H5",
      "m12 19-7-7 7-7"
    ],
    plus: [
      "M12 5v14",
      "M5 12h14"
    ],
    download: [
      "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
      "m7 10 5 5 5-5",
      "M12 15V3"
    ],
    zap: [
      "M13 2 3 14h9l-1 8 10-12h-9l1-8z"
    ],
    search: [
      "M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z",
      "m21 21-4.35-4.35"
    ],
    settings: [
      "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",
      "M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0z"
    ],
    upload: [
      "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
      "m17 8-5-5-5 5",
      "M12 3v12"
    ],
    copy: [
      "M20 9H11a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z",
      "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
    ]
  };
  function icon(name, size = 16) {
    const s = svg(size);
    for (const d of PATHS[name] || []) p(s, d);
    return s;
  }
  let searchMatches = /* @__PURE__ */ new Map();
  function buildTree(files) {
    const root = { isFolder: true, children: /* @__PURE__ */ new Map(), path: "", name: "" };
    for (const item of files) {
      const parts = item.path.split("/").filter(Boolean);
      let node = root;
      let curPath = "";
      for (let i = 0; i < parts.length; i++) {
        const seg = parts[i];
        curPath = curPath ? `${curPath}/${seg}` : seg;
        if (i === parts.length - 1) {
          node.children.set(seg, { isFolder: false, name: seg, path: curPath, item });
        } else {
          if (!node.children.has(seg)) {
            node.children.set(seg, { isFolder: true, name: seg, path: curPath, children: /* @__PURE__ */ new Map() });
          }
          node = node.children.get(seg);
        }
      }
    }
    return root;
  }
  function nodeCheckState(node) {
    if (!node.isFolder) return node.item.selected ? 1 : 0;
    const vals = [...node.children.values()].map(nodeCheckState);
    if (!vals.length) return 0;
    const sum = vals.reduce((a, b) => a + b, 0);
    return sum === vals.length ? 1 : sum === 0 ? 0 : 0.5;
  }
  function setNodeChecked(node, val) {
    if (!node.isFolder) {
      node.item.selected = val;
      return;
    }
    for (const c of node.children.values()) setNodeChecked(c, val);
  }
  function highlightLabel(text) {
    if (!state.searchQ) return document.createTextNode(text);
    const idx = text.toLowerCase().indexOf(state.searchQ);
    if (idx < 0) return document.createTextNode(text);
    const span = document.createElement("span");
    span.append(text.slice(0, idx));
    const mark = document.createElement("mark");
    mark.textContent = text.slice(idx, idx + state.searchQ.length);
    span.append(mark, text.slice(idx + state.searchQ.length));
    return span;
  }
  function precomputeMatches(node, query) {
    if (!node.isFolder) {
      const match = node.path.toLowerCase().includes(query);
      searchMatches.set(node.path, match);
      return match;
    }
    let anyMatch = node.path.toLowerCase().includes(query);
    for (const child of node.children.values()) {
      if (precomputeMatches(child, query)) {
        anyMatch = true;
      }
    }
    searchMatches.set(node.path, anyMatch);
    return anyMatch;
  }
  function renderTree() {
    const treePane = $("cu-tree-pane");
    const treeList = $("cu-tree-list");
    if (!treePane || !treeList) return;
    const scrollTop = treePane.scrollTop;
    const visibleFiles = state.allFiles.filter((f) => !shouldSkip(f.path, f.file.size));
    if (!visibleFiles.length) {
      treePane.classList.add("cu-empty");
      treeList.textContent = "";
      updateStats();
      return;
    }
    treePane.classList.remove("cu-empty");
    const tree = buildTree(visibleFiles);
    searchMatches.clear();
    if (state.searchQ) {
      precomputeMatches(tree, state.searchQ);
    }
    const frag = document.createDocumentFragment();
    renderChildren(tree, frag);
    treeList.textContent = "";
    treeList.appendChild(frag);
    updateStats();
    treePane.scrollTop = scrollTop;
  }
  function renderChildren(node, container) {
    const sorted = [...node.children.values()].sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const child of sorted) {
      if (state.searchQ && searchMatches.get(child.path) === false) continue;
      container.appendChild(child.isFolder ? renderFolder(child) : renderFile(child));
    }
  }
  function updateDescendantCheckboxes(cb, checked) {
    const row = cb.closest(".tr");
    if (!row) return;
    const wrap = row.parentElement;
    if (!wrap) return;
    const childrenWrap = wrap.querySelector(".tr-children");
    if (childrenWrap) {
      const childCbs = childrenWrap.querySelectorAll('input[type="checkbox"]');
      for (const childCb of childCbs) {
        childCb.checked = checked;
        childCb.indeterminate = false;
      }
    }
  }
  function updateAncestorCheckboxes(cb) {
    let cur = cb.closest(".tr-children");
    while (cur) {
      const parentWrap = cur.parentElement;
      if (!parentWrap) break;
      const parentCb = parentWrap.querySelector('.tr > input[type="checkbox"]');
      if (!parentCb) break;
      const siblingCbs = Array.from(cur.children).map((child) => child.classList.contains("tr") ? child.querySelector("input") : child.querySelector(".tr > input")).filter(Boolean);
      let checkedCount = 0;
      let indeterminateCount = 0;
      for (const scb of siblingCbs) {
        if (scb.checked) checkedCount++;
        if (scb.indeterminate) indeterminateCount++;
      }
      if (checkedCount === siblingCbs.length) {
        parentCb.checked = true;
        parentCb.indeterminate = false;
      } else if (checkedCount === 0 && indeterminateCount === 0) {
        parentCb.checked = false;
        parentCb.indeterminate = false;
      } else {
        parentCb.checked = false;
        parentCb.indeterminate = true;
      }
      cur = parentWrap.closest(".tr-children");
    }
  }
  function renderFolder(node) {
    const wrap = document.createElement("div");
    const hasMatch = state.searchQ && searchMatches.get(node.path) === true;
    const isOpen2 = state.openFolders.has(node.path) || !!hasMatch;
    const row = document.createElement("div");
    row.className = "tr";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    const stateVal = nodeCheckState(node);
    cb.checked = stateVal === 1;
    cb.indeterminate = stateVal === 0.5;
    cb.addEventListener("change", (e) => {
      const checked = e.target.checked;
      setNodeChecked(node, checked);
      updateDescendantCheckboxes(cb, checked);
      updateAncestorCheckboxes(cb);
      updateStats();
    });
    const caret = document.createElement("span");
    caret.className = "caret";
    caret.appendChild(icon(isOpen2 ? "chevronDown" : "chevronRight", 14));
    const iconEl = document.createElement("span");
    iconEl.className = `t-icon ${isOpen2 ? "folderOpen" : "folder"}`;
    iconEl.appendChild(icon(isOpen2 ? "folderOpen" : "folder", 17));
    const label = document.createElement("span");
    label.className = "t-label";
    label.appendChild(highlightLabel(node.name));
    const toggle = () => {
      if (state.openFolders.has(node.path)) {
        state.openFolders.delete(node.path);
      } else {
        state.openFolders.add(node.path);
      }
      renderTree();
    };
    caret.addEventListener("click", toggle);
    label.addEventListener("click", toggle);
    row.append(cb, caret, iconEl, label);
    wrap.appendChild(row);
    if (isOpen2) {
      const childrenWrap = document.createElement("div");
      childrenWrap.className = "tr-children";
      renderChildren(node, childrenWrap);
      wrap.appendChild(childrenWrap);
    }
    return wrap;
  }
  function renderFile(node) {
    const row = document.createElement("div");
    row.className = "tr";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = node.item.selected;
    cb.addEventListener("change", (e) => {
      const checked = e.target.checked;
      node.item.selected = checked;
      updateAncestorCheckboxes(cb);
      updateStats();
    });
    const spacer = document.createElement("span");
    spacer.className = "caret spacer";
    const iconEl = document.createElement("span");
    iconEl.className = `t-icon ${node.item.isBinary ? "bin" : "file"}`;
    iconEl.appendChild(icon(node.item.isBinary ? "paperclip" : "file", 16));
    const label = document.createElement("span");
    label.className = "t-label";
    label.appendChild(highlightLabel(node.name));
    label.title = node.path;
    const size = document.createElement("span");
    size.className = "t-size";
    size.textContent = formatSize(node.item.file.size);
    row.append(cb, spacer, iconEl, label, size);
    if (node.item.isBinary) {
      const badge = document.createElement("span");
      badge.className = "t-badge bin";
      badge.textContent = "raw";
      row.appendChild(badge);
    }
    const removeBtn = document.createElement("span");
    removeBtn.className = "t-remove";
    removeBtn.appendChild(icon("x", 13));
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      state.allFiles = state.allFiles.filter((f) => f.path !== node.item.path);
      renderTree();
    });
    row.appendChild(removeBtn);
    return row;
  }
  let isOpen = false;
  let isSettingsOpen = false;
  const isMac = typeof navigator !== "undefined" && (/Mac|iPhone|iPad|iPod/i.test(navigator.platform) || /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent));
  const MAX_DRAG_FILES = 5e3;
  function debounce(fn, delay) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }
  function openPanel() {
    isOpen = true;
    const overlay = $("cu-overlay");
    if (overlay) {
      overlay.classList.add("open");
      renderTree();
    }
  }
  function closePanel() {
    isOpen = false;
    const overlay = $("cu-overlay");
    if (overlay) overlay.classList.remove("open");
  }
  function togglePanel() {
    isOpen ? closePanel() : openPanel();
  }
  function pickFolder() {
    const input = document.createElement("input");
    input.type = "file";
    input.webkitdirectory = true;
    input.multiple = true;
    input.addEventListener("change", (e) => {
      const target = e.target;
      if (target.files) {
        if (target.files.length > MAX_DRAG_FILES) {
          if (!confirm(`You are selecting ${target.files.length} files. This may freeze the browser.

Are you sure you want to proceed?`)) {
            return;
          }
        }
        ingestFiles(Array.from(target.files).map((f) => ({ file: f, path: f.webkitRelativePath || f.name })));
        renderTree();
      }
    });
    input.click();
  }
  async function handleDrop(e, treePane) {
    e.preventDefault();
    treePane.classList.remove("drag-over");
    if (!e.dataTransfer) return;
    const droppedFiles = [];
    let fileCount = 0;
    let aborted = false;
    async function traverse(entry, prefix = "") {
      if (aborted) return;
      if (entry.isFile) {
        fileCount++;
        if (fileCount > MAX_DRAG_FILES) {
          aborted = true;
          if (confirm(`You are uploading more than ${MAX_DRAG_FILES} files. This might be a mistake (e.g., dropping a root directory or node_modules).

Do you want to cancel the upload?`)) {
            droppedFiles.length = 0;
            return;
          } else {
            aborted = false;
          }
        }
        const file = await new Promise((r) => entry.file(r));
        if (aborted) return;
        droppedFiles.push({ file, path: prefix + file.name });
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        let entries = [], batch;
        do {
          batch = await new Promise((r) => reader.readEntries(r));
          entries = entries.concat(batch);
        } while (batch.length > 0 && !aborted);
        for (const child of entries) {
          if (aborted) break;
          await traverse(child, prefix + entry.name + "/");
        }
      }
    }
    await Promise.all(
      [...e.dataTransfer.items].filter((i) => i.kind === "file").map((i) => i.webkitGetAsEntry?.()).filter(Boolean).map((entry) => traverse(entry))
    );
    if (droppedFiles.length > 0) {
      ingestFiles(droppedFiles);
      renderTree();
    }
  }
  function buildTagEditor(initialValue, onUpdate) {
    const container = el("div", { cls: "cu-tag-editor" });
    const chips = el("div", { cls: "cu-chips" });
    const input = el("input", { cls: "cu-chip-input", type: "text", placeholder: "Add tag + Enter..." });
    let tags = initialValue.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const renderChips = () => {
      chips.textContent = "";
      tags.forEach((tag) => {
        const chip = el("div", { cls: "cu-chip", txt: tag });
        const remove = el("span", { cls: "cu-chip-x" });
        remove.appendChild(icon("x", 10));
        remove.addEventListener("click", () => {
          tags = tags.filter((t) => t !== tag);
          onUpdate(tags.join(","));
          renderChips();
        });
        chip.appendChild(remove);
        chips.appendChild(chip);
      });
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const val = input.value.trim().toLowerCase();
        if (val && !tags.includes(val)) {
          tags.push(val);
          onUpdate(tags.join(","));
          renderChips();
        }
        input.value = "";
      }
    });
    renderChips();
    container.append(chips, input);
    return container;
  }
  function updateShortcutHint() {
    const hint = $("cu-kbd-hint");
    if (hint) {
      const key = (settings.shortcutKey || "u").toUpperCase();
      hint.textContent = `${isMac ? "⌥⇧" : "Alt+Shift+"}${key}`;
    }
  }
  function buildSettingsPane() {
    const pane = el("div", { id: "cu-settings-pane" });
    pane.appendChild(el("div", { cls: "cu-setting-section", txt: "Limits & Shortcut" }));
    const limitRow = el("div", { cls: "cu-setting-row" }, [
      el("label", { txt: "Max uploads / chunks" }),
      el("input", { id: "cu-set-maxChunks", type: "number", value: String(settings.maxChunks) })
    ]);
    limitRow.querySelector("input")?.addEventListener("change", (e) => {
      settings.maxChunks = Number(e.target.value) || settings.maxChunks;
      saveSettings();
    });
    const sizeLabel = el("label", { txt: "Max file size (bytes)" });
    const sizeHelper = el("span", { id: "cu-size-helper", txt: ` (${formatSize(settings.maxFileBytes)})`, style: "color: var(--accent-strong); font-size: 11.5px; margin-left: 6px;" });
    sizeLabel.appendChild(sizeHelper);
    const sizeRow = el("div", { cls: "cu-setting-row" }, [
      sizeLabel,
      el("input", { id: "cu-set-maxFileBytes", type: "number", value: String(settings.maxFileBytes) })
    ]);
    const sizeInput = sizeRow.querySelector("input");
    sizeInput?.addEventListener("input", (e) => {
      const bytes = Number(e.target.value) || 0;
      sizeHelper.textContent = ` (${formatSize(bytes)})`;
    });
    sizeInput?.addEventListener("change", (e) => {
      settings.maxFileBytes = Number(e.target.value) || settings.maxFileBytes;
      saveSettings();
    });
    const charRow = el("div", { cls: "cu-setting-row" }, [
      el("label", { txt: "Max characters per chunk" }),
      el("input", { id: "cu-set-maxChunkChars", type: "number", value: String(settings.maxChunkChars) })
    ]);
    charRow.querySelector("input")?.addEventListener("change", (e) => {
      settings.maxChunkChars = Number(e.target.value) || settings.maxChunkChars;
      saveSettings();
    });
    const shortcutRow = el("div", { cls: "cu-setting-row" }, [
      el("label", { txt: "Hotkey Letter (Alt+Shift+Key)" }),
      el("input", { id: "cu-set-shortcutKey", type: "text", value: settings.shortcutKey || "u", maxLength: 1 })
    ]);
    shortcutRow.querySelector("input")?.addEventListener("input", (e) => {
      const val = e.target.value.trim().toLowerCase();
      settings.shortcutKey = val || "u";
      saveSettings();
      updateShortcutHint();
    });
    const limitsGrid1 = el("div", { cls: "cu-setting-grid" }, [limitRow, sizeRow]);
    const limitsGrid2 = el("div", { cls: "cu-setting-grid" }, [charRow, shortcutRow]);
    pane.append(limitsGrid1, limitsGrid2);
    pane.appendChild(el("div", { cls: "cu-setting-section", txt: "Ignored Folders & Extensions" }));
    const folderLabel = el("label", { txt: "Ignored folders" });
    const folderEditor = buildTagEditor(settings.ignoreFolders, (val) => {
      settings.ignoreFolders = val;
      saveSettings();
    });
    const extLabel = el("label", { txt: "Ignored extensions" });
    const extEditor = buildTagEditor(settings.ignoreExts, (val) => {
      settings.ignoreExts = val;
      saveSettings();
    });
    pane.append(
      el("div", { cls: "cu-setting-row" }, [folderLabel, folderEditor]),
      el("div", { cls: "cu-setting-row" }, [extLabel, extEditor])
    );
    pane.appendChild(el("div", { cls: "cu-setting-section", txt: "Inclusion Options" }));
    const skipHiddenRow = el("div", { cls: "cu-setting-row row-cb" }, [
      el("input", { id: "cu-set-skipHidden", type: "checkbox" }),
      el("label", { txt: "Skip hidden files & folders" })
    ]);
    const skipHiddenCb = skipHiddenRow.querySelector("input");
    skipHiddenCb.checked = settings.skipHidden;
    skipHiddenCb.addEventListener("change", () => {
      settings.skipHidden = skipHiddenCb.checked;
      saveSettings();
    });
    const includeBinRow = el("div", { cls: "cu-setting-row row-cb" }, [
      el("input", { id: "cu-set-includeBinary", type: "checkbox" }),
      el("label", { txt: "Include binary files (images, zip, etc.)" })
    ]);
    const includeBinCb = includeBinRow.querySelector("input");
    includeBinCb.checked = settings.includeBinary;
    includeBinCb.addEventListener("change", () => {
      settings.includeBinary = includeBinCb.checked;
      saveSettings();
    });
    const optionsGrid = el("div", { cls: "cu-setting-grid" }, [skipHiddenRow, includeBinRow]);
    pane.appendChild(optionsGrid);
    pane.appendChild(el("div", { cls: "cu-setting-section", txt: "Custom Manifest Prompt" }));
    const promptRow = el("div", { cls: "cu-setting-row" }, [
      el("label", { txt: "Instructions prepended to manifest" }),
      el("textarea", { id: "cu-set-customPrompt", placeholder: "e.g. Please analyze this codebase for memory leaks...", rows: 3 })
    ]);
    const promptTextarea = promptRow.querySelector("textarea");
    promptTextarea.value = settings.customPrompt || "";
    promptTextarea.addEventListener("change", () => {
      settings.customPrompt = promptTextarea.value;
      saveSettings();
    });
    pane.appendChild(promptRow);
    const resetBtn = el("button", { cls: "cu-reset-btn", txt: "Reset to Defaults" });
    resetBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to reset all settings to defaults?")) {
        resetSettings();
        updateShortcutHint();
        const parent = pane.parentElement;
        if (parent) {
          pane.remove();
          const newPane = buildSettingsPane();
          newPane.classList.add("open");
          parent.insertBefore(newPane, $("cu-footer"));
        }
        showToast("Settings reset to defaults.");
      }
    });
    pane.appendChild(el("div", { cls: "cu-settings-footer" }, [resetBtn]));
    return pane;
  }
  function toggleSettings() {
    const treePane = $("cu-tree-pane");
    const toolbar = $("cu-toolbar");
    const actions = $("cu-actions");
    const settingsToggle = $("cu-settings-toggle");
    if (!treePane || !settingsToggle || !toolbar || !actions || !state.shadowRoot) return;
    let settingsPane = $("cu-settings-pane");
    isSettingsOpen = !isSettingsOpen;
    if (isSettingsOpen) {
      if (!settingsPane) {
        settingsPane = buildSettingsPane();
        const footer = $("cu-footer");
        if (footer) footer.parentElement?.insertBefore(settingsPane, footer);
      }
      treePane.style.display = "none";
      toolbar.style.display = "none";
      actions.style.display = "none";
      settingsPane.classList.add("open");
      settingsToggle.textContent = "";
      settingsToggle.appendChild(icon("arrowLeft", 16));
      settingsToggle.title = "Back to Files";
    } else {
      treePane.style.display = "block";
      toolbar.style.display = "flex";
      actions.style.display = "flex";
      if (settingsPane) settingsPane.classList.remove("open");
      settingsToggle.textContent = "";
      settingsToggle.appendChild(icon("settings", 16));
      settingsToggle.title = "Settings";
      renderTree();
    }
  }
  function buildUI() {
    if (document.getElementById("codebase-uploader-root")) return;
    const $host = document.createElement("div");
    $host.id = "codebase-uploader-root";
    $host.style.cssText = "all:initial;position:fixed!important;top:0;left:0;width:0;height:0;z-index:2147483647!important;pointer-events:none;";
    const shadow = $host.attachShadow({ mode: "open" });
    state.shadowRoot = shadow;
    const style = document.createElement("style");
    style.textContent = STYLESHEET;
    shadow.appendChild(style);
    const closeBtn = el("button", { cls: "cu-icon-btn", id: "cu-close", title: "Close (Esc)" });
    closeBtn.appendChild(icon("x", 16));
    const settingsBtn = el("button", { cls: "cu-icon-btn", id: "cu-settings-toggle", title: "Settings" });
    settingsBtn.appendChild(icon("settings", 16));
    const kbdHint = el("span", { id: "cu-kbd-hint", cls: "cu-kbd", txt: `${isMac ? "⌥⇧" : "Alt+Shift+"}U` });
    const header = el("div", { id: "cu-header" }, [
      el("h3", { txt: "Codebase Uploader" }),
      kbdHint,
      settingsBtn,
      closeBtn
    ]);
    const searchInput = el("input", { id: "cu-search", type: "text", placeholder: "Filter files…", autocomplete: "off", spellcheck: false });
    const addFolderBtn = el("button", { cls: "cu-btn", id: "cu-add-folder", txt: " Folder" });
    addFolderBtn.insertBefore(icon("plus", 14), addFolderBtn.firstChild);
    const toolbar = el("div", { id: "cu-toolbar" }, [searchInput, addFolderBtn]);
    const selAll = el("button", { cls: "cu-btn", txt: "All" });
    const selNone = el("button", { cls: "cu-btn", txt: "None" });
    const selectionGroup = el("div", { cls: "cu-action-group" }, [selAll, selNone]);
    const expandAll = el("button", { cls: "cu-btn", txt: "Expand" });
    const collapseAll = el("button", { cls: "cu-btn", txt: "Collapse" });
    const viewGroup = el("div", { cls: "cu-action-group" }, [expandAll, collapseAll]);
    const clearBtn = el("button", { cls: "cu-btn cu-btn-danger", id: "cu-clear", txt: "Clear" });
    const actions = el("div", { id: "cu-actions" }, [selectionGroup, viewGroup, clearBtn]);
    const dropzoneBtn = el("button", { cls: "cu-btn cu-btn-primary", txt: "Choose Folder" });
    const dropIcon = icon("folderOpen", 48);
    dropIcon.setAttribute("class", "cu-drop-icon");
    const dropzone = el("div", { id: "cu-dropzone" }, [
      dropIcon,
      el("strong", { txt: "Drop a folder or click below" }),
      el("div", { cls: "hint", txt: "Text → markdown chunks · Binary → raw attachments" }),
      dropzoneBtn
    ]);
    const treeList = el("div", { id: "cu-tree-list" });
    const treeContent = el("div", { id: "cu-tree-content" }, [dropzone, treeList]);
    const treePane = el("div", { id: "cu-tree-pane", cls: "cu-empty" }, [treeContent]);
    const stats = el("div", { id: "cu-stats", txt: "No files loaded." });
    const chunkEstimate = el("div", { id: "cu-chunk-estimate", txt: "—" });
    const downloadBtn = el("button", { cls: "cu-btn", id: "cu-download-btn", txt: " Download" });
    downloadBtn.insertBefore(icon("download", 14), downloadBtn.firstChild);
    const copyBtn = el("button", { cls: "cu-btn", id: "cu-copy-btn", txt: " Copy" });
    copyBtn.insertBefore(icon("copy", 14), copyBtn.firstChild);
    const uploadBtn = el("button", { cls: "cu-btn cu-btn-primary", id: "cu-upload-btn", txt: " Upload" });
    uploadBtn.insertBefore(icon("zap", 14), uploadBtn.firstChild);
    const footer = el("div", { id: "cu-footer" }, [stats, chunkEstimate, downloadBtn, copyBtn, uploadBtn]);
    const panel = el("div", { id: "cu-panel" }, [header, toolbar, actions, treePane, footer]);
    const overlay = el("div", { id: "cu-overlay", role: "dialog", "aria-modal": "true" }, [panel]);
    shadow.appendChild(overlay);
    document.documentElement.appendChild($host);
    closeBtn.addEventListener("click", closePanel);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closePanel();
    });
    let clearTimer = null;
    clearBtn.addEventListener("click", () => {
      if (clearBtn.textContent === "Clear") {
        clearBtn.textContent = "Confirm?";
        clearTimer = setTimeout(() => {
          clearBtn.textContent = "Clear";
        }, 2500);
      } else {
        clearTimeout(clearTimer);
        clearBtn.textContent = "Clear";
        state.allFiles = [];
        renderTree();
        showToast("Cleared.");
      }
    });
    settingsBtn.addEventListener("click", toggleSettings);
    addFolderBtn.addEventListener("click", pickFolder);
    dropzoneBtn.addEventListener("click", pickFolder);
    const onSearchInput = debounce(() => {
      state.searchQ = searchInput.value.trim().toLowerCase();
      renderTree();
    }, 150);
    searchInput.addEventListener("input", onSearchInput);
    selAll.addEventListener("click", () => {
      state.allFiles.forEach((f) => f.selected = true);
      renderTree();
    });
    selNone.addEventListener("click", () => {
      state.allFiles.forEach((f) => f.selected = false);
      renderTree();
    });
    expandAll.addEventListener("click", () => {
      state.allFiles.forEach((f) => {
        const parts = f.path.split("/").slice(0, -1);
        let current = "";
        for (const part of parts) {
          current = current ? `${current}/${part}` : part;
          state.openFolders.add(current);
        }
      });
      renderTree();
    });
    collapseAll.addEventListener("click", () => {
      state.openFolders.clear();
      renderTree();
    });
    uploadBtn.addEventListener("click", () => run("upload"));
    copyBtn.addEventListener("click", () => run("copy"));
    downloadBtn.addEventListener("click", () => run("download"));
    treePane.addEventListener("dragover", (e) => {
      e.preventDefault();
      treePane.classList.add("drag-over");
    });
    treePane.addEventListener("dragleave", () => treePane.classList.remove("drag-over"));
    treePane.addEventListener("drop", (e) => handleDrop(e, treePane));
    if (isOpen) openPanel();
    updateShortcutHint();
    new MutationObserver(() => {
      if (!document.getElementById("codebase-uploader-root")) buildUI();
    }).observe(document.documentElement, { childList: true });
  }
  function buildCopySidePane(chunks) {
    const pane = el("div", { id: "cu-copy-side-pane" });
    const closeBtn = el("button", { cls: "cu-icon-btn", id: "cu-copy-side-pane-close", title: "Close side panel" });
    closeBtn.appendChild(icon("x", 14));
    closeBtn.addEventListener("click", () => pane.remove());
    const header = el("div", { id: "cu-copy-side-pane-header" }, [
      el("h3", { txt: "Copy Parts" }),
      closeBtn
    ]);
    const body = el("div", { id: "cu-copy-side-pane-body" });
    chunks.forEach((chunk, index) => {
      const isChunk = chunk.name.startsWith("codebase_part_");
      const label = isChunk ? `Part ${chunk.name.match(/_part_(\d+)/)?.[1] || index + 1}` : chunk.name;
      const title = isChunk ? `Text Chunk (${label})` : chunk.name;
      const info = el("div", { cls: "cu-chunk-info" }, [
        el("span", { cls: "cu-chunk-title", txt: title }),
        el("span", { cls: "cu-chunk-stats", txt: formatSize(chunk.size) })
      ]);
      const copyBtn = el("button", { cls: "cu-chunk-copy-btn", txt: ` Copy` });
      copyBtn.insertBefore(icon("copy", 13), copyBtn.firstChild);
      copyBtn.addEventListener("click", async () => {
        try {
          const type = await copyFileToClipboard(chunk);
          const msg = type === "base64" ? "image Base64" : label;
          showToast(`Copied ${msg}!`);
          copyBtn.textContent = " Copied!";
          copyBtn.insertBefore(icon("zap", 13), copyBtn.firstChild);
          copyBtn.classList.add("copied");
          setTimeout(() => {
            copyBtn.textContent = ` Copy`;
            copyBtn.insertBefore(icon("copy", 13), copyBtn.firstChild);
            copyBtn.classList.remove("copied");
          }, 2e3);
        } catch (err) {
          showToast("Failed to copy.", "error");
        }
      });
      const row = el("div", { cls: "cu-chunk-row" }, [info, copyBtn]);
      body.appendChild(row);
    });
    pane.appendChild(header);
    pane.appendChild(body);
    return pane;
  }
  registerCopyModal((chunks) => {
    const treePane = $("cu-tree-pane");
    if (treePane) {
      const existing = $("cu-copy-side-pane");
      if (existing) existing.remove();
      treePane.appendChild(buildCopySidePane(chunks));
    }
  });
  buildUI();
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      const active = state.shadowRoot?.activeElement || document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
        active.blur();
        e.preventDefault();
        return;
      }
      closePanel();
      e.preventDefault();
    }
    const targetKey = (settings.shortcutKey || "u").toLowerCase();
    if (e.altKey && e.shiftKey && e.key.toLowerCase() === targetKey) {
      togglePanel();
      e.preventDefault();
    }
  });
  GM_registerMenuCommand("📂 Toggle Codebase Uploader", togglePanel);

})();
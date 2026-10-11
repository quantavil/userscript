// ==UserScript==
// @name         Codebase Uploader
// @namespace    http://tampermonkey.net/
// @version      1.4.0
// @author       quantavil
// @description  An elegant, zero-dependency userscript that packages directories and codebases for AI chats. Features smart markdown chunking, customizable ignore patterns, binary file uploads, and a premium Liquid Glass interface.
// @license      GPL-3.0-or-later
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

(function() {
	"use strict";
	var TOAST_DURATION = 2500;
	var REVOCATION_DELAY_MS = 1e4;
	var DEFAULT_SETTINGS = {
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
	var TEXT_EXTS = new Set([
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
	var BINARY_EXTS = new Set([
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
	var TEXT_FILENAMES = new Set([
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
	var SITE_SELECTORS = [
		"input[data-testid=\"file-upload-input\"]",
		"input[data-testid=\"upload-file-input\"]",
		"input.chat-upload__input",
		"input[type=\"file\"][accept*=\"text\"]",
		"input[type=\"file\"][multiple]",
		"input[type=\"file\"]"
	];
	var STYLESHEET = `
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
    margin-left: 20px;
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
	var state = {
		allFiles: [],
		openFolders: new Set(),
		searchQ: "",
		shadowRoot: null
	};
	function $(id) {
		if (!state.shadowRoot) return null;
		return state.shadowRoot.getElementById(id);
	}
	var DOM_PROPS = new Set([
		"id",
		"title",
		"type",
		"placeholder",
		"autocomplete",
		"rows",
		"spellcheck"
	]);
	function el(tag, props = {}, children = []) {
		const e = document.createElement(tag);
		for (const [k, v] of Object.entries(props)) if (k === "cls") e.className = v;
		else if (k === "txt") e.textContent = v;
		else if (DOM_PROPS.has(k)) e[k] = v;
		else e.setAttribute(k, v);
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
		const toast = el("div", {
			id: "cu-toast",
			txt: msg
		});
		toast.classList.add(type);
		state.shadowRoot.appendChild(toast);
		setTimeout(() => toast.classList.add("show"), 10);
		setTimeout(() => {
			toast.classList.remove("show");
			setTimeout(() => toast.remove(), 300);
		}, TOAST_DURATION);
	}
	var settings = { ...DEFAULT_SETTINGS };
	var ignoreFoldersSet = new Set();
	var ignoreExtsSet = new Set();
	function updateCachedSettings() {
		ignoreFoldersSet = new Set(settings.ignoreFolders.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
		ignoreExtsSet = new Set(settings.ignoreExts.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
	}
	function loadSettings() {
		try {
			if (typeof localStorage !== "undefined") {
				const raw = localStorage.getItem("cu-settings");
				if (raw) settings = {
					...DEFAULT_SETTINGS,
					...JSON.parse(raw)
				};
			}
		} catch (e) {
			console.warn("[Codebase Uploader] Failed to load settings:", e);
		}
		updateCachedSettings();
	}
	function saveSettings() {
		try {
			if (typeof localStorage !== "undefined") localStorage.setItem("cu-settings", JSON.stringify(settings));
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
	var copyModalCallback = null;
	function registerCopyModal(cb) {
		copyModalCallback = cb;
	}
	async function copyFileToClipboard(file) {
		if (file.type.startsWith("image/") && file.type !== "image/svg+xml") try {
			await navigator.clipboard.write([new ClipboardItem({ [file.type]: file })]);
			return "image";
		} catch (err) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = async () => {
					if (typeof reader.result === "string") try {
						await navigator.clipboard.writeText(reader.result);
						resolve("base64");
					} catch (e) {
						reject(e);
					}
					else reject(new Error("Invalid read result"));
				};
				reader.onerror = () => reject(reader.error);
				reader.readAsDataURL(file);
			});
		}
		else {
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
		for (const ignoreExt of ignoreExtsSet) if (ignoreExt.startsWith(".") && name.endsWith(ignoreExt)) return true;
		if (!settings.includeBinary && isBinaryFile(path)) return true;
		if (size > settings.maxFileBytes) return true;
		return false;
	}
	function ingestFiles(fileObjs) {
		const existingPaths = new Set(state.allFiles.map((f) => f.path));
		let added = 0;
		const newFiles = [...state.allFiles];
		for (const { file, path } of fileObjs) {
			if (existingPaths.has(path)) continue;
			existingPaths.add(path);
			const isBin = isBinaryFile(path);
			newFiles.push({
				file,
				path,
				selected: true,
				isBinary: isBin
			});
			added++;
		}
		if (added > 0) state.allFiles = newFiles;
		const statsEl = $("cu-stats");
		if (statsEl && added > 0) statsEl.textContent = `Added ${added} file(s).`;
	}
	function isHighSurrogate(code) {
		return code >= 55296 && code <= 56319;
	}
	function isLowSurrogate(code) {
		return code >= 56320 && code <= 57343;
	}
	function safeSlice(str, start, length) {
		if (start >= str.length || length <= 0) return "";
		let actualStart = start;
		if (actualStart > 0 && isLowSurrogate(str.charCodeAt(actualStart)) && isHighSurrogate(str.charCodeAt(actualStart - 1))) actualStart++;
		let actualEnd = Math.min(str.length, actualStart + length);
		if (actualEnd > actualStart && actualEnd < str.length && isHighSurrogate(str.charCodeAt(actualEnd - 1)) && isLowSurrogate(str.charCodeAt(actualEnd))) actualEnd--;
		if (actualStart >= actualEnd) return "";
		return str.slice(actualStart, actualEnd);
	}
	async function buildChunks(textFiles, binaryFiles = []) {
		const chunks = [];
		let chunkNum = 1;
		let parts = [];
		let currentChars = 0;
		const flush = () => {
			if (!parts.length) return;
			chunks.push(new File([`# Codebase Context — Part ${chunkNum}\n\n` + parts.join("")], `codebase_part_${chunkNum}.md`, { type: "text/markdown" }));
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
				const chunkContent = safeSlice(content, offset, maxContentSize);
				const block = `## File: \`${isLarge ? `${path} (Part ${partNum})` : path}\`\n\n\`\`\`${ext}\n${chunkContent}\n\`\`\`\n\n`;
				if (currentChars + block.length > settings.maxChunkChars) flush();
				parts.push(block);
				currentChars += block.length;
				offset += chunkContent.length;
				partNum++;
				if (chunkContent.length === 0) break;
			}
		}
		flush();
		const fileLines = [...textFiles.map((f) => `- \`${f.path}\``), ...binaryFiles.map((f) => `- \`${f.path}\` (binary)`)];
		const manifest = `# Codebase Manifest\n${settings.customPrompt ? `${settings.customPrompt.trim()}\n\n` : ""}- **Total files:** ${textFiles.length + binaryFiles.length}\n- **Chunks:** ${chunks.length}\n\n## File list\n${fileLines.join("\n")}`;
		chunks.unshift(new File([manifest], "codebase_manifest.md", { type: "text/markdown" }));
		return chunks;
	}
	function findInShadows(selectors, root = document) {
		for (const sel of selectors) {
			const elElement = root.querySelector(sel);
			if (elElement instanceof HTMLElement) return elElement;
		}
		const elements = root.querySelectorAll("*");
		for (const elNode of elements) if (elNode.shadowRoot) {
			const found = findInShadows(selectors, elNode.shadowRoot);
			if (found) return found;
		}
		return null;
	}
	function findFileInput() {
		return findInShadows(SITE_SELECTORS);
	}
	function findChatInput() {
		return findInShadows([
			"#prompt-textarea",
			"textarea",
			"[contenteditable=\"true\"]",
			"input[type=\"text\"]"
		]);
	}
	function dispatchDrop(target, dt) {
		try {
			target.dispatchEvent(new DragEvent("dragenter", {
				bubbles: true,
				cancelable: true,
				dataTransfer: dt
			}));
			target.dispatchEvent(new DragEvent("dragover", {
				bubbles: true,
				cancelable: true,
				dataTransfer: dt
			}));
			target.dispatchEvent(new DragEvent("drop", {
				bubbles: true,
				cancelable: true,
				dataTransfer: dt
			}));
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
		if (fileInput) try {
			fileInput.files = dt.files;
			fileInput.dispatchEvent(new Event("change", { bubbles: true }));
			fileInput.dispatchEvent(new Event("input", { bubbles: true }));
			return true;
		} catch (e) {
			console.error("[Codebase Uploader] File input injection failed:", e);
		}
		const chatInput = findChatInput();
		if (chatInput && dispatchDrop(chatInput, dt)) return true;
		return dispatchDrop(document.body, dt);
	}
	function downloadFiles(files) {
		files.forEach((f) => {
			const url = URL.createObjectURL(f);
			Object.assign(document.createElement("a"), {
				href: url,
				download: f.name
			}).click();
			setTimeout(() => URL.revokeObjectURL(url), REVOCATION_DELAY_MS);
		});
	}
	function updateStats() {
		const visible = state.allFiles.filter((f) => !shouldSkip(f.path, f.file.size));
		const active = visible.filter((f) => f.selected);
		const textActive = active.filter((f) => !f.isBinary);
		const binActive = active.filter((f) => f.isBinary);
		const totalBytes = active.reduce((a, f) => a + f.file.size, 0);
		const estChunks = active.length ? Math.max(1, Math.ceil((textActive.reduce((a, f) => a + f.file.size, 0) + textActive.length * 100) / settings.maxChunkChars)) : 0;
		const estTotal = active.length ? estChunks + binActive.length : 0;
		const asciiEl = $("cu-ascii-meter");
		if (asciiEl) {
			const capacity = settings.maxChunkChars * settings.maxChunks;
			const pct = capacity > 0 ? Math.min(100, Math.round(totalBytes / capacity * 100)) : 0;
			const filled = Math.min(12, Math.round(pct / 100 * 12));
			asciiEl.textContent = `[${"|".repeat(filled) + ".".repeat(12 - filled)}] ${pct}%`;
		}
		const filesEl = $("cu-stat-files");
		if (filesEl) filesEl.textContent = `${active.length} / ${visible.length}`;
		const chunksEl = $("cu-stat-chunks");
		if (chunksEl) chunksEl.textContent = `~${estTotal}`;
		const payloadEl = $("cu-stat-payload");
		if (payloadEl) payloadEl.textContent = formatSize(totalBytes);
		const matchEl = $("cu-match-counter");
		if (matchEl) {
			let matchCount = visible.length;
			if (state.searchQ) matchCount = visible.filter((f) => f.path.toLowerCase().includes(state.searchQ)).length;
			matchEl.textContent = `[MATCHES: ${matchCount}]`;
		}
		const statsEl = $("cu-stats");
		if (statsEl) statsEl.textContent = `${active.length}/${visible.length} files · ${textActive.length} text, ${binActive.length} bin · ${formatSize(totalBytes)}`;
		const chunkEstimate = $("cu-chunk-estimate");
		if (chunkEstimate) {
			if (!active.length) {
				chunkEstimate.textContent = "—";
				chunkEstimate.className = "";
			} else {
				chunkEstimate.textContent = `~${estTotal} upload${estTotal !== 1 ? "s" : ""}`;
				chunkEstimate.className = estTotal > settings.maxChunks ? "danger" : estTotal > settings.maxChunks * .7 ? "warn" : "";
			}
		}
	}
	async function run(mode = "upload") {
		const statsEl = $("cu-stats");
		const overlay = $("cu-overlay");
		const files = state.allFiles.filter((f) => !shouldSkip(f.path, f.file.size)).filter((f) => f.selected);
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
				const msg = await copyFileToClipboard(file) === "base64" ? "image Base64 data URL" : file.name;
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
			if (confirm(`${allUploads.length} uploads exceeds limit of ${settings.maxChunks}.\n\nDownload combined files instead?`)) doDownload();
			else if (statsEl) statsEl.textContent = `Too many uploads (${allUploads.length}). Deselect some or raise the limit.`;
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
		if (injectToChat(allUploads)) {
			if (overlay) overlay.classList.remove("open");
			showToast(`Uploaded ${allUploads.length} item(s)!`);
			if (statsEl) statsEl.textContent = `Uploaded ${allUploads.length} item(s).`;
		} else await doCopy();
	}
	var NS = "http://www.w3.org/2000/svg";
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
		const el = document.createElementNS(NS, "path");
		el.setAttribute("d", d);
		parent.appendChild(el);
	}
	var PATHS = {
		folder: ["M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"],
		folderOpen: ["M6 14l1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v1"],
		file: ["M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z", "M14 2v6h6"],
		paperclip: ["m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"],
		x: ["M18 6 6 18", "M6 6l12 12"],
		chevronRight: ["m9 18 6-6-6-6"],
		chevronDown: ["m6 9 6 6 6-6"],
		arrowLeft: ["M19 12H5", "m12 19-7-7 7-7"],
		plus: ["M12 5v14", "M5 12h14"],
		download: [
			"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
			"m7 10 5 5 5-5",
			"M12 15V3"
		],
		zap: ["M13 2 3 14h9l-1 8 10-12h-9l1-8z"],
		search: ["M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z", "m21 21-4.35-4.35"],
		settings: ["M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z", "M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0z"],
		upload: [
			"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
			"m17 8-5-5-5 5",
			"M12 3v12"
		],
		copy: ["M20 9H11a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z", "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"],
		save: [
			"M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z",
			"M17 21v-8H7v8",
			"M7 3v5h8"
		],
		terminal: ["m4 17 6-6-6-6", "M12 19h8"],
		code: ["m16 18 6-6-6-6", "m8 6-6 6 6 6"],
		binary: [
			"M6 18h12",
			"M6 6h12",
			"M12 2v20"
		],
		dot: ["M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0"]
	};
	function icon(name, size = 16) {
		const s = svg(size);
		for (const d of PATHS[name] || []) p(s, d);
		return s;
	}
	var searchMatches = new Map();
	function buildTree(files) {
		const root = {
			isFolder: true,
			children: new Map(),
			path: "",
			name: ""
		};
		for (const item of files) {
			const parts = item.path.split("/").filter(Boolean);
			let node = root;
			let curPath = "";
			for (let i = 0; i < parts.length; i++) {
				const seg = parts[i];
				curPath = curPath ? `${curPath}/${seg}` : seg;
				if (i === parts.length - 1) node.children.set(seg, {
					isFolder: false,
					name: seg,
					path: curPath,
					item
				});
				else {
					if (!node.children.has(seg)) node.children.set(seg, {
						isFolder: true,
						name: seg,
						path: curPath,
						children: new Map()
					});
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
		return sum === vals.length ? 1 : sum === 0 ? 0 : .5;
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
		for (const child of node.children.values()) if (precomputeMatches(child, query)) anyMatch = true;
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
		if (state.searchQ) precomputeMatches(tree, state.searchQ);
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
			const childCbs = childrenWrap.querySelectorAll("input[type=\"checkbox\"]");
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
			const parentCb = parentWrap.querySelector(".tr > input[type=\"checkbox\"]");
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
		const isOpen = state.openFolders.has(node.path) || !!hasMatch;
		const row = document.createElement("div");
		row.className = "tr tr-matrix-row";
		const cb = document.createElement("input");
		cb.type = "checkbox";
		const stateVal = nodeCheckState(node);
		cb.checked = stateVal === 1;
		cb.indeterminate = stateVal === .5;
		cb.addEventListener("change", (e) => {
			const checked = e.target.checked;
			setNodeChecked(node, checked);
			updateDescendantCheckboxes(cb, checked);
			updateAncestorCheckboxes(cb);
			updateStats();
		});
		const caret = document.createElement("span");
		caret.className = "caret matrix-caret";
		caret.setAttribute("tabindex", "0");
		caret.setAttribute("role", "button");
		caret.setAttribute("aria-label", isOpen ? "Collapse folder" : "Expand folder");
		caret.appendChild(icon(isOpen ? "chevronDown" : "chevronRight", 12));
		const badge = document.createElement("span");
		badge.className = "t-badge dir";
		badge.textContent = "DIR";
		const label = document.createElement("span");
		label.className = "t-label";
		label.appendChild(highlightLabel(node.name));
		const toggle = () => {
			if (state.openFolders.has(node.path)) state.openFolders.delete(node.path);
			else state.openFolders.add(node.path);
			renderTree();
		};
		caret.addEventListener("click", toggle);
		caret.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				toggle();
			}
		});
		label.addEventListener("click", toggle);
		row.append(cb, caret, badge, label);
		wrap.appendChild(row);
		if (isOpen) {
			const childrenWrap = document.createElement("div");
			childrenWrap.className = "tr-children";
			renderChildren(node, childrenWrap);
			wrap.appendChild(childrenWrap);
		}
		return wrap;
	}
	function renderFile(node) {
		const row = document.createElement("div");
		row.className = "tr tr-matrix-row";
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
		spacer.className = "caret matrix-caret spacer";
		const badge = document.createElement("span");
		badge.className = node.item.isBinary ? "t-badge bin" : "t-badge code";
		badge.textContent = node.item.isBinary ? "BIN" : "CODE";
		const label = document.createElement("span");
		label.className = "t-label";
		label.appendChild(highlightLabel(node.name));
		label.title = node.path;
		const size = document.createElement("span");
		size.className = "t-size";
		size.textContent = formatSize(node.item.file.size);
		row.append(cb, spacer, badge, label, size);
		const removeBtn = document.createElement("span");
		removeBtn.className = "t-remove";
		removeBtn.setAttribute("tabindex", "0");
		removeBtn.setAttribute("role", "button");
		removeBtn.setAttribute("aria-label", `Remove file ${node.name}`);
		removeBtn.appendChild(icon("x", 13));
		const handleRemoveFile = (e) => {
			e.stopPropagation();
			state.allFiles = state.allFiles.filter((f) => f.path !== node.item.path);
			renderTree();
		};
		removeBtn.addEventListener("click", handleRemoveFile);
		removeBtn.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				handleRemoveFile(e);
			}
		});
		row.appendChild(removeBtn);
		return row;
	}
	var isOpen = false;
	var isSettingsOpen = false;
	var previouslyFocusedElement = null;
	var isMac = typeof navigator !== "undefined" && (/Mac|iPhone|iPad|iPod/i.test(navigator.platform) || /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent));
	var MAX_DRAG_FILES = 5e3;
	function debounce(fn, delay) {
		let timer = null;
		return (...args) => {
			clearTimeout(timer);
			timer = setTimeout(() => fn(...args), delay);
		};
	}
	function handleFocusTrap(e) {
		if (!isOpen || !state.shadowRoot) return;
		const overlay = $("cu-overlay");
		if (!overlay || !overlay.classList.contains("open")) return;
		const focusables = Array.from(state.shadowRoot.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"])")).filter((el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0);
		if (focusables.length === 0) {
			e.preventDefault();
			return;
		}
		const first = focusables[0];
		const last = focusables[focusables.length - 1];
		const active = state.shadowRoot.activeElement;
		if (e.shiftKey) {
			if (!active || active === first || !overlay.contains(active)) {
				e.preventDefault();
				last.focus();
			}
		} else if (!active || active === last || !overlay.contains(active)) {
			e.preventDefault();
			first.focus();
		}
	}
	function openPanel() {
		isOpen = true;
		previouslyFocusedElement = document.activeElement;
		const overlay = $("cu-overlay");
		if (overlay) {
			overlay.classList.add("open");
			renderTree();
			requestAnimationFrame(() => {
				const search = $("cu-search");
				if (search) search.focus();
				else $("cu-close")?.focus();
			});
		}
	}
	function closePanel() {
		isOpen = false;
		const overlay = $("cu-overlay");
		if (overlay) overlay.classList.remove("open");
		if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === "function") {
			previouslyFocusedElement.focus();
			previouslyFocusedElement = null;
		}
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
					if (!confirm(`You are selecting ${target.files.length} files. This may freeze the browser.\n\nAre you sure you want to proceed?`)) return;
				}
				ingestFiles(Array.from(target.files).map((f) => ({
					file: f,
					path: f.webkitRelativePath || f.name
				})));
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
					if (confirm(`You are uploading more than ${MAX_DRAG_FILES} files. This might be a mistake (e.g., dropping a root directory or node_modules).\n\nDo you want to cancel the upload?`)) {
						droppedFiles.length = 0;
						return;
					} else aborted = false;
				}
				const file = await new Promise((r) => entry.file(r));
				if (aborted) return;
				droppedFiles.push({
					file,
					path: prefix + file.name
				});
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
		await Promise.all([...e.dataTransfer.items].filter((i) => i.kind === "file").map((i) => i.webkitGetAsEntry?.()).filter(Boolean).map((entry) => traverse(entry)));
		if (droppedFiles.length > 0) {
			ingestFiles(droppedFiles);
			renderTree();
		}
	}
	function buildTagEditor(initialValue, onUpdate) {
		const container = el("div", { cls: "cu-tag-editor" });
		const chips = el("div", { cls: "cu-chips" });
		const input = el("input", {
			cls: "cu-chip-input",
			type: "text",
			placeholder: "Add tag + Enter..."
		});
		let tags = initialValue.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
		const renderChips = () => {
			chips.textContent = "";
			tags.forEach((tag) => {
				const chip = el("div", {
					cls: "cu-chip",
					txt: tag
				});
				const remove = el("span", {
					cls: "cu-chip-x",
					tabindex: "0",
					role: "button",
					"aria-label": `Remove ${tag} tag`
				});
				remove.appendChild(icon("x", 10));
				const handleRemoveTag = () => {
					tags = tags.filter((t) => t !== tag);
					onUpdate(tags.join(","));
					renderChips();
				};
				remove.addEventListener("click", handleRemoveTag);
				remove.addEventListener("keydown", (e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						handleRemoveTag();
					}
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
		pane.appendChild(el("div", {
			cls: "cu-setting-section",
			txt: "Limits & Shortcut"
		}));
		const limitRow = el("div", { cls: "cu-setting-row" }, [el("label", { txt: "Max uploads / chunks" }), el("input", {
			id: "cu-set-maxChunks",
			type: "number",
			value: String(settings.maxChunks)
		})]);
		limitRow.querySelector("input")?.addEventListener("change", (e) => {
			settings.maxChunks = Number(e.target.value) || settings.maxChunks;
			saveSettings();
		});
		const sizeLabel = el("label", { txt: "Max file size (bytes)" });
		const sizeHelper = el("span", {
			id: "cu-size-helper",
			txt: ` (${formatSize(settings.maxFileBytes)})`,
			style: "color: var(--accent-strong); font-size: 11.5px; margin-left: 6px;"
		});
		sizeLabel.appendChild(sizeHelper);
		const sizeRow = el("div", { cls: "cu-setting-row" }, [sizeLabel, el("input", {
			id: "cu-set-maxFileBytes",
			type: "number",
			value: String(settings.maxFileBytes)
		})]);
		const sizeInput = sizeRow.querySelector("input");
		sizeInput?.addEventListener("input", (e) => {
			const bytes = Number(e.target.value) || 0;
			sizeHelper.textContent = ` (${formatSize(bytes)})`;
		});
		sizeInput?.addEventListener("change", (e) => {
			settings.maxFileBytes = Number(e.target.value) || settings.maxFileBytes;
			saveSettings();
		});
		const charRow = el("div", { cls: "cu-setting-row" }, [el("label", { txt: "Max characters per chunk" }), el("input", {
			id: "cu-set-maxChunkChars",
			type: "number",
			value: String(settings.maxChunkChars)
		})]);
		charRow.querySelector("input")?.addEventListener("change", (e) => {
			settings.maxChunkChars = Number(e.target.value) || settings.maxChunkChars;
			saveSettings();
		});
		const shortcutRow = el("div", { cls: "cu-setting-row" }, [el("label", { txt: "Hotkey Letter (Alt+Shift+Key)" }), el("input", {
			id: "cu-set-shortcutKey",
			type: "text",
			value: settings.shortcutKey || "u",
			maxLength: 1
		})]);
		shortcutRow.querySelector("input")?.addEventListener("input", (e) => {
			const val = e.target.value.trim().toLowerCase();
			settings.shortcutKey = val || "u";
			saveSettings();
			updateShortcutHint();
		});
		const limitsGrid1 = el("div", { cls: "cu-setting-grid" }, [limitRow, sizeRow]);
		const limitsGrid2 = el("div", { cls: "cu-setting-grid" }, [charRow, shortcutRow]);
		pane.append(limitsGrid1, limitsGrid2);
		pane.appendChild(el("div", {
			cls: "cu-setting-section",
			txt: "Ignored Folders & Extensions"
		}));
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
		pane.append(el("div", { cls: "cu-setting-row" }, [folderLabel, folderEditor]), el("div", { cls: "cu-setting-row" }, [extLabel, extEditor]));
		pane.appendChild(el("div", {
			cls: "cu-setting-section",
			txt: "Inclusion Options"
		}));
		const skipHiddenRow = el("div", { cls: "cu-setting-row row-cb" }, [el("input", {
			id: "cu-set-skipHidden",
			type: "checkbox"
		}), el("label", { txt: "Skip hidden files & folders" })]);
		const skipHiddenCb = skipHiddenRow.querySelector("input");
		skipHiddenCb.checked = settings.skipHidden;
		skipHiddenCb.addEventListener("change", () => {
			settings.skipHidden = skipHiddenCb.checked;
			saveSettings();
		});
		const includeBinRow = el("div", { cls: "cu-setting-row row-cb" }, [el("input", {
			id: "cu-set-includeBinary",
			type: "checkbox"
		}), el("label", { txt: "Include binary files (images, zip, etc.)" })]);
		const includeBinCb = includeBinRow.querySelector("input");
		includeBinCb.checked = settings.includeBinary;
		includeBinCb.addEventListener("change", () => {
			settings.includeBinary = includeBinCb.checked;
			saveSettings();
		});
		const optionsGrid = el("div", { cls: "cu-setting-grid" }, [skipHiddenRow, includeBinRow]);
		pane.appendChild(optionsGrid);
		pane.appendChild(el("div", {
			cls: "cu-setting-section",
			txt: "Custom Manifest Prompt"
		}));
		const promptRow = el("div", { cls: "cu-setting-row" }, [el("label", { txt: "Instructions prepended to manifest" }), el("textarea", {
			id: "cu-set-customPrompt",
			placeholder: "e.g. Please analyze this codebase for memory leaks...",
			rows: 3
		})]);
		const promptTextarea = promptRow.querySelector("textarea");
		promptTextarea.value = settings.customPrompt || "";
		promptTextarea.addEventListener("change", () => {
			settings.customPrompt = promptTextarea.value;
			saveSettings();
		});
		pane.appendChild(promptRow);
		const resetBtn = el("button", {
			cls: "cu-reset-btn",
			txt: "Reset to Defaults"
		});
		resetBtn.addEventListener("click", () => {
			if (confirm("Are you sure you want to reset all settings to defaults?")) {
				resetSettings();
				updateShortcutHint();
				const parent = pane.parentElement;
				if (parent) {
					pane.remove();
					const newPane = buildSettingsPane();
					newPane.classList.add("open");
					parent.appendChild(newPane);
				}
				showToast("Settings reset to defaults.");
			}
		});
		pane.appendChild(el("div", { cls: "cu-settings-footer" }, [resetBtn]));
		return pane;
	}
	function toggleSettings() {
		const workspacePane = $("cu-workspace-pane");
		const settingsToggle = $("cu-settings-toggle");
		const commandLayout = $("cu-command-layout");
		if (!workspacePane || !settingsToggle || !commandLayout || !state.shadowRoot) return;
		let settingsPane = $("cu-settings-pane");
		isSettingsOpen = !isSettingsOpen;
		if (isSettingsOpen) {
			if (!settingsPane) {
				settingsPane = buildSettingsPane();
				commandLayout.appendChild(settingsPane);
			}
			workspacePane.style.display = "none";
			settingsPane.classList.add("open");
			settingsToggle.textContent = "";
			settingsToggle.appendChild(icon("arrowLeft", 16));
			settingsToggle.title = "Back to Workspace";
		} else {
			workspacePane.style.display = "flex";
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
		const closeBtn = el("button", {
			cls: "cu-icon-btn",
			id: "cu-close",
			title: "Close (Esc)"
		});
		closeBtn.appendChild(icon("x", 16));
		const settingsBtn = el("button", {
			cls: "cu-icon-btn",
			id: "cu-settings-toggle",
			title: "Settings"
		});
		settingsBtn.appendChild(icon("settings", 16));
		const dotIcon = icon("dot", 12);
		dotIcon.style.color = "#3CD070";
		const statusBadge = el("span", {
			id: "cu-status-online",
			cls: "cu-status-online"
		}, [dotIcon, document.createTextNode("ONLINE")]);
		const header = el("div", { id: "cu-header" }, [
			el("h3", {}, [document.createTextNode("[ CODEBASE_UPLOADER // SYS_REV_1.4.0 ] "), statusBadge]),
			el("div", { id: "cu-header-space" }),
			el("span", {
				id: "cu-kbd-hint",
				cls: "cu-kbd",
				txt: `${isMac ? "⌥⇧" : "Alt+Shift+"}U`
			}),
			settingsBtn,
			closeBtn
		]);
		const hudHeader = el("div", {
			cls: "cu-setting-section",
			txt: "[ TELEMETRY // HUD ]"
		});
		const asciiMeter = el("div", {
			id: "cu-ascii-meter",
			cls: "cu-ascii-meter",
			txt: "[............] 0%"
		});
		const dataReadouts = el("div", {
			id: "cu-data-readouts",
			style: "display: flex; flex-direction: column; gap: 8px;"
		}, [
			el("div", { cls: "cu-metric-card" }, [el("span", {
				cls: "cu-metric-label",
				txt: "Total Files"
			}), el("span", {
				id: "cu-stat-files",
				cls: "cu-metric-value",
				txt: "0 / 0"
			})]),
			el("div", { cls: "cu-metric-card" }, [el("span", {
				cls: "cu-metric-label",
				txt: "Text Chunks"
			}), el("span", {
				id: "cu-stat-chunks",
				cls: "cu-metric-value",
				txt: "0"
			})]),
			el("div", { cls: "cu-metric-card" }, [el("span", {
				cls: "cu-metric-label",
				txt: "Payload Size"
			}), el("span", {
				id: "cu-stat-payload",
				cls: "cu-metric-value",
				txt: "0 B"
			})])
		]);
		const presetAll = el("button", {
			cls: "cu-preset-chip",
			txt: "[ALL]"
		});
		const presetCode = el("button", {
			cls: "cu-preset-chip",
			txt: "[CODE]"
		});
		const presetDocs = el("button", {
			cls: "cu-preset-chip",
			txt: "[DOCS]"
		});
		const presetsBar = el("div", {
			id: "cu-presets-bar",
			style: "display: flex; gap: 6px; flex-wrap: wrap;"
		}, [
			presetAll,
			presetCode,
			presetDocs
		]);
		const dropzoneBtn = el("button", {
			cls: "cu-btn cu-btn-primary",
			style: "width: 100%; margin-top: 8px;"
		}, [el("span", { txt: "+ DROP FOLDER MATRIX HERE" })]);
		const industrialDropzone = el("div", {
			id: "cu-dropzone-box",
			style: "margin-top: auto; padding: 14px 10px; border: 1px dashed #222638; background: #06070a; border-radius: 2px; text-align: center;"
		}, [el("div", {
			cls: "hint",
			txt: "Drag folder matrix or click below",
			style: "font-size: 11px; margin-bottom: 8px; color: var(--text-tertiary); font-family: var(--font-mono);"
		}), dropzoneBtn]);
		const telemetryPane = el("div", { id: "cu-telemetry-pane" }, [
			hudHeader,
			asciiMeter,
			dataReadouts,
			el("div", {
				cls: "cu-setting-section",
				txt: "[ PRESETS ]",
				style: "margin-top: 8px;"
			}),
			presetsBar,
			industrialDropzone
		]);
		const searchInput = el("input", {
			id: "cu-search",
			type: "text",
			placeholder: "FILTER_QUERY: ",
			autocomplete: "off",
			spellcheck: false
		});
		const toolbar = el("div", { id: "cu-toolbar" }, [searchInput, el("span", {
			id: "cu-match-counter",
			cls: "cu-kbd",
			txt: "[MATCHES: 0]"
		})]);
		const selAll = el("button", {
			cls: "cu-btn",
			txt: "[ALL]"
		});
		const selNone = el("button", {
			cls: "cu-btn",
			txt: "[NONE]"
		});
		const selectionGroup = el("div", { cls: "cu-action-group" }, [selAll, selNone]);
		const expandAll = el("button", {
			cls: "cu-btn",
			txt: "[EXPAND]"
		});
		const collapseAll = el("button", {
			cls: "cu-btn",
			txt: "[COLLAPSE]"
		});
		const viewGroup = el("div", { cls: "cu-action-group" }, [expandAll, collapseAll]);
		const clearBtn = el("button", {
			cls: "cu-btn cu-btn-danger",
			id: "cu-clear",
			txt: "[RESET]"
		});
		const actions = el("div", { id: "cu-actions" }, [
			selectionGroup,
			viewGroup,
			clearBtn
		]);
		const dropzoneIconBadge = el("span", { cls: "cu-btn-icon-badge" }, [icon("folderOpen", 13)]);
		const mainChooseBtn = el("button", { cls: "cu-btn cu-btn-primary" }, [el("span", { txt: "Select Directory" }), dropzoneIconBadge]);
		const dropIcon = icon("folderOpen", 48);
		dropIcon.setAttribute("class", "cu-drop-icon");
		const treePane = el("div", {
			id: "cu-tree-pane",
			cls: "cu-empty"
		}, [el("div", { id: "cu-tree-content" }, [el("div", { id: "cu-dropzone" }, [
			dropIcon,
			el("strong", { txt: "MATRIX EMPTY — NO DATA LOADED" }),
			el("div", {
				cls: "hint",
				txt: "Text files → markdown chunks · Binary → raw attachments"
			}),
			mainChooseBtn
		]), el("div", { id: "cu-tree-list" })])]);
		const downloadBtn = el("button", {
			cls: "cu-btn cu-btn-tactical",
			id: "cu-download-btn"
		}, [icon("save", 13), document.createTextNode(" [SAVE BUNDLE]")]);
		const copyBtn = el("button", {
			cls: "cu-btn cu-btn-tactical",
			id: "cu-copy-btn",
			style: "background: transparent; border: 1px solid #00E5FF; color: #00E5FF;"
		}, [icon("copy", 13), document.createTextNode(" [COPY CHUNKS]")]);
		const uploadBtn = el("button", {
			cls: "cu-btn cu-btn-primary",
			id: "cu-upload-btn",
			style: "background: #FF3333; border-color: #FF3333; color: #FFFFFF; box-shadow: 0 0 12px rgba(255, 51, 51, 0.4);"
		}, [icon("upload", 13), document.createTextNode(" [EXECUTE UPLOAD]")]);
		const overlay = el("div", {
			id: "cu-overlay",
			role: "dialog",
			"aria-modal": "true"
		}, [el("div", { id: "cu-panel" }, [header, el("div", { id: "cu-command-layout" }, [telemetryPane, el("div", {
			id: "cu-workspace-pane",
			style: "display: flex; flex-direction: column; flex: 1; height: 100%; overflow: hidden;"
		}, [
			toolbar,
			actions,
			treePane,
			el("div", {
				id: "cu-footer",
				style: "display: flex; gap: 8px; justify-content: flex-end; align-items: center;"
			}, [
				downloadBtn,
				copyBtn,
				uploadBtn
			])
		])])])]);
		shadow.appendChild(overlay);
		document.documentElement.appendChild($host);
		closeBtn.addEventListener("click", closePanel);
		overlay.addEventListener("click", (e) => {
			if (e.target === overlay) closePanel();
		});
		overlay.addEventListener("keydown", (e) => {
			if (e.key === "Tab") handleFocusTrap(e);
		});
		let clearTimer = null;
		clearBtn.addEventListener("click", () => {
			if (clearBtn.textContent === "[RESET]") {
				clearBtn.textContent = "CONFIRM?";
				clearTimer = setTimeout(() => {
					clearBtn.textContent = "[RESET]";
				}, 2500);
			} else {
				clearTimeout(clearTimer);
				clearBtn.textContent = "[RESET]";
				state.allFiles = [];
				renderTree();
				showToast("Cleared.");
			}
		});
		settingsBtn.addEventListener("click", toggleSettings);
		dropzoneBtn.addEventListener("click", pickFolder);
		mainChooseBtn.addEventListener("click", pickFolder);
		presetAll.addEventListener("click", () => {
			state.allFiles.forEach((f) => f.selected = true);
			renderTree();
		});
		const DOC_EXTS = new Set([
			".md",
			".mdx",
			".markdown",
			".txt",
			".doc",
			".docx",
			".pdf",
			".rst"
		]);
		const DOC_NAMES = new Set([
			"readme",
			"changelog",
			"license",
			"contributing",
			"notice"
		]);
		presetDocs.addEventListener("click", () => {
			state.allFiles.forEach((f) => {
				const filename = f.path.split("/").pop().toLowerCase();
				const dotIdx = filename.lastIndexOf(".");
				const ext = dotIdx >= 0 ? filename.slice(dotIdx) : "";
				f.selected = DOC_EXTS.has(ext) || DOC_NAMES.has(filename);
			});
			renderTree();
		});
		presetCode.addEventListener("click", () => {
			state.allFiles.forEach((f) => {
				const filename = f.path.split("/").pop().toLowerCase();
				const dotIdx = filename.lastIndexOf(".");
				const ext = dotIdx >= 0 ? filename.slice(dotIdx) : "";
				const isDoc = DOC_EXTS.has(ext) || DOC_NAMES.has(filename);
				f.selected = !f.isBinary && !isDoc;
			});
			renderTree();
		});
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
		[telemetryPane, treePane].forEach((pane) => {
			pane.addEventListener("dragover", (e) => {
				e.preventDefault();
				pane.classList.add("drag-over");
			});
			pane.addEventListener("dragleave", () => pane.classList.remove("drag-over"));
			pane.addEventListener("drop", (e) => handleDrop(e, pane));
		});
		if (isOpen) openPanel();
		updateShortcutHint();
		new MutationObserver(() => {
			if (!document.getElementById("codebase-uploader-root")) buildUI();
		}).observe(document.documentElement, { childList: true });
	}
	function buildCopySidePane(chunks) {
		const pane = el("div", { id: "cu-copy-side-pane" });
		const closeBtn = el("button", {
			cls: "cu-icon-btn",
			id: "cu-copy-side-pane-close",
			title: "Close side panel"
		});
		closeBtn.appendChild(icon("x", 14));
		closeBtn.addEventListener("click", () => pane.remove());
		const header = el("div", { id: "cu-copy-side-pane-header" }, [el("h3", { txt: "[ COPY PARTS ]" }), closeBtn]);
		const body = el("div", { id: "cu-copy-side-pane-body" });
		chunks.forEach((chunk, index) => {
			const isChunk = chunk.name.startsWith("codebase_part_");
			const label = isChunk ? `Part ${chunk.name.match(/_part_(\d+)/)?.[1] || index + 1}` : chunk.name;
			const info = el("div", { cls: "cu-chunk-info" }, [el("span", {
				cls: "cu-chunk-title",
				txt: isChunk ? `Text Chunk (${label})` : chunk.name
			}), el("span", {
				cls: "cu-chunk-stats",
				txt: formatSize(chunk.size)
			})]);
			const copyBtn = el("button", {
				cls: "cu-chunk-copy-btn",
				txt: ` Copy`
			});
			copyBtn.insertBefore(icon("copy", 13), copyBtn.firstChild);
			copyBtn.addEventListener("click", async () => {
				try {
					showToast(`Copied ${await copyFileToClipboard(chunk) === "base64" ? "image Base64" : label}!`);
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
		if (isOpen && e.key === "Tab") {
			handleFocusTrap(e);
			return;
		}
		if (e.key === "Escape" && isOpen) {
			const active = state.shadowRoot?.activeElement || document.activeElement;
			if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
				active.blur();
				e.preventDefault();
				return;
			}
			closePanel();
			e.preventDefault();
			return;
		}
		const targetKey = (settings.shortcutKey || "u").toLowerCase();
		if (e.altKey && e.shiftKey && e.key.toLowerCase() === targetKey) {
			togglePanel();
			e.preventDefault();
		}
	});
	GM_registerMenuCommand("Toggle Codebase Uploader", togglePanel);
})();

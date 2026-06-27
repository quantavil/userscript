import { Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  maxChunks: 10,
  maxFileBytes: 2_000_000,
  maxChunkChars: 480_000,
  ignoreFolders: 'node_modules,__pycache__,dist,build,venv,.next,.nuxt,.idea,.vscode,coverage,.git,out,tmp,temp,.cache,.parcel-cache,vendor,Pods,target,bin,obj,.angular,.svelte-kit',
  ignoreExts: '.pyc,.pyo,.log,.lock,.map,.DS_Store,.min.js,.min.css,.exe,.dll,.so,.dylib,.bin,.o,.obj,.class',
  skipHidden: true,
  includeBinary: true,
  showFab: true,
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
  '.gitignore', '.dockerignore', '.npmignore', '.editorconfig', '.gitattributes',
  '.gitmodules', '.env', '.babelrc', '.eslintrc', '.prettierrc', '.stylelintrc',
  '.rspec', '.nvmrc', '.node-version', '.python-version', '.ruby-version',
]);

export const SITE_SELECTORS = [
  'input[data-testid="file-upload-input"]',
  'input[data-testid="upload-file-input"]',
  'input.chat-upload__input',
  'input[type="file"][accept*="text"]',
  'input[type="file"][multiple]',
];



export const STYLESHEET = `
  :host {
    all: initial;
    position: fixed !important;
    top: 0; left: 0; width: 0; height: 0;
    z-index: 2147483647 !important;
    pointer-events: none;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  * { box-sizing: border-box; }

  #cu-fab {
    pointer-events: auto;
    position: fixed; bottom: 24px; right: 24px; z-index: 2147483647;
    width: 52px; height: 52px; border-radius: 16px;
    background: linear-gradient(135deg, #1e1b4b, #311042);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #f3f4f6; font-size: 24px; cursor: pointer;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.15);
    display: flex; align-items: center; justify-content: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    user-select: none;
  }
  #cu-fab:hover {
    transform: translateY(-4px) scale(1.05);
    border-color: #6366f1; color: #a5b4fc;
    box-shadow: 0 12px 30px rgba(99, 102, 241, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.2);
  }
  #cu-fab:active { transform: translateY(-1px) scale(0.98); }
  #cu-fab.success {
    border-color: #10b981; color: #34d399;
    background: linear-gradient(135deg, #064e3b, #022c22);
    box-shadow: 0 12px 30px rgba(16, 185, 129, 0.35);
  }

  #cu-overlay {
    pointer-events: none;
    position: fixed; inset: 0; background: rgba(8, 10, 15, 0.65);
    backdrop-filter: blur(12px) saturate(180%); z-index: 2147483647;
    display: flex; align-items: center; justify-content: center;
    font-family: inherit; opacity: 0;
    transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  #cu-overlay.open { opacity: 1; pointer-events: auto; }

  #cu-modal {
    background: radial-gradient(circle at 10% 10%, #1c1b22, #0d0c10);
    color: #e2e8f0; border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px; width: min(840px, 94vw); height: min(85vh, 840px);
    display: flex; flex-direction: column; position: relative;
    box-shadow: 0 30px 70px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    overflow: hidden;
    transform: translateY(15px) scale(0.97); opacity: 0;
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
  }
  #cu-overlay.open #cu-modal { transform: translateY(0) scale(1); opacity: 1; }

  #cu-header {
    padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    display: flex; align-items: center; gap: 10px;
    background: rgba(255, 255, 255, 0.01);
  }
  #cu-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: #f8fafc; flex: 1; letter-spacing: 0.3px; }

  .cu-icon-btn {
    background: none; border: none; color: #94a3b8; font-size: 16px;
    cursor: pointer; padding: 7px 10px; border-radius: 8px; transition: all 0.2s;
  }
  .cu-icon-btn:hover { background: rgba(255, 255, 255, 0.06); color: #f8fafc; }

  #cu-toolbar {
    padding: 12px 20px; display: flex; gap: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.01);
  }
  #cu-search {
    flex: 1; padding: 9px 14px; border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: #09090c; color: #f8fafc; font-size: 13px; outline: none;
    font-family: inherit; transition: all 0.2s;
  }
  #cu-search:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2); background: #050507; }
  #cu-search::placeholder { color: #475569; }

  .cu-btn {
    padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.08);
    cursor: pointer; font-weight: 600; font-size: 12.5px;
    background: rgba(255, 255, 255, 0.05); color: #cbd5e1;
    white-space: nowrap; font-family: inherit; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .cu-btn:hover { background: rgba(255, 255, 255, 0.1); color: #f8fafc; border-color: rgba(255,255,255,0.15); }
  .cu-btn:active { transform: scale(0.97); }
  .cu-btn-primary { background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; border: none; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25); }
  .cu-btn-primary:hover { background: linear-gradient(135deg, #818cf8, #6366f1); box-shadow: 0 6px 16px rgba(99, 102, 241, 0.35); }
  .cu-btn-danger { background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; border: none; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2); }
  .cu-btn-danger:hover { background: linear-gradient(135deg, #f87171, #ef4444); box-shadow: 0 6px 16px rgba(239, 68, 68, 0.3); }
  .cu-btn-sm { padding: 6px 10px; font-size: 11.5px; border-radius: 8px; }

  #cu-subbar {
    padding: 10px 20px; display: flex; gap: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex-wrap: wrap; background: rgba(0, 0, 0, 0.1);
  }

  #cu-tree-pane {
    flex: 1; overflow-y: auto; padding: 14px 20px;
    font-family: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 12.5px; position: relative; background: #0b0a0d;
  }
  #cu-tree-pane.drag-over { background: rgba(99, 102, 241, 0.04); outline: 2px dashed rgba(99, 102, 241, 0.4); outline-offset: -6px; }

  #cu-dropzone {
    display: none; flex-direction: column; align-items: center; justify-content: center;
    gap: 16px; height: 100%; color: #475569; font-size: 13.5px; text-align: center; padding: 40px 20px;
  }
  #cu-tree-pane.cu-empty #cu-dropzone { display: flex; }
  #cu-dropzone .icon { font-size: 56px; filter: drop-shadow(0 10px 20px rgba(99,102,241,0.15)); animation: float 3s ease-in-out infinite; }
  @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
  #cu-dropzone strong { color: #94a3b8; font-size: 15px; }
  #cu-dropzone .hint { max-width: 420px; line-height: 1.6; color: #64748b; }

  #cu-tree-list { display: flex; flex-direction: column; gap: 2px; }

  .tr { display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-radius: 8px; cursor: default; transition: all 0.12s ease; }
  .tr:hover { background: rgba(255, 255, 255, 0.03); }
  .tr input[type=checkbox] { accent-color: #6366f1; cursor: pointer; flex-shrink: 0; width: 14px; height: 14px; outline: none; }
  .tr .caret { width: 16px; text-align: center; color: #64748b; cursor: pointer; font-size: 11px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; transition: color 0.15s; }
  .tr .caret:hover { color: #f8fafc; }
  .tr .t-icon { flex-shrink: 0; font-size: 14px; }
  .tr .t-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #cbd5e1; cursor: pointer; font-size: 12.5px; transition: color 0.12s; }
  .tr:hover .t-label { color: #f1f5f9; }
  .tr .t-label mark { background: rgba(99, 102, 241, 0.3); color: #e0e7ff; border-radius: 3px; padding: 0 2px; }
  .tr .t-size { color: #475569; font-size: 11px; flex-shrink: 0; font-family: ui-monospace, "SF Mono", Menlo, monospace; }
  .tr .t-badge { font-size: 9px; padding: 2px 6px; border-radius: 5px; background: rgba(255, 255, 255, 0.05); color: #94a3b8; flex-shrink: 0; text-transform: uppercase; letter-spacing: .4px; font-weight: 600; }
  .tr .t-badge.bin { background: rgba(16, 185, 129, 0.1); color: #34d399; }
  .tr .t-remove { opacity: 0; color: #64748b; cursor: pointer; font-size: 11px; padding: 2px 5px; border-radius: 5px; transition: all 0.15s; }
  .tr:hover .t-remove { opacity: 1; }
  .tr .t-remove:hover { background: rgba(239, 68, 68, 0.15); color: #f87171; }
  .tr-children { margin-left: 20px; border-left: 1px solid rgba(255, 255, 255, 0.04); padding-left: 10px; display: flex; flex-direction: column; gap: 2px; }

  #cu-footer {
    padding: 14px 20px; border-top: 1px solid rgba(255, 255, 255, 0.08);
    display: flex; align-items: center; gap: 12px; background: rgba(0, 0, 0, 0.15);
  }
  #cu-stats { font-size: 12.5px; color: #64748b; flex: 1; }
  #cu-chunk-estimate {
    display: inline-flex; align-items: center; gap: 4px; background: #09090c;
    border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 999px;
    padding: 4px 12px; font-size: 12px; color: #94a3b8;
  }
  #cu-chunk-estimate.warn { border-color: rgba(245, 158, 11, 0.5); color: #fbbf24; }
  #cu-chunk-estimate.danger { border-color: rgba(239, 68, 68, 0.5); color: #f87171; }
  #cu-tree-pane::-webkit-scrollbar { width: 6px; }
  #cu-tree-pane::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 3px; }
  #cu-tree-pane::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.15); }

  /* Settings Pane */
  #cu-settings-pane {
    display: none; flex-direction: column; gap: 14px; padding: 20px;
    overflow-y: auto; background: #0b0a0d; height: 100%;
  }
  .cu-setting-row { display: flex; flex-direction: column; gap: 5px; }
  .cu-setting-row.row-cb { flex-direction: row; align-items: center; gap: 10px; }
  .cu-setting-row label { font-size: 13px; font-weight: 600; color: #cbd5e1; }
  .cu-setting-row input[type="text"], .cu-setting-row input[type="number"] {
    padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);
    background: #09090c; color: #f8fafc; font-size: 13px; outline: none;
    font-family: inherit; transition: all 0.2s;
  }
  .cu-setting-row input:focus { border-color: #6366f1; }
  .cu-setting-row input[type="checkbox"] { accent-color: #6366f1; width: 16px; height: 16px; cursor: pointer; }

  /* Toast Notification */
  #cu-toast {
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-20px);
    background: #0f172a; color: #34d399; padding: 10px 20px; border-radius: 10px;
    border: 1px solid #10b981; font-size: 13px; font-weight: 600;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5); pointer-events: none;
    opacity: 0; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 2147483647;
  }
  #cu-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

  /* Custom Confirmation Box */
  #cu-confirm-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.4);
    backdrop-filter: blur(4px); z-index: 2147483647;
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.2s; pointer-events: auto;
  }
  #cu-confirm-overlay.show { opacity: 1; }
  #cu-confirm-box {
    background: #1c1b22; border: 1px solid rgba(255,255,255,0.1);
    padding: 20px; border-radius: 14px; max-width: 320px; width: 90%;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
    transform: scale(0.95); transition: transform 0.2s;
  }
  #cu-confirm-overlay.show #cu-confirm-box { transform: scale(1); }
  #cu-confirm-msg { color: #e2e8f0; font-size: 13px; margin-bottom: 16px; line-height: 1.5; text-align: center; }
  #cu-confirm-btns { display: flex; justify-content: flex-end; gap: 8px; }

  /* Prefers Reduced Motion */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation: none !important;
      transition: none !important;
    }
  }
`;

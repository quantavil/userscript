/**
 * Greasemonkey/Tampermonkey API type declarations
 * Supplements @types/greasemonkey with missing/better types
 */

// ============================================
// Storage
// ============================================

declare function GM_getValue<T>(key: string, defaultValue: T): T;
declare function GM_getValue<T>(key: string): T | undefined;
declare function GM_setValue(key: string, value: unknown): void;
declare function GM_deleteValue(key: string): void;
declare function GM_listValues(): string[];

// ============================================
// Style
// ============================================

declare function GM_addStyle(css: string): HTMLStyleElement;

// ============================================
// Notifications
// ============================================

interface GM_NotificationOptions {
  text: string;
  title?: string;
  image?: string;
  timeout?: number;
  onclick?: () => void;
  ondone?: () => void;
}

declare function GM_notification(options: GM_NotificationOptions): void;
declare function GM_notification(
  text: string,
  title?: string,
  image?: string,
  onclick?: () => void
): void;

// ============================================
// Menu Commands
// ============================================

declare function GM_registerMenuCommand(
  caption: string,
  onClick: (event: MouseEvent | KeyboardEvent) => void,
  accessKey?: string
): number;

declare function GM_unregisterMenuCommand(menuCommandId: number): void;

// ============================================
// Download
// ============================================

interface GM_DownloadOptions {
  url: string;
  name: string;
  headers?: Record<string, string>;
  saveAs?: boolean;
  conflictAction?: 'uniquify' | 'overwrite' | 'prompt';
  onprogress?: (event: GM_DownloadProgressEvent) => void;
  onload?: () => void;
  onerror?: (error: GM_DownloadError) => void;
  ontimeout?: () => void;
}

interface GM_DownloadProgressEvent {
  loaded: number;
  total: number;
  lengthComputable: boolean;
}

interface GM_DownloadError {
  error: 'not_enabled' | 'not_whitelisted' | 'not_permitted' | 'not_supported' | 'not_succeeded';
  details?: string;
}

interface GM_DownloadResult {
  abort: () => void;
}

declare function GM_download(options: GM_DownloadOptions): GM_DownloadResult;
declare function GM_download(url: string, name: string): GM_DownloadResult;

// ============================================
// XMLHttpRequest
// ============================================

interface GM_XHRDetails<TContext = unknown> {
  method?: 'GET' | 'POST' | 'HEAD' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';
  url: string;
  headers?: Record<string, string>;
  data?: string | Blob | ArrayBuffer | FormData | URLSearchParams;
  responseType?: 'text' | 'arraybuffer' | 'blob' | 'json' | 'document';
  timeout?: number;
  context?: TContext;
  anonymous?: boolean;
  binary?: boolean;
  nocache?: boolean;
  revalidate?: boolean;
  user?: string;
  password?: string;
  overrideMimeType?: string;
  
  // Events
  onabort?: (response: GM_XHRResponse<TContext>) => void;
  onerror?: (response: GM_XHRResponse<TContext>) => void;
  onload?: (response: GM_XHRResponse<TContext>) => void;
  onloadend?: (response: GM_XHRResponse<TContext>) => void;
  onloadstart?: (response: GM_XHRResponse<TContext>) => void;
  onprogress?: (response: GM_XHRProgressResponse<TContext>) => void;
  onreadystatechange?: (response: GM_XHRResponse<TContext>) => void;
  ontimeout?: (response: GM_XHRResponse<TContext>) => void;
}

interface GM_XHRResponse<TContext = unknown> {
  readonly readyState: number;
  readonly status: number;
  readonly statusText: string;
  readonly responseHeaders: string;
  readonly response: unknown;
  readonly responseText?: string;
  readonly responseXML?: Document | null;
  readonly finalUrl: string;
  readonly context?: TContext;
}

interface GM_XHRProgressResponse<TContext = unknown> extends GM_XHRResponse<TContext> {
  readonly loaded: number;
  readonly total: number;
  readonly lengthComputable: boolean;
}

interface GM_XHRControl {
  abort: () => void;
}

declare function GM_xmlhttpRequest<TContext = unknown>(
  details: GM_XHRDetails<TContext>
): GM_XHRControl;

// ============================================
// Tabs
// ============================================

interface GM_OpenInTabOptions {
  active?: boolean;
  insert?: boolean;
  setParent?: boolean;
  incognito?: boolean;
  loadInBackground?: boolean;
}

interface GM_Tab {
  close: () => void;
  closed: boolean;
  onclose?: () => void;
}

declare function GM_openInTab(url: string, options?: GM_OpenInTabOptions | boolean): GM_Tab;

// ============================================
// Clipboard
// ============================================

declare function GM_setClipboard(
  data: string,
  info?: string | { type?: string; mimetype?: string }
): void;

// ============================================
// Resources
// ============================================

declare function GM_getResourceText(name: string): string;
declare function GM_getResourceURL(name: string): string;

// ============================================
// Info
// ============================================

interface GM_ScriptInfo {
  name: string;
  namespace: string;
  description: string;
  version: string;
  author: string;
  homepage: string;
  icon: string;
  icon64: string;
  grant: string[];
  matches: string[];
  includes: string[];
  excludes: string[];
  'run-at': string;
  resources: Record<string, string>;
  downloadURL?: string;
  updateURL?: string;
  supportURL?: string;
}

interface GM_Info {
  script: GM_ScriptInfo;
  scriptMetaStr: string;
  scriptHandler: string;
  version: string;
  platform: {
    arch: string;
    browserName: string;
    browserVersion: string;
    os: string;
  };
}

declare const GM_info: GM_Info;

// ============================================
// Unsafe Window
// ============================================

declare const unsafeWindow: Window & typeof globalThis;

// ============================================
// Log
// ============================================

declare function GM_log(message: unknown, ...optionalParams: unknown[]): void;

// ============================================
// Global Window Augmentation
// ============================================

declare global {
  interface Window {
    // File System Access API
    showSaveFilePicker?: (options?: ShowSaveFilePickerOptions) => Promise<FileSystemFileHandle>;
    showOpenFilePicker?: (options?: ShowOpenFilePickerOptions) => Promise<FileSystemFileHandle[]>;
    showDirectoryPicker?: (options?: DirectoryPickerOptions) => Promise<FileSystemDirectoryHandle>;
  }
  
  interface ShowSaveFilePickerOptions {
    excludeAcceptAllOption?: boolean;
    suggestedName?: string;
    types?: FilePickerAcceptType[];
    id?: string;
    startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
  }
  
  interface ShowOpenFilePickerOptions {
    multiple?: boolean;
    excludeAcceptAllOption?: boolean;
    types?: FilePickerAcceptType[];
    id?: string;
    startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
  }
  
  interface DirectoryPickerOptions {
    id?: string;
    mode?: 'read' | 'readwrite';
    startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
  }
  
  interface FilePickerAcceptType {
    description?: string;
    accept: Record<string, string | string[]>;
  }
  
  interface FileSystemHandle {
    readonly kind: 'file' | 'directory';
    readonly name: string;
    isSameEntry(other: FileSystemHandle): Promise<boolean>;
    queryPermission?(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
    requestPermission?(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
  }
  
  interface FileSystemFileHandle extends FileSystemHandle {
    readonly kind: 'file';
    getFile(): Promise<File>;
    createWritable(options?: { keepExistingData?: boolean }): Promise<FileSystemWritableFileStream>;
  }
  
  interface FileSystemDirectoryHandle extends FileSystemHandle {
    readonly kind: 'directory';
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
    getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
    removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
    resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>;
    keys(): AsyncIterableIterator<string>;
    values(): AsyncIterableIterator<FileSystemHandle>;
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  }
  
  interface FileSystemWritableFileStream extends WritableStream {
    write(data: FileSystemWriteChunkType): Promise<void>;
    seek(position: number): Promise<void>;
    truncate(size: number): Promise<void>;
  }
  
  type FileSystemWriteChunkType =
    | BufferSource
    | Blob
    | string
    | { type: 'write'; position?: number; data: BufferSource | Blob | string }
    | { type: 'seek'; position: number }
    | { type: 'truncate'; size: number };
}

export {};
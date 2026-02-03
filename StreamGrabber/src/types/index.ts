// ============================================
// Core Types
// ============================================

export type MediaKind = 'hls' | 'video' | 'variant';
export type HlsType = 'master' | 'media' | 'invalid' | 'error' | null;

export interface MediaItem {
  url: string;
  kind: MediaKind;
  label: string;
  sublabel: string | null;
  size: number | null;
  type: string | null;
  origin: string;

  // Enrichment state
  enriched: boolean;
  enriching: boolean;

  // HLS-specific
  hlsType: HlsType;
  isLive: boolean;
  encrypted: boolean;
  duration?: number;
  segCount?: number;
  resolution?: string | null;
  isVod?: boolean;
  isFmp4?: boolean;
  variantCount?: number;
  variants?: Variant[];
  bestVariant?: Variant;
  variant?: Variant;

  // Cross-frame
  isRemote?: boolean;
  remoteWin?: Window;

  // Internal
  _enrichPromise?: Promise<boolean> | null;
}

export interface Variant {
  url: string;
  res: string | null;
  w: number | null;
  h: number | null;
  peak: number | null;
  avg: number | null;
  codecs: string | null;
}

export interface Segment {
  uri: string;
  dur: number;
  range: string | null;
  key: SegmentKey | null;
  map: SegmentMap | null;
  needMap: boolean;
}

export interface SegmentKey {
  method: string;
  uri: string | null;
  iv: string | null;
}

export interface SegmentMap {
  uri: string;
  rangeHeader: string | null;
}

export interface ParsedMedia {
  segs: Segment[];
  mediaSeq: number;
  endList: boolean;
}

// ============================================
// Blob Tracking
// ============================================

export interface BlobInfo {
  blob: Blob | null;
  type: string;
  size: number;
  kind: 'm3u8' | 'video' | 'other';
  ts: number;
  revoked?: boolean;
}

// ============================================
// Network Types
// ============================================

export interface HeadMeta {
  length: number | null;
  type: string | null;
}

export interface ProgressEvent {
  loaded: number;
  total: number;
}

export type ProgressCallback = (e: ProgressEvent) => void;

export interface GmRequestOptions {
  url: string;
  responseType?: 'text' | 'arraybuffer';
  headers?: Record<string, string>;
  timeout?: number;
  onprogress?: ProgressCallback;
}



// ============================================
// Download Types
// ============================================

export interface FileWriter {
  write(chunk: Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort(): void;
}

/**
 * Progress card controller
 * Note: onStop/onCancel are set via the controller, not the interface
 */
export interface ProgressCardController {
  update(percent: number, text?: string): void;
  done(ok?: boolean, msg?: string): void;
  remove(): void;
  setOnStop(fn: () => 'paused' | 'resumed'): void;
  setOnCancel(fn: () => void): void;
}

// Legacy alias for compatibility
export type ProgressCard = ProgressCardController;

// ============================================
// Message Types (Cross-frame)
// ============================================

export type MessageType =
  | 'SG_DETECT'
  | 'SG_CMD_DOWNLOAD'
  | 'SG_CMD_PICK'
  | 'SG_CMD_PICK_RESULT'
  | 'SG_CMD_CONTROL'
  | 'SG_PROGRESS_START'
  | 'SG_PROGRESS_UPDATE'
  | 'SG_PROGRESS_DONE';

export interface SGMessage {
  type: MessageType;
  item?: Partial<MediaItem>;
  payload?: Record<string, unknown>;
}

// ============================================
// Range Parsing
// ============================================

export interface ByteRange {
  start: number;
  end: number | null;
}

// ============================================
// Global Type Augmentations
// ============================================

declare global {
  interface Window {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{
        description?: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<FileSystemFileHandle>;
  }

  interface FileSystemFileHandle {
    createWritable(): Promise<FileSystemWritableFileStream>;
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write(data: BufferSource | Blob | string): Promise<void>;
    close(): Promise<void>;
    abort(): Promise<void>;
  }

  function GM_download(options: {
    url: string;
    name: string;
    saveAs?: boolean;
    onprogress?: (e: { loaded: number; total: number; lengthComputable: boolean }) => void;
    onload?: () => void;
    onerror?: (err: { error: string; details?: string }) => void;
    ontimeout?: () => void;
  }): void;

  function GM_xmlhttpRequest(options: {
    method?: string;
    url: string;
    headers?: Record<string, string>;
    responseType?: 'text' | 'arraybuffer' | 'blob' | 'json';
    data?: any;
    timeout?: number;
    onload?: (response: any) => void;
    onerror?: (response: any) => void;
    onprogress?: (response: any) => void;
    ontimeout?: (response: any) => void;
    onabort?: (response: any) => void;
  }): { abort: () => void };

  function GM_getValue<T>(key: string, defaultValue?: T): T;
  function GM_setValue<T>(key: string, value: T): void;
  function GM_notification(options: {
    text: string;
    title?: string;
    image?: string;
    onclick?: () => void;
    timeout?: number;
  }): void;
}
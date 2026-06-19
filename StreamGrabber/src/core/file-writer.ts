import { notifyDownloadComplete, shortId } from '../utils';
import { createInternalBlobUrl } from '../utils/blob-utils';

interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string): Promise<void>;
  close(): Promise<void>;
  abort(): Promise<void>;
}

declare global {
  interface FileSystemFileHandle {
    createWritable(options?: any): Promise<FileSystemWritableFileStream>;
  }
}

export interface FileWriter {
  write(chunk: Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort(): void;
}

// ===== Shared Utilities =====

const CONFIG = {
  /** Buffer threshold before flushing to Blob */
  MAX_BUFFER_SIZE: 100 * 1024 * 1024, // 100MB
  /** Hard limit to prevent browser crashes */
  MAX_FILE_SIZE: 1.9 * 1024 * 1024 * 1024, // ~1.9GB (Chrome limit ~2GB)
  /** Delay before revoking blob URLs */
  URL_REVOKE_DELAY: 60000,
} as const;

const log = {
  info: (msg: string) => console.log(`[SG] ${msg}`),
  warn: (msg: string, ...args: unknown[]) => console.warn(`[SG] ${msg}`, ...args),
  error: (msg: string, ...args: unknown[]) => console.error(`[SG] ${msg}`, ...args),
};

const revokeUrlLater = (url: string, delay = CONFIG.URL_REVOKE_DELAY): void => {
  setTimeout(() => URL.revokeObjectURL(url), delay);
};

const wrapSaveError = (e: unknown): Error =>
  new Error(`Failed to save file: ${(e as Error).message}`);

const silentAbort = (abortable: { abort(): Promise<void> }) =>
  abortable.abort().catch(() => { });

const silentRemove = (root: FileSystemDirectoryHandle, name: string) =>
  root.removeEntry(name).catch(() => { });

const getExtension = (filename: string, fallback = ''): string =>
  filename.split('.').pop() || fallback;

const addPartSuffix = (filename: string, part: number): string => {
  const lastDot = filename.lastIndexOf('.');
  return lastDot === -1
    ? `${filename}.part${part}`
    : `${filename.slice(0, lastDot)}.part${part}${filename.slice(lastDot)}`;
};

class WriterState {
  private closed = false;
  private aborted = false;

  get isClosed() { return this.closed; }
  get isAborted() { return this.aborted; }

  setClosed() { this.closed = true; }
  setAborted() { this.aborted = true; }

  /**
   * Asserts writer is open and valid.
   * @param warnOnly If true, returns false on close instead of throwing.
   */
  assertWritable(warnOnly = false): boolean {
    if (this.aborted) throw new Error('Writer was aborted');
    if (this.closed) {
      if (warnOnly) {
        log.warn('Attempted to write after close');
        return false;
      }
      throw new Error('Writer was closed');
    }
    return true;
  }
}

function mapGMDownloadError(error?: string, details?: string): string {
  switch (error) {
    case 'not_enabled':
      return 'Downloads are disabled in userscript settings';
    case 'not_whitelisted':
      return 'URL not whitelisted for download. Check userscript settings.';
    case 'not_permitted':
      return 'Download not permitted. Try allowing downloads in browser settings.';
    case 'not_supported':
      return 'Download not supported by your userscript manager';
    case 'not_succeeded':
      return details || 'Download failed. Check if the file location is writable.';
    default:
      return `Download failed: ${error || 'unknown'}${details ? ` - ${details}` : ''}`;
  }
}

function downloadViaAnchor(url: string, filename: string): Promise<void> {
  return new Promise((resolve) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.target = '_blank';
    a.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none';
    (document.body || document.documentElement).appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      resolve();
    }, 5000);
  });
}

function downloadWithGM(
  url: string | Blob,
  filename: string,
  onSuccess?: () => void
): Promise<void> {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return new Promise((resolve, reject) => {
    GM_download({
      url: url as any,
      name: filename,
      saveAs: !isMobile, // Disable saveAs on mobile to avoid picker crashes
      onload: () => {
        onSuccess?.();
        resolve();
      },
      onerror: (err) => {
        reject(new Error(mapGMDownloadError(err?.error, err?.details)));
      },
      ontimeout: () => {
        reject(new Error('Download timed out'));
      },
    });
  });
}

/**
 * Handles the actual download process (GM_download or Anchor fallback)
 * and ensures URLs are revoked.
 */
async function triggerDownload(
  url: string | Blob,
  filename: string,
  onSuccess?: () => void,
  fallbackOnFail: boolean = true
): Promise<void> {
  try {
    const isBlobUrl = typeof url === 'string' && url.startsWith('blob:');
    const isBlobObj = url instanceof Blob;

    // Use GM_download for non-blob URLs and for native Blob objects (supported in Tampermonkey)
    if ((!isBlobUrl || isBlobObj) && typeof GM_download === 'function') {
      try {
        await downloadWithGM(url, filename, onSuccess);
        return;
      } catch (e) {
        log.warn('GM_download failed, falling back to anchor:', (e as Error).message);
        if (!fallbackOnFail) throw e;
      }
    }

    // Fallback: download via anchor
    let anchorUrl = url;
    if (url instanceof Blob) {
      anchorUrl = createInternalBlobUrl(url);
    }
    await downloadViaAnchor(anchorUrl as string, filename);
    onSuccess?.();
  } finally {
    if (typeof url === 'string') {
      revokeUrlLater(url);
    }
  }
}


// ===== Native Writer (File System Access API) =====

async function createNativeWriter(
  suggestedName: string,
  mimeType: string
): Promise<FileWriter | null> {
  // Check browser support and secure context
  if (
    typeof window.showSaveFilePicker !== 'function' ||
    (window.isSecureContext === false) // Explicit false check, as some environments might be undefined but secure
  ) {
    return null;
  }

  try {
    const ext = getExtension(suggestedName, 'mp4');
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: 'Video file',
          accept: { [mimeType]: [`.${ext}`] },
        },
      ],
    });

    const stream = await handle.createWritable();
    const state = new WriterState();

    return {
      async write(chunk: Uint8Array): Promise<void> {
        if (!state.assertWritable(true)) return;
        await stream.write(chunk as any);
      },

      async close(): Promise<Blob | undefined> {
        if (state.isAborted) throw new Error('Writer was aborted');
        if (state.isClosed) return;
        state.setClosed();
        try {
          await stream.close();
          notifyDownloadComplete(suggestedName);
          return undefined;
        } catch (e) {
          log.error('Native close error:', e);
          throw wrapSaveError(e);
        }
      },

      abort(): void {
        if (state.isClosed || state.isAborted) return;
        state.setAborted();
        silentAbort(stream);
      },
    };
  } catch (e) {
    const error = e as Error;
    if (error.name === 'AbortError') throw e;
    log.warn('File System Access API failed, using fallback:', error.message);
    return null;
  }
}

// ===== OPFS Writer (Virtual File System) =====

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

async function cleanupStaleTempFiles(root: FileSystemDirectoryHandle): Promise<void> {
  try {
    const now = Date.now();
    const deletePromises: Promise<void>[] = [];

    // Iterate over all entries
    // @ts-ignore - TS might complain about async iterator on older definitions
    for await (const [name, handle] of root.entries()) {
      if (handle.kind === 'file' && name.endsWith('.tmp') && name.startsWith('sg_download_')) {
        // Extract timestamp from filename: sg_download_<TIMESTAMP>_<RANDOM>.tmp
        const match = /^sg_download_(\d+)_/.exec(name);
        if (match) {
          const ts = parseInt(match[1], 10);
          if (!isNaN(ts) && (now - ts > STALE_THRESHOLD_MS)) {
            log.info(`Cleaning up stale temp file: ${name}`);
            deletePromises.push(silentRemove(root, name));
          }
        }
      }
    }

    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }
  } catch (e) {
    log.warn('Failed to cleanup stale temp files:', e);
  }
}

async function createOpfsWriter(
  suggestedName: string,
  mimeType: string
): Promise<FileWriter | null> {
  if (!navigator.storage?.getDirectory) {
    return null;
  }

  try {
    const root = await navigator.storage.getDirectory();

    // Lazy cleanup on new write
    cleanupStaleTempFiles(root).catch(() => { });

    // Use a temp name to avoid conflicts, or just use the suggested name if unique.
    // For simplicity and to allow simple cleanup, we'll specific temp file.
    // But to support "Save As" at the end, we just need the data.
    const tempName = `sg_download_${Date.now()}_${shortId()}.tmp`;
    const fileHandle = await root.getFileHandle(tempName, { create: true });

    // Create a sync access handle if available (faster), or writable (standard)
    // Synchronous Access Handle is much faster for writing but requires a Worker.
    // Since we are likely on main thread (userscript), we use createWritable().
    const writable = await fileHandle.createWritable();
    const state = new WriterState();

    return {
      async write(chunk: Uint8Array): Promise<void> {
        if (!state.assertWritable(true)) return;
        await writable.write(chunk as any);
      },

      async close(): Promise<Blob | undefined> {
        if (state.isAborted) throw new Error('Writer was aborted');
        if (state.isClosed) return;
        state.setClosed();

        try {
          await writable.close();

          // Get the file
          const file = await fileHandle.getFile();

          // Trigger download using the native File/Blob object directly
          await triggerDownload(file, suggestedName, () => {
            notifyDownloadComplete(suggestedName);
          });

          // Cleanup OPFS file after download trigger.
          setTimeout(() => {
            silentRemove(root, tempName);
          }, CONFIG.URL_REVOKE_DELAY + 5000); // Clean up after revocation to be safe

          return file;
        } catch (e) {
          log.error('OPFS close error:', e);
          throw wrapSaveError(e);
        }
      },

      abort(): void {
        if (state.isClosed || state.isAborted) return;
        state.setAborted();
        silentAbort(writable);
        silentRemove(root, tempName);
      }
    };
  } catch (e) {
    log.warn('OPFS initialization failed:', e);
    return null;
  }
}

// ===== Blob Writer (Fallback with Multi-part Logic) =====

/**
 * Create a file writer using in-memory blob + GM_download/Anchor (fallback)
 * Optimized to use "paged" blobs and multi-part splitting for massive files.
 */
function createBlobWriter(suggestedName: string, mimeType: string): FileWriter {
  const blobParts: Blob[] = [];
  let currentBuffer: Uint8Array[] = [];
  let currentBufferSize = 0;
  let currentPartSize = 0;
  let partNumber = 1;
  const state = new WriterState();

  const flushBuffer = (): void => {
    if (currentBufferSize === 0) return;
    const blob = new Blob(currentBuffer as any, { type: mimeType }); // mimeType helpful for some constructs
    blobParts.push(blob);
    currentBuffer = [];
    currentBufferSize = 0;
  };

  const clearMemory = (): void => {
    currentBuffer = [];
    currentBufferSize = 0;
    blobParts.length = 0;
    currentPartSize = 0;
  };

  const savePart = async (isFinal: boolean): Promise<Blob | undefined> => {
    flushBuffer();

    if (blobParts.length === 0 && !isFinal) return; // Don't save empty parts if not final
    if (blobParts.length === 0 && isFinal && partNumber === 1) {
      log.warn('Saving empty file');
    }

    // Determine filename
    let filename = suggestedName;
    if (partNumber > 1 || (!isFinal && partNumber === 1)) {
      filename = addPartSuffix(suggestedName, partNumber);
    }

    log.info(`Saving part ${partNumber}: ${filename}, Size: ${(currentPartSize / 1024 / 1024).toFixed(2)} MB`);

    const blob = new Blob(blobParts, { type: mimeType });

    // IMMEDIATE MEMORY CLEAR after Blob creation to free JS refs. 
    // Browser holds Blob ref until URL revoked.
    clearMemory();

    // Trigger download using the native Blob object
    await triggerDownload(blob, filename, () => {
      if (isFinal) notifyDownloadComplete(suggestedName);
    });

    return blob;
  };

  return {
    async write(chunk: Uint8Array): Promise<void> {
      if (!state.assertWritable(true)) return;

      // Check strict size limit for the current part
      if (currentPartSize + chunk.length > CONFIG.MAX_FILE_SIZE) {
        log.warn(`File part ${partNumber} limit reached (~1.9GB). Splitting file...`);
        // Save current part (isFinal = false)
        await savePart(false);
        partNumber++;
      }

      currentBuffer.push(chunk);
      currentBufferSize += chunk.length;
      currentPartSize += chunk.length;

      // Flush to Blob if buffer gets too large (paging)
      if (currentBufferSize >= CONFIG.MAX_BUFFER_SIZE) {
        flushBuffer();
        if (blobParts.length % 5 === 0) {
          log.info(`Part ${partNumber} Buffer: ${blobParts.length} blobs, Size: ${(currentPartSize / 1024 / 1024).toFixed(2)} MB`);
        }
      }
    },

    async close(): Promise<Blob | undefined> {
      if (state.isAborted) throw new Error('Writer was aborted');
      if (state.isClosed) return;
      state.setClosed();

      // Save the final part (isFinal = true) and return the Blob
      return await savePart(true);
    },

    abort(): void {
      if (state.isClosed || state.isAborted) return;
      state.setAborted();
      clearMemory();
    },
  };
}

// ===== Exports =====

export async function createFileWriter(
  suggestedName: string,
  mimeType: string
): Promise<FileWriter> { // Use return type inference or change signature to enforce FileWriter
  try {
    const nativeWriter = await createNativeWriter(suggestedName, mimeType);
    if (nativeWriter) {
      log.info('Using native File System Access API');
      return nativeWriter;
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      log.info('User cancelled file picker');
      // AbortError from picker means stop everything.
      // But we need to return a FileWriter or throw.
      // If we throw, the caller must handle it. 
      // Existing caller expects FileWriter or throws.
      // Re-throwing AbortError is correct for cancellation.
      throw e;
    }
    // Other errors log and fall through
    log.warn('Native writer creation failed:', e);
  }

  const opfsWriter = await createOpfsWriter(suggestedName, mimeType);
  if (opfsWriter) {
    log.info('Using OPFS writer');
    return opfsWriter;
  }

  log.info('Using blob fallback for download');
  return createBlobWriter(suggestedName, mimeType);
}

// Legacy export if needed, or for direct blob downloads
export function downloadBlob(blob: Blob, filename: string): Promise<void> {
  return triggerDownload(blob, filename);
}
import { notifyDownloadComplete } from './shared';

declare const GM_download: any;

export interface FileWriter {
  write(chunk: Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort(): void;
}

// ===== Shared Utilities =====

const revokeUrlLater = (url: string, delay = 5000): void => {
  setTimeout(() => URL.revokeObjectURL(url), delay);
};

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
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Short delay to ensure click registers before revoking
    setTimeout(() => {
      resolve();
    }, 500);
  });
}

function downloadWithGM(
  url: string,
  filename: string,
  onSuccess?: () => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    GM_download({
      url,
      name: filename,
      saveAs: true,
      onload: () => {
        onSuccess?.();
        resolve();
      },
      onerror: (err: any) => {
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
async function triggerDownload(url: string, filename: string, onSuccess?: () => void): Promise<void> {
  try {
    if (typeof GM_download === 'function') {
      await downloadWithGM(url, filename, onSuccess);
    } else {
      console.log('[SG] GM_download unavailable, using anchor fallback');
      await downloadViaAnchor(url, filename);
      onSuccess?.();
    }
  } finally {
    revokeUrlLater(url);
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
    const ext = suggestedName.split('.').pop() || 'mp4';
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
    let closed = false;
    let aborted = false;

    return {
      async write(chunk: Uint8Array): Promise<void> {
        if (aborted) throw new Error('Writer was aborted');
        if (closed) {
          console.warn('[SG] Attempted to write after close');
          return;
        }
        await stream.write(chunk as any);
      },

      async close(): Promise<void> {
        if (aborted) throw new Error('Writer was aborted');
        if (closed) return;
        closed = true;
        try {
          await stream.close();
          notifyDownloadComplete(suggestedName);
        } catch (e) {
          console.error('[SG] Native close error:', e);
          throw new Error(`Failed to save file: ${(e as Error).message}`);
        }
      },

      abort(): void {
        if (closed || aborted) return;
        aborted = true;
        stream.abort().catch(() => { });
      },
    };
  } catch (e) {
    const error = e as Error;
    if (error.name === 'AbortError') throw e;
    console.warn('[SG] File System Access API failed, using fallback:', error.message);
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
  let closed = false;
  let aborted = false;

  // Max buffer size before flushing to a Blob (e.g., 100MB)
  const MAX_BUFFER_SIZE = 100 * 1024 * 1024;
  // Hard limit for in-memory blobs to prevent browser crash (e.g., 1.9GB)
  const MAX_FILE_SIZE = 1.9 * 1024 * 1024 * 1024;

  const flushBuffer = () => {
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

  const savePart = async (isFinal: boolean): Promise<void> => {
    flushBuffer();

    if (blobParts.length === 0 && !isFinal) return; // Don't save empty parts if not final
    if (blobParts.length === 0 && isFinal && partNumber === 1) {
      throw new Error('No data to save');
    }

    // Determine filename
    let filename = suggestedName;
    if (partNumber > 1 || (!isFinal && partNumber === 1)) {
      // Inject .partN before extension for ANY part if we are splitting
      // If we are saving intermediate part 1, we rename it to part1
      const lastDotIndex = suggestedName.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        filename = `${suggestedName.substring(0, lastDotIndex)}.part${partNumber}${suggestedName.substring(lastDotIndex)}`;
      } else {
        filename = `${suggestedName}.part${partNumber}`;
      }
    }

    console.log(`[SG] Saving part ${partNumber}: ${filename}, Size: ${(currentPartSize / 1024 / 1024).toFixed(2)} MB`);

    const blob = new Blob(blobParts, { type: mimeType });

    // IMMEDIATE MEMORY CLEAR after Blob creation to free JS refs. 
    // Browser holds Blob ref until URL revoked.
    blobParts.length = 0;
    currentBuffer = [];
    currentBufferSize = 0;
    currentPartSize = 0;

    const url = URL.createObjectURL(blob);

    // Trigger download - we await it to ensure we don't start next part too fast 
    // or if we want to handle errors, though strictly we could fire-and-forget for speed.
    // Awaiting is safer to prevent memory spikes if download is synchronous-ish (buffer copy).
    await triggerDownload(url, filename, () => {
      if (isFinal) notifyDownloadComplete(suggestedName);
    });
  };

  return {
    async write(chunk: Uint8Array): Promise<void> {
      if (aborted) throw new Error('Writer was aborted');
      if (closed) {
        console.warn('[SG] Attempted to write after close');
        return;
      }

      // Check strict size limit for the current part
      if (currentPartSize + chunk.length > MAX_FILE_SIZE) {
        console.warn(`[SG] File part ${partNumber} limit reached (~1.9GB). Splitting file...`);
        // Save current part (isFinal = false)
        await savePart(false);
        partNumber++;
      }

      currentBuffer.push(chunk);
      currentBufferSize += chunk.length;
      currentPartSize += chunk.length;

      // Flush to Blob if buffer gets too large (paging)
      if (currentBufferSize >= MAX_BUFFER_SIZE) {
        flushBuffer();
        if (blobParts.length % 5 === 0) {
          console.log(`[SG] Part ${partNumber} Buffer: ${blobParts.length} blobs, Size: ${(currentPartSize / 1024 / 1024).toFixed(2)} MB`);
        }
      }
    },

    async close(): Promise<void> {
      if (aborted) throw new Error('Writer was aborted');
      if (closed) return;
      closed = true;

      // Save the final part (isFinal = true)
      await savePart(true);
      // Ensure everything cleared
      clearMemory();
    },

    abort(): void {
      if (closed || aborted) return;
      aborted = true;
      clearMemory();
    },
  };
}

// ===== Exports =====

export async function createFileWriter(
  suggestedName: string,
  mimeType: string
): Promise<FileWriter> {
  const nativeWriter = await createNativeWriter(suggestedName, mimeType);
  if (nativeWriter) {
    console.log('[SG] Using native File System Access API');
    return nativeWriter;
  }

  console.log('[SG] Using blob fallback for download');
  return createBlobWriter(suggestedName, mimeType);
}

// Legacy export if needed, or for direct blob downloads
export function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  return triggerDownload(url, filename);
}
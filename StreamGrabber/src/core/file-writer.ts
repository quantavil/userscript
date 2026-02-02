/**
 * File writing with streaming support
 * Uses File System Access API when available, falls back to blob/GM_download
 */

import { notifyDownloadComplete } from './shared';

export interface FileWriter {
  write(chunk: Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort(): void;
}

/**
 * Create a file writer using File System Access API (streaming to disk)
 */
async function createNativeWriter(
  suggestedName: string,
  mimeType: string
): Promise<FileWriter | null> {
  if (typeof window.showSaveFilePicker !== 'function') {
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
        if (closed || aborted) return;
        try {
          await stream.write(chunk);
        } catch (e) {
          console.error('[SG] Native write error:', e);
          throw e;
        }
      },
      async close(): Promise<void> {
        if (closed || aborted) return;
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
        try {
          stream.abort();
        } catch {
          /* ignore */
        }
      },
    };
  } catch (e) {
    const error = e as Error;
    if (error.name === 'AbortError') {
      throw e;
    }
    console.warn('[SG] File System Access API failed, using fallback:', error.message);
    return null;
  }
}

/**
 * Create a file writer using in-memory blob + GM_download (fallback)
 */
function createBlobWriter(suggestedName: string, mimeType: string): FileWriter {
  const chunks: Uint8Array[] = [];
  let totalSize = 0;
  let closed = false;
  let aborted = false;

  return {
    async write(chunk: Uint8Array): Promise<void> {
      if (closed || aborted) return;
      chunks.push(chunk);
      totalSize += chunk.length;

      if (totalSize > 500 * 1024 * 1024 && chunks.length % 100 === 0) {
        console.warn(
          `[SG] Large download in memory: ${Math.round(totalSize / 1024 / 1024)}MB`
        );
      }
    },
    async close(): Promise<void> {
      if (closed || aborted) return;
      closed = true;

      if (chunks.length === 0) {
        throw new Error('No data to save');
      }

      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);

      console.log(`[SG] Saving blob: ${suggestedName}, size: ${blob.size} bytes`);

      return new Promise((resolve, reject) => {
        const cleanup = () => {
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        };

        GM_download({
          url,
          name: suggestedName,
          saveAs: true,
          onload: () => {
            cleanup();
            notifyDownloadComplete(suggestedName);
            resolve();
          },
          onerror: (err) => {
            cleanup();
            const errorMsg = err?.error || 'unknown';
            const details = err?.details || '';
            console.error('[SG] GM_download error:', { error: errorMsg, details });

            let userMessage: string;
            switch (errorMsg) {
              case 'not_enabled':
                userMessage = 'Downloads are disabled in userscript settings';
                break;
              case 'not_whitelisted':
                userMessage =
                  'URL not whitelisted for download. Check userscript settings.';
                break;
              case 'not_permitted':
                userMessage =
                  'Download not permitted. Try allowing downloads in browser settings.';
                break;
              case 'not_supported':
                userMessage = 'Download not supported by your userscript manager';
                break;
              case 'not_succeeded':
                userMessage =
                  details || 'Download failed. Check if the file location is writable.';
                break;
              default:
                userMessage = `Download failed: ${errorMsg}${details ? ` - ${details}` : ''}`;
            }

            reject(new Error(userMessage));
          },
          ontimeout: () => {
            cleanup();
            reject(new Error('Download timed out'));
          },
        });
      });
    },
    abort(): void {
      if (closed || aborted) return;
      aborted = true;
      chunks.length = 0;
    },
  };
}

/**
 * Create a file writer - tries native API first, falls back to blob
 */
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

/**
 * Alternative: Direct blob download without streaming
 */
export function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    GM_download({
      url,
      name: filename,
      saveAs: true,
      onload: () => {
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        resolve();
      },
      onerror: (err) => {
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        const errorMsg = err?.error || 'unknown';
        const details = err?.details || '';
        reject(
          new Error(`Download failed: ${errorMsg}${details ? ` - ${details}` : ''}`)
        );
      },
      ontimeout: () => {
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        reject(new Error('Download timed out'));
      },
    });
  });
}
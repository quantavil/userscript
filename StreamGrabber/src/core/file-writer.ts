/**
 * File writing with streaming support
 * Uses File System Access API when available, falls back to in-memory blob
 */

export interface FileWriter {
  write(chunk: Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort(): void;
}

/**
 * Create a file writer
 * Tries native File System Access API first, falls back to blob accumulation
 */
export async function createFileWriter(
  suggestedName: string,
  mimeType: string
): Promise<FileWriter> {
  // Try File System Access API (Chrome/Edge)
  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{
          description: 'Video file',
          accept: { [mimeType]: [`.${suggestedName.split('.').pop()}`] },
        }],
      });
      
      const stream = await handle.createWritable();
      
      return {
        async write(chunk: Uint8Array): Promise<void> {
          await stream.write(chunk);
        },
        async close(): Promise<void> {
          await stream.close();
          GM_notification({
            text: `Download complete: ${suggestedName}`,
            title: 'StreamGrabber',
            timeout: 3000,
          });
        },
        abort(): void {
          try { stream.abort(); } catch { /* ignore */ }
        },
      };
    } catch (e) {
      // User cancelled or API failed, fall through to blob method
      if ((e as Error).name === 'AbortError') {
        throw e; // Re-throw user cancellation
      }
    }
  }
  
  // Fallback: accumulate in memory, download via GM_download
  const chunks: Uint8Array[] = [];
  let aborted = false;
  
  return {
    async write(chunk: Uint8Array): Promise<void> {
      if (aborted) return;
      chunks.push(chunk);
    },
    async close(): Promise<void> {
      if (aborted) return;
      
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      return new Promise((resolve, reject) => {
        GM_download({
          url,
          name: suggestedName,
          onload: () => {
            URL.revokeObjectURL(url);
            GM_notification({
              text: `Download complete: ${suggestedName}`,
              title: 'StreamGrabber',
              timeout: 3000,
            });
            resolve();
          },
          onerror: (err) => {
            URL.revokeObjectURL(url);
            reject(new Error(`Download failed: ${err}`));
          },
        });
      });
    },
    abort(): void {
      aborted = true;
      chunks.length = 0;
    },
  };
}
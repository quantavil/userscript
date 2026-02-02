import PQueue from 'p-queue';
import pRetry, { AbortError } from 'p-retry';
import type { Segment, ParsedMedia, ProgressCardController } from '../types';
import { CFG } from '../config';
import { getBin } from './network';
import { aesCbcDecrypt, hexToU8, ivFromSeq } from './crypto';
import { createFileWriter, type FileWriter } from './file-writer';
import { once } from '../utils';

// ============================================
// Types
// ============================================

interface DownloadState {
  paused: boolean;
  canceled: boolean;
  done: number;
  writePtr: number;
  byteDone: number;
  avgLen: number;
}

// ============================================
// Segment Downloader
// ============================================

export async function downloadSegments(
  parsed: ParsedMedia,
  filename: string,
  isFmp4: boolean,
  srcUrl: string, // Keep for logging
  card: ProgressCardController
): Promise<void> {
  const segs = parsed.segs;
  const total = segs.length;

  console.log('[SG] Starting segment download:', { filename, segments: total, srcUrl });

  // State
  const state: DownloadState = {
    paused: false,
    canceled: false,
    done: 0,
    writePtr: 0,
    byteDone: 0,
    avgLen: 0,
  };

  // Queue & Concurrency
  const queue = new PQueue({ concurrency: CFG.CONCURRENCY });

  // Progress tracking
  const inprog = new Map<number, { loaded: number; total: number }>();
  // segment index -> AbortController
  const controllers = new Map<number, AbortController>();

  // Buffers for sequential writing
  const buffers = new Map<number, Uint8Array>();

  // Caches for keys and init segments
  const keyCache = new Map<string, Uint8Array>();
  const keyInflight = new Map<string, Promise<Uint8Array>>();
  const mapCache = new Map<string, Uint8Array>();
  const mapInflight = new Map<string, Promise<Uint8Array>>();

  // File writer
  const mime = isFmp4 ? 'video/mp4' : 'video/mp2t';
  let writer: FileWriter;

  try {
    writer = await createFileWriter(filename, mime);
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      card.remove();
      return;
    }
    throw e;
  }

  // ----------------------------------------
  // Control handlers
  // ----------------------------------------

  card.setOnStop(() => {
    state.paused = !state.paused;
    if (state.paused) {
      queue.pause();
    } else {
      queue.start();
    }
    return state.paused ? 'paused' : 'resumed';
  });

  card.setOnCancel(() => {
    state.canceled = true;
    abortAll();
    queue.clear();
    writer.abort();
    card.remove();
  });

  function abortAll(): void {
    for (const controller of controllers.values()) {
      controller.abort();
    }
    controllers.clear();
    inprog.clear();
  }

  // ----------------------------------------
  // Progress UI
  // ----------------------------------------

  let rafId = 0;
  function draw(): void {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;

      let partial = 0;
      inprog.forEach(({ loaded, total: t }) => {
        if (t > 0) {
          partial += Math.min(1, loaded / t);
        } else if (state.avgLen > 0) {
          partial += Math.min(1, loaded / state.avgLen);
        }
      });

      const pct = ((state.done + partial) / total) * 100;
      card.update(pct, `${state.done}/${total}`);
    });
  }

  // ----------------------------------------
  // Writing (Sequential)
  // ----------------------------------------

  let writeChain = Promise.resolve();

  function queueFlush(): void {
    writeChain = writeChain.then(async () => {
      while (buffers.has(state.writePtr)) {
        const chunk = buffers.get(state.writePtr)!;
        buffers.delete(state.writePtr);
        await writer.write(chunk);
        state.writePtr++;
      }
    });
  }

  // ----------------------------------------
  // Key & Map fetching
  // ----------------------------------------

  async function fetchKeyBytes(s: Segment): Promise<Uint8Array | null> {
    if (!s.key || s.key.method !== 'AES-128' || !s.key.uri) return null;

    return once(keyCache, keyInflight, s.key.uri, async () => {
      const buf = await getBin(s.key!.uri!);
      return new Uint8Array(buf);
    }, 100);
  }

  async function fetchMapBytes(s: Segment): Promise<Uint8Array | null> {
    if (!s.needMap || !s.map?.uri) return null;

    const id = `${s.map.uri}|${s.map.rangeHeader || ''}`;
    return once(mapCache, mapInflight, id, async () => {
      const headers: Record<string, string> = s.map!.rangeHeader ? { Range: s.map!.rangeHeader } : {};
      const buf = await getBin(s.map!.uri, headers);
      return new Uint8Array(buf);
    }, 100);
  }

  // ----------------------------------------
  // Task Logic
  // ----------------------------------------

  async function downloadSegmentTask(i: number): Promise<void> {
    if (state.canceled) return;

    const s = segs[i];

    // Encryption check
    if (s.key && s.key.method && s.key.method !== 'AES-128') {
      throw new AbortError(new Error(`Unsupported key method: ${s.key.method}`));
    }

    const controller = new AbortController();
    controllers.set(i, controller);

    try {
      await pRetry(async () => {
        if (state.canceled) throw new AbortError(new Error('Canceled'));

        const headers: Record<string, string> = s.range ? { Range: s.range } : {};

        // Use our getBin wrapper but attach the abort signal if we can?
        // getBin returns an AbortablePromise. We can just use that.
        // We'll wrap it to respect the controller.

        const req = getBin(s.uri, headers, CFG.REQUEST_TIMEOUT, (e) => {
          inprog.set(i, { loaded: e.loaded, total: e.total });
          draw();
        });

        // Wire abort controller to request
        controller.signal.addEventListener('abort', () => req.abort());

        // If already aborted
        if (controller.signal.aborted) {
          req.abort();
          throw new Error('Aborted');
        }

        let buf: ArrayBuffer;
        try {
          buf = await req;
        } catch (err) {
          // If manual abort, don't retry, just throw
          if (controller.signal.aborted) throw new AbortError(new Error('Aborted'));
          throw err;
        }

        // Decrypt if needed
        const keyBytes = await fetchKeyBytes(s);
        if (keyBytes) {
          const iv = s.key!.iv ? hexToU8(s.key!.iv) : ivFromSeq(parsed.mediaSeq + i);
          buf = await aesCbcDecrypt(buf, keyBytes, iv);
        }

        let u8 = new Uint8Array(buf);

        // Prepend init segment if needed
        if (s.needMap) {
          const mapBytes = await fetchMapBytes(s);
          if (mapBytes?.length) {
            const joined = new Uint8Array(mapBytes.length + u8.length);
            joined.set(mapBytes, 0);
            joined.set(u8, mapBytes.length);
            u8 = joined;
          }
        }

        buffers.set(i, u8);
      }, {
        retries: CFG.RETRIES,
        onFailedAttempt: ({ error, attemptNumber }) => {
          if (state.canceled) return;
          console.warn(`[SG] Segment ${i} failed (attempt ${attemptNumber}): ${error.message}`);
        },
        signal: controller.signal // Pass signal to pRetry if supported, or just use ours
      });

      // Success
      inprog.delete(i);
      controllers.delete(i);

      state.done++;
      const finishedSize = buffers.get(i)?.length || 0;
      state.byteDone += finishedSize;
      state.avgLen = state.byteDone / Math.max(1, state.done);

      draw();
      queueFlush();

    } catch (error) {
      inprog.delete(i);
      controllers.delete(i);
      if (!state.canceled && !(error instanceof AbortError)) {
        console.error(`[SG] Segment ${i} fatal error:`, error);
        // If a segment fails permanently, we must fail the whole download
        abortAll();
        state.canceled = true; // effectively canceled by error
        queue.clear();
        finalize(false);
      }
    }
  }

  // ----------------------------------------
  // Finalize
  // ----------------------------------------

  async function finalize(ok: boolean): Promise<void> {
    try {
      queueFlush();
      await writeChain;

      if (ok) {
        await writer.close();
        card.update(100, '');
        card.done(true);
      } else {
        writer.abort();
        card.done(false, 'Failed');
      }
    } catch (e) {
      console.error('[SG] finalize error:', e);
      card.done(false);
    }
  }

  // ----------------------------------------
  // Start
  // ----------------------------------------

  // Add all tasks to queue
  for (let i = 0; i < total; i++) {
    queue.add(() => downloadSegmentTask(i));
  }

  // Wait for queue to empty
  await queue.onIdle();

  if (!state.canceled && state.done === total) {
    finalize(true);
  } else if (!state.canceled && state.done < total) {
 
  }
}
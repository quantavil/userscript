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
  ended: boolean;
  done: number;
  active: number;
  nextIdx: number;
  writePtr: number;
  byteDone: number;
  avgLen: number;
}

interface SegmentStatus {
  attempts: Uint8Array;
  status: Int8Array; // 0=pending, 1=fetching, 2=done, -1=failed
}

// ============================================
// Segment Downloader
// ============================================

export async function downloadSegments(
  parsed: ParsedMedia,
  filename: string,
  isFmp4: boolean,
  srcUrl: string, // Keep for logging, prefix removed
  card: ProgressCardController
): Promise<void> {
  const segs = parsed.segs;
  const total = segs.length;

  console.log('[SG] Starting segment download:', { filename, segments: total, srcUrl });

  // State
  const state: DownloadState = {
    paused: false,
    canceled: false,
    ended: false,
    done: 0,
    active: 0,
    nextIdx: 0,
    writePtr: 0,
    byteDone: 0,
    avgLen: 0,
  };

  const seg: SegmentStatus = {
    attempts: new Uint8Array(total),
    status: new Int8Array(total),
  };

  // Inflight tracking
  const inflight = new Map<number, { abort: () => void }>();
  const inprog = new Map<number, { loaded: number; total: number }>();
  const buffers = new Map<number, Uint8Array>();
  const retryQueue = new Set<number>();

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
    if (!state.paused) pump();
    return state.paused ? 'paused' : 'resumed';
  });

  card.setOnCancel(() => {
    state.canceled = true;
    abortAll();
    writer.abort();
    card.remove();
  });

  // ----------------------------------------
  // Helpers
  // ----------------------------------------

  function abortAll(): void {
    for (const [, req] of inflight) {
      try {
        req.abort();
      } catch {
        /* ignore */
      }
    }
    inflight.clear();
    inprog.clear();
  }

  function enqueueRetry(i: number): void {
    retryQueue.add(i);
  }

  function takeRetry(): number {
    const it = retryQueue.values().next();
    if (it.done) return -1;
    retryQueue.delete(it.value);
    return it.value;
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
  // Writing
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
      const headers = s.map!.rangeHeader ? { Range: s.map!.rangeHeader } : {};
      const buf = await getBin(s.map!.uri, headers);
      return new Uint8Array(buf);
    }, 100);
  }

  // ----------------------------------------
  // Segment handling
  // ----------------------------------------

  function fail(i: number, why: string): void {
    seg.attempts[i]++;

    if (seg.attempts[i] > CFG.RETRIES) {
      seg.status[i] = -1;
      console.error(`[SG] Segment ${i} failed: ${why}`);
      maybeFailFast(i);
    } else {
      seg.status[i] = 0;
      enqueueRetry(i);
    }
  }

  function maybeFailFast(i: number): void {
    if (seg.status[i] === -1 && i === state.writePtr && !state.ended) {
      abortAll();
      finalize(false);
    }
  }

  async function handleSegment(i: number): Promise<void> {
    const s = segs[i];
    seg.status[i] = 1;
    state.active++;

    // Check unsupported encryption
    if (s.key && s.key.method && s.key.method !== 'AES-128') {
      state.active--;
      seg.status[i] = -1;
      console.error('[SG] Unsupported key method:', s.key.method);
      maybeFailFast(i);
      check();
      return;
    }

    const headers = s.range ? { Range: s.range } : {};

    const req = getBin(s.uri, headers, CFG.REQUEST_TIMEOUT, (e) => {
      inprog.set(i, { loaded: e.loaded, total: e.total });
      draw();
    });

    inflight.set(i, { abort: () => req.abort() });

    try {
      let buf = await req;

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
      inprog.delete(i);
      inflight.delete(i);

      seg.status[i] = 2;
      state.active--;
      state.done++;
      state.byteDone += u8.length;
      state.avgLen = state.byteDone / Math.max(1, state.done);

      draw();
      queueFlush();
    } catch (e) {
      inprog.delete(i);
      inflight.delete(i);
      state.active--;
      fail(i, (e as Error).message || 'network/decrypt');
    } finally {
      pump();
      check();
    }
  }

  // ----------------------------------------
  // Pump & Check
  // ----------------------------------------

  function pump(): void {
    if (state.paused || state.canceled || state.ended) return;

    while (state.active < CFG.CONCURRENCY) {
      let idx = takeRetry();

      if (idx === -1) {
        while (state.nextIdx < total && seg.status[state.nextIdx] !== 0) {
          state.nextIdx++;
        }
        if (state.nextIdx < total) {
          idx = state.nextIdx++;
        }
      }

      if (idx === -1) break;
      handleSegment(idx);
    }
  }

  function check(): void {
    if (state.ended) return;

    if (seg.status[state.writePtr] === -1) {
      abortAll();
      finalize(false);
      return;
    }

    if (state.done === total) {
      finalize(true);
      return;
    }

    if (!state.active) {
      for (let i = 0; i < seg.status.length; i++) {
        if (seg.status[i] === -1) {
          finalize(false);
          return;
        }
      }
    }
  }

  async function finalize(ok: boolean): Promise<void> {
    if (state.ended) return;
    state.ended = true;

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
    } finally {
      abortAll();
    }
  }

  // Start!
  pump();
}
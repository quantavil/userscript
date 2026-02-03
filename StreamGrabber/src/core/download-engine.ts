import PQueue from 'p-queue';
import pRetry, { AbortError } from 'p-retry';
import type { Segment, ParsedMedia, ProgressCardController } from '../types';
import { CFG } from '../config';
import { getBin } from './network';
import { aesCbcDecrypt, hexToU8, ivFromSeq } from './crypto';
import { createFileWriter, type FileWriter } from './file-writer';
import { once } from '../utils/index';

// ============================================
// Constants
// ============================================

const INFLIGHT_CACHE_TIMEOUT_MS = 100;
const MAX_BUFFERED_SEGMENTS = 50;
const BACKPRESSURE_CHECK_MS = 50;

// ============================================
// Types
// ============================================

interface SegmentProgress {
  loaded: number;
  total: number;
}

// ============================================
// ResourceCache
// ============================================

class ResourceCache {
  private cache = new Map<string, Uint8Array>();
  private inflight = new Map<string, Promise<Uint8Array>>();

  async fetch(
    key: string,
    fetcher: () => Promise<Uint8Array>,
    signal?: AbortSignal
  ): Promise<Uint8Array> {
    // Check abort before starting
    if (signal?.aborted) {
      throw new AbortError(new Error('Aborted'));
    }

    const result = await once(
      this.cache,
      this.inflight,
      key,
      fetcher,
      INFLIGHT_CACHE_TIMEOUT_MS
    );

    // Check abort after fetch
    if (signal?.aborted) {
      throw new AbortError(new Error('Aborted'));
    }

    return result;
  }

  clear(): void {
    this.cache.clear();
    this.inflight.clear();
  }
}

// ============================================
// SequentialWriter
// ============================================

class SequentialWriter {
  private buffers = new Map<number, Uint8Array>();
  private writePtr = 0;
  private writeChain = Promise.resolve();
  private totalBytes = 0;
  private writeError: Error | null = null;

  constructor(private writer: FileWriter) { }

  get bufferedCount(): number {
    return this.buffers.size;
  }

  get bytesWritten(): number {
    return this.totalBytes;
  }

  get error(): Error | null {
    return this.writeError;
  }

  shouldThrottle(): boolean {
    return this.buffers.size >= MAX_BUFFERED_SEGMENTS;
  }

  enqueue(index: number, data: Uint8Array): void {
    this.buffers.set(index, data);
    this.flush();
  }

  private flush(): void {
    this.writeChain = this.writeChain.then(async () => {
      while (this.buffers.has(this.writePtr)) {
        const chunk = this.buffers.get(this.writePtr)!;
        this.buffers.delete(this.writePtr);

        try {
          await this.writer.write(chunk);
          this.totalBytes += chunk.length;
        } catch (e) {
          this.writeError = e as Error;
          throw e;
        }

        this.writePtr++;
      }
    });
  }

  async finalize(): Promise<void> {
    await this.writeChain;
    if (this.writeError) {
      throw this.writeError;
    }
  }

  async close(): Promise<void> {
    await this.finalize();
    await this.writer.close();
  }

  abort(): void {
    this.buffers.clear();
    this.writer.abort();
  }
}

// ============================================
// ProgressTracker
// ============================================

class ProgressTracker {
  private inProgress = new Map<number, SegmentProgress>();
  private rafId = 0;
  private _done = 0;
  private byteDone = 0;
  private avgLen = 0;

  constructor(
    private total: number,
    private onUpdate: (pct: number, done: number, total: number) => void
  ) { }

  get done(): number {
    return this._done;
  }

  get averageSize(): number {
    return this.avgLen;
  }

  setProgress(index: number, loaded: number, total: number): void {
    this.inProgress.set(index, { loaded, total });
    this.scheduleUpdate();
  }

  markComplete(index: number, bytes: number): void {
    this.inProgress.delete(index);
    this._done++;
    this.byteDone += bytes;
    this.avgLen = this.byteDone / this._done;
    this.scheduleUpdate();
  }

  clear(index: number): void {
    this.inProgress.delete(index);
  }

  private scheduleUpdate(): void {
    if (this.rafId) return;

    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      const partial = this.calculatePartial();
      const pct = ((this._done + partial) / this.total) * 100;
      this.onUpdate(pct, this._done, this.total);
    });
  }

  private calculatePartial(): number {
    let partial = 0;
    this.inProgress.forEach(({ loaded, total }) => {
      if (total > 0) {
        partial += Math.min(1, loaded / total);
      } else if (this.avgLen > 0) {
        partial += Math.min(1, loaded / this.avgLen);
      }
    });
    return partial;
  }
}

// ============================================
// SegmentFetcher
// ============================================

class SegmentFetcher {
  private keyCache = new ResourceCache();
  private mapCache = new ResourceCache();

  constructor(private mediaSeq: number) { }

  async fetch(
    segment: Segment,
    index: number,
    signal: AbortSignal,
    onProgress: (loaded: number, total: number) => void
  ): Promise<Uint8Array> {
    this.validateEncryption(segment);

    // Pre-fetch with abort support
    const [keyBytes, mapBytes] = await Promise.all([
      this.fetchKey(segment, signal),
      this.fetchMap(segment, signal),
    ]);

    // Download segment
    const buf = await this.download(segment, signal, onProgress);

    // Decrypt
    const decrypted = keyBytes
      ? await this.decrypt(buf, keyBytes, segment, index)
      : buf;

    // Prepend map
    return this.prependMap(new Uint8Array(decrypted), mapBytes);
  }

  private validateEncryption(segment: Segment): void {
    if (segment.key?.method && segment.key.method !== 'AES-128') {
      throw new AbortError(
        new Error(`Unsupported key method: ${segment.key.method}`)
      );
    }
  }

  private async download(
    segment: Segment,
    signal: AbortSignal,
    onProgress: (loaded: number, total: number) => void
  ): Promise<ArrayBuffer> {
    const headers: Record<string, string> = segment.range
      ? { Range: segment.range }
      : {};

    // Pass signal directly to getBin
    try {
      return await getBin(
        segment.uri,
        headers,
        CFG.REQUEST_TIMEOUT,
        (e) => onProgress(e.loaded, e.total),
        signal
      );
    } catch (err) {
      if (signal.aborted) {
        throw new AbortError(new Error('Aborted'));
      }
      throw err;
    }
  }

  private async fetchKey(
    segment: Segment,
    signal: AbortSignal
  ): Promise<Uint8Array | null> {
    if (!segment.key || segment.key.method !== 'AES-128' || !segment.key.uri) {
      return null;
    }

    return this.keyCache.fetch(
      segment.key.uri,
      async () => {
        const buf = await getBin(segment.key!.uri!, {}, CFG.REQUEST_TIMEOUT, undefined, signal);
        return new Uint8Array(buf);
      },
      signal
    );
  }

  private async fetchMap(
    segment: Segment,
    signal: AbortSignal
  ): Promise<Uint8Array | null> {
    if (!segment.needMap || !segment.map?.uri) {
      return null;
    }

    const cacheKey = `${segment.map.uri}|${segment.map.rangeHeader || ''}`;
    return this.mapCache.fetch(
      cacheKey,
      async () => {
        const headers: Record<string, string> = segment.map!.rangeHeader
          ? { Range: segment.map!.rangeHeader }
          : {};
        const buf = await getBin(segment.map!.uri, headers, CFG.REQUEST_TIMEOUT, undefined, signal);
        return new Uint8Array(buf);
      },
      signal
    );
  }

  private async decrypt(
    buf: ArrayBuffer,
    keyBytes: Uint8Array,
    segment: Segment,
    index: number
  ): Promise<ArrayBuffer> {
    const iv = segment.key!.iv
      ? hexToU8(segment.key!.iv)
      : ivFromSeq(this.mediaSeq + index);
    return aesCbcDecrypt(buf, keyBytes, iv);
  }

  private prependMap(
    data: Uint8Array,
    mapBytes: Uint8Array | null
  ): Uint8Array {
    if (!mapBytes?.length) return data;

    const joined = new Uint8Array(mapBytes.length + data.length);
    joined.set(mapBytes, 0);
    joined.set(data, mapBytes.length);
    return joined;
  }

  clear(): void {
    this.keyCache.clear();
    this.mapCache.clear();
  }
}

// ============================================
// SegmentDownloader
// ============================================

class SegmentDownloader {
  private queue: PQueue;
  private controllers = new Map<number, AbortController>();
  private writer: SequentialWriter;
  private progress: ProgressTracker;
  private fetcher: SegmentFetcher;

  private paused = false;
  private canceled = false;
  private finalized = false;

  constructor(
    private segments: Segment[],
    mediaSeq: number,
    writer: FileWriter,
    private onProgress: (pct: number, done: number, total: number) => void,
    private onComplete: (success: boolean, message?: string) => void
  ) {
    this.queue = new PQueue({ concurrency: CFG.CONCURRENCY });
    this.writer = new SequentialWriter(writer);
    this.progress = new ProgressTracker(segments.length, onProgress);
    this.fetcher = new SegmentFetcher(mediaSeq);
  }

  async start(): Promise<void> {
    for (let i = 0; i < this.segments.length; i++) {
      this.queue.add(() => this.downloadSegment(i));
    }

    await this.queue.onIdle();
    await this.finalize();
  }

  togglePause(): boolean {
    this.paused = !this.paused;
    if (this.paused) {
      this.queue.pause();
    } else {
      this.queue.start();
    }
    return this.paused;
  }

  cancel(): void {
    if (this.canceled) return;

    this.canceled = true;
    this.abortAll();
    this.queue.clear();
    this.writer.abort();
    this.cleanup();
  }

  private async downloadSegment(index: number): Promise<void> {
    if (this.canceled) return;

    await this.waitForBackpressure();

    if (this.canceled) return;

    const controller = new AbortController();
    this.controllers.set(index, controller);

    try {
      await pRetry(
        async () => {
          if (this.canceled) {
            throw new AbortError(new Error('Canceled'));
          }

          const data = await this.fetcher.fetch(
            this.segments[index],
            index,
            controller.signal,
            (loaded, total) => {
              this.progress.setProgress(index, loaded, total);
            }
          );

          this.writer.enqueue(index, data);
          this.progress.markComplete(index, data.length);
        },
        {
          retries: CFG.RETRIES,
          signal: controller.signal,
          onFailedAttempt: ({ error, attemptNumber }) => {
            if (!this.canceled) {
              console.warn(
                `[SG] Segment ${index} failed (attempt ${attemptNumber}): ${error.message}`
              );
            }
          },
        }
      );
    } catch (error) {
      this.handleSegmentError(index, error);
    } finally {
      this.controllers.delete(index);
    }
  }

  private async waitForBackpressure(): Promise<void> {
    while (this.writer.shouldThrottle() && !this.canceled) {
      await new Promise((r) => setTimeout(r, BACKPRESSURE_CHECK_MS));
    }
  }

  private handleSegmentError(index: number, error: unknown): void {
    this.progress.clear(index);

    if (this.canceled || error instanceof AbortError) {
      return;
    }

    console.error(`[SG] Segment ${index} fatal error:`, error);

    // Trigger failure, but let finalize() handle completion
    this.canceled = true;
    this.abortAll();
    this.queue.clear();
  }

  private abortAll(): void {
    for (const controller of this.controllers.values()) {
      controller.abort();
    }
    this.controllers.clear();
  }

  private async finalize(): Promise<void> {
    if (this.finalized) return;
    this.finalized = true;

    const success =
      !this.canceled &&
      this.progress.done === this.segments.length &&
      !this.writer.error;

    try {
      if (success) {
        await this.writer.close();
        this.onComplete(true);
      } else {
        this.writer.abort();
        const msg = this.writer.error
          ? 'Write failed'
          : this.canceled
            ? 'Canceled'
            : 'Incomplete download';
        this.onComplete(false, msg);
      }
    } catch (e) {
      console.error('[SG] Finalize error:', e);
      this.onComplete(false, 'Finalization failed');
    } finally {
      this.cleanup();
    }
  }

  private cleanup(): void {
    this.fetcher.clear();
  }
}

// ============================================
// Public API
// ============================================

export async function downloadSegments(
  parsed: ParsedMedia,
  filename: string,
  isFmp4: boolean,
  card: ProgressCardController
): Promise<void> {
  const total = parsed.segs.length;
  console.log('[SG] Starting segment download:', { filename, segments: total });

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

  const downloader = new SegmentDownloader(
    parsed.segs,
    parsed.mediaSeq,
    writer,
    (pct, done, total) => {
      card.update(pct, `${done}/${total}`);
    },
    (success, message) => {
      if (success) {
        card.update(100, '');
        card.done(true);
      } else {
        card.done(false, message);
      }
    }
  );

  card.setOnStop(() => {
    const paused = downloader.togglePause();
    return paused ? 'paused' : 'resumed';
  });

  card.setOnCancel(() => {
    downloader.cancel();
    card.remove();
  });

  await downloader.start();
}
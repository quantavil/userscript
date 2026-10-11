export interface PositionHistory {
  startFen: string;
  moves: string[];
}

interface AnalysisEvaluation {
  cp?: number;
  mate?: number;
}

export interface AnalysisResult {
  success: boolean;
  depth: number;
  bestmove: string;
  pv: string;
  evaluation: AnalysisEvaluation;
  nodes?: number;
  time?: number;
}

export interface UciWorkerLike {
  onmessage: ((event: MessageEvent<string>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(command: string): void;
  terminate(): void;
}

type UciWorkerFactory = (signal: AbortSignal) => UciWorkerLike | Promise<UciWorkerLike>;

interface UciClientOptions {
  initTimeoutMs?: number;
  searchTimeoutSlackMs?: number;
  stopTimeoutMs?: number;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: unknown): void;
}

interface SearchInfo {
  depth: number;
  pv: string;
  evaluation: AnalysisEvaluation;
  nodes?: number;
  time?: number;
}

interface SearchJob {
  fen: string;
  positionKey: string;
  depth: number;
  timeLimit: number;
  history?: PositionHistory;
  pondering: boolean;
  promise: Promise<AnalysisResult>;
  signal?: AbortSignal;
  resolve(result: AnalysisResult): void;
  reject(reason: unknown): void;
  settled: boolean;
  abortReason?: unknown;
  timeoutReason?: Error;
  searchStarted: boolean;
  stopSent: boolean;
  info: SearchInfo;
  resultValue?: AnalysisResult;
  result?: Deferred<AnalysisResult>;
  searchTimer?: ReturnType<typeof setTimeout>;
  stopTimer?: ReturnType<typeof setTimeout>;
  onAbort?: () => void;
}

interface CompletedPonder {
  fen: string;
  positionKey: string;
  depth: number;
  result: AnalysisResult;
}

const PONDER_REUSE_DEPTH = 12;

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function abortError(): DOMException {
  return new DOMException('Analysis aborted', 'AbortError');
}

function asError(reason: unknown): Error {
  if (reason instanceof Error) return reason;
  return new Error(typeof reason === 'string' ? reason : 'Stockfish worker failed');
}

function safeTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout> {
  const timer = setTimeout(callback, delay);
  const maybeNodeTimer = timer as unknown as { unref?: () => void };
  maybeNodeTimer.unref?.();
  return timer;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = safeTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs} ms`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function tokenValue(tokens: string[], name: string): string | undefined {
  const index = tokens.indexOf(name);
  return index >= 0 ? tokens[index + 1] : undefined;
}

function finiteInteger(raw: string | undefined): number | undefined {
  if (raw === undefined || !/^-?\d+$/.test(raw)) return undefined;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : undefined;
}

function parseInfo(line: string, previous: SearchInfo): SearchInfo {
  const tokens = line.trim().split(/\s+/);
  if (tokens[0] !== 'info' || tokens[1] === 'string') return previous;
  const depth = finiteInteger(tokenValue(tokens, 'depth')) ?? previous.depth;
  const cpIndex = tokens.indexOf('cp');
  const mateIndex = tokens.indexOf('mate');
  let evaluation = previous.evaluation;
  if (cpIndex >= 0) {
    const cp = finiteInteger(tokens[cpIndex + 1]);
    if (cp !== undefined) evaluation = { cp };
  } else if (mateIndex >= 0) {
    const mate = finiteInteger(tokens[mateIndex + 1]);
    if (mate !== undefined) evaluation = { mate };
  }

  const pvIndex = tokens.indexOf('pv');
  const pv = pvIndex >= 0 ? tokens.slice(pvIndex + 1).join(' ') : previous.pv;
  return {
    depth,
    pv,
    evaluation,
    nodes: finiteInteger(tokenValue(tokens, 'nodes')) ?? previous.nodes,
    time: finiteInteger(tokenValue(tokens, 'time')) ?? previous.time,
  };
}

function positionCommand(fen: string, history?: PositionHistory): string {
  if (
    history &&
    typeof history.startFen === 'string' &&
    history.startFen.length > 0 &&
    !/[\r\n]/.test(history.startFen) &&
    Array.isArray(history.moves) &&
    history.moves.every((move) => /^[a-h][1-8][a-h][1-8][nbrq]?$/.test(move))
  ) {
    const moves = history.moves.join(' ');
    return `position fen ${history.startFen}${moves ? ` moves ${moves}` : ''}`;
  }
  return `position fen ${fen}`;
}

function validBestMove(move: string): boolean {
  return /^[a-h][1-8][a-h][1-8][nbrq]?$/.test(move);
}

/**
 * Owns a single persistent UCI worker and serializes every position/search pair.
 * A canceled search rejects for its caller immediately, sends `stop`, and keeps
 * the queue closed until that search's `bestmove` has been consumed.
 */
export class UciClient {
  private worker: UciWorkerLike | null = null;
  private ready = false;
  private readyPromise: Promise<void> | null = null;
  private uciWaiter: Deferred<void> | null = null;
  private readyWaiter: Deferred<void> | null = null;
  private active: SearchJob | null = null;
  private ponderJob: SearchJob | null = null;
  private completedPonder: CompletedPonder | null = null;
  private queue: SearchJob[] = [];
  private pumping = false;
  private resetRequested = false;

  private readonly initTimeoutMs: number;
  private readonly searchTimeoutSlackMs: number;
  private readonly stopTimeoutMs: number;

  constructor(
    private readonly workerFactory: UciWorkerFactory,
    options: UciClientOptions = {},
  ) {
    this.initTimeoutMs = options.initTimeoutMs ?? 25_000;
    this.searchTimeoutSlackMs = options.searchTimeoutSlackMs ?? 3_000;
    this.stopTimeoutMs = options.stopTimeoutMs ?? 2_000;
  }

  get busy(): boolean {
    return this.pumping || this.queue.length > 0 || this.active !== null;
  }

  async warm(): Promise<void> {
    await this.ensureReady();
  }

  analyze(
    fen: string,
    depth: number,
    timeLimit: number,
    signal?: AbortSignal,
    history?: PositionHistory,
  ): Promise<AnalysisResult> {
    if (signal?.aborted) return Promise.reject(abortError());
    if (!fen || /[\r\n]/.test(fen)) return Promise.reject(new Error('A valid position FEN is required'));

    const positionKey = positionCommand(fen, history);
    const requestedDepth = Math.max(1, Math.min(100, Math.floor(depth) || 1));
    const completedPonder = this.completedPonder;
    this.completedPonder = null;
    if (
      completedPonder?.positionKey === positionKey &&
      completedPonder.depth === requestedDepth &&
      completedPonder.result.success
    ) {
      return Promise.resolve(completedPonder.result);
    }
    const ponderJob = this.ponderJob;
    if (ponderJob) {
      if (ponderJob.positionKey === positionKey && ponderJob.depth === requestedDepth) {
        this.promotePonder(ponderJob, timeLimit, signal);
        return ponderJob.promise;
      }
      this.cancelPonder();
    }

    return this.enqueue(fen, depth, timeLimit, signal, history, false);
  }

  /** Start an un-timed UCI ponder search that can be promoted on a matching position. */
  ponder(fen: string, depth: number, signal?: AbortSignal, history?: PositionHistory): Promise<AnalysisResult> | null {
    if (signal?.aborted || !fen || /[\r\n]/.test(fen) || this.busy || this.ponderJob) return null;
    this.completedPonder = null;
    return this.enqueue(fen, depth, 1, signal, history, true);
  }

  /** Cancel speculative work, keeping it only when its predicted FEN still matches. */
  cancelPonder(preserveFen?: string): void {
    const job = this.ponderJob;
    if (!job) {
      if (preserveFen === undefined || this.completedPonder?.fen !== preserveFen) this.completedPonder = null;
      return;
    }
    if (preserveFen !== undefined && job.fen === preserveFen) return;
    this.ponderJob = null;
    this.completedPonder = null;
    this.abortJob(job);
  }

  private enqueue(
    fen: string,
    depth: number,
    timeLimit: number,
    signal: AbortSignal | undefined,
    history: PositionHistory | undefined,
    pondering: boolean,
  ): Promise<AnalysisResult> {
    let resolve!: (result: AnalysisResult) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<AnalysisResult>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const job: SearchJob = {
      fen,
      positionKey: positionCommand(fen, history),
      depth: Math.max(1, Math.min(100, Math.floor(depth) || 1)),
      timeLimit: Math.max(1, Math.min(120_000, Math.floor(timeLimit) || 1)),
      history,
      pondering,
      promise,
      signal,
      resolve,
      reject,
      settled: false,
      searchStarted: false,
      stopSent: false,
      info: { depth: 0, pv: '', evaluation: {} },
    };
    if (signal) this.attachAbort(job, signal);
    this.queue.push(job);
    if (pondering) this.ponderJob = job;
    void this.drain();
    return promise;
  }

  private attachAbort(job: SearchJob, signal: AbortSignal): void {
    job.signal = signal;
    job.onAbort = () => this.abortJob(job);
    signal.addEventListener('abort', job.onAbort, { once: true });
  }

  private promotePonder(job: SearchJob, timeLimit: number, signal?: AbortSignal): void {
    if (job.onAbort) job.signal?.removeEventListener('abort', job.onAbort);
    job.onAbort = undefined;
    job.signal = undefined;
    job.timeLimit = Math.max(1, Math.min(120_000, Math.floor(timeLimit) || 1));
    job.pondering = false;
    this.ponderJob = null;
    if (signal) this.attachAbort(job, signal);
    if (signal?.aborted) {
      this.abortJob(job);
      return;
    }
    if (this.active !== job || !job.searchStarted || job.resultValue) return;

    if (job.info.depth >= PONDER_REUSE_DEPTH) {
      this.stopActiveSearch(job);
      return;
    }
    try {
      this.send('ponderhit');
      job.searchTimer = safeTimeout(() => {
        job.timeoutReason = new Error(`Stockfish search exceeded ${job.timeLimit + this.searchTimeoutSlackMs} ms`);
        this.stopActiveSearch(job);
      }, job.timeLimit + this.searchTimeoutSlackMs);
    } catch (error) {
      job.result?.reject(error);
      this.destroyWorker();
    }
  }

  /** Reject current/queued callers while letting an active search drain safely. */
  cancelAll(reason: unknown = abortError()): void {
    this.completedPonder = null;
    const queued = this.queue.splice(0);
    for (const job of queued) {
      job.abortReason = reason;
      this.rejectJob(job, reason);
      this.cleanupJob(job);
    }
    if (this.active) {
      this.active.abortReason = reason;
      this.rejectJob(this.active, reason);
      if (this.active.searchStarted && !this.active.resultValue) this.stopActiveSearch(this.active);
    }
    this.ponderJob = null;
  }

  /** Request a new game on the same worker after any active search is drained. */
  reset(): void {
    this.cancelAll(new Error('Engine reset'));
    if (!this.worker) return;
    this.resetRequested = true;
    void this.drain();
  }

  private abortJob(job: SearchJob): void {
    const reason = abortError();
    job.abortReason = reason;
    this.rejectJob(job, reason);
    if (this.active === job) {
      if (job.searchStarted && !job.resultValue) this.stopActiveSearch(job);
      return;
    }
    const index = this.queue.indexOf(job);
    if (index >= 0) {
      this.queue.splice(index, 1);
      this.cleanupJob(job);
    }
  }

  private rejectJob(job: SearchJob, reason: unknown): void {
    if (job.settled) return;
    job.settled = true;
    job.reject(reason);
  }

  private resolveJob(job: SearchJob, result: AnalysisResult): void {
    if (job.settled) return;
    job.settled = true;
    job.resolve(result);
  }

  private cleanupJob(job: SearchJob): void {
    if (job.onAbort) job.signal?.removeEventListener('abort', job.onAbort);
    if (job.searchTimer) clearTimeout(job.searchTimer);
    if (job.stopTimer) clearTimeout(job.stopTimer);
  }

  private async drain(): Promise<void> {
    if (this.pumping) return;
    this.pumping = true;
    try {
      while (this.resetRequested || this.queue.length > 0) {
        if (this.resetRequested) {
          await this.performReset();
          continue;
        }

        const job = this.queue.shift();
        if (!job) continue;
        if (job.abortReason || job.signal?.aborted) {
          this.rejectJob(job, job.abortReason ?? abortError());
          this.cleanupJob(job);
          continue;
        }

        this.active = job;
        try {
          await this.ensureReady();
          if (job.abortReason || job.signal?.aborted) throw job.abortReason ?? abortError();
          const result = await this.runSearch(job);
          if (job.timeoutReason) throw job.timeoutReason;
          if (job.abortReason || job.signal?.aborted) throw job.abortReason ?? abortError();
          if (job.pondering && result.success) {
            this.completedPonder = {
              fen: job.fen,
              positionKey: job.positionKey,
              depth: job.depth,
              result,
            };
          }
          this.resolveJob(job, result);
        } catch (error) {
          this.rejectJob(job, error);
        } finally {
          this.cleanupJob(job);
          if (this.ponderJob === job) this.ponderJob = null;
          if (this.active === job) this.active = null;
        }
      }
    } catch (error) {
      const reason = asError(error);
      for (const job of this.queue.splice(0)) {
        this.rejectJob(job, reason);
        this.cleanupJob(job);
      }
      this.resetRequested = false;
    } finally {
      this.pumping = false;
      if (this.resetRequested || this.queue.length > 0) void this.drain();
    }
  }

  private async performReset(): Promise<void> {
    if (!this.worker) {
      this.resetRequested = false;
      return;
    }
    await this.ensureReady();
    const waiter = deferred<void>();
    this.readyWaiter = waiter;
    try {
      this.send('ucinewgame');
      this.send('isready');
      await withTimeout(waiter.promise, this.initTimeoutMs, 'Stockfish reset');
      this.resetRequested = false;
    } catch (error) {
      this.destroyWorker();
      throw error;
    } finally {
      if (this.readyWaiter === waiter) this.readyWaiter = null;
    }
  }

  private async ensureReady(): Promise<void> {
    if (this.ready) return;
    if (this.readyPromise) return this.readyPromise;

    const readyPromise = this.initialize();
    this.readyPromise = readyPromise;
    try {
      await readyPromise;
    } finally {
      if (this.readyPromise === readyPromise) this.readyPromise = null;
    }
  }

  private async initialize(): Promise<void> {
    if (!this.worker) {
      const setupController = new AbortController();
      let worker: UciWorkerLike;
      try {
        worker = await withTimeout(
          Promise.resolve().then(() => this.workerFactory(setupController.signal)),
          this.initTimeoutMs,
          'Stockfish worker setup',
        );
      } catch (error) {
        setupController.abort();
        throw error;
      }
      worker.onmessage = (event) => this.handleMessage(String(event.data));
      worker.onerror = (event) => this.handleError(event.error ?? new Error(event.message || 'Stockfish worker error'));
      this.worker = worker;
    }

    const uci = deferred<void>();
    this.uciWaiter = uci;
    this.send('uci');
    try {
      await withTimeout(uci.promise, this.initTimeoutMs, 'Stockfish UCI initialization');
    } catch (error) {
      this.destroyWorker();
      throw error;
    } finally {
      if (this.uciWaiter === uci) this.uciWaiter = null;
    }

    const ready = deferred<void>();
    this.readyWaiter = ready;
    this.send('isready');
    try {
      await withTimeout(ready.promise, this.initTimeoutMs, 'Stockfish readiness');
      this.ready = true;
    } catch (error) {
      this.destroyWorker();
      throw error;
    } finally {
      if (this.readyWaiter === ready) this.readyWaiter = null;
    }
  }

  private async runSearch(job: SearchJob): Promise<AnalysisResult> {
    const result = deferred<AnalysisResult>();
    job.result = result;
    const timeLimit = job.timeLimit;

    this.send(positionCommand(job.fen, job.history));
    job.searchStarted = true;
    if (job.pondering) {
      this.send(`go ponder depth ${job.depth}`);
      try {
        return await result.promise;
      } catch (error) {
        if (job.stopSent) this.destroyWorker();
        throw error;
      }
    }
    job.searchTimer = safeTimeout(() => {
      job.timeoutReason = new Error(`Stockfish search exceeded ${timeLimit + this.searchTimeoutSlackMs} ms`);
      this.stopActiveSearch(job);
    }, timeLimit + this.searchTimeoutSlackMs);
    this.send(`go depth ${job.depth} movetime ${timeLimit}`);

    try {
      return await result.promise;
    } catch (error) {
      if (job.stopSent) this.destroyWorker();
      throw error;
    }
  }

  private stopActiveSearch(job: SearchJob): void {
    if (job.stopSent || this.active !== job) return;
    job.stopSent = true;
    if (job.searchTimer) clearTimeout(job.searchTimer);
    try {
      this.send('stop');
    } catch (error) {
      job.result?.reject(error);
      this.destroyWorker();
      return;
    }
    job.stopTimer = safeTimeout(() => {
      if (this.active !== job) return;
      const reason = job.abortReason ?? job.timeoutReason ?? new Error('Stockfish did not return bestmove after stop');
      job.result?.reject(reason);
      this.destroyWorker();
    }, this.stopTimeoutMs);
  }

  private handleMessage(line: string): void {
    const message = line.trim();
    if (!message) return;
    if (message === 'uciok') {
      this.uciWaiter?.resolve();
      return;
    }
    if (message === 'readyok') {
      this.readyWaiter?.resolve();
      return;
    }

    const job = this.active;
    if (!job?.searchStarted) return;
    if (message.startsWith('info ')) {
      job.info = parseInfo(message, job.info);
      return;
    }
    if (message.startsWith('bestmove ')) {
      if (job.searchTimer) clearTimeout(job.searchTimer);
      if (job.stopTimer) clearTimeout(job.stopTimer);
      const bestmove = message.split(/\s+/)[1] ?? '';
      job.resultValue = {
        success: validBestMove(bestmove),
        depth: job.info.depth,
        bestmove: validBestMove(bestmove) ? bestmove : '',
        pv: job.info.pv,
        evaluation: job.info.evaluation,
        ...(job.info.nodes === undefined ? {} : { nodes: job.info.nodes }),
        ...(job.info.time === undefined ? {} : { time: job.info.time }),
      };
      job.result?.resolve(job.resultValue);
    }
  }

  private handleError(reason: unknown): void {
    const error = asError(reason);
    this.uciWaiter?.reject(error);
    this.readyWaiter?.reject(error);
    this.active?.result?.reject(error);
    this.destroyWorker();
  }

  private send(command: string): void {
    if (!this.worker) throw new Error('Stockfish worker is unavailable');
    this.worker.postMessage(command);
  }

  private destroyWorker(): void {
    this.completedPonder = null;
    const worker = this.worker;
    this.worker = null;
    this.ready = false;
    this.readyPromise = null;
    if (!worker) return;
    worker.onmessage = null;
    worker.onerror = null;
    try {
      worker.terminate();
    } catch {
      // A terminated worker cannot affect later searches.
    }
  }
}

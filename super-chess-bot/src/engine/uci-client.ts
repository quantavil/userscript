import { canonicalFen, type PositionHistory } from '../chess/position.js';
import type { Evaluation, MultiPvLine } from '../chess/types';

export type { MultiPvLine, PositionHistory };

interface AnalysisResultFields {
  depth: number;
  pv: string;
  evaluation: Evaluation;
  nodes?: number;
  time?: number;
  multiPv?: MultiPvLine[];
}

export type AnalysisResult =
  | (AnalysisResultFields & { success: true; bestmove: string })
  | (AnalysisResultFields & { success: false; bestmove: '' | '(none)' });

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
  /** Wall-clock ceiling for a depth-driven search, which carries no `movetime`. */
  depthOnlyTimeoutMs?: number;
  chess960?: boolean;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: unknown): void;
}

interface SearchInfo {
  depth: number;
  pv: string;
  evaluation: Evaluation;
  nodes?: number;
  time?: number;
}

export interface SearchOptions {
  searchMoves?: readonly string[];
  /** Absolute performance.now() deadline; stop gracefully and retain completed lines. */
  deadline?: number;
}

interface SearchJob {
  options?: SearchOptions;
  fen: string;
  positionKey: string;
  depth: number;
  /** Engine time budget in milliseconds; 0 means "search to `depth` with no `movetime`". */
  timeLimit: number;
  history?: PositionHistory;
  pondering: boolean;
  slackMs?: number;
  multiPv: number;
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
  multiPvLines: Map<number, MultiPvLine>;
  multiPvSnapshots: Map<number, Map<number, MultiPvLine>>;
  hasMultiPv: boolean;
  legalMoves?: number;
  onDepthComplete?: (depth: number, lines: MultiPvLine[]) => void;
  resultValue?: AnalysisResult;
  result?: Deferred<AnalysisResult>;
  searchTimer?: ReturnType<typeof setTimeout>;
  stopTimer?: ReturnType<typeof setTimeout>;
  onAbort?: () => void;
}

import {
  LIVE_MULTI_PV,
  PONDER_REUSE_DEPTH,
  UCI_DEPTH_ONLY_TIMEOUT_MS,
  UCI_INIT_TIMEOUT_MS,
  UCI_SEARCH_SLACK_MS,
  UCI_STOP_TIMEOUT_MS,
} from './config.js';

export { LIVE_MULTI_PV };

/**
 * `a-h` squares, ranks 1-8, and a promotion suffix. Chess960 king-takes-rook castling
 * (`e1h1`) matches the plain form, so no separate alternative is needed, and a rank 0, a file
 * beyond `h`, or a trailing `+` are all rejected.
 */
const UCI_MOVE_PATTERN = /^[a-h][1-8][a-h][1-8][nbrq]?$/;

export function isValidUciMove(move: string): boolean {
  return UCI_MOVE_PATTERN.test(move);
}

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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs} ms`)), timeoutMs);
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

function clampSearchDepth(depth: number): number {
  return Math.max(1, Math.min(100, Math.floor(depth) || 1));
}

/** 0 is a valid budget meaning "no `movetime`", so it cannot use the `|| default` idiom. */
function clampTimeLimit(timeLimit: number): number {
  const value = Math.floor(timeLimit);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(120_000, value);
}

function parseInfo(line: string, previous: SearchInfo, job?: SearchJob): SearchInfo {
  const tokens = line.trim().split(/\s+/);
  if (tokens[0] !== 'info' || tokens[1] === 'string') return previous;
  const multipvIndex = tokens.indexOf('multipv');
  const hasMultipvToken = multipvIndex >= 0;
  const multipv = hasMultipvToken ? (finiteInteger(tokens[multipvIndex + 1]) ?? 1) : 1;

  const existingLine = job?.multiPvLines.get(multipv);
  const pvIndex = tokens.indexOf('pv');
  const depth =
    finiteInteger(tokenValue(tokens, 'depth')) ?? (multipv === 1 ? previous.depth : (existingLine?.depth ?? 0));

  const cpIndex = tokens.indexOf('cp');
  const mateIndex = tokens.indexOf('mate');
  let evaluation: Evaluation =
    pvIndex >= 0 ? {} : multipv === 1 ? previous.evaluation : (existingLine?.evaluation ?? {});
  const isBound = tokens.includes('lowerbound') || tokens.includes('upperbound');
  if (!isBound) {
    if (cpIndex >= 0) {
      const cp = finiteInteger(tokens[cpIndex + 1]);
      if (cp !== undefined) evaluation = { cp };
    } else if (mateIndex >= 0) {
      const mate = finiteInteger(tokens[mateIndex + 1]);
      if (mate !== undefined) evaluation = { mate };
    }
  }

  // Bounds and unscored PVs are not exact evaluations of this move at this depth.
  if (pvIndex >= 0 && (isBound || (!Number.isFinite(evaluation.cp) && !Number.isFinite(evaluation.mate))))
    return previous;

  const pv =
    pvIndex >= 0 ? tokens.slice(pvIndex + 1).join(' ') : multipv === 1 ? previous.pv : (existingLine?.pv ?? '');

  const nodes = finiteInteger(tokenValue(tokens, 'nodes')) ?? previous.nodes;
  const time = finiteInteger(tokenValue(tokens, 'time')) ?? previous.time;

  if (job && (hasMultipvToken || pvIndex >= 0)) {
    if (hasMultipvToken) job.hasMultiPv = true;
    // A `currmove`-only line repeats the depth of the line it is exploring. It must not
    // overwrite the recorded depth, which belongs to the last line that carried a real PV.
    if (pvIndex >= 0 || existingLine === undefined) {
      const lineEntry: MultiPvLine = {
        multipv,
        depth,
        uci: pv ? (pv.split(/\s+/)[0] ?? '') : '',
        pv,
        evaluation,
        ...(nodes !== undefined ? { nodes } : {}),
        ...(time !== undefined ? { time } : {}),
      };
      job.multiPvLines.set(multipv, lineEntry);
      if (depth > 0 && pvIndex >= 0 && (Number.isFinite(evaluation.cp) || Number.isFinite(evaluation.mate))) {
        let snapshot = job.multiPvSnapshots.get(depth);
        if (!snapshot) {
          snapshot = new Map();
          job.multiPvSnapshots.set(depth, snapshot);
        }
        snapshot.set(multipv, lineEntry);
        const expectedCount = job.legalMoves ? Math.min(job.multiPv, job.legalMoves) : job.multiPv;
        if (job.onDepthComplete && snapshot.size >= expectedCount) {
          const lines = Array.from(snapshot.values()).sort((a, b) => a.multipv - b.multipv);
          job.onDepthComplete(depth, lines);
        }
      }
    }
  }

  if (multipv === 1) {
    return {
      depth,
      pv,
      evaluation,
      nodes,
      time,
    };
  }
  return previous;
}

function positionCommand(fen: string, history?: PositionHistory): string {
  if (
    history &&
    typeof history.startFen === 'string' &&
    history.startFen.length > 0 &&
    !/[\r\n]/.test(history.startFen) &&
    Array.isArray(history.moves) &&
    history.moves.every(isValidUciMove)
  ) {
    const moves = history.moves.join(' ');
    return `position fen ${history.startFen}${moves ? ` moves ${moves}` : ''}`;
  }
  return `position fen ${fen}`;
}

/**
 * Owns a single persistent UCI worker and serializes every position/search pair.
 * A canceled search rejects for its caller immediately, sends `stop`, and keeps
 * the queue closed until that search's `bestmove` has been consumed.
 */
export class UciClient {
  private worker: UciWorkerLike | null = null;
  private disposed = false;
  private setupController: AbortController | null = null;
  private setupWaiter: Deferred<UciWorkerLike> | null = null;
  private drainWaiter: Deferred<void> | null = null;
  private ready = false;
  private readyPromise: Promise<void> | null = null;
  private uciWaiter: Deferred<void> | null = null;
  private readyWaiter: Deferred<void> | null = null;
  private active: SearchJob | null = null;
  /** MultiPV value currently applied on the worker. */
  private appliedMultiPv = LIVE_MULTI_PV;
  private ponderJob: SearchJob | null = null;
  private queue: SearchJob[] = [];
  private pumping = false;
  private resetRequested = false;
  private readonly chess960: boolean;

  private readonly initTimeoutMs: number;
  private readonly searchTimeoutSlackMs: number;
  private readonly stopTimeoutMs: number;
  private readonly depthOnlyTimeoutMs: number;

  constructor(
    private readonly workerFactory: UciWorkerFactory,
    options: UciClientOptions = {},
  ) {
    this.initTimeoutMs = options.initTimeoutMs ?? UCI_INIT_TIMEOUT_MS;
    this.searchTimeoutSlackMs = options.searchTimeoutSlackMs ?? UCI_SEARCH_SLACK_MS;
    this.stopTimeoutMs = options.stopTimeoutMs ?? UCI_STOP_TIMEOUT_MS;
    this.depthOnlyTimeoutMs = options.depthOnlyTimeoutMs ?? UCI_DEPTH_ONLY_TIMEOUT_MS;
    this.chess960 = options.chess960 ?? false;
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
    slackMs?: number,
    multiPv: number = LIVE_MULTI_PV,
    legalMoves?: number,
    onDepthComplete?: (depth: number, lines: MultiPvLine[]) => void,
    options?: SearchOptions,
  ): Promise<AnalysisResult> {
    return this.analyzeReady(
      fen,
      depth,
      timeLimit,
      signal,
      history,
      slackMs,
      multiPv,
      legalMoves,
      onDepthComplete,
      options,
    );
  }

  private analyzeReady(
    fen: string,
    depth: number,
    timeLimit: number,
    signal?: AbortSignal,
    history?: PositionHistory,
    slackMs?: number,
    multiPv: number = LIVE_MULTI_PV,
    legalMoves?: number,
    onDepthComplete?: (depth: number, lines: MultiPvLine[]) => void,
    options?: SearchOptions,
  ): Promise<AnalysisResult> {
    if (this.disposed) return Promise.reject(new Error('Engine client is disposed'));
    if (signal?.aborted) return Promise.reject(abortError());
    if (!fen || /[\r\n]/.test(fen)) return Promise.reject(new Error('A valid position FEN is required'));

    if (
      options?.searchMoves &&
      (options.searchMoves.length === 0 || options.searchMoves.some((move) => !isValidUciMove(move)))
    ) {
      return Promise.reject(new Error('Valid search moves are required'));
    }
    if (
      options?.deadline !== undefined &&
      (!Number.isFinite(options.deadline) || options.deadline <= performance.now())
    ) {
      return Promise.reject(new Error('Search deadline expired'));
    }
    const positionKey = positionCommand(fen, history);
    const requestedDepth = clampSearchDepth(depth);
    const ponderJob = this.ponderJob;
    if (ponderJob) {
      if (
        ponderJob.positionKey === positionKey &&
        ponderJob.depth === requestedDepth &&
        ponderJob.multiPv === multiPv &&
        !options
      ) {
        this.promotePonder(ponderJob, timeLimit, signal);
        return ponderJob.promise;
      }
      this.cancelPonder();
    }

    return this.enqueue(
      fen,
      depth,
      timeLimit,
      signal,
      history,
      false,
      slackMs,
      multiPv,
      legalMoves,
      onDepthComplete,
      options,
    );
  }

  /** Start an un-timed UCI ponder search that can be promoted on a matching position. */
  ponder(fen: string, depth: number, signal?: AbortSignal, history?: PositionHistory): Promise<AnalysisResult> | null {
    if (this.disposed || signal?.aborted || !fen || /[\r\n]/.test(fen) || this.busy || this.ponderJob) return null;
    return this.enqueue(fen, depth, 1, signal, history, true, undefined, LIVE_MULTI_PV);
  }

  /** Cancel speculative work, keeping it only when its predicted FEN still matches. */
  cancelPonder(preserveFen?: string): void {
    const job = this.ponderJob;
    if (!job) return;
    if (preserveFen !== undefined) {
      const variant = this.chess960 ? 'chess960' : undefined;
      const jobFen = canonicalFen(job.fen, variant) ?? job.fen;
      const targetFen = canonicalFen(preserveFen, variant) ?? preserveFen;
      if (jobFen === targetFen) return;
    }
    this.ponderJob = null;
    this.abortJob(job);
  }

  private enqueue(
    fen: string,
    depth: number,
    timeLimit: number,
    signal: AbortSignal | undefined,
    history: PositionHistory | undefined,
    pondering: boolean,
    slackMs?: number,
    multiPv: number = LIVE_MULTI_PV,
    legalMoves?: number,
    onDepthComplete?: (depth: number, lines: MultiPvLine[]) => void,
    options?: SearchOptions,
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
      depth: clampSearchDepth(depth),
      timeLimit: clampTimeLimit(timeLimit),
      history,
      pondering,
      slackMs,
      multiPv,
      promise,
      signal,
      resolve,
      reject,
      settled: false,
      searchStarted: false,
      stopSent: false,
      info: { depth: 0, pv: '', evaluation: {} },
      multiPvLines: new Map(),
      multiPvSnapshots: new Map(),
      hasMultiPv: false,
      legalMoves,
      onDepthComplete,
      options,
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
    job.pondering = false;
    this.ponderJob = null;
    const limit = clampTimeLimit(timeLimit);
    // A depth-driven promotion has no `movetime`, so the wall-clock ceiling takes over.
    job.timeLimit = limit > 0 ? limit : this.depthOnlyTimeoutMs;
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
      // The ponder was started with no `movetime`, so the foreground budget is a hard ceiling
      // here: there is no engine-side limit to overrun and therefore no slack to allow.
      job.searchTimer = setTimeout(() => {
        this.stopActiveSearch(job);
      }, job.timeLimit);
    } catch (error) {
      job.result?.reject(error);
      this.destroyWorker();
    }
  }

  /** Reject current/queued callers while letting an active search drain safely. */
  cancelAll(reason: unknown = abortError()): void {
    this.cancelSearches(reason);
  }

  private cancelSearches(reason: unknown): void {
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

  /** Permanently release ownership, including setup resources that arrive late. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const reason = new Error('Engine client is disposed');
    this.resetRequested = false;
    this.ponderJob = null;
    for (const job of this.queue.splice(0)) {
      this.rejectJob(job, reason);
      this.cleanupJob(job);
    }
    if (this.active) {
      this.active.abortReason = reason;
      this.rejectJob(this.active, reason);
      this.active.result?.reject(reason);
      this.cleanupJob(this.active);
    }
    this.setupController?.abort();
    this.setupWaiter?.reject(reason);
    this.uciWaiter?.reject(reason);
    this.readyWaiter?.reject(reason);
    this.destroyWorker();
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
    const drained = deferred<void>();
    this.drainWaiter = drained;
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

        let completed = false;
        this.active = job;
        try {
          await this.ensureReady();
          if (job.abortReason || job.signal?.aborted) throw job.abortReason ?? abortError();
          const result = await this.runSearch(job);
          if (job.timeoutReason) throw job.timeoutReason;
          if (job.abortReason || job.signal?.aborted) throw job.abortReason ?? abortError();
          this.resolveJob(job, result);
          completed = true;
        } catch (error) {
          this.rejectJob(job, error);
        } finally {
          this.cleanupJob(job);
          if (this.ponderJob === job && !completed) this.ponderJob = null;
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
      drained.resolve();
      if (this.drainWaiter === drained) this.drainWaiter = null;
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
    if (this.disposed) throw new Error('Engine client is disposed');
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
      const setup = deferred<UciWorkerLike>();
      this.setupController = setupController;
      this.setupWaiter = setup;
      // Observe the factory independently: a timeout or disposal must also clean
      // resources from factories that ignore their AbortSignal.
      void Promise.resolve()
        .then(() => {
          if (setupController.signal.aborted) throw new Error('Engine client is disposed');
          return this.workerFactory(setupController.signal);
        })
        .then((worker) => {
          if (setupController.signal.aborted || this.disposed) {
            worker.terminate();
            return;
          }
          setup.resolve(worker);
        })
        .catch((error: unknown) => setup.reject(error));
      let worker: UciWorkerLike;
      try {
        worker = await withTimeout(setup.promise, this.initTimeoutMs, 'Stockfish worker setup');
        if (this.disposed || setupController.signal.aborted) {
          worker.terminate();
          throw new Error('Engine client is disposed');
        }
      } catch (error) {
        setupController.abort();
        throw error;
      } finally {
        if (this.setupController === setupController) this.setupController = null;
        if (this.setupWaiter === setup) this.setupWaiter = null;
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
      if (this.disposed) throw new Error('Engine client is disposed');
    } catch (error) {
      this.destroyWorker();
      throw error;
    } finally {
      if (this.uciWaiter === uci) this.uciWaiter = null;
    }

    const ready = deferred<void>();
    this.readyWaiter = ready;
    this.send(`setoption name UCI_Chess960 value ${this.chess960}`);
    this.appliedMultiPv = LIVE_MULTI_PV;
    this.send(`setoption name MultiPV value ${this.appliedMultiPv}`);
    this.send('isready');
    try {
      await withTimeout(ready.promise, this.initTimeoutMs, 'Stockfish readiness');
      if (this.disposed) throw new Error('Engine client is disposed');
      this.ready = true;
    } catch (error) {
      this.destroyWorker();
      throw error;
    } finally {
      if (this.readyWaiter === ready) this.readyWaiter = null;
    }
  }

  private async runSearch(job: SearchJob): Promise<AnalysisResult> {
    if (job.options?.deadline !== undefined && job.options.deadline <= performance.now()) {
      throw new Error('Search deadline expired');
    }
    const result = deferred<AnalysisResult>();
    job.result = result;
    // A zero budget means "search to `depth`": the report pass wants a stable depth rather than a
    // stable duration, so it carries no `movetime` and is bounded only by the wall-clock ceiling.
    const depthOnly = job.timeLimit <= 0;
    const budget = depthOnly ? this.depthOnlyTimeoutMs : job.timeLimit;

    // UCI processes commands in order, so this lands before `go` without an extra readiness round trip.
    if (job.multiPv !== this.appliedMultiPv) {
      this.send(`setoption name MultiPV value ${job.multiPv}`);
      this.appliedMultiPv = job.multiPv;
    }

    this.send(job.positionKey);
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
    const slack = job.slackMs ?? this.searchTimeoutSlackMs;
    const untilDeadline =
      job.options?.deadline === undefined ? Infinity : Math.max(0, job.options.deadline - performance.now());
    const gracefulDeadline = untilDeadline <= budget + slack;
    job.searchTimer = setTimeout(
      () => {
        if (!gracefulDeadline) job.timeoutReason = new Error(`Stockfish search exceeded ${budget + slack} ms`);
        this.stopActiveSearch(job);
      },
      Math.min(budget + slack, untilDeadline),
    );
    const restriction = job.options?.searchMoves ? ` searchmoves ${job.options.searchMoves.join(' ')}` : '';
    this.send((depthOnly ? `go depth ${job.depth}` : `go depth ${job.depth} movetime ${job.timeLimit}`) + restriction);

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
    job.stopTimer = setTimeout(() => {
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
      job.info = parseInfo(message, job.info, job);
      return;
    }
    if (message.startsWith('bestmove ')) {
      if (job.searchTimer) clearTimeout(job.searchTimer);
      if (job.stopTimer) clearTimeout(job.stopTimer);
      const bestmove = message.split(/\s+/)[1] ?? '';
      const terminal = bestmove === '(none)';
      let multiPv: MultiPvLine[] | undefined;
      if (job.hasMultiPv) {
        const expectedCount = job.legalMoves ? Math.min(job.multiPv, job.legalMoves) : job.multiPv;
        const depths = Array.from(job.multiPvSnapshots.keys()).sort((a, b) => b - a);
        for (const d of depths) {
          const snapshot = job.multiPvSnapshots.get(d);
          if (snapshot && snapshot.size >= expectedCount) {
            multiPv = Array.from(snapshot.values()).sort((a, b) => a.multipv - b.multipv);
            break;
          }
        }
        if (!multiPv && job.multiPvLines.size > 0) {
          multiPv = Array.from(job.multiPvLines.values()).sort((a, b) => a.multipv - b.multipv);
        }
      }
      const common = {
        depth: job.info.depth,
        pv: job.info.pv.split(/\s+/)[0] === bestmove ? job.info.pv : isValidUciMove(bestmove) ? bestmove : '',
        // Terminal roots have no PV move to match, but their exact mate/draw score is still valid.
        evaluation: terminal || job.info.pv.split(/\s+/)[0] === bestmove ? job.info.evaluation : {},
        ...(job.info.nodes === undefined ? {} : { nodes: job.info.nodes }),
        ...(job.info.time === undefined ? {} : { time: job.info.time }),
        ...(multiPv ? { multiPv } : {}),
      };
      job.resultValue = isValidUciMove(bestmove)
        ? { ...common, success: true, bestmove }
        : { ...common, success: false, bestmove: terminal ? '(none)' : '' };
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

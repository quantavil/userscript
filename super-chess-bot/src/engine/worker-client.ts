import { type AnalysisResult, type PositionHistory, UciClient, type UciWorkerLike } from './uci-client.js';

class ResourceWorker implements UciWorkerLike {
  constructor(
    private readonly worker: Worker,
    private readonly objectUrls: string[],
  ) {}

  get onmessage(): ((event: MessageEvent<string>) => void) | null {
    return this.worker.onmessage as ((event: MessageEvent<string>) => void) | null;
  }

  set onmessage(handler: ((event: MessageEvent<string>) => void) | null) {
    this.worker.onmessage = handler as ((this: Worker, ev: MessageEvent) => unknown) | null;
  }

  get onerror(): ((event: ErrorEvent) => void) | null {
    return this.worker.onerror;
  }

  set onerror(handler: ((event: ErrorEvent) => void) | null) {
    this.worker.onerror = handler as ((this: AbstractWorker, ev: ErrorEvent) => unknown) | null;
  }

  postMessage(command: string): void {
    this.worker.postMessage(command);
  }

  terminate(): void {
    this.worker.terminate();
    for (const objectUrl of this.objectUrls) URL.revokeObjectURL(objectUrl);
  }
}

async function createStockfishWorker(signal: AbortSignal): Promise<UciWorkerLike> {
  if (typeof Worker === 'undefined') {
    throw new Error('Stockfish requires browser Web Worker support');
  }
  if (typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('Stockfish worker resources are unavailable in this browser');
  }

  if (typeof GM_getResourceText !== 'function' || typeof GM_getResourceURL !== 'function') {
    throw new Error('Stockfish resources are missing; check userscript @resource permissions');
  }

  const source = GM_getResourceText('stockfish.js');
  const wasmUrl = GM_getResourceURL('stockfish.wasm');
  if (typeof source !== 'string' || source.length === 0 || typeof wasmUrl !== 'string' || wasmUrl.length === 0) {
    throw new Error('Stockfish JavaScript or WASM resource could not be loaded');
  }

  let wasmObjectUrl: string | undefined;
  let workerObjectUrl: string | undefined;
  try {
    const response = await fetch(wasmUrl, { signal });
    if (!response.ok) throw new Error(`WASM resource request failed with status ${response.status}`);
    const wasm = await response.arrayBuffer();
    if (signal.aborted) throw new DOMException('Worker setup aborted', 'AbortError');

    wasmObjectUrl = URL.createObjectURL(new Blob([wasm], { type: 'application/wasm' }));
    workerObjectUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    const workerUrl = `${workerObjectUrl}#${encodeURIComponent(wasmObjectUrl)}`;
    return new ResourceWorker(new Worker(workerUrl), [workerObjectUrl, wasmObjectUrl]);
  } catch (error) {
    if (workerObjectUrl) URL.revokeObjectURL(workerObjectUrl);
    if (wasmObjectUrl) URL.revokeObjectURL(wasmObjectUrl);
    const detail = error instanceof Error ? `: ${error.message}` : '';
    throw new Error(`Stockfish worker could not start${detail}`);
  }
}

class EngineWorkerClient {
  private readonly client = new UciClient(createStockfishWorker);
  private ponderSearch: { fen: string; controller: AbortController } | null = null;

  warm(): Promise<void> {
    return this.client.warm();
  }

  analyze(
    fen: string,
    depth: number,
    timeLimit: number,
    signal?: AbortSignal,
    history?: PositionHistory,
  ): Promise<AnalysisResult> {
    if (signal?.aborted) return this.client.analyze(fen, depth, timeLimit, signal, history);
    const result = this.client.analyze(fen, depth, timeLimit, signal, history);
    // UciClient promotes an exact match or cancels a miss before queuing search.
    this.ponderSearch = null;
    return result;
  }

  ponder(fen: string, depth: number, history?: PositionHistory): boolean {
    if (!fen || this.client.busy || this.ponderSearch) return false;
    const controller = new AbortController();
    const promise = this.client.ponder(fen, depth, controller.signal, history);
    if (!promise) return false;
    const search = { fen, controller };
    this.ponderSearch = search;
    void promise
      .catch(() => {
        // A canceled or failed speculative search is handled by the next turn.
      })
      .finally(() => {
        if (this.ponderSearch === search) this.ponderSearch = null;
      });
    return true;
  }

  cancelPonder(preserveFen?: string): void {
    const search = this.ponderSearch;
    if (search && preserveFen !== undefined && search.fen === preserveFen) return;
    this.ponderSearch = null;
    search?.controller.abort();
    this.client.cancelPonder(preserveFen);
  }

  reset(): void {
    this.cancelPonder();
    this.client.reset();
  }
}

export const engineWorker = new EngineWorkerClient();

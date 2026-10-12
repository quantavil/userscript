import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getAnalysis,
  hasLegalMoves,
  parseBestLine,
  predictFen,
  resetEngine,
  warmEngine,
} from '../src/engine/analysis.js';
import { formatMove, uciToSan } from '../src/engine/san.js';
import { UciClient, type UciWorkerLike } from '../src/engine/uci-client.js';
import { replaySanLine } from '../src/history.js';

class FakeUciWorker implements UciWorkerLike {
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  commands: string[] = [];
  terminated = false;

  postMessage(command: string): void {
    this.commands.push(command);
    if (command === 'uci') queueMicrotask(() => this.emit('uciok'));
    if (command === 'isready') queueMicrotask(() => this.emit('readyok'));
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(line: string): void {
    this.onmessage?.({ data: line } as MessageEvent<string>);
  }
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error('Condition was not reached');
}

describe('UCI Stockfish client', () => {
  it('initializes once and parses the final info line and best move', async () => {
    const worker = new FakeUciWorker();
    let constructions = 0;
    const client = new UciClient(() => {
      constructions++;
      return worker;
    });

    const resultPromise = client.analyze(START_FEN, 14, 250);
    await waitUntil(() => worker.commands.some((command) => command.startsWith('go ')));
    worker.emit('info depth 13 score cp 27 nodes 456 time 71 pv e2e4 e7e5 g1f3');
    worker.emit('info string debug depth 99 score cp 999 pv a1a2 nonsense');
    worker.emit('info depth 14 score mate 3 nodes 512 time 89 pv e2e4 e7e5 g1f3');
    worker.emit('info string ignored pv a1a2');
    worker.emit('bestmove e2e4 ponder e7e5');

    const result = await resultPromise;
    expect(constructions).toBe(1);
    expect(result).toEqual({
      success: true,
      depth: 14,
      bestmove: 'e2e4',
      pv: 'e2e4 e7e5 g1f3',
      evaluation: { mate: 3 },
      nodes: 512,
      time: 89,
    });
    await client.warm();
    expect(constructions).toBe(1);
  });

  it('parses MultiPV candidate lines and preserves evaluations against non-PV info lines', async () => {
    const worker = new FakeUciWorker();
    const client = new UciClient(() => worker);

    const resultPromise = client.analyze(START_FEN, 12, 250);
    await waitUntil(() => worker.commands.some((command) => command.startsWith('go ')));
    expect(worker.commands).toContain('setoption name MultiPV value 3');

    worker.emit('info depth 10 multipv 1 score cp 55 pv e2e4 e7e5');
    worker.emit('info depth 10 multipv 2 score cp 30 pv d2d4 d7d5');
    worker.emit('info depth 10 multipv 3 score cp -10 pv c2c4 c7c5');
    // Non-PV currmove line should NOT corrupt line 2 or wipe its evaluation
    worker.emit('info depth 11 multipv 2 currmove b1c3 currmovenumber 1');
    worker.emit('bestmove e2e4');

    const result = await resultPromise;
    expect(result.success).toBe(true);
    expect(result.bestmove).toBe('e2e4');
    expect(result.multiPv).toHaveLength(3);
    expect(result.multiPv?.[0]).toMatchObject({ multipv: 1, uci: 'e2e4', evaluation: { cp: 55 } });
    expect(result.multiPv?.[1]).toMatchObject({ multipv: 2, uci: 'd2d4', evaluation: { cp: 30 } });
    expect(result.multiPv?.[2]).toMatchObject({ multipv: 3, uci: 'c2c4', evaluation: { cp: -10 } });
  });

  it('ignores lowerbound and upperbound score lines so bound leaks do not overwrite exact evaluation', async () => {
    const worker = new FakeUciWorker();
    const client = new UciClient(() => worker);

    const resultPromise = client.analyze(START_FEN, 12, 250);
    await waitUntil(() => worker.commands.some((command) => command.startsWith('go ')));

    worker.emit('info depth 10 multipv 1 score cp 55 pv e2e4 e7e5');
    worker.emit('info depth 11 multipv 1 score cp 80 lowerbound pv e2e4 e7e5');
    worker.emit('info depth 11 multipv 1 score cp 20 upperbound pv e2e4 e7e5');
    worker.emit('bestmove e2e4');

    const result = await resultPromise;
    expect(result.evaluation).toEqual({ cp: 55 });
    expect(result.multiPv?.[0]?.evaluation).toEqual({ cp: 55 });
  });

  it('sends stop on cancellation, drains bestmove, then reuses the worker for the next search', async () => {
    const worker = new FakeUciWorker();
    let constructions = 0;
    const client = new UciClient(
      () => {
        constructions++;
        return worker;
      },
      { stopTimeoutMs: 500 },
    );

    const controller = new AbortController();
    const canceled = client.analyze(START_FEN, 20, 5_000, controller.signal);
    await waitUntil(() => worker.commands.some((command) => command.startsWith('go ')));
    controller.abort();
    await waitUntil(() => worker.commands.includes('stop'));

    const next = client.analyze(START_FEN, 8, 500);
    expect(worker.commands.filter((command) => command.startsWith('go '))).toHaveLength(1);

    worker.emit('bestmove e2e4');
    await expect(canceled).rejects.toMatchObject({ name: 'AbortError' });
    await waitUntil(() => worker.commands.filter((command) => command.startsWith('go ')).length === 2);
    worker.emit('info depth 8 score cp 12 nodes 30 time 9 pv e2e4');
    worker.emit('bestmove e2e4');

    await expect(next).resolves.toMatchObject({ bestmove: 'e2e4', depth: 8 });
    expect(constructions).toBe(1);
    expect(worker.terminated).toBe(false);
  });

  it('recreates the worker if a canceled search never drains its bestmove', async () => {
    const workers: FakeUciWorker[] = [];
    const client = new UciClient(
      () => {
        const worker = new FakeUciWorker();
        workers.push(worker);
        return worker;
      },
      { stopTimeoutMs: 10 },
    );

    const controller = new AbortController();
    const canceled = client.analyze(START_FEN, 20, 5_000, controller.signal);
    await waitUntil(() => workers[0]?.commands.some((command) => command.startsWith('go ')));
    controller.abort();
    await waitUntil(() => workers[0]?.commands.includes('stop'));
    const next = client.analyze(START_FEN, 8, 500);

    await expect(canceled).rejects.toMatchObject({ name: 'AbortError' });
    await waitUntil(() => workers.length === 2 && workers[1].commands.some((command) => command.startsWith('go ')));
    expect(workers[0].terminated).toBe(true);
    workers[1].emit('info depth 8 score cp 12 nodes 30 time 9 pv e2e4');
    workers[1].emit('bestmove e2e4');
    await expect(next).resolves.toMatchObject({ bestmove: 'e2e4', depth: 8 });
  });

  it('replays supplied game history in the UCI position command', async () => {
    const worker = new FakeUciWorker();
    const client = new UciClient(() => worker);
    const history = {
      startFen: START_FEN,
      moves: ['e2e4', 'e7e5', 'g1f3'],
    };

    const resultPromise = client.analyze(START_FEN, 6, 300, undefined, history);
    await waitUntil(() => worker.commands.some((command) => command.startsWith('go ')));
    expect(worker.commands).toContain(`position fen ${START_FEN} moves e2e4 e7e5 g1f3`);
    worker.emit('info depth 6 score cp 10 nodes 40 time 10 pv b8c6');
    worker.emit('bestmove b8c6');
    await expect(resultPromise).resolves.toMatchObject({ bestmove: 'b8c6' });
  });

  it('serializes replayed standard castling history with king destination squares', async () => {
    const startFen = 'r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1';
    const line = replaySanLine(startFen, ['O-O', 'O-O-O']);
    expect(line).toBeDefined();

    const worker = new FakeUciWorker();
    const client = new UciClient(() => worker);
    const resultPromise = client.analyze(line?.fens.at(-1) ?? startFen, 8, 100, undefined, line?.history);
    await waitUntil(() => worker.commands.some((command) => command.startsWith('go ')));

    expect(worker.commands).toContain(`position fen ${startFen} moves e8g8 e1c1`);
    worker.emit('info depth 8 score cp 10 nodes 40 time 10 pv a1a2');
    worker.emit('bestmove a1a2');
    await expect(resultPromise).resolves.toMatchObject({ bestmove: 'a1a2' });
  });

  it('promotes a matching ponder search and returns its already searched move', async () => {
    const worker = new FakeUciWorker();
    const client = new UciClient(() => worker);
    const background = new AbortController();
    const history = { startFen: START_FEN, moves: ['e2e4', 'e7e5'] };

    const pondering = client.ponder(START_FEN, 30, background.signal, history);
    await waitUntil(() => worker.commands.includes('go ponder depth 30'));
    worker.emit('info depth 14 score cp 23 nodes 900 time 50 pv e2e4 e7e5');

    const foreground = client.analyze(START_FEN, 30, 100, undefined, history);
    expect(worker.commands).toContain('stop');
    expect(worker.commands.filter((command) => command.startsWith('go '))).toHaveLength(1);

    worker.emit('bestmove e2e4');
    await expect(foreground).resolves.toMatchObject({ bestmove: 'e2e4', depth: 14 });
    await expect(pondering).resolves.toMatchObject({ bestmove: 'e2e4', depth: 14 });
  });

  it('reuses a matching ponder result that finished before our turn', async () => {
    const worker = new FakeUciWorker();
    const client = new UciClient(() => worker);
    const pondering = client.ponder(START_FEN, 14);
    await waitUntil(() => worker.commands.includes('go ponder depth 14'));
    worker.emit('info depth 14 score cp 18 nodes 500 time 40 pv e2e4 e7e5');
    worker.emit('bestmove e2e4');
    await expect(pondering).resolves.toMatchObject({ bestmove: 'e2e4', depth: 14 });

    let goCount = 0;
    const foreground = client.analyze(START_FEN, 14, 100).then((result) => {
      goCount = worker.commands.filter((command) => command.startsWith('go ')).length;
      return result;
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (worker.commands.filter((command) => command.startsWith('go ')).length > 1) {
      worker.emit('info depth 14 score cp 18 nodes 500 time 40 pv e2e4 e7e5');
      worker.emit('bestmove e2e4');
    }

    await expect(foreground).resolves.toMatchObject({ bestmove: 'e2e4', depth: 14 });
    expect(goCount).toBe(1);
  });

  it('continues a shallow matching ponder within the foreground budget', async () => {
    const worker = new FakeUciWorker();
    const client = new UciClient(() => worker);
    const background = new AbortController();

    const pondering = client.ponder(START_FEN, 30, background.signal);
    await waitUntil(() => worker.commands.includes('go ponder depth 30'));
    worker.emit('info depth 4 score cp 8 nodes 80 time 20 pv e2e4');

    const foreground = client.analyze(START_FEN, 30, 500);
    expect(worker.commands).toContain('ponderhit');
    expect(worker.commands.filter((command) => command.startsWith('go '))).toHaveLength(1);

    worker.emit('info depth 8 score cp 12 nodes 200 time 55 pv d2d4');
    worker.emit('bestmove d2d4');
    await expect(foreground).resolves.toMatchObject({ bestmove: 'd2d4', depth: 8 });
    await expect(pondering).resolves.toMatchObject({ bestmove: 'd2d4', depth: 8 });
  });

  it('stops a promoted shallow ponder at the foreground budget and accepts its drained move', async () => {
    const worker = new FakeUciWorker();
    const client = new UciClient(() => worker, { searchTimeoutSlackMs: 5_000, stopTimeoutMs: 500 });
    const background = new AbortController();
    const pondering = client.ponder(START_FEN, 30, background.signal);
    await waitUntil(() => worker.commands.includes('go ponder depth 30'));
    worker.emit('info depth 4 score cp 8 nodes 80 time 20 pv e2e4');

    vi.useFakeTimers();
    const foreground = client.analyze(START_FEN, 30, 100);
    await vi.advanceTimersByTimeAsync(100);

    expect(worker.commands).toContain('stop');
    worker.emit('info depth 8 score cp 12 nodes 200 time 55 pv d2d4');
    worker.emit('bestmove d2d4');
    await expect(foreground).resolves.toMatchObject({ bestmove: 'd2d4', depth: 8 });
    await expect(pondering).resolves.toMatchObject({ bestmove: 'd2d4', depth: 8 });
  });

  it('preserves UCI bestmove none as a terminal marker', async () => {
    const worker = new FakeUciWorker();
    const client = new UciClient(() => worker);
    const resultPromise = client.analyze(START_FEN, 8, 500);
    await waitUntil(() => worker.commands.some((command) => command.startsWith('go ')));
    worker.emit('bestmove (none)');

    await expect(resultPromise).resolves.toMatchObject({ success: false, bestmove: '(none)' });
  });

  it('cancels a promoted ponder when the foreground owner aborts', async () => {
    const worker = new FakeUciWorker();
    const client = new UciClient(() => worker, { stopTimeoutMs: 500 });
    const background = new AbortController();
    const foregroundOwner = new AbortController();

    const pondering = client.ponder(START_FEN, 30, background.signal);
    await waitUntil(() => worker.commands.includes('go ponder depth 30'));
    worker.emit('info depth 4 score cp 8 nodes 80 time 20 pv e2e4');
    const foreground = client.analyze(START_FEN, 30, 500, foregroundOwner.signal);
    expect(worker.commands).toContain('ponderhit');

    foregroundOwner.abort();
    await expect(foreground).rejects.toMatchObject({ name: 'AbortError' });
    await expect(pondering).rejects.toMatchObject({ name: 'AbortError' });
    await waitUntil(() => worker.commands.filter((command) => command === 'stop').length === 1);
    worker.emit('bestmove e2e4');
    expect(worker.commands.filter((command) => command === 'stop')).toHaveLength(1);
  });

  it('does not reuse a ponder with different repetition history', async () => {
    const worker = new FakeUciWorker();
    const client = new UciClient(() => worker, { stopTimeoutMs: 500 });
    const background = new AbortController();
    const ponderHistory = { startFen: START_FEN, moves: ['e2e4'] };
    const actualHistory = { startFen: START_FEN, moves: ['e2e4', 'e7e5'] };

    const pondering = client.ponder(START_FEN, 30, background.signal, ponderHistory);
    await waitUntil(() => worker.commands.includes('go ponder depth 30'));
    const foreground = client.analyze(START_FEN, 30, 100, undefined, actualHistory);
    expect(worker.commands).toContain('stop');
    worker.emit('bestmove e2e4');
    await expect(pondering).rejects.toMatchObject({ name: 'AbortError' });
    await waitUntil(() => worker.commands.filter((command) => command.startsWith('go ')).length === 2);
    expect(worker.commands).toContain(`position fen ${START_FEN} moves e2e4 e7e5`);
    worker.emit('info depth 10 score cp 18 nodes 240 time 40 pv e2e4');
    worker.emit('bestmove e2e4');
    await expect(foreground).resolves.toMatchObject({ bestmove: 'e2e4', depth: 10 });
  });

  it('stops a mismatched ponder, drains it, then searches the actual position', async () => {
    const worker = new FakeUciWorker();
    const client = new UciClient(() => worker, { stopTimeoutMs: 500 });
    const background = new AbortController();

    const pondering = client.ponder(START_FEN, 30, background.signal);
    await waitUntil(() => worker.commands.includes('go ponder depth 30'));
    const actualFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const foreground = client.analyze(actualFen, 30, 100);
    await waitUntil(() => worker.commands.filter((command) => command.startsWith('go ')).length === 1);
    expect(worker.commands).toContain('stop');

    worker.emit('bestmove e2e4');
    await expect(pondering).rejects.toMatchObject({ name: 'AbortError' });
    await waitUntil(() => worker.commands.filter((command) => command.startsWith('go ')).length === 2);
    expect(worker.commands).toContain(`position fen ${actualFen}`);
    worker.emit('info depth 10 score cp 18 nodes 240 time 40 pv e7e5');
    worker.emit('bestmove e7e5');
    await expect(foreground).resolves.toMatchObject({ bestmove: 'e7e5', depth: 10 });
  });
});

class FakeStockfishWorker {
  static instances: FakeStockfishWorker[] = [];
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  commands: string[] = [];
  terminated = false;

  constructor(readonly url: string) {
    FakeStockfishWorker.instances.push(this);
  }

  postMessage(command: string): void {
    this.commands.push(command);
    if (command === 'uci') queueMicrotask(() => this.emit('uciok'));
    if (command === 'isready') queueMicrotask(() => this.emit('readyok'));
    if (command.startsWith('go ')) {
      queueMicrotask(() => {
        this.emit('info depth 10 score cp 32 nodes 100 time 20 pv e2e4 e7e5');
        this.emit('bestmove e2e4 ponder e7e5');
      });
    }
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(line: string): void {
    this.onmessage?.({ data: line } as MessageEvent<string>);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Stockfish analysis API', () => {
  it('checks terminal positions and malformed FENs with chessops', () => {
    expect(hasLegalMoves(START_FEN)).toBe(true);
    expect(hasLegalMoves('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1')).toBe(false);
    expect(hasLegalMoves('not a fen')).toBeNull();
  });

  it('fails clearly when worker support is unavailable instead of searching on the page thread', async () => {
    vi.stubGlobal('Worker', undefined);
    await expect(warmEngine()).rejects.toThrow('Web Worker');
  });

  it('warms the resource-backed worker and searches with supplied history', async () => {
    FakeStockfishWorker.instances = [];
    vi.stubGlobal('Worker', FakeStockfishWorker);
    vi.stubGlobal('GM_getResourceText', (name: string) => (name === 'stockfish.js' ? 'fake engine source' : ''));
    vi.stubGlobal('GM_getResourceURL', (name: string) =>
      name === 'stockfish.wasm' ? 'data:application/wasm;base64,AA==' : '',
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, arrayBuffer: async () => new Uint8Array([0, 97, 115, 109]).buffer })),
    );

    await warmEngine();
    const history = { startFen: START_FEN, moves: ['e2e4', 'e7e5', 'g1f3'] };
    const result = await getAnalysis(START_FEN, 10, 250, undefined, history);

    expect(result).toMatchObject({
      success: true,
      depth: 10,
      bestmove: 'e2e4',
      evaluation: { cp: 32 },
    });
    expect(FakeStockfishWorker.instances).toHaveLength(1);
    expect(FakeStockfishWorker.instances[0].url).not.toContain('data:application/wasm');
    expect(fetch).toHaveBeenCalledWith(
      'data:application/wasm;base64,AA==',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(FakeStockfishWorker.instances[0].commands).toContain(`position fen ${START_FEN} moves e2e4 e7e5 g1f3`);
    expect(parseBestLine(result)).toEqual({ uci: 'e2e4', pv: 'e2e4 e7e5', score: { cp: 32 } });
    expect(predictFen(START_FEN, 'e2e4')).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');

    resetEngine();
    await waitUntil(() => FakeStockfishWorker.instances[0].commands.includes('ucinewgame'));
  });
});

describe('chessops move notation', () => {
  it('formats legal castling and promotion moves and returns UCI for invalid input', () => {
    const castleFen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    const promotionFen = '7k/1P6/8/8/8/8/8/7K w - - 0 1';

    expect(uciToSan(castleFen, 'e1g1')).toBe('O-O');
    expect(uciToSan(promotionFen, 'b7b8q')).toBe('b8=Q+');
    expect(uciToSan(START_FEN, 'e2e5')).toBe('e2e5');
    expect(uciToSan('not a FEN', 'e2e4')).toBe('e2e4');
    expect(formatMove(START_FEN, 'e2e4')).toBe('1. e4');
  });
});

import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

const NativeURL = URL;

class BrowserWorker {
  static workers: BrowserWorker[] = [];
  static peak = 0;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;
  commands: string[] = [];
  constructor() {
    BrowserWorker.workers.push(this);
    BrowserWorker.peak = Math.max(BrowserWorker.peak, BrowserWorker.workers.filter((w) => !w.terminated).length);
  }
  postMessage(command: string) {
    this.commands.push(command);
    if (command === 'uci') queueMicrotask(() => this.onmessage?.({ data: 'uciok' } as MessageEvent<string>));
    if (command === 'isready') queueMicrotask(() => this.onmessage?.({ data: 'readyok' } as MessageEvent<string>));
    if (command.startsWith('go '))
      queueMicrotask(() => this.onmessage?.({ data: 'bestmove e2e4' } as MessageEvent<string>));
  }
  terminate() {
    this.terminated = true;
  }
}

async function setup() {
  vi.resetModules();
  BrowserWorker.workers = [];
  BrowserWorker.peak = 0;
  vi.stubGlobal('Worker', BrowserWorker);
  class ResourceURL extends NativeURL {
    static override createObjectURL = () => 'blob:resource';
    static override revokeObjectURL = vi.fn();
  }
  vi.stubGlobal('URL', ResourceURL);
  vi.stubGlobal('GM_getResourceText', () => '/* source */');
  vi.stubGlobal('GM_getResourceURL', () => 'data:application/wasm;base64,AA==');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }));
  return (await import('../../../src/engine/worker-client.js')).engineWorker;
}

/** Each owned worker holds exactly two object URLs: the worker script and its WASM payload. */
const OBJECT_URLS_PER_WORKER = 2;

afterEach(() => vi.unstubAllGlobals());

describe('single engine ownership', () => {
  it('terminates replaced workers and releases their resource URLs across Chess960 switches', async () => {
    const engine = await setup();
    await engine.warm();
    // warm + three switches means four owned workers were created and three were replaced.
    const created = 4;
    await engine.ensureEngine(true);
    await engine.ensureEngine(false);
    await engine.ensureEngine(true);
    expect(BrowserWorker.workers.filter((worker) => !worker.terminated)).toHaveLength(1);
    expect(BrowserWorker.peak).toBe(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes((created - 1) * OBJECT_URLS_PER_WORKER);
  });
  it('rejects a superseded initialization and prevents its late fetch from creating a worker', async () => {
    const engine = await setup();
    let release!: (response: Response) => void;
    let markBodyRead!: () => void;
    const bodyRead = new Promise<void>((resolve) => {
      markBodyRead = resolve;
    });
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }) as Promise<Response>,
    );
    const old = engine.warm();
    const rejected = expect(old).rejects.toThrow(/disposed/);
    // Wait for the first worker to exist before forcing a replacement.
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    await engine.ensureEngine(true);
    await rejected;

    // The superseded setup resolves only now, after its abort signal is already set. Resolving
    // the body read is the observable point at which the aborted continuation resumes.
    release(
      Object.assign(new Response(new ArrayBuffer(8)), {
        arrayBuffer: async () => {
          markBodyRead();
          return new ArrayBuffer(8);
        },
      }),
    );
    await bodyRead;
    await Promise.resolve();

    expect(BrowserWorker.workers).toHaveLength(1);
    expect(BrowserWorker.peak).toBe(1);
    // The late result must not adopt the replacement either.
    expect(BrowserWorker.workers[0]?.terminated).toBe(false);
  });
  it('rejects stale callers instead of analyzing on a replacement engine', async () => {
    const engine = await setup();
    const old = engine.ensureEngine(true);
    const rejected = expect(old).rejects.toThrow(/disposed|replaced/);
    await engine.ensureEngine(false);
    await rejected;
  });
});

describe('canonical variant engine selection', () => {
  const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  it('normalizes standard aliases without modifying engine options', async () => {
    const engine = await setup();

    await engine.analyze(fen, 10, 50, undefined, undefined, 0, 'fromPosition');
    expect(BrowserWorker.workers[0]?.commands).toContain('setoption name UCI_Chess960 value false');
    expect(BrowserWorker.workers[0]?.commands).not.toContain('setoption name UCI_Variant');
  });

  it('recreates one owned worker as Chess960 changes and returns to standard', async () => {
    const engine = await setup();

    await engine.analyze(fen, 10, 50, undefined, undefined, 0, 'standard');
    const standardWorker = BrowserWorker.workers[0];
    expect(standardWorker?.commands).toContain('setoption name UCI_Chess960 value false');

    await engine.analyze(fen, 10, 50, undefined, undefined, 0, 'chess960');
    const chess960Worker = BrowserWorker.workers[1];
    expect(standardWorker?.terminated).toBe(true);
    expect(chess960Worker?.commands).toContain('setoption name UCI_Chess960 value true');

    await engine.analyze(fen, 10, 50, undefined, undefined, 0, 'standard');
    const resumedStandardWorker = BrowserWorker.workers[2];
    expect(chess960Worker?.terminated).toBe(true);
    expect(resumedStandardWorker?.commands).toContain('setoption name UCI_Chess960 value false');
    expect(BrowserWorker.workers.filter((worker) => !worker.terminated)).toHaveLength(1);
    expect(BrowserWorker.peak).toBe(1);
  });

  it('rejects unsupported variants before creating or switching workers', async () => {
    const engine = await setup();

    await expect(engine.analyze(fen, 10, 50, undefined, undefined, 0, 'antichess')).rejects.toThrow(/unknown variant/i);
    expect(BrowserWorker.workers).toHaveLength(0);

    await engine.analyze(fen, 10, 50, undefined, undefined, 0, 'standard');
    const standardWorker = BrowserWorker.workers[0];
    await expect(engine.analyze(fen, 10, 50, undefined, undefined, 0, 'crazyhouse')).rejects.toThrow(
      /unknown variant/i,
    );
    expect(BrowserWorker.workers).toHaveLength(1);
    expect(BrowserWorker.workers[0]).toBe(standardWorker);
    expect(standardWorker?.terminated).toBe(false);
  });
});

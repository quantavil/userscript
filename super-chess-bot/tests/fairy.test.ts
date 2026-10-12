import { describe, expect, it, vi } from 'vitest';
import { countLegalMoves, hasLegalMoves, predictFen } from '../src/engine/analysis.js';
import { formatMove, uciToSan } from '../src/engine/san.js';
import { isValidUciMove, UciClient, type UciWorkerLike } from '../src/engine/uci-client.js';
import { engineWorker } from '../src/engine/worker-client.js';
import { canonicalFen, parseRules } from '../src/history.js';
import { type PychessObservation, parsePychessObservation } from '../src/sites/pychess-state.js';

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

describe('Fairy chess UCI move validation', () => {
  it('validates standard orthodox chess moves', () => {
    expect(isValidUciMove('e2e4')).toBe(true);
    expect(isValidUciMove('g1f3')).toBe(true);
    expect(isValidUciMove('e7e8q')).toBe(true);
    expect(isValidUciMove('a7a8n')).toBe(true);
  });

  it('validates 10x8 Capablanca and large board coordinates', () => {
    expect(isValidUciMove('a1j8')).toBe(true);
    expect(isValidUciMove('j8a1')).toBe(true);
    expect(isValidUciMove('i2i4')).toBe(true);
    expect(isValidUciMove('a1a10')).toBe(true);
    expect(isValidUciMove('j1j10')).toBe(true);
  });

  it('validates Crazyhouse and Shogi pocket piece drops', () => {
    expect(isValidUciMove('P@e4')).toBe(true);
    expect(isValidUciMove('n@f3')).toBe(true);
    expect(isValidUciMove('B@c6')).toBe(true);
    expect(isValidUciMove('Q@d8')).toBe(true);
  });

  it('validates Xiangqi rank 0-9 coordinate moves', () => {
    expect(isValidUciMove('a0a1')).toBe(true);
    expect(isValidUciMove('b2e2')).toBe(true);
    expect(isValidUciMove('h9e9')).toBe(true);
  });

  it('rejects invalid or malformed move strings', () => {
    expect(isValidUciMove('')).toBe(false);
    expect(isValidUciMove('nonsense')).toBe(false);
    expect(isValidUciMove('e2')).toBe(false);
    expect(isValidUciMove('e2e')).toBe(false);
    expect(isValidUciMove('k1k8')).toBe(false); // file 'k' does not exist in fairy coords
    expect(isValidUciMove('e2e99')).toBe(false);
  });
});

describe('Fairy chess FEN canonicalization and rules', () => {
  it('identifies supported rules', () => {
    expect(parseRules('standard')).toBe('chess');
    expect(parseRules('chess')).toBe('chess');
    expect(parseRules('crazyhouse')).toBe('crazyhouse');
    expect(parseRules('atomic')).toBe('atomic');
    expect(parseRules('antichess')).toBe('antichess');
    expect(parseRules('kingofthehill')).toBe('kingofthehill');
    expect(parseRules('3check')).toBe('3check');
    expect(parseRules('threeCheck')).toBe('3check');
    expect(parseRules('horde')).toBe('horde');
    expect(parseRules('racingkings')).toBe('racingkings');
    expect(parseRules('capablanca')).toBeNull(); // non-chessops fairy game
    expect(parseRules('xiangqi')).toBeNull();
  });

  it('canonicalizes orthodox and variant FENs', () => {
    const standardFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(canonicalFen(standardFen, 'chess')).toBe(standardFen);

    // Crazyhouse starting position
    const zhFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[] w KQkq - 0 1';
    expect(canonicalFen(zhFen, 'crazyhouse')).toBe(zhFen);

    // Atomic starting position
    expect(canonicalFen(standardFen, 'atomic')).toBe(standardFen);

    // Non-chessops fairy game accepts well-formed FEN
    const xiangqiFen = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1';
    expect(canonicalFen(xiangqiFen, 'xiangqi')).toBe(xiangqiFen);
  });
});

describe('UciClient variant configuration', () => {
  it('sends UCI_Variant on initialization for non-standard variants', async () => {
    const worker = new FakeUciWorker();
    const client = new UciClient(() => worker, { variant: 'atomic' });
    await client.warm();

    expect(worker.commands).toContain('setoption name UCI_Variant value atomic');
    expect(worker.commands).toContain('setoption name MultiPV value 3');
    expect(worker.commands).toContain('isready');
  });

  it('does not send UCI_Variant on initialization for standard chess', async () => {
    const worker = new FakeUciWorker();
    const client = new UciClient(() => worker, { variant: 'chess' });
    await client.warm();

    expect(worker.commands.some((c) => c.startsWith('setoption name UCI_Variant'))).toBe(false);
  });

  it('updates variant dynamically with setVariant', async () => {
    const worker = new FakeUciWorker();
    const client = new UciClient(() => worker, { variant: 'atomic' });
    await client.warm();

    await client.setVariant('crazyhouse');
    expect(worker.commands).toContain('setoption name UCI_Variant value crazyhouse');
    expect(client.activeVariant).toBe('crazyhouse');
  });
});

describe('PyChess variant observation parsing', () => {
  const baseObservation: PychessObservation = {
    metadata: {
      isRoundView: true,
      pathname: '/Round123',
      gameId: 'Round123',
      username: 'Alice',
      whitePlayer: 'Alice',
      blackPlayer: 'Bob',
      variant: 'crazyhouse',
      chess960: '0',
      correspondence: '0',
      initialFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[] w KQkq - 0 1',
      status: 'started',
      initialResult: null,
    },
    board: {
      element: {} as HTMLElement,
      owned: true,
      connected: true,
      visible: true,
      width: 8,
      height: 8,
    },
    state: {
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[] w KQkq - 0 1',
      displayedPlacement: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
      turnColor: 'white',
      movableColor: 'white',
      orientation: 'white',
    },
    moves: [],
    result: { text: null, postgame: false },
    clocks: {
      clock0: { min: '3', sec: '00', connecting: false },
      clock1: { min: '3', sec: '00', connecting: false },
    },
  };

  it('accepts Crazyhouse variant game and exposes variant in snapshot', () => {
    const result = parsePychessObservation(baseObservation, {});
    expect(result.kind).toBe('game');
    if (result.kind === 'game') {
      expect(result.snapshot.variant).toBe('crazyhouse');
      expect(result.snapshot.boardDimensions).toEqual({ width: 8, height: 8 });
    }
  });

  it('accepts 10x8 Capablanca board and exposes board dimensions', () => {
    const capablancaObs: PychessObservation = {
      ...baseObservation,
      metadata: {
        ...baseObservation.metadata,
        variant: 'capablanca',
        initialFen: 'rnabqkbcnr/pppppppppp/10/10/10/10/PPPPPPPPPP/RNABQKBCNR w KQkq - 0 1',
      },
      board: {
        ...baseObservation.board,
        width: 10,
        height: 8,
      },
      state: {
        ...baseObservation.state,
        fen: 'rnabqkbcnr/pppppppppp/10/10/10/10/PPPPPPPPPP/RNABQKBCNR w KQkq - 0 1',
      },
    };

    const result = parsePychessObservation(capablancaObs, {});
    expect(result.kind).toBe('game');
    if (result.kind === 'game') {
      expect(result.snapshot.variant).toBe('capablanca');
      expect(result.snapshot.boardDimensions).toEqual({ width: 10, height: 8 });
    }
  });
});

describe('Fairy chess position validation and SAN formatting', () => {
  const antichessFen = 'r1b1kbnr/p2n1ppp/3pp3/1P6/P7/1P6/3PPPPP/RNq1KBNR w - - 0 7';

  it('validates Antichess moves correctly where standard chess would reject them', () => {
    // Under orthodox chess rules, White king is in check from Qc1, so d2d4 is illegal
    expect(predictFen(antichessFen, 'd2d4', 'chess')).toBeNull();

    // Under Antichess rules, king has no royal status and d2d4 is a legal move
    const nextFen = predictFen(antichessFen, 'd2d4', 'antichess');
    expect(nextFen).toBe('r1b1kbnr/p2n1ppp/3pp3/1P6/P2P4/1P6/4PPPP/RNq1KBNR b - d3 0 7');

    expect(hasLegalMoves(antichessFen, 'antichess')).toBe(true);
    expect(countLegalMoves(antichessFen, 'antichess')).toBeGreaterThan(0);
  });

  it('formats variant moves into SAN', () => {
    expect(uciToSan(antichessFen, 'd2d4', 'antichess')).toBe('d4');
    expect(formatMove(antichessFen, 'd2d4', 'antichess')).toBe('7. d4');
  });

  it('guards engineWorker against pondering when active engine is fairy-stockfish', async () => {
    class MockWorker extends FakeUciWorker {}
    vi.stubGlobal('Worker', MockWorker);
    vi.stubGlobal('Blob', class {});
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      }),
    );
    vi.stubGlobal('GM_getResourceText', () => '/* fairy source */');
    vi.stubGlobal('GM_getResourceURL', () => 'data:application/wasm;base64,AA==');

    try {
      await engineWorker.ensureEngine('fairy-stockfish', 'antichess');
      expect(engineWorker.activeEngineKind).toBe('fairy-stockfish');

      const ponderStarted = engineWorker.ponder(antichessFen, 20);
      expect(ponderStarted).toBe(false);
    } finally {
      engineWorker.reset();
      vi.unstubAllGlobals();
    }
  });

  it('formats Fairy-Stockfish in stop timeout error message', async () => {
    class HangingWorker extends FakeUciWorker {
      override postMessage(command: string): void {
        this.commands.push(command);
        if (command === 'uci') queueMicrotask(() => this.emit('uciok'));
        if (command === 'isready') queueMicrotask(() => this.emit('readyok'));
        // Never emit bestmove to force stop timeout
      }
    }

    const worker = new HangingWorker();
    const client = new UciClient(() => worker, {
      variant: 'antichess',
      searchTimeoutSlackMs: 5,
      stopTimeoutMs: 15,
    });
    await client.warm();

    const searchPromise = client.analyze('8/8/8/8/8/8/8/8 w - - 0 1', 10, 5, undefined, undefined, 0);

    await expect(searchPromise).rejects.toThrow(/Fairy-Stockfish/);
  });
});

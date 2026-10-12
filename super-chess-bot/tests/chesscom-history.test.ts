import { afterEach, describe, expect, it } from 'vitest';
import { canonicalFen } from '../src/history.js';
import { createChesscomAdapter } from '../src/sites/chesscom.js';
import { resetCapturedChesscomController } from '../src/sites/chesscom-bridge.js';

// The real wc-chess-board controller, as measured on a live guest game:
// - getHistoryFENS() holds only the CURRENT position, so its length never grows past 1.
// - getFEN() / getTurn() / getHistorySANs() flip optimistically inside move().
// - getFingerprints().startingFen is the only true root.
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
const AFTER_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

afterEach(() => {
  resetCapturedChesscomController();
});

describe('Chess.com position history', () => {
  it('indexes the confirmed history from the real root instead of the current position', () => {
    const fixture = makeFixture({ sans: ['e4'], fen: AFTER_E4 });
    const snapshot = readGame(fixture);

    expect(snapshot.confirmedFens?.[0]).toBe(canonicalFen(START_FEN));
    expect(snapshot.confirmedFens?.[1]).toBe(canonicalFen(AFTER_E4));
    expect(snapshot.confirmedFens).toHaveLength(2);
  });

  it('replays accepted plies into engine UCI history', () => {
    const fixture = makeFixture({ sans: ['e4', 'e5'], fen: AFTER_E5 });
    const snapshot = readGame(fixture);

    expect(snapshot.history).toEqual({ startFen: canonicalFen(START_FEN), moves: ['e2e4', 'e7e5'] });
    expect(snapshot.confirmedFens?.[2]).toBe(canonicalFen(AFTER_E5));
  });

  it('never exposes a ply-indexed slot that the accepted SAN list cannot back', () => {
    // The controller has already flipped its local position, but the server has not accepted
    // the move yet, so the SAN list is still empty. Confirmation must stay pending rather than
    // accept the optimistic local position at ply 1.
    const fixture = makeFixture({ sans: [], fen: AFTER_E4 });
    const snapshot = readGame(fixture);

    expect(snapshot.fen).toBe(AFTER_E4);
    expect(snapshot.history).toEqual({ startFen: canonicalFen(START_FEN), moves: [] });
    expect(snapshot.confirmedFens).toHaveLength(1);
    expect(snapshot.confirmedFens?.[1]).toBeUndefined();
  });

  it('omits history entirely when the controller exposes no fingerprint root', () => {
    const fixture = makeFixture({ sans: ['e4'], fen: AFTER_E4, withStartingFen: false });
    const snapshot = readGame(fixture);

    expect(snapshot.history).toBeUndefined();
    expect(snapshot.confirmedFens).toBeUndefined();
  });

  it('omits history when the SAN list cannot be replayed from the root', () => {
    const fixture = makeFixture({ sans: ['e4', 'zz9'], fen: AFTER_E5 });
    const snapshot = readGame(fixture);

    expect(snapshot.history).toBeUndefined();
    expect(snapshot.confirmedFens).toBeUndefined();
  });
});

function readGame(fixture: ReturnType<typeof makeFixture>) {
  const read = createChesscomAdapter(() => fixture.page as unknown as Window).read();
  if (read.kind !== 'game') throw new Error(`expected a game snapshot, got ${read.kind}`);
  return read.snapshot;
}

function makeFixture(options: { sans: string[]; fen: string; withStartingFen?: boolean }) {
  const game = {
    id: 'live-game',
    getFEN: () => options.fen,
    getPlayingAs: () => 1,
    getTurn: () => (options.fen.split(' ')[1] === 'b' ? 2 : 1),
    getOptions: () => ({ flipped: false, isWhiteOnBottom: true }),
    getState: () => 'Idle',
    isGameOver: () => false,
    // Measured behaviour: a single-element array holding the current position.
    getHistoryFENs: () => [options.fen],
    getHistorySANs: () => [...options.sans],
    ...(options.withStartingFen === false
      ? {}
      : { getFingerprints: () => ({ startingFen: START_FEN, moves: ['', ...options.sans] }) }),
  };
  const board = Object.assign(element(), {
    game,
    ownerDocument: { defaultView: { getComputedStyle: () => ({ display: 'block', visibility: 'visible' }) } },
    getClientRects: () => [{ width: 400, height: 400 }],
    getBoundingClientRect: () => ({ width: 400, height: 400 }),
    getAttribute: () => null,
    classList: { contains: () => false },
  });
  const page = {
    document: {
      body: element(),
      querySelectorAll: () => [board],
      querySelector: () => null,
    },
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
  };
  return { page, board };
}

function element() {
  const node = {
    nodeType: 1,
    parentElement: null as unknown,
    textContent: '',
    matches: (selector: string) => selector.includes('.board'),
    querySelector: () => null,
    closest(selector: string) {
      return selector.includes('.board') ? node : null;
    },
  };
  return node;
}

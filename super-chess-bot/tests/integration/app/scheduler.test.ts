import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { cancelAnalysis, scheduleAnalysis } from '../../../src/app/scheduler.js';
import { BotState } from '../../../src/app/state.js';
import { predictFen } from '../../../src/chess/position.js';
import type { MoveConfirmation } from '../../../src/game/confirmation.js';
import type { MoveRequest } from '../../../src/sites/types.js';
import { ui } from '../../../src/ui/mount.js';

const mocks = vi.hoisted(() => {
  const snapshot = {
    identity: {},
    gameId: 'game-one',
    board: {} as HTMLElement,
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    playerColor: 'w' as 'w' | 'b',
    sideToMove: 'w' as 'w' | 'b',
    orientation: 'white' as const,
    phase: 'live' as const,
    inputReady: true,
    remainingMs: null as number | null,
    history: {
      startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      moves: [] as string[],
    },
    confirmedFens: ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'],
  };
  const siteRead = {
    kind: 'game' as const,
    snapshot,
  };
  const site = {
    id: 'lichess' as const,
    read: () => siteRead,
    subscribe: vi.fn(() => () => {}),
    submitMove: vi.fn(async (_request: MoveRequest) => true),
    cancelInput: vi.fn(),
  };
  return {
    snapshot,
    siteRead,
    site,
    analyze: vi.fn(),
    confirmMove: vi.fn(
      async (): Promise<MoveConfirmation> => ({
        status: 'confirmed',
        source: 'site-accepted',
      }),
    ),
    drawArrow: vi.fn(),
    drawMultiPvArrows: vi.fn(),
    clearArrows: vi.fn(),
    ponderPosition: vi.fn((_fen?: string, _depth?: number, _history?: unknown) => true),
    cancelPonder: vi.fn(),
  };
});

vi.mock('../../../src/sites/registry.js', () => ({
  getSite: () => mocks.site,
  readSite: () => mocks.site.read(),
}));
vi.mock('../../../src/game/confirmation.js', () => ({ confirmSiteMove: mocks.confirmMove }));
vi.mock('../../../src/board/input.js', () => ({
  cancelPendingMove: vi.fn(),
  getMoveRevision: () => 0,
}));
vi.mock('../../../src/board/overlays.js', () => ({
  clearArrows: mocks.clearArrows,
  drawArrow: mocks.drawArrow,
  drawMultiPvArrows: mocks.drawMultiPvArrows,
}));
vi.mock('../../../src/engine/tablebase.js', () => ({
  lookupTablebase: vi.fn().mockResolvedValue(null),
  isTablebaseEligible: vi.fn().mockReturnValue(false),
}));
vi.mock('../../../src/engine/service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/engine/service.js')>();
  return {
    ...actual,
    getAnalysis: mocks.analyze,
    ponderPosition: mocks.ponderPosition,
    cancelPonder: mocks.cancelPonder,
  };
});

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('scheduler state consistency and multi-pv / elo throttling', () => {
  beforeEach(() => {
    cancelAnalysis();
    vi.clearAllMocks();
    Object.assign(mocks.snapshot, {
      identity: {},
      gameId: 'game-one',
      fen: START_FEN,
      playerColor: 'w',
      sideToMove: 'w',
      orientation: 'white',
      phase: 'live',
      inputReady: true,
      remainingMs: null,
      history: { startFen: START_FEN, moves: [] },
      confirmedFens: [START_FEN],
    });
    mocks.siteRead.kind = 'game';
    BotState.hackEnabled = true;
    BotState.autoMove = false;
    BotState.autoRetry = false;
    BotState.openingBook = false;
    BotState.ponderEnabled = false;
    BotState.targetElo = 0;
    BotState.madmanMode = false;
    BotState.blunderShield = false;
    BotState.multiPvLines = [];
    BotState.evalHistory = [];
    BotState.bestMove = '-';
    BotState.currentEvaluation = '-';
    BotState.principalVariation = '-';
  });

  afterEach(() => {
    BotState.madmanMode = false;
    cancelAnalysis();
    vi.restoreAllMocks();
  });

  it('dispatches a planned Madman reply while canceled speculative work is still draining', async () => {
    BotState.madmanMode = true;
    BotState.premove = true;
    BotState.autoMove = true;
    BotState.moveTime = 25;
    BotState.timingMode = 'dynamic';
    mocks.analyze.mockResolvedValue({
      success: true,
      bestmove: 'e2e4',
      pv: 'e2e4 e7e5 g1f3 b8c6',
      evaluation: { cp: 20 },
      depth: 12,
    });
    await scheduleAnalysis('main', START_FEN);
    const opponentFen = predictFen(START_FEN, 'e2e4') ?? '';
    const target = predictFen(opponentFen, 'e7e5') ?? '';
    mocks.snapshot.fen = opponentFen;
    mocks.snapshot.sideToMove = 'b';
    mocks.snapshot.history.moves = ['e2e4'];
    cancelAnalysis(opponentFen);
    let finish!: (value: unknown) => void;
    mocks.analyze.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const pondering = scheduleAnalysis('ponder', opponentFen);
    await Promise.resolve();
    expect(finish).toBeDefined();
    mocks.snapshot.fen = target;
    mocks.snapshot.sideToMove = 'w';
    mocks.snapshot.history.moves = ['e2e4', 'e7e5'];
    cancelAnalysis(target);
    const searches = mocks.analyze.mock.calls.length;
    await scheduleAnalysis('main', target);
    expect(mocks.site.submitMove.mock.calls.at(-1)?.[0].uci).toBe('g1f3');
    expect(mocks.analyze).toHaveBeenCalledTimes(searches);
    expect(BotState.statusInfo).toContain('Premove');
    expect(BotState.statusInfo).toContain('planned');
    finish({ success: false, bestmove: '', pv: '', evaluation: {}, depth: 0 });
    await pondering;
  });

  it('rejects a Madman planned continuation when history changes', async () => {
    BotState.madmanMode = true;
    BotState.premove = true;
    BotState.autoMove = true;
    BotState.moveTime = 25;
    BotState.timingMode = 'fixed';
    mocks.analyze.mockResolvedValue({
      success: true,
      bestmove: 'e2e4',
      pv: 'e2e4 e7e5 g1f3',
      evaluation: { cp: 20 },
      depth: 12,
    });
    await scheduleAnalysis('main', START_FEN);
    const target = predictFen(predictFen(START_FEN, 'e2e4') ?? '', 'e7e5') ?? '';
    mocks.snapshot.fen = target;
    mocks.snapshot.history = { startFen: target, moves: [] };
    cancelAnalysis(target);
    mocks.analyze.mockResolvedValue({
      success: true,
      bestmove: 'f1c4',
      pv: 'f1c4',
      evaluation: { cp: 20 },
      depth: 12,
    });
    await scheduleAnalysis('main', target);
    expect(mocks.site.submitMove.mock.calls.at(-1)?.[0].uci).toBe('f1c4');
    expect(BotState.statusInfo).not.toContain('Premove');
  });

  it('dispatches an evaluated attacking branch without repeating foreground search', async () => {
    const root = 'rnbq1rk1/pppp1ppp/5n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b - - 4 5';
    Object.assign(mocks.snapshot, {
      fen: root,
      sideToMove: 'b',
      history: { startFen: root, moves: [] },
    });
    BotState.madmanMode = true;
    BotState.premove = true;
    BotState.autoMove = true;
    BotState.moveTime = 25;
    mocks.analyze.mockImplementation(
      async (fen, _depth, _time, _signal, _history, _slack, _variant, _multi, _legal, _onDepth, options) => {
        const move = fen === root ? 'd7d6' : 'h2h3';
        const lines = options?.searchMoves
          ? options.searchMoves.map((uci: string) => ({
              uci,
              pv: uci,
              depth: 4,
              multipv: 1,
              evaluation: { cp: uci === 'h2h3' ? 20 : -100 },
            }))
          : [{ uci: move, pv: move, depth: 3, multipv: 1, evaluation: { cp: 20 } }];
        return {
          success: true,
          bestmove: lines[0].uci,
          pv: lines[0].pv,
          depth: lines[0].depth,
          evaluation: lines[0].evaluation,
          multiPv: lines,
        };
      },
    );
    await scheduleAnalysis('ponder', root);
    const target = predictFen(root, 'd7d6') ?? '';
    Object.assign(mocks.snapshot, {
      fen: target,
      sideToMove: 'w',
      history: { startFen: root, moves: ['d7d6'] },
    });
    cancelAnalysis(target);
    const count = mocks.analyze.mock.calls.length;
    await scheduleAnalysis('main', target);
    expect(mocks.site.submitMove.mock.calls.at(-1)?.[0].uci).toBe('f3g5');
    expect(mocks.analyze).toHaveBeenCalledTimes(count);
    expect(BotState.statusInfo).toContain('fast');
    expect(BotState.currentEvaluation).toBe('-1.00');
  });

  it('caches punishment for taking an observed offer even when best-play prediction omits the capture', async () => {
    const start = '6k1/5ppp/8/8/8/8/3Q1PPP/6K1 w - - 0 1';
    const offer = '6k1/5ppp/7Q/8/8/8/5PPP/6K1 b - - 1 1';
    const taken = '6k1/5p1p/7p/8/8/8/5PPP/6K1 w - - 0 2';
    Object.assign(mocks.snapshot, { fen: start, history: { startFen: start, moves: [] } });
    BotState.madmanMode = true;
    BotState.premove = true;
    BotState.autoMove = true;
    BotState.moveTime = 25;
    mocks.analyze.mockResolvedValue({
      success: true,
      bestmove: 'd2h6',
      pv: 'd2h6',
      evaluation: { cp: -100 },
      depth: 12,
    });
    await scheduleAnalysis('main', start);
    Object.assign(mocks.snapshot, {
      fen: offer,
      sideToMove: 'b',
      history: { startFen: start, moves: ['d2h6'] },
    });
    cancelAnalysis(offer);
    mocks.analyze.mockImplementation(
      async (fen, _depth, _time, _signal, _history, _slack, _variant, _multi, _legal, _onDepth, options) => {
        if (fen !== offer && fen !== taken) throw new Error('unprepared ordinary branch');
        const moves = fen === offer ? ['f7f6'] : (options?.searchMoves ?? ['f2f3', 'g2g3', 'h2h3']);
        const lines = moves.map((uci: string) => ({
          uci,
          pv: uci,
          evaluation: { cp: 0 },
          depth: options?.searchMoves ? 4 : 3,
          multipv: 1,
        }));
        return {
          success: true,
          bestmove: lines[0].uci,
          pv: lines[0].pv,
          evaluation: lines[0].evaluation,
          depth: lines[0].depth,
          multiPv: lines,
        };
      },
    );
    await scheduleAnalysis('ponder', offer);
    Object.assign(mocks.snapshot, {
      fen: taken,
      sideToMove: 'w',
      history: { startFen: start, moves: ['d2h6', 'g7h6'] },
    });
    cancelAnalysis(taken);
    const searches = mocks.analyze.mock.calls.length;
    await scheduleAnalysis('main', taken);
    expect(mocks.site.submitMove.mock.calls.at(-1)?.[0].uci).toBe('f2f3');
    expect(mocks.analyze).toHaveBeenCalledTimes(searches);
    expect(BotState.statusInfo).toContain('Premove');
  });

  it('skips synthetic timing waits on a Madman premove cache miss', async () => {
    vi.useFakeTimers();
    try {
      BotState.madmanMode = true;
      BotState.premove = true;
      BotState.autoMove = true;
      BotState.moveTime = 25;
      BotState.timingMode = 'dynamic';
      mocks.analyze.mockResolvedValue({
        success: true,
        bestmove: 'e2e4',
        pv: 'e2e4',
        evaluation: { cp: 20 },
        depth: 12,
      });
      const work = scheduleAnalysis('main', START_FEN);
      await vi.advanceTimersByTimeAsync(0);
      expect(mocks.site.submitMove).toHaveBeenCalledTimes(1);
      await work;
    } finally {
      vi.useRealTimers();
    }
  });

  it('lets Madman choose attacking pressure instead of Elo sampling or premove chain steering', async () => {
    const fen = 'rnbq1rk1/pppp1ppp/5n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w - - 4 5';
    mocks.snapshot.fen = fen;
    mocks.snapshot.history = { startFen: fen, moves: [] };
    BotState.madmanMode = true;
    BotState.targetElo = 800;
    BotState.premove = true;
    BotState.moveTime = 25;
    BotState.timingMode = 'fixed';
    const quiet = { multipv: 1, depth: 12, evaluation: { cp: 20 }, pv: 'h2h3', uci: 'h2h3' };
    const attack = { multipv: 2, depth: 12, evaluation: { cp: -100 }, pv: 'f3g5', uci: 'f3g5' };
    mocks.analyze.mockResolvedValue({
      success: true,
      bestmove: quiet.uci,
      pv: quiet.pv,
      evaluation: quiet.evaluation,
      depth: 12,
      multiPv: [
        quiet,
        attack,
        { ...quiet, uci: 'a2a3', pv: 'a2a3', evaluation: { cp: -500 } },
        { ...quiet, uci: 'b2b3', pv: 'b2b3', evaluation: { cp: -500 } },
        { ...quiet, uci: 'd2d3', pv: 'd2d3', evaluation: { cp: -500 } },
        { ...quiet, uci: 'g2g3', pv: 'g2g3', evaluation: { cp: -500 } },
      ],
    });
    await scheduleAnalysis('main', fen);
    expect(BotState.bestMove).toBe('f3g5');
    expect(BotState.currentEvaluation).toBe('-1.00');
    expect(BotState.statusInfo).toContain('Madman');
    expect(mocks.analyze.mock.calls[0][7]).toBe(6);
  });

  it('evaluates opening positions rather than blindly dispatching a book move in Madman mode', async () => {
    BotState.madmanMode = true;
    BotState.openingBook = true;
    BotState.premove = true;
    BotState.moveTime = 25;
    BotState.timingMode = 'fixed';
    mocks.analyze.mockResolvedValue({
      success: true,
      bestmove: 'e2e4',
      pv: 'e2e4',
      evaluation: { cp: 20 },
      depth: 8,
      multiPv: [{ uci: 'e2e4', pv: 'e2e4', evaluation: { cp: 20 }, depth: 8, multipv: 1 }],
    });
    await scheduleAnalysis('main', START_FEN);
    expect(mocks.analyze).toHaveBeenCalled();
    expect(BotState.currentEvaluation).toBe('+0.20');
    expect(BotState.statusInfo).not.toContain('Book');
  });

  it('aligns best.pv, score, multiPv ordering, and anticipated ponder when Elo throttling picks a secondary candidate', async () => {
    BotState.targetElo = 1500;
    BotState.ponderEnabled = true;
    BotState.premove = false;

    const line1 = {
      multipv: 1,
      depth: 20,
      evaluation: { cp: 50 },
      pv: 'e2e4 e7e5 g1f3',
      uci: 'e2e4',
    };
    const line2 = {
      multipv: 2,
      depth: 20,
      evaluation: { cp: 20 },
      pv: 'd2d4 d7d5 c2c4',
      uci: 'd2d4',
    };

    mocks.analyze.mockResolvedValue({
      success: true,
      bestmove: 'e2e4',
      depth: 20,
      pv: line1.pv,
      evaluation: line1.evaluation,
      multiPv: [line1, line2],
    });

    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    await scheduleAnalysis('main', START_FEN);

    // Chosen move should be line 2 ('d2d4')
    expect(BotState.bestMove).toBe('d2d4');
    expect(BotState.principalVariation).toBe('d2d4 d7d5 c2c4');
    expect(BotState.currentEvaluation).toBe('+0.20');

    // Multi-PV lines should have candidate #2 reordered to index 0 so primary arrow is drawn for chosen move
    expect(mocks.drawMultiPvArrows).toHaveBeenCalled();
    const drawnLines = mocks.drawMultiPvArrows.mock.calls[0]?.[0];
    expect(drawnLines[0].uci).toBe('d2d4');

    // Ponder should be anticipated with reply to d2d4 (which is d7d5)
    // Advance position to after bot's move: Black to move
    const afterD4 = predictFen(START_FEN, 'd2d4') ?? '';
    mocks.snapshot.fen = afterD4;
    mocks.snapshot.sideToMove = 'b';
    mocks.snapshot.history = { startFen: START_FEN, moves: ['d2d4'] };

    // Trigger opponent pondering
    await scheduleAnalysis('ponder', afterD4);

    // Anticipated ponder should search targetFen predicted from d2d4 + d7d5
    expect(mocks.ponderPosition).toHaveBeenCalled();
    const targetFenPondered = mocks.ponderPosition.mock.calls[0]?.[0];
    // Position after 1.d4 d5
    expect(targetFenPondered).toContain('rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR');
  });

  it('clears multiPvLines on search engine failure', async () => {
    BotState.multiPvLines = [{ multipv: 1, depth: 20, evaluation: { cp: 30 }, pv: 'e2e4', uci: 'e2e4' }];
    mocks.analyze.mockRejectedValue(new Error('Engine crashed'));

    await scheduleAnalysis('main', START_FEN);

    expect(BotState.bestMove).toBe('-');
    expect(BotState.currentEvaluation).toBe('-');
    expect(BotState.principalVariation).toBe('-');
    expect(BotState.multiPvLines).toEqual([]);
  });

  it('clears multiPvLines on move confirmation failure', async () => {
    BotState.autoMove = true;
    BotState.multiPvLines = [{ multipv: 1, depth: 20, evaluation: { cp: 30 }, pv: 'e2e4', uci: 'e2e4' }];

    mocks.analyze.mockResolvedValue({
      success: true,
      bestmove: 'e2e4',
      depth: 20,
      pv: 'e2e4',
      evaluation: { cp: 30 },
    });
    mocks.confirmMove.mockResolvedValue({ status: 'failed' });

    await scheduleAnalysis('main', START_FEN);

    expect(BotState.bestMove).toBe('-');
    expect(BotState.currentEvaluation).toBe('-');
    expect(BotState.principalVariation).toBe('-');
    expect(BotState.multiPvLines).toEqual([]);
  });

  it('deduplicates evalHistory when same ply is evaluated multiple times', async () => {
    mocks.analyze.mockResolvedValue({
      success: true,
      bestmove: 'e2e4',
      depth: 20,
      pv: 'e2e4',
      evaluation: { cp: 30 },
    });

    await scheduleAnalysis('main', START_FEN);
    expect(BotState.evalHistory).toEqual([0.3]);

    // Re-evaluating the same ply (e.g., settings refreshed) updates instead of pushing duplicate
    mocks.analyze.mockResolvedValue({
      success: true,
      bestmove: 'e2e4',
      depth: 22,
      pv: 'e2e4',
      evaluation: { cp: 35 },
    });

    // Reset processed guard so scheduleAnalysis can run for same fen
    cancelAnalysis();
    await scheduleAnalysis('main', START_FEN);
    expect(BotState.evalHistory).toEqual([0.35]);

    // Next turn (ply 2): Black plays e7e5, White's turn again
    const turn2Fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    mocks.snapshot.fen = turn2Fen;
    mocks.snapshot.history = { startFen: START_FEN, moves: ['e2e4', 'e7e5'] };
    mocks.snapshot.sideToMove = 'w';

    mocks.analyze.mockResolvedValue({
      success: true,
      bestmove: 'g1f3',
      depth: 20,
      pv: 'g1f3',
      evaluation: { cp: 45 },
    });

    await scheduleAnalysis('main', turn2Fen);
    expect(BotState.evalHistory).toEqual([0.35, 0.45]);
  });
});

describe('FEN-keyed ponder table and 0ms premove execution', () => {
  beforeEach(() => {
    cancelAnalysis();
    vi.clearAllMocks();
    Object.assign(mocks.snapshot, {
      identity: {},
      gameId: 'premove-game',
      fen: START_FEN,
      playerColor: 'w',
      sideToMove: 'w',
      orientation: 'white',
      phase: 'live',
      inputReady: true,
      remainingMs: null,
      history: { startFen: START_FEN, moves: [] },
      confirmedFens: [START_FEN],
    });
    mocks.siteRead.kind = 'game';
    mocks.confirmMove.mockResolvedValue({ status: 'confirmed', source: 'site-accepted' });
    BotState.hackEnabled = true;
    BotState.autoMove = true;
    BotState.premove = true;
    BotState.autoRetry = false;
    BotState.openingBook = false;
    BotState.ponderEnabled = false;
    BotState.targetElo = 0;
    BotState.blunderShield = false;
    BotState.multiPvLines = [];
  });

  afterEach(() => {
    cancelAnalysis();
    vi.restoreAllMocks();
  });

  it('executes matching premove with 0ms engine delay when opponent plays predicted PV1 reply', async () => {
    const logSpy = vi.spyOn(ui, 'log');

    // Turn 1 (White to move): search yields e2e4 with reply e7e5 and follow-up g1f3
    mocks.analyze.mockResolvedValue({
      success: true,
      bestmove: 'e2e4',
      depth: 14,
      pv: 'e2e4 e7e5 g1f3',
      evaluation: { cp: 30 },
      multiPv: [
        {
          multipv: 1,
          depth: 14,
          uci: 'e2e4',
          pv: 'e2e4 e7e5 g1f3',
          evaluation: { cp: 30 },
        },
      ],
    });

    await scheduleAnalysis('main', START_FEN);

    // Turn 1 move e2e4 was submitted to site
    expect(mocks.site.submitMove).toHaveBeenCalledTimes(1);
    expect(mocks.site.submitMove.mock.calls[0][0].uci).toBe('e2e4');

    // Reset mocks to inspect turn 2 behavior
    mocks.analyze.mockClear();
    mocks.site.submitMove.mockClear();

    // Turn 2: Opponent confirms move e7e5 -> Black to move turns into White to move
    const afterE5Fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    mocks.snapshot.fen = afterE5Fen;
    mocks.snapshot.history = { startFen: START_FEN, moves: ['e2e4', 'e7e5'] };
    mocks.snapshot.sideToMove = 'w';

    await scheduleAnalysis('main', afterE5Fen);

    // PREMOVE HIT!
    // 1. Engine getAnalysis must NOT have been called!
    expect(mocks.analyze).not.toHaveBeenCalled();
    // 2. Reply move g1f3 must have been immediately submitted!
    expect(mocks.site.submitMove).toHaveBeenCalledTimes(1);
    expect(mocks.site.submitMove.mock.calls[0][0].uci).toBe('g1f3');
    // 3. Status info must report Premove
    expect(BotState.statusInfo).toContain('Ready · Premove');
    // 4. Activity log must report " · premove"
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('· premove'), 'move');
  });

  it('clears ponder table and runs regular engine search when opponent plays unexpected move', async () => {
    mocks.analyze.mockResolvedValue({
      success: true,
      bestmove: 'e2e4',
      depth: 14,
      pv: 'e2e4 e7e5 g1f3',
      evaluation: { cp: 30 },
      multiPv: [
        {
          multipv: 1,
          depth: 14,
          uci: 'e2e4',
          pv: 'e2e4 e7e5 g1f3',
          evaluation: { cp: 30 },
        },
      ],
    });

    await scheduleAnalysis('main', START_FEN);
    mocks.analyze.mockClear();
    mocks.site.submitMove.mockClear();

    // Turn 2: Opponent plays c7c5 (Sicilian) instead of e7e5!
    const afterC5Fen = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    mocks.snapshot.fen = afterC5Fen;
    mocks.snapshot.history = { startFen: START_FEN, moves: ['e2e4', 'c7c5'] };
    mocks.snapshot.sideToMove = 'w';

    mocks.analyze.mockResolvedValue({
      success: true,
      bestmove: 'g1f3',
      depth: 14,
      pv: 'g1f3 d7d6',
      evaluation: { cp: 25 },
    });

    await scheduleAnalysis('main', afterC5Fen);

    // Opponent deviated: normal engine analysis ran!
    expect(mocks.analyze).toHaveBeenCalledTimes(1);
    expect(BotState.statusInfo).not.toContain('Premove');
  });

  it('does not arm or execute premoves when premove toggle is disabled', async () => {
    BotState.premove = false;

    mocks.analyze.mockResolvedValue({
      success: true,
      bestmove: 'e2e4',
      depth: 14,
      pv: 'e2e4 e7e5 g1f3',
      evaluation: { cp: 30 },
      multiPv: [
        {
          multipv: 1,
          depth: 14,
          uci: 'e2e4',
          pv: 'e2e4 e7e5 g1f3',
          evaluation: { cp: 30 },
        },
      ],
    });

    await scheduleAnalysis('main', START_FEN);
    mocks.analyze.mockClear();

    const afterE5Fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    mocks.snapshot.fen = afterE5Fen;
    mocks.snapshot.history = { startFen: START_FEN, moves: ['e2e4', 'e7e5'] };
    mocks.snapshot.sideToMove = 'w';

    mocks.analyze.mockResolvedValue({
      success: true,
      bestmove: 'g1f3',
      depth: 14,
      pv: 'g1f3 b8c6',
      evaluation: { cp: 35 },
    });

    await scheduleAnalysis('main', afterE5Fen);

    // Premove disabled: regular engine analysis MUST run!
    expect(mocks.analyze).toHaveBeenCalledTimes(1);
  });

  it('arms book replies and dispatches them instantly when opening book and premove are enabled', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const logSpy = vi.spyOn(ui, 'log');
    try {
      BotState.premove = true;
      BotState.autoMove = true;
      BotState.openingBook = true;
      BotState.openingStyle = 'balanced';

      // Turn 1: White plays 1. e4 from opening book
      await scheduleAnalysis('main', START_FEN);

      // Book move e2e4 was submitted to site immediately without engine analyze
      expect(mocks.analyze).not.toHaveBeenCalled();
      expect(mocks.site.submitMove).toHaveBeenCalledTimes(1);
      expect(mocks.site.submitMove.mock.calls[0][0].uci).toBe('e2e4');

      mocks.site.submitMove.mockClear();

      // Turn 2: Opponent plays 1... e5 -> White to move
      const afterE5Fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
      mocks.snapshot.fen = afterE5Fen;
      mocks.snapshot.history = { startFen: START_FEN, moves: ['e2e4', 'e7e5'] };
      mocks.snapshot.sideToMove = 'w';

      await scheduleAnalysis('main', afterE5Fen);

      // Instant premove hit for 2. Nf3!
      expect(mocks.analyze).not.toHaveBeenCalled();
      expect(mocks.site.submitMove).toHaveBeenCalledTimes(1);
      expect(mocks.site.submitMove.mock.calls[0][0].uci).toBe('g1f3');
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('premove'), 'move');
    } finally {
      randomSpy.mockRestore();
    }
  });
});

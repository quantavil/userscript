import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelAnalysis, scheduleAnalysis } from '../../../src/app/scheduler.js';
import { BotState } from '../../../src/app/state.js';
import { predictFen } from '../../../src/chess/position.js';
import type { MoveConfirmation } from '../../../src/game/confirmation.js';
import type { MoveRequest } from '../../../src/sites/types.js';

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
    history: { startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: [] as string[] },
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
    confirmMove: vi.fn(async (): Promise<MoveConfirmation> => ({ status: 'confirmed', source: 'site-accepted' })),
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
    BotState.blunderShield = false;
    BotState.multiPvLines = [];
    BotState.evalHistory = [];
    BotState.bestMove = '-';
    BotState.currentEvaluation = '-';
    BotState.principalVariation = '-';
  });

  afterEach(() => {
    cancelAnalysis();
    vi.restoreAllMocks();
  });

  it('aligns best.pv, score, multiPv ordering, and anticipated ponder when Elo throttling picks a secondary candidate', async () => {
    BotState.targetElo = 1500;
    BotState.ponderEnabled = true;

    const line1 = { multipv: 1, depth: 20, evaluation: { cp: 50 }, pv: 'e2e4 e7e5 g1f3', uci: 'e2e4' };
    const line2 = { multipv: 2, depth: 20, evaluation: { cp: 20 }, pv: 'd2d4 d7d5 c2c4', uci: 'd2d4' };

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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const panel = vi.hoisted(() => ({
  appendLog: vi.fn(),
  clearLogs: vi.fn(),
  updateAnalysis: vi.fn(),
  syncSettings: vi.fn(),
}));
const site = vi.hoisted(() => ({
  read: {
    kind: 'game' as 'game' | 'waiting' | 'ineligible',
    snapshot: {
      identity: {},
      gameId: 'test-game',
      board: {} as HTMLElement,
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      playerColor: 'w' as 'w' | 'b',
      sideToMove: 'b' as 'w' | 'b',
      orientation: 'white' as 'white' | 'black',
      phase: 'live' as 'live' | 'replay' | 'finished',
      inputReady: false,
      remainingMs: null,
      history: { startFen: '', moves: [] },
    },
  },
}));

vi.mock('../src/board.js', () => ({ updateEvaluationBar: vi.fn() }));
vi.mock('../src/panel.js', () => ({
  appendPanelLog: panel.appendLog,
  clearPanelLogs: panel.clearLogs,
  mountPanel: vi.fn(),
  syncPanelSettings: panel.syncSettings,
  updatePanelAnalysis: panel.updateAnalysis,
}));
vi.mock('../src/sites/index.js', () => ({ readSite: () => site.read }));

import { BotState, invalidateGameCache } from '../src/state.js';
import { ui } from '../src/ui.js';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

beforeEach(() => {
  site.read.kind = 'game';
  site.read.snapshot.fen = START_FEN;
  const game = { getFEN: () => START_FEN, getPlayingAs: () => 1 };
  vi.stubGlobal('document', {
    querySelector: (selector: string) => (selector.includes('board') ? { game } : null),
  });
  Object.assign(BotState, {
    hackEnabled: 1,
    bestMove: '-',
    currentEvaluation: '-',
    principalVariation: '-',
    statusInfo: 'Ready',
    recoveryAction: null,
  });
  invalidateGameCache();
  ui.clearConsole();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  invalidateGameCache();
});

describe('panel view state', () => {
  it('shows SAN for the suggested move and keeps routine search status out of the activity log', () => {
    BotState.bestMove = 'e2e4';
    BotState.currentEvaluation = '0.32';
    BotState.principalVariation = 'e2e4 e7e5';
    BotState.statusInfo = 'Ready · D10 · 42 ms';

    ui.updateDisplay(1);

    expect(panel.updateAnalysis).toHaveBeenLastCalledWith({
      status: 'Ready · D10 · 42 ms',
      evaluation: '0.32',
      bestMove: 'e4',
      principalVariation: 'e2e4 e7e5',
      recoveryAction: null,
    });
    expect(panel.appendLog).not.toHaveBeenCalled();
  });

  it('logs actionable failures and forwards the retry state to the panel', () => {
    BotState.statusInfo = 'Stockfish worker crashed';
    BotState.recoveryAction = 'retry';

    ui.updateDisplay(1);

    expect(panel.appendLog).toHaveBeenCalledWith('Stockfish worker crashed', 'error');
    expect(panel.updateAnalysis).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'Stockfish worker crashed', recoveryAction: 'retry' }),
    );
  });

  it('converts the suggested move against the adapter accepted FEN', () => {
    site.read.snapshot.fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    BotState.bestMove = 'e7e5';

    ui.updateDisplay(1);

    expect(panel.updateAnalysis).toHaveBeenLastCalledWith(expect.objectContaining({ bestMove: 'e5' }));
  });

  it('converts multiPv candidate lines to SAN against the accepted FEN', () => {
    site.read.snapshot.fen = START_FEN;
    BotState.multiPvLines = [
      { multipv: 1, uci: 'e2e4', pv: 'e2e4 e7e5', evaluation: { cp: 50 }, depth: 14 },
      { multipv: 2, uci: 'g1f3', pv: 'g1f3 d7d5', evaluation: { cp: 30 }, depth: 14 },
    ];

    ui.updateDisplay(1);

    expect(panel.updateAnalysis).toHaveBeenLastCalledWith(
      expect.objectContaining({
        multiPvLines: [
          expect.objectContaining({ multipv: 1, uci: 'e2e4', san: 'e4' }),
          expect.objectContaining({ multipv: 2, uci: 'g1f3', san: 'Nf3' }),
        ],
      }),
    );
  });
});

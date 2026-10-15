import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

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

vi.mock('../../../src/board/ownership.js', () => ({ markBotNode: vi.fn() }));
vi.mock('../../../src/ui/panel.js', () => ({
  appendPanelLog: panel.appendLog,
  clearPanelLogs: panel.clearLogs,
  mountPanel: vi.fn(),
  syncPanelSettings: panel.syncSettings,
  updatePanelAnalysis: panel.updateAnalysis,
}));
vi.mock('../../../src/sites/registry.js', () => ({ readSite: () => site.read }));

import { BotState } from '../../../src/app/state.js';
import { gameHistoryTracker } from '../../../src/game/history.js';
import { invalidateGameCache } from '../../../src/sites/chesscom/snapshot.js';
import { ui } from '../../../src/ui/mount.js';

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

    ui.updateDisplay();

    expect(panel.updateAnalysis).toHaveBeenLastCalledWith({
      status: 'Ready · D10 · 42 ms',
      evaluation: '0.32',
      bestMove: 'e4',
      principalVariation: '1. e4 e5',
      recoveryAction: null,
      reportAvailable: false,
      multiPvLines: [],
      evalHistory: [],
    });
    expect(panel.appendLog).not.toHaveBeenCalled();
  });

  it('logs actionable failures and forwards the retry state to the panel', () => {
    BotState.statusInfo = 'Stockfish worker crashed';
    BotState.recoveryAction = 'retry';

    ui.updateDisplay();

    expect(panel.appendLog).toHaveBeenCalledWith('Stockfish worker crashed', 'error');
    expect(panel.updateAnalysis).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'Stockfish worker crashed', recoveryAction: 'retry' }),
    );
  });

  it('keeps the Multi-PV array reference stable while the lines are unchanged', () => {
    site.read.snapshot.fen = START_FEN;
    const lines = [{ multipv: 1, uci: 'e2e4', pv: 'e2e4 e7e5', evaluation: { cp: 50 }, depth: 14 }];
    BotState.multiPvLines = lines;

    ui.updateDisplay();
    ui.updateDisplay();
    ui.updateDisplay();

    // The panel compares arrays element-wise by identity to skip no-op renders. Handing it a
    // freshly built array on every update made that check always report a change.
    const calls = panel.updateAnalysis.mock.calls.map(([next]) => next.multiPvLines);
    expect(calls[0]).toEqual([expect.objectContaining({ uci: 'e2e4', san: 'e4' })]);
    expect(calls[1]).toBe(calls[0]);
    expect(calls[2]).toBe(calls[0]);
  });

  it('rebuilds the Multi-PV array when the lines or their SAN actually change', () => {
    site.read.snapshot.fen = START_FEN;
    const first = [{ multipv: 1, uci: 'e2e4', pv: 'e2e4 e7e5', evaluation: { cp: 50 }, depth: 14 }];
    BotState.multiPvLines = first;

    ui.updateDisplay();
    // A new search replaces the source array, so the result must not be reused.
    BotState.multiPvLines = [{ multipv: 1, uci: 'g1f3', pv: 'g1f3 d7d5', evaluation: { cp: 30 }, depth: 14 }];
    ui.updateDisplay();

    const calls = panel.updateAnalysis.mock.calls.map(([next]) => next.multiPvLines);
    expect(calls[0][0].san).toBe('e4');
    expect(calls[1][0]).not.toBe(calls[0][0]);
    expect(calls[1][0].san).toBe('Nf3');
  });

  it('converts the suggested move against the adapter accepted FEN', () => {
    site.read.snapshot.fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    BotState.bestMove = 'e7e5';

    ui.updateDisplay();

    expect(panel.updateAnalysis).toHaveBeenLastCalledWith(expect.objectContaining({ bestMove: 'e5' }));
  });

  it('converts multiPv candidate lines to SAN against the accepted FEN', () => {
    site.read.snapshot.fen = START_FEN;
    BotState.multiPvLines = [
      { multipv: 1, uci: 'e2e4', pv: 'e2e4 e7e5', evaluation: { cp: 50 }, depth: 14 },
      { multipv: 2, uci: 'g1f3', pv: 'g1f3 d7d5', evaluation: { cp: 30 }, depth: 14 },
    ];

    ui.updateDisplay();

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

describe('presentation cleanup', () => {
  it('clears log entries without resetting game history', () => {
    const reset = vi.spyOn(gameHistoryTracker, 'reset');
    ui.clearConsole();
    expect(panel.clearLogs).toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
    reset.mockRestore();
  });
  it('sends explicit empty lines and trend data to clear stale presentation', () => {
    BotState.multiPvLines = undefined;
    BotState.evalHistory = [];
    ui.updateDisplay();
    expect(panel.updateAnalysis).toHaveBeenLastCalledWith(
      expect.objectContaining({ multiPvLines: [], evalHistory: [] }),
    );
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const panel = vi.hoisted(() => ({
  appendLog: vi.fn(),
  clearLogs: vi.fn(),
  updateAnalysis: vi.fn(),
  syncSettings: vi.fn(),
}));

vi.mock('../src/board.js', () => ({ updateEvaluationBar: vi.fn() }));
vi.mock('../src/panel.js', () => ({
  appendPanelLog: panel.appendLog,
  clearPanelLogs: panel.clearLogs,
  mountPanel: vi.fn(),
  syncPanelSettings: panel.syncSettings,
  updatePanelAnalysis: panel.updateAnalysis,
}));

import { BotState, invalidateGameCache } from '../src/state.js';
import { ui } from '../src/ui.js';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

beforeEach(() => {
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
    expect(panel.appendLog).toHaveBeenCalledWith('Eval: 0.32 | PV: e2e4 e7e5', 'info');
    expect(panel.appendLog).not.toHaveBeenCalledWith('Ready · D10 · 42 ms', 'status');
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
});

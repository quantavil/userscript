import { describe, expect, it } from 'vite-plus/test';
import { BotState } from '../../../src/app/state.js';
import { uciSequenceToSan } from '../../../src/chess/notation.js';
import { gameReportSignal, resetGameReport } from '../../../src/game/report/analyzer.js';
import { REPORT_DEPTH_MAX, REPORT_DEPTH_MIN } from '../../../src/settings/schema.js';
import { EvalTrendGraph, formatTrendValue } from '../../../src/ui/components/eval-trend-graph.js';
import { atDepthLimit, stepReportDepth } from '../../../src/ui/components/game-report-panel.js';
import { updatePanelSetting } from '../../../src/ui/panel.js';
import {
  getStatusTone,
  isErrorStatus,
  isRoutineStatus,
  isWorkingStatus,
  setupProblem,
} from '../../../src/ui/status.js';

describe('eval trend headline', () => {
  it('never renders a signed zero', () => {
    // `(-0.04).toFixed(1)` is "-0.0", which reads as a rendering bug rather than an even score.
    expect(formatTrendValue(-0.04)).toBe('0.0');
    expect(formatTrendValue(-0.001)).toBe('0.0');
    expect(formatTrendValue(0)).toBe('0.0');
  });

  it('keeps the sign for a real value in either direction', () => {
    expect(formatTrendValue(0.5)).toBe('+0.5');
    expect(formatTrendValue(-0.7)).toBe('-0.7');
    expect(formatTrendValue(1.25)).toBe('+1.3');
  });
});

describe('report depth stepper bounds', () => {
  it('moves one step inside the range', () => {
    expect(stepReportDepth(18, 1)).toBe(19);
    expect(stepReportDepth(18, -1)).toBe(17);
  });

  it('never offers a value the settings schema would reject', () => {
    expect(stepReportDepth(REPORT_DEPTH_MAX, 1)).toBe(REPORT_DEPTH_MAX);
    expect(stepReportDepth(REPORT_DEPTH_MIN, -1)).toBe(REPORT_DEPTH_MIN);
    expect(stepReportDepth(99, 1)).toBe(REPORT_DEPTH_MAX);
    expect(stepReportDepth(-5, -1)).toBe(REPORT_DEPTH_MIN);
  });

  it('reports which direction is unavailable', () => {
    expect(atDepthLimit(REPORT_DEPTH_MIN, -1)).toBe(true);
    expect(atDepthLimit(REPORT_DEPTH_MIN, 1)).toBe(false);
    expect(atDepthLimit(REPORT_DEPTH_MAX, 1)).toBe(true);
    expect(atDepthLimit(REPORT_DEPTH_MAX, -1)).toBe(false);
    expect(atDepthLimit(18, 1)).toBe(false);
    expect(atDepthLimit(18, -1)).toBe(false);
  });
});

describe('report progress state', () => {
  it('exposes an error string so the panel can offer a retry instead of looking idle', () => {
    resetGameReport();
    expect(gameReportSignal.value.error).toBeNull();

    gameReportSignal.value = {
      running: false,
      done: false,
      analyzed: 0,
      total: 40,
      report: null,
      error: 'Report analysis failed: engine down',
    };

    expect(gameReportSignal.value.error).toContain('engine down');
    // The state is not "done", so the action button still offers a regeneration.
    expect(gameReportSignal.value.done).toBe(false);
    resetGameReport();
    expect(gameReportSignal.value.error).toBeNull();
  });
});

describe('eval trend graph label', () => {
  it('labels subtitle as turns rather than plies', () => {
    const vnode = EvalTrendGraph({ history: [0.2, 0.4] });
    expect(JSON.stringify(vnode)).toContain('" turns"');
    expect(JSON.stringify(vnode)).not.toContain('plies');
  });
});

describe('PV UCI sequence to SAN formatting', () => {
  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const AFTER_E4_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

  it('formats full PV UCI sequences into SAN with move numbers when White starts', () => {
    expect(uciSequenceToSan(START_FEN, 'e2e4 e7e5 g1f3 b8c6')).toBe('1. e4 e5 2. Nf3 Nc6');
  });

  it('formats full PV UCI sequences into SAN with move numbers when Black starts', () => {
    expect(uciSequenceToSan(AFTER_E4_FEN, 'e7e5 g1f3 b8c6')).toBe('1... e5 2. Nf3 Nc6');
  });

  it('handles invalid or empty or hyphen sequences gracefully', () => {
    expect(uciSequenceToSan(START_FEN, '-')).toBe('-');
    expect(uciSequenceToSan(START_FEN, '')).toBe('');
    expect(uciSequenceToSan('not a fen', 'e2e4 e7e5')).toBe('e2e4 e7e5');
  });
});

describe('settings actions', () => {
  it('updates gameReport setting in BotState and storage', () => {
    updatePanelSetting('gameReport', false);
    expect(BotState.gameReport).toBe(false);

    updatePanelSetting('gameReport', true);
    expect(BotState.gameReport).toBe(true);
  });

  it('updates premove setting in BotState and storage', () => {
    updatePanelSetting('premove', false);
    expect(BotState.premove).toBe(false);

    updatePanelSetting('premove', true);
    expect(BotState.premove).toBe(true);
  });
});

describe('status classification and tone mapping', () => {
  it('identifies routine, error, and working statuses correctly', () => {
    expect(isRoutineStatus('Ready · D10 · 42 ms')).toBe(true);
    expect(isRoutineStatus('Stockfish worker crashed')).toBe(false);
    expect(isErrorStatus('Stockfish worker crashed')).toBe(true);
    expect(isWorkingStatus('Analyzing position...')).toBe(true);
    expect(setupProblem('Chess.com controller not captured')).toBe(true);
    expect(setupProblem('Ready')).toBe(false);
  });

  it('determines structured status tones accurately', () => {
    expect(getStatusTone('Stockfish worker crashed', true)).toBe('error');
    expect(getStatusTone('Analyzing move', true)).toBe('working');
    expect(getStatusTone('Ready', true)).toBe('ready');
    expect(getStatusTone('Ready', false)).toBe('idle');
  });
});

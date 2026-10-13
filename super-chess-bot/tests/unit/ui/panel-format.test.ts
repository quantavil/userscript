import { describe, expect, it } from 'vitest';
import { gameReportSignal, resetGameReport } from '../../../src/game/report/analyzer.js';
import { REPORT_DEPTH_MAX, REPORT_DEPTH_MIN } from '../../../src/settings/schema.js';
import { formatTrendValue } from '../../../src/ui/components/eval-trend-graph.js';
import { atDepthLimit, stepReportDepth } from '../../../src/ui/components/game-report-panel.js';

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

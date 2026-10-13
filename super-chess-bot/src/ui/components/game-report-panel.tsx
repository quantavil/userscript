import { gameHistoryTracker } from '../../game/history.js';
import type { PlayerReport } from '../../game/report/aggregate.js';
import { gameReportSignal } from '../../game/report/analyzer.js';
import { REPORT_DEPTH_MAX, REPORT_DEPTH_MIN } from '../../settings/schema.js';

/** Trailing-zero percentage so 92.4 reads as "92%" beside 97.5 reading as "98%". */
function percent(value: number | null): string {
  if (value == null) return '—';
  return `${Math.round(value)}%`;
}

/** Move the report depth by one step, clamped to the range the settings schema accepts. */
export function stepReportDepth(depth: number, direction: -1 | 1): number {
  return Math.min(REPORT_DEPTH_MAX, Math.max(REPORT_DEPTH_MIN, depth + direction));
}

export function atDepthLimit(depth: number, direction: -1 | 1): boolean {
  return direction < 0 ? depth <= REPORT_DEPTH_MIN : depth >= REPORT_DEPTH_MAX;
}

/** Accuracy band drives the colour, so a weak number is visible without reading it. */
function accuracyTone(value: number | null): string {
  if (value == null) return 'none';
  if (value >= 90) return 'high';
  if (value >= 75) return 'mid';
  return 'low';
}

function ReportPlayer({ label, report }: { label: string; report: PlayerReport }) {
  return (
    <div class="panel-report-player">
      <div class="panel-report-head">
        <span class="panel-report-name">{label}</span>
        <span class="panel-report-accuracy" data-tone={accuracyTone(report.accuracy)}>
          {percent(report.accuracy)}
        </span>
      </div>
      <dl class="panel-report-stats">
        <div class="panel-report-stat" data-kind="inaccuracy">
          <dt>{report.inaccuracy}</dt>
          <dd>Inaccuracies</dd>
        </div>
        <div class="panel-report-stat" data-kind="mistake">
          <dt>{report.mistake}</dt>
          <dd>Mistakes</dd>
        </div>
        <div class="panel-report-stat" data-kind="blunder">
          <dt>{report.blunder}</dt>
          <dd>Blunders</dd>
        </div>
        <div class="panel-report-stat" data-kind="acpl">
          <dt>{report.acpl.toFixed(0)}</dt>
          <dd>Avg centipawn loss</dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * Post-game accuracy summary, in the shape players already read on the big chess sites:
 * a headline accuracy per side, then the four damage counters.
 *
 * The numbers come from Lichess's open formulas against our own engine, not from the host site,
 * so they are labelled a local estimate rather than presented as the site's own review.
 */
export function GameReportPanel({
  reportDepth,
  onDepthChange,
  onGenerate,
  onCancel,
  canGenerate,
}: {
  reportDepth: number;
  onDepthChange: (depth: number) => void;
  onGenerate: () => void;
  onCancel: () => void;
  canGenerate: boolean;
}) {
  const progress = gameReportSignal.value;
  const moves = gameHistoryTracker.getMoves();
  const movesCount = moves.length;

  const decDepth = () => onDepthChange(stepReportDepth(reportDepth, -1));
  const incDepth = () => onDepthChange(stepReportDepth(reportDepth, 1));
  const atMinDepth = atDepthLimit(reportDepth, -1);
  const atMaxDepth = atDepthLimit(reportDepth, 1);

  return (
    <section class="panel-report" aria-label="Game report">
      <div class="panel-report-head">
        <span class="panel-report-title">Game report</span>
        <span class="panel-report-note">Local engine estimate</span>
      </div>

      <div class="panel-report-row">
        <div class="panel-report-stepper" title={`Search depth per move: ${reportDepth}`}>
          <button
            type="button"
            class="panel-report-step-btn"
            disabled={atMinDepth || progress.running}
            aria-label="Decrease depth"
            onClick={decDepth}
          >
            −
          </button>
          <span class="panel-report-depth-val">{reportDepth}</span>
          <button
            type="button"
            class="panel-report-step-btn"
            disabled={atMaxDepth || progress.running}
            aria-label="Increase depth"
            onClick={incDepth}
          >
            +
          </button>
        </div>

        <button
          type="button"
          class="panel-report-action-btn"
          disabled={!canGenerate || movesCount === 0 || progress.running}
          onClick={onGenerate}
        >
          {progress.running
            ? `Analyzing ${progress.analyzed}/${progress.total}…`
            : progress.done
              ? 'Regenerate report'
              : 'Generate report'}
        </button>

        {progress.running && (
          <button
            type="button"
            class="panel-report-cancel-btn"
            title="Cancel analysis"
            aria-label="Cancel analysis"
            onClick={onCancel}
          >
            ✕
          </button>
        )}
      </div>

      {progress.error && (
        <p class="panel-report-error" role="alert">
          {progress.error}
        </p>
      )}

      {progress.report && (
        <>
          <ReportPlayer label="White" report={progress.report.white} />
          <ReportPlayer label="Black" report={progress.report.black} />
        </>
      )}
    </section>
  );
}

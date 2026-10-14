/**
 * One-decimal display value for the trend headline.
 *
 * A tiny negative value rounds to `-0.0`, which reads as a rendering bug rather than an even
 * score, so it collapses to `0.0`.
 */
export function formatTrendValue(value: number): string {
  const text = value.toFixed(1);
  if (value > 0) return `+${text}`;
  return text === '-0.0' ? '0.0' : text;
}

export function EvalTrendGraph({ history }: { history?: number[] }) {
  if (!history || history.length < 2) return null;

  const width = 280;
  const height = 56;
  const startX = 26;
  const chartWidth = width - startX;
  const zeroY = height / 2;
  const maxEval = 10;
  const usableHalf = zeroY - 6;

  const coords = history.map((val, idx) => {
    const x = startX + (idx / (history.length - 1)) * (chartWidth - 2);
    const clamped = Math.max(-maxEval, Math.min(maxEval, val));
    const y = zeroY - (clamped / maxEval) * usableHalf;
    return { x, y };
  });

  const pathD = coords.reduce(
    (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`,
    '',
  );
  const lastX = coords[coords.length - 1].x.toFixed(1);
  const firstX = coords[0].x.toFixed(1);
  const areaD = `${pathD} L ${lastX},${zeroY} L ${firstX},${zeroY} Z`;
  const latest = coords[coords.length - 1];
  const latestVal = history[history.length - 1];
  const latestFormatted = formatTrendValue(latestVal);
  const valTone = latestVal > 0.3 ? 'sage' : latestVal < -0.3 ? 'brick' : 'brass';

  return (
    <div class="panel-trend">
      <div class="panel-trend-head">
        <div class="panel-trend-label-wrap">
          <span class="panel-trend-title">Eval Trend</span>
          <span class="panel-trend-subtitle">{history.length} turns</span>
        </div>
        <span class="panel-trend-val" data-tone={valTone}>
          {latestFormatted}
        </span>
      </div>
      <div class="panel-trend-box">
        <svg class="panel-trend-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="scb-eval-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--sage)" stop-opacity="0.22" />
              <stop offset="50%" stop-color="var(--brass)" stop-opacity="0.08" />
              <stop offset="100%" stop-color="var(--brick)" stop-opacity="0.22" />
            </linearGradient>
          </defs>

          {/* Left Y-axis labels: +10, 0, -10 */}
          <text x="21" y="10" text-anchor="end" class="panel-trend-axis-text">
            +10
          </text>
          <text x="21" y={zeroY + 3} text-anchor="end" class="panel-trend-axis-text">
            0
          </text>
          <text x="21" y="52" text-anchor="end" class="panel-trend-axis-text">
            -10
          </text>

          {/* Single horizontal dotted zero row */}
          <line
            x1={startX}
            y1={zeroY}
            x2={width - 2}
            y2={zeroY}
            stroke="var(--muted)"
            stroke-dasharray="3 3"
            stroke-width="1"
            stroke-opacity="0.6"
          />

          {/* Shaded Area and Trend Line */}
          <path d={areaD} fill="url(#scb-eval-fill)" />
          <path d={pathD} fill="none" stroke="var(--brass)" stroke-width="1.75" stroke-linejoin="round" />

          {/* Latest Point Indicator */}
          <circle
            cx={latest.x}
            cy={latest.y}
            r="4"
            fill="none"
            stroke="var(--brass)"
            stroke-width="1.2"
            stroke-opacity="0.6"
          />
          <circle cx={latest.x} cy={latest.y} r="2.2" fill="var(--brass)" />
        </svg>
      </div>
    </div>
  );
}

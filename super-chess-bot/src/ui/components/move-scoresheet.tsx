import type { MovePairView } from '../../game/history.js';

/**
 * One per-ply time cell: a proportional fill bar plus its label.
 *
 * The bar is what makes the column scannable. `1.6s` has to be read, but a bar's length can be
 * compared against the row above at a glance, so "opponent spent three times longer here"
 * becomes visible without reading a single number.
 */
function MoveTime({ ms, max }: { ms: number | null | undefined; max: number }) {
  if (ms == null) return <span class="panel-scoresheet-time" />;
  const fill = max > 0 ? Math.max(6, Math.min(100, Math.round((ms / max) * 100))) : 6;
  return (
    <span class="panel-scoresheet-time" title={`${(ms / 1000).toFixed(1)}s`}>
      <span class="panel-scoresheet-bar" style={{ '--fill': `${fill}%` }} aria-hidden="true" />
      <span class="panel-scoresheet-time-label">{(ms / 1000).toFixed(1)}s</span>
    </span>
  );
}

export function MoveScoresheet({ pairs }: { pairs: readonly MovePairView[] }) {
  // The longest recorded time sets the bar scale, so every row is comparable within one game.
  const max = pairs.reduce((peak, pair) => Math.max(peak, pair.white?.elapsedMs ?? 0, pair.black?.elapsedMs ?? 0), 0);
  const lastPly = pairs.at(-1);
  const lastNumber = lastPly?.moveNumber ?? -1;

  return (
    <div class="panel-scoresheet">
      {pairs.map((pair) => {
        const isLastPair = pair.moveNumber === lastNumber;
        const whiteActive = isLastPair && pair.black == null;
        const blackActive = isLastPair && pair.black != null;
        return (
          <div
            key={pair.moveNumber}
            class="panel-scoresheet-row"
            data-stripe={pair.moveNumber % 2 === 0 ? 'even' : 'odd'}
          >
            <span class="panel-scoresheet-num">{pair.moveNumber}.</span>
            <span class="panel-scoresheet-move" data-turn="w" data-active={whiteActive || undefined}>
              {pair.white?.san ?? ''}
            </span>
            <span class="panel-scoresheet-move" data-turn="b" data-active={blackActive || undefined}>
              {pair.black?.san ?? ''}
            </span>
            <MoveTime ms={pair.white?.elapsedMs} max={max} />
            <MoveTime ms={pair.black?.elapsedMs} max={max} />
          </div>
        );
      })}
    </div>
  );
}

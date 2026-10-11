import type { SiteRecord } from '../types';
import { formatDate, formatRank, formatRankChange } from './format';

function TrancoLink(props: { domain: string; label: string }) {
  return (
    <a
      href={`https://tranco-list.eu/?query=${encodeURIComponent(props.domain)}`}
      target="_blank"
      rel="noreferrer"
      class="so-btn-link"
    >
      {props.label} ↗
    </a>
  );
}

function Unranked(props: { record: SiteRecord; onRefresh: () => void }) {
  const unlisted = props.record.status === 'no-data';
  return (
    <section class="so-empty">
      <p>{unlisted ? 'Domain outside Tranco Top 1M list (Unranked).' : 'Global rank signal unavailable.'}</p>
      {!unlisted && props.record.errorCode && <code>{props.record.errorCode}</code>}
      <div class="so-empty-actions">
        <button type="button" onClick={props.onRefresh}>
          Retry scan
        </button>
        <TrancoLink domain={props.record.domain} label="Tranco List" />
      </div>
    </section>
  );
}

export function Snapshot(props: { record: SiteRecord; collectionStatus: string; onRefresh: () => void }) {
  const stats = props.record.stats;
  if (!stats) return <Unranked record={props.record} onRefresh={props.onRefresh} />;

  const history = stats.rankHistory;
  const ranks = history.map((p) => p.rank);
  const minRank = ranks.length ? Math.min(...ranks) : (stats.globalRank ?? 0);
  const maxRank = ranks.length ? Math.max(...ranks) : (stats.globalRank ?? 0);
  const rankSpread = Math.max(1, maxRank - minRank);

  return (
    <section class="so-snapshot">
      <div class="so-signal-meta">
        <span>TRANCO TOP 1M RANK</span>
        {props.record.status === 'error' ? (
          <span>stale · {props.record.errorCode ?? 'refresh failed'}</span>
        ) : props.collectionStatus === 'loading' ? (
          <span>refreshing…</span>
        ) : null}
      </div>

      {stats.description && <p class="so-desc">“{stats.description}”</p>}

      {stats.globalRank !== null ? (
        <>
          <div class="so-hero-zone">
            <div class="so-orbit" role="img" aria-label={`Global rank ${formatRank(stats.globalRank)}`}>
              <i />
              <i />
              <div>
                <small>GLOBAL RANK</small>
                <strong>{formatRank(stats.globalRank)}</strong>
                <em>
                  {stats.globalRankChange === null
                    ? '—'
                    : `${stats.globalRankChange > 0 ? '↑' : stats.globalRankChange < 0 ? '↓' : '='} ${formatRankChange(stats.globalRankChange)} (30d)`}
                </em>
              </div>
            </div>
          </div>

          {history.length > 1 && (
            <div class="so-sparkline-box">
              <div class="so-sparkline-label">
                <span>30-Day Rank History</span>
                <span>{history.length} snapshots</span>
              </div>
              <div class="so-sparkline-bars" role="img" aria-label="30-day rank sparkline">
                {history
                  .slice(0, 30)
                  .reverse()
                  .map((point) => {
                    const heightPct = 15 + ((maxRank - point.rank) / rankSpread) * 75;
                    return (
                      <span
                        key={point.date}
                        title={`${point.date}: #${point.rank.toLocaleString()}`}
                        style={{ height: `${heightPct}%` }}
                      />
                    );
                  })}
              </div>
            </div>
          )}

          <div class="so-ranks">
            <div>
              <small>CURRENT</small>
              <b>{formatRank(stats.globalRank)}</b>
              <em>{formatRankChange(stats.globalRankChange)}</em>
            </div>
            <div>
              <small>30D PEAK</small>
              <b>{formatRank(minRank)}</b>
              <em>best</em>
            </div>
            <div>
              <small>30D LOW</small>
              <b>{formatRank(maxRank)}</b>
              <em>trough</em>
            </div>
          </div>
        </>
      ) : (
        <Unranked record={props.record} onRefresh={props.onRefresh} />
      )}

      {stats.tech && stats.tech.length > 0 && (
        <>
          <div class="so-section-title">
            <span>TECH STACK DETECTED</span>
            <small>{stats.tech.length} detected</small>
          </div>
          <div class="so-badges">
            {stats.tech.map((t) => (
              <span key={t.name} class={`so-badge is-${t.category}`}>
                {t.name}
              </span>
            ))}
          </div>
        </>
      )}

      {stats.dns && (
        <>
          <div class="so-section-title">
            <span>INFRASTRUCTURE & DNS</span>
          </div>
          <div class="so-telemetry-grid">
            <div class="so-telemetry-card">
              <small>DNS / CDN</small>
              <strong>{stats.dns.nameserverProvider ?? 'Custom DNS'}</strong>
              {stats.dns.nameservers[0] && <em>{stats.dns.nameservers[0]}</em>}
            </div>
            <div class="so-telemetry-card">
              <small>MAIL SERVER</small>
              <strong>{stats.dns.mailProvider ?? 'Custom / None'}</strong>
              {stats.dns.mailServers[0] && <em>{stats.dns.mailServers[0]}</em>}
            </div>
          </div>
        </>
      )}

      {stats.performance && (
        <>
          <div class="so-section-title">
            <span>PAGE PERFORMANCE</span>
            {stats.performance.protocol && <small>{stats.performance.protocol}</small>}
          </div>
          <div class="so-telemetry-grid">
            <div class="so-telemetry-card">
              <small>TIME TO FIRST BYTE</small>
              <strong>{stats.performance.ttfbMs !== null ? `${stats.performance.ttfbMs} ms` : '—'}</strong>
            </div>
            <div class="so-telemetry-card">
              <small>PAGE LOAD TIME</small>
              <strong>
                {stats.performance.loadTimeMs !== null
                  ? `${(stats.performance.loadTimeMs / 1000).toFixed(2)} s`
                  : '—'}
              </strong>
            </div>
            <div class="so-telemetry-card">
              <small>TOTAL TRANSFERRED</small>
              <strong>
                {stats.performance.transferBytes !== null
                  ? `${(stats.performance.transferBytes / 1024).toFixed(1)} KB`
                  : '—'}
              </strong>
            </div>
            <div class="so-telemetry-card">
              <small>TOTAL REQUESTS</small>
              <strong>{stats.performance.resourceCount} assets</strong>
            </div>
          </div>
        </>
      )}

      <div class="so-section-title">
        <span>OBSERVATORY TELEMETRY</span>
        <TrancoLink domain={props.record.domain} label="Tranco Report" />
      </div>

      <dl class="so-metrics">
        <div>
          <dt>Local visits</dt>
          <dd>{props.record.visitCount}×</dd>
        </div>
        <div>
          <dt>First seen</dt>
          <dd>{formatDate(props.record.firstVisitedAt)}</dd>
        </div>
        <div>
          <dt>Last visit</dt>
          <dd>{formatDate(props.record.lastVisitedAt)}</dd>
        </div>
      </dl>
    </section>
  );
}

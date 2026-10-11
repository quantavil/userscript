import { useMemo, useState } from 'preact/hooks';
import type { SiteRecord, SortDirection, SortKey } from '../types';
import { formatDate, formatRank, formatRankChange } from './format';

function valueFor(record: SiteRecord, key: SortKey): string | number | null {
  if (key === 'domain') return record.domain;
  if (key === 'globalRank') return record.stats?.globalRank ?? null;
  return record[key];
}

export function sortRecords(records: SiteRecord[], key: SortKey, direction: SortDirection): SiteRecord[] {
  const multiplier = direction === 'asc' ? 1 : -1;
  return [...records].sort((left, right) => {
    const a = valueFor(left, key);
    const b = valueFor(right, key);
    if (a === null && b === null) return left.domain.localeCompare(right.domain);
    if (a === null) return 1; // missing ranks always last, in either direction
    if (b === null) return -1;
    const compared =
      typeof a === 'string' && typeof b === 'string' ? a.localeCompare(b) : Number(a) - Number(b);
    return compared === 0 ? left.domain.localeCompare(right.domain) : compared * multiplier;
  });
}

export function Leaderboard(props: {
  records: SiteRecord[];
  currentDomain: string;
  onSelect: (record: SiteRecord) => void;
  onDelete: (domain: string) => void;
  onClear: () => void;
  onExport: () => void;
}) {
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('globalRank');
  const [direction, setDirection] = useState<SortDirection>('asc');

  const rows = useMemo(
    () =>
      sortRecords(
        props.records.filter((record) => record.domain.includes(filter.trim().toLowerCase())),
        sortKey,
        direction,
      ),
    [props.records, filter, sortKey, direction],
  );

  // Ascending is the useful default for rank (#1 first); everything else reads best newest/largest first.
  const applySort = (key: SortKey) => {
    setSortKey(key);
    setDirection(key === 'globalRank' || key === 'domain' ? 'asc' : 'desc');
  };
  const changeSort = (key: SortKey) => {
    if (key === sortKey) setDirection(direction === 'asc' ? 'desc' : 'asc');
    else applySort(key);
  };

  return (
    <section class="so-leaderboard">
      <div class="so-tools">
        <label>
          Filter domains
          <input
            aria-label="Filter domains"
            type="search"
            value={filter}
            placeholder="Search…"
            onInput={(event) => setFilter(event.currentTarget.value)}
          />
        </label>
        <div class="so-sort">
          <label>
            Sort
            <select
              aria-label="Sort leaderboard"
              value={sortKey}
              onChange={(event) => applySort(event.currentTarget.value as SortKey)}
            >
              <option value="globalRank">Global rank</option>
              <option value="visitCount">Visit count</option>
              <option value="domain">Domain</option>
              <option value="lastVisitedAt">Last visited</option>
              <option value="capturedAt">Refreshed</option>
            </select>
          </label>
          <button
            type="button"
            title={`Reverse sort direction (${direction === 'asc' ? 'ascending' : 'descending'})`}
            aria-label={`Reverse sort direction, currently ${direction === 'asc' ? 'ascending' : 'descending'}`}
            onClick={() => setDirection(direction === 'asc' ? 'desc' : 'asc')}
          >
            {direction === 'desc' ? '↓' : '↑'} {rows.length}/{props.records.length}
          </button>
        </div>
      </div>

      <div class="so-table">
        <div class="so-tr so-th">
          <span>#</span>
          <button
            type="button"
            aria-label={`Sort by domain, ${sortKey === 'domain' ? direction : 'inactive'}`}
            onClick={() => changeSort('domain')}
          >
            Domain {sortKey === 'domain' ? (direction === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button
            type="button"
            aria-label={`Sort by global rank, ${sortKey === 'globalRank' ? direction : 'inactive'}`}
            onClick={() => changeSort('globalRank')}
          >
            Global Rank {sortKey === 'globalRank' ? (direction === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button
            type="button"
            aria-label={`Sort by visit count, ${sortKey === 'visitCount' ? direction : 'inactive'}`}
            onClick={() => changeSort('visitCount')}
          >
            Visits {sortKey === 'visitCount' ? (direction === 'asc' ? '↑' : '↓') : ''}
          </button>
          <span />
        </div>

        {rows.map((record, index) => (
          <div
            class={`so-tr ${record.domain === props.currentDomain ? 'is-current' : ''}`}
            key={record.domain}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <button type="button" class="so-domain" onClick={() => props.onSelect(record)}>
              {record.domain}
              <small>
                {record.status} · visited {record.visitCount}×
              </small>
            </button>
            <span class="so-rank-cell">
              <b>{formatRank(record.stats?.globalRank ?? null)}</b>
              {record.stats?.globalRankChange != null && (
                <em>{formatRankChange(record.stats.globalRankChange)}</em>
              )}
            </span>
            <span>{record.visitCount}×</span>
            <button
              type="button"
              class="so-delete"
              aria-label={`Delete ${record.domain}`}
              onClick={() => props.onDelete(record.domain)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {!rows.length && <p class="so-empty-row">No domains match this filter.</p>}

      <footer class="so-view-footer">
        <span>
          Updated{' '}
          {formatDate(props.records.reduce((max, record) => Math.max(max, record.capturedAt ?? 0), 0))}
        </span>
        <div>
          <button type="button" onClick={props.onExport}>
            Export JSON
          </button>
          <button type="button" onClick={props.onClear}>
            Clear all
          </button>
        </div>
      </footer>
    </section>
  );
}

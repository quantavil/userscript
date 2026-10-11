import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/preact';
import type { SiteRecord } from '../src/types';
import { App } from '../src/ui/App';
import { formatDate, formatRank, formatRankChange } from '../src/ui/format';
import { Leaderboard, sortRecords } from '../src/ui/Leaderboard';
import { Snapshot } from '../src/ui/Snapshot';
import { makeStats } from './factories';

function record(domain: string, rank: number | null, visits = 1): SiteRecord {
  const stats = rank !== null ? makeStats(domain, rank) : null;
  return {
    schemaVersion: 1,
    domain,
    firstVisitedAt: 1,
    lastVisitedAt: 2,
    visitCount: visits,
    capturedAt: 4,
    expiresAt: Date.now() + 1_000,
    status: stats ? 'ready' : 'no-data',
    retryAfter: null,
    errorCode: null,
    stats,
  };
}

describe('Signal Observatory UI', () => {
  test('formats compact values, ranks, and dates', () => {
    expect(formatRank(29)).toBe('#29');
    expect(formatRank(null)).toBe('—');
    expect(formatRankChange(2)).toBe('+2');
    expect(formatRankChange(-5)).toBe('-5');
    expect(formatDate(0)).toBe('never');
    expect(formatDate(null)).toBe('never');
  });

  test('renders the snapshot and Tranco rank, tech stack, DNS, and performance', () => {
    const current = record('github.com', 29, 12);
    render(<Snapshot record={current} collectionStatus="ready" onRefresh={() => {}} />);
    expect(screen.getByText('TRANCO TOP 1M RANK')).toBeTruthy();
    expect(screen.getAllByText('#29').length).toBeGreaterThan(0);
    expect(screen.getByText('12×')).toBeTruthy();
    expect(screen.getByText('Tranco Report ↗')).toBeTruthy();

    // Verify rich metadata sections
    expect(screen.getByText('TECH STACK DETECTED')).toBeTruthy();
    expect(screen.getByText('React')).toBeTruthy();
    expect(screen.getByText('Next.js')).toBeTruthy();
    expect(screen.getByText('INFRASTRUCTURE & DNS')).toBeTruthy();
    expect(screen.getByText('AWS Route 53')).toBeTruthy();
    expect(screen.getByText('Google Workspace')).toBeTruthy();
    expect(screen.getByText('PAGE PERFORMANCE')).toBeTruthy();
    expect(screen.getByText('120 ms')).toBeTruthy();
    expect(screen.getByText('HTTP/3')).toBeTruthy();
  });

  test('labels unranked domains clearly', () => {
    const current = record('unranked.xyz', null, 1);
    render(<Snapshot record={current} collectionStatus="ready" onRefresh={() => {}} />);
    expect(screen.getByText(/Domain outside Tranco Top 1M list/i)).toBeTruthy();
    expect(screen.getByText(/Tranco List ↗/i)).toBeTruthy();
  });

  test('sorts ranks ascending (rank 1 first) and filters leaderboard rows', () => {
    const records = [
      record('google.com', 1, 100),
      record('github.com', 29, 50),
      record('unranked.xyz', null, 5),
    ];
    expect(sortRecords(records, 'globalRank', 'asc').map((item) => item.domain)).toEqual([
      'google.com',
      'github.com',
      'unranked.xyz',
    ]);

    render(
      <Leaderboard
        records={records}
        currentDomain="github.com"
        onSelect={() => {}}
        onDelete={() => {}}
        onClear={() => {}}
        onExport={() => {}}
      />,
    );
    expect(screen.getByLabelText('Sort leaderboard')).toBeTruthy();
    fireEvent.input(screen.getByLabelText('Filter domains'), { target: { value: 'google' } });
    expect(screen.getByText('google.com')).toBeTruthy();
    expect(screen.queryByText('github.com')).toBeNull();
  });

  test('switches tabs and closes with Escape', () => {
    let closed = false;
    const view = render(
      <App
        domain="example.com"
        currentRecord={record('example.com', 100, 5)}
        records={[record('example.com', 100, 5)]}
        collectionStatus="ready"
        onRefresh={async () => {}}
        onDelete={() => {}}
        onClear={() => {}}
        onExport={() => {}}
        onClose={() => {
          closed = true;
        }}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: /leaderboard/i }));
    expect(screen.getByLabelText('Filter domains')).toBeTruthy();
    expect(view.container.querySelector('.so-panel')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(closed).toBe(true);
  });

  test('clicking header refresh button triggers onRefresh', async () => {
    let refreshed = false;
    const current = record('example.com', 42);

    render(
      <App
        domain="example.com"
        currentRecord={current}
        records={[current]}
        collectionStatus="ready"
        onRefresh={async () => {
          refreshed = true;
        }}
        onDelete={() => {}}
        onClear={() => {}}
        onExport={() => {}}
        onClose={() => {}}
      />,
    );

    const refreshBtn = screen.getByRole('button', { name: /refresh global rank/i });
    expect(refreshBtn).toBeTruthy();
    fireEvent.click(refreshBtn);
    expect(refreshed).toBe(true);
  });
});

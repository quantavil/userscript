import { useEffect, useRef, useState } from 'preact/hooks';
import { faviconUrl } from '../telemetry';
import type { SiteRecord } from '../types';
import { Leaderboard } from './Leaderboard';
import { Snapshot } from './Snapshot';

export function App(props: {
  domain: string;
  currentRecord: SiteRecord;
  records: SiteRecord[];
  collectionStatus: string;
  onRefresh: (domain: string) => Promise<void>;
  onDelete: (domain: string) => void;
  onClear: () => void;
  onExport: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'snapshot' | 'leaderboard'>('snapshot');
  const [selectedDomain, setSelectedDomain] = useState<string>(props.domain);
  const [refreshingDomain, setRefreshingDomain] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selectedRecord =
    (selectedDomain === props.domain
      ? props.currentRecord
      : props.records.find((record) => record.domain === selectedDomain)) ?? props.currentRecord;

  useEffect(() => {
    // Move focus into the dialog so Esc, Tab and screen readers land inside it.
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') props.onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [props.onClose]);

  const current = tab === 'snapshot' ? selectedRecord : props.currentRecord;
  const isLoading =
    refreshingDomain === current.domain ||
    (current.domain === props.domain && props.collectionStatus === 'loading');

  const triggerRefresh = async () => {
    setRefreshingDomain(current.domain);
    try {
      await props.onRefresh(current.domain);
    } finally {
      setRefreshingDomain(null);
    }
  };

  return (
    <div class="so-panel" role="dialog" aria-modal="true" aria-label="SiteOrbit" tabIndex={-1} ref={panelRef}>
      <header class="so-header">
        <div class="so-header-title">
          <small>SITEORBIT · OBSERVATORY</small>
          <div class="so-header-brand">
            <img
              src={current.stats?.faviconUrl ?? faviconUrl(current.domain)}
              alt=""
              class="so-favicon"
              onError={(event) => {
                event.currentTarget.style.visibility = 'hidden';
              }}
            />
            <strong>{current.domain}</strong>
          </div>
        </div>
        <div class="so-header-actions">
          <button
            type="button"
            class={`so-icon-btn ${isLoading ? 'is-spinning' : ''}`}
            aria-label="Refresh global rank signal"
            title="Refresh global rank signal"
            disabled={isLoading}
            onClick={triggerRefresh}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M13.65 2.35A7.958 7.958 0 0 0 8 0a8 8 0 1 0 8 8h-2a6 6 0 1 1-1.76-4.24l-2.24 2.24h6V0l-2.35 2.35z" />
            </svg>
          </button>
          <button
            type="button"
            class="so-icon-btn"
            aria-label="Close SiteOrbit"
            title="Close (Esc)"
            onClick={props.onClose}
          >
            ✕
          </button>
        </div>
      </header>

      <div class="so-tabs" role="tablist" aria-label="SiteOrbit sections">
        <button
          type="button"
          role="tab"
          id="so-tab-snapshot"
          aria-controls="so-tabpanel"
          aria-selected={tab === 'snapshot'}
          onClick={() => setTab('snapshot')}
        >
          Snapshot
        </button>
        <button
          type="button"
          role="tab"
          id="so-tab-leaderboard"
          aria-controls="so-tabpanel"
          aria-selected={tab === 'leaderboard'}
          onClick={() => setTab('leaderboard')}
        >
          Leaderboard · {props.records.length}
        </button>
      </div>

      <div
        class="so-content"
        id="so-tabpanel"
        role="tabpanel"
        aria-labelledby={tab === 'snapshot' ? 'so-tab-snapshot' : 'so-tab-leaderboard'}
      >
        {tab === 'snapshot' ? (
          <Snapshot
            record={selectedRecord}
            collectionStatus={
              refreshingDomain === selectedRecord.domain
                ? 'loading'
                : selectedRecord.domain === props.domain
                  ? props.collectionStatus
                  : selectedRecord.status
            }
            onRefresh={triggerRefresh}
          />
        ) : (
          <Leaderboard
            records={props.records}
            currentDomain={props.domain}
            onSelect={(record) => {
              setSelectedDomain(record.domain);
              setTab('snapshot');
            }}
            onDelete={props.onDelete}
            onClear={props.onClear}
            onExport={props.onExport}
          />
        )}
      </div>
    </div>
  );
}

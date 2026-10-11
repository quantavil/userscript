export interface RankPoint {
  date: string;
  rank: number;
}

export interface DnsInfo {
  nameservers: string[];
  nameserverProvider: string | null;
  mailServers: string[];
  mailProvider: string | null;
  hasIpv6: boolean;
}

export type TechCategory = 'framework' | 'cms' | 'ui' | 'analytics' | 'cdn' | 'observability';

export interface TechItem {
  name: string;
  category: TechCategory;
}

export interface PerformanceMetrics {
  ttfbMs: number | null;
  loadTimeMs: number | null;
  transferBytes: number | null;
  protocol: string | null;
  resourceCount: number;
}

export interface SiteStats {
  domain: string;
  globalRank: number | null;
  globalRankChange: number | null; // e.g. +1 (improved), -3 (dropped)
  rankHistory: RankPoint[];
  capturedAt: number;
  dns?: DnsInfo | null;
  tech?: TechItem[];
  performance?: PerformanceMetrics | null;
  description?: string | null;
  faviconUrl?: string | null;
}

export type RecordStatus = 'ready' | 'no-data' | 'error';

export interface SiteRecord {
  schemaVersion: 1;
  domain: string;
  firstVisitedAt: number;
  lastVisitedAt: number;
  visitCount: number;
  capturedAt: number | null;
  expiresAt: number | null;
  status: RecordStatus;
  retryAfter: number | null;
  errorCode: string | null;
  stats: SiteStats | null;
}

export type CollectionState =
  | { status: 'idle'; record: SiteRecord | null }
  | { status: 'loading'; record: SiteRecord | null }
  | { status: 'ready'; record: SiteRecord }
  | { status: 'error'; record: SiteRecord; code: string };

export type SortKey = 'domain' | 'globalRank' | 'lastVisitedAt' | 'capturedAt' | 'visitCount';
export type SortDirection = 'asc' | 'desc';

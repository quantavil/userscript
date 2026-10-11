export type WatchedMode = 'dim' | 'hide' | 'off';

export interface FilterProfile {
  name: string;
  minViews: number;
  maxViews: number;
  minDays: number;
  maxDays: number;
  minDuration: number;
  maxDuration: number;
  keywordBlacklist: string[];
  channelBlacklist: string[];
  channelWhitelist: string[];
  watchedMode: WatchedMode;
  hideShorts: boolean;
  hidePosts: boolean;
}

export interface FilterState {
  minViews: number;
  maxViews: number;
  minDays: number;
  maxDays: number;
  minDuration: number;
  maxDuration: number;
  keywordBlacklist: string[];
  channelBlacklist: string[];
  channelWhitelist: string[];
  watchedMode: WatchedMode;
  hideShorts: boolean;
  hidePosts: boolean;
  enabled: boolean;
  activeProfile?: string;
}

export interface RawFilterState {
  minViews?: number;
  maxViews?: number | null;
  minDays?: number;
  maxDays?: number | null;
  minDuration?: number;
  maxDuration?: number | null;
  keywordBlacklist?: string[];
  channelBlacklist?: string[];
  channelWhitelist?: string[];
  watchedMode?: WatchedMode;
  hideShorts?: boolean;
  hidePosts?: boolean;
  enabled?: boolean;
  activeProfile?: string;
}

export interface VideoMeta {
  views: number;
  daysAgo: number;
  duration: number;
  title: string;
  channel: string;
  isWatched: boolean;
}

export interface ValidationResult<T = number | string | null> {
  valid: boolean;
  error?: string;
  value?: T;
}

export interface FormValidationResult {
  valid: boolean;
  minViews?: number | null;
  maxViews?: number | null;
  minDate?: string | null;
  maxDate?: string | null;
  minDur?: number | null;
  maxDur?: number | null;
}

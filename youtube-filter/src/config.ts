import type { FilterProfile, FilterState } from './types';

export const STORAGE_KEY = 'ytVideoFilter:v3';
export const PROFILES_STORAGE_KEY = 'ytVideoFilter:profiles:v1';

export const VIDEO_HOST_SELECTORS: readonly string[] = [
  'ytd-rich-item-renderer',
  'ytd-video-renderer',
  'ytd-grid-video-renderer',
  'ytd-compact-video-renderer',
  'yt-lockup-view-model',
  'ytd-reel-item-renderer',
  'ytm-video-with-context-renderer',
  'ytm-compact-video-renderer',
  'ytm-reel-item-renderer',
  'ytm-rich-item-renderer',
  'ytd-reel-shelf-renderer',
  'ytd-rich-shelf-renderer',
  'ytd-rich-section-renderer',
  'ytd-post-renderer',
  'ytd-backstage-post-renderer',
  'yt-post-item-view-model'
];

export const DEFAULT_FILTERS: Readonly<FilterState> = Object.freeze({
  minViews: 0,
  maxViews: Infinity,
  minDays: 0,
  maxDays: Infinity,
  minDuration: 0,
  maxDuration: Infinity,
  keywordBlacklist: [],
  channelBlacklist: [],
  channelWhitelist: [],
  watchedMode: 'dim',
  hideShorts: false,
  hidePosts: false,
  enabled: false,
  activeProfile: 'Default'
});

export const DEFAULT_PROFILES: readonly FilterProfile[] = [
  {
    name: 'Default',
    minViews: 0,
    maxViews: Infinity,
    minDays: 0,
    maxDays: Infinity,
    minDuration: 0,
    maxDuration: Infinity,
    keywordBlacklist: [],
    channelBlacklist: [],
    channelWhitelist: [],
    watchedMode: 'dim',
    hideShorts: false,
    hidePosts: false
  }
];

import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyFiltersToDOM,
  evaluateVideo,
  getVideoMeta,
  isPost,
  isShorts,
  isVideoWatched,
  matchesChannelList,
  matchesFilter,
  matchesKeywordBlacklist
} from '../src/filter';
import type { FilterState } from '../src/types';

describe('filter.ts', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const createVideoCard = (options: {
    views?: string;
    time?: string;
    duration?: string;
    title?: string;
    channel?: string;
    isShorts?: boolean;
    isWatched?: boolean;
    watchedWidth?: string;
    ariaLabel?: string;
  }): HTMLElement => {
    const card = document.createElement('ytd-rich-item-renderer');

    if (options.isShorts) {
      const link = document.createElement('a');
      link.href = '/shorts/abc123xyz';
      card.appendChild(link);
      return card;
    }

    // Title
    if (options.title) {
      const titleLink = document.createElement('a');
      titleLink.id = 'video-title';
      titleLink.textContent = options.title;
      card.appendChild(titleLink);
    }

    // Channel
    if (options.channel) {
      const channelEl = document.createElement('ytd-channel-name');
      const textSpan = document.createElement('span');
      textSpan.id = 'text';
      textSpan.textContent = options.channel;
      channelEl.appendChild(textSpan);
      card.appendChild(channelEl);
    }

    // Metadata line
    const metaLine = document.createElement('div');
    metaLine.id = 'metadata-line';

    if (options.views) {
      const vSpan = document.createElement('span');
      vSpan.textContent = options.views;
      metaLine.appendChild(vSpan);
    }

    if (options.time) {
      const tSpan = document.createElement('span');
      tSpan.textContent = options.time;
      metaLine.appendChild(tSpan);
    }
    card.appendChild(metaLine);

    // Duration overlay
    if (options.duration) {
      const overlay = document.createElement(
        'ytd-thumbnail-overlay-time-status-renderer'
      );
      const textSpan = document.createElement('span');
      textSpan.id = 'text';
      textSpan.textContent = options.duration;
      overlay.appendChild(textSpan);
      card.appendChild(overlay);
    }

    // Watched progress bar overlay
    if (options.isWatched || options.watchedWidth) {
      const resumeRenderer = document.createElement('ytd-thumbnail-overlay-resume-playback-renderer');
      const progressBar = document.createElement('div');
      progressBar.id = 'progress';
      progressBar.style.width = options.watchedWidth || '85%';
      resumeRenderer.appendChild(progressBar);
      card.appendChild(resumeRenderer);
    }

    // Aria-label fallback on thumbnail
    if (options.ariaLabel) {
      const thumb = document.createElement('ytd-thumbnail');
      thumb.setAttribute('aria-label', options.ariaLabel);
      card.appendChild(thumb);
    }

    return card;
  };

  describe('isShorts', () => {
    it('detects shorts links correctly', () => {
      const shortsCard = createVideoCard({ isShorts: true });
      expect(isShorts(shortsCard)).toBe(true);

      const normalCard = createVideoCard({ views: '10K views' });
      expect(isShorts(normalCard)).toBe(false);
    });

    it('detects is-shorts attribute and shorts shelf renderer', () => {
      const el = document.createElement('ytd-video-renderer');
      el.setAttribute('is-shorts', '');
      expect(isShorts(el)).toBe(true);

      const shelf = document.createElement('ytd-reel-shelf-renderer');
      expect(isShorts(shelf)).toBe(true);
    });
  });

  describe('isPost', () => {
    it('detects community post elements', () => {
      const postCard = document.createElement('ytd-post-renderer');
      expect(isPost(postCard)).toBe(true);

      const backstage = document.createElement('ytd-backstage-post-renderer');
      expect(isPost(backstage)).toBe(true);

      const lockupPost = document.createElement('yt-post-item-view-model');
      expect(isPost(lockupPost)).toBe(true);

      const richItemWithPost = document.createElement('ytd-rich-item-renderer');
      richItemWithPost.appendChild(document.createElement('yt-post-item-view-model'));
      expect(isPost(richItemWithPost)).toBe(true);

      const normalVideo = createVideoCard({ views: '10K views' });
      expect(isPost(normalVideo)).toBe(false);
    });
  });

  describe('isVideoWatched', () => {
    it('identifies watched videos with >= 70% progress', () => {
      const watched = createVideoCard({ watchedWidth: '85%' });
      expect(isVideoWatched(watched)).toBe(true);

      const exactly70 = createVideoCard({ watchedWidth: '70%' });
      expect(isVideoWatched(exactly70)).toBe(true);

      const barelyWatched = createVideoCard({ watchedWidth: '30%' });
      expect(isVideoWatched(barelyWatched)).toBe(false);

      const zeroProgress = createVideoCard({ watchedWidth: '0%' });
      expect(isVideoWatched(zeroProgress)).toBe(false);

      const unwatched = createVideoCard({ views: '10K views' });
      expect(isVideoWatched(unwatched)).toBe(false);
    });
  });

  describe('matchesKeywordBlacklist & matchesChannelList', () => {
    it('matches keywords case-insensitively and supports regex without mangling uppercase character classes', () => {
      expect(matchesKeywordBlacklist('Ultimate Prank Compilation 2026', ['prank', 'reaction'])).toBe(true);
      expect(matchesKeywordBlacklist('Learn TypeScript in 100 Seconds', ['prank', 'reaction'])).toBe(false);
      expect(matchesKeywordBlacklist('Awesome Movie Trailer', ['/trailer$/i'])).toBe(true);
      
      // Case-sensitive regex character class test
      expect(matchesKeywordBlacklist('LIVESTREAM TODAY', ['/[A-Z]{6,}/'])).toBe(true);
      expect(matchesKeywordBlacklist('livestream today', ['/[A-Z]{6,}/'])).toBe(false);
    });

    it('matches channels in blacklist and whitelist', () => {
      expect(matchesChannelList('T-Series', ['t-series', 'cocomelon'])).toBe(true);
      expect(matchesChannelList('Fireship', ['t-series', 'cocomelon'])).toBe(false);
    });
  });

  describe('getVideoMeta', () => {
    it('extracts metadata from standard card layout', () => {
      const card = createVideoCard({
        title: 'Building Userscripts with Bun',
        channel: 'Tech Dev',
        views: '250K views',
        time: '4 days ago',
        duration: '14:20',
        isWatched: true
      });

      const meta = getVideoMeta(card);
      expect(meta.title).toBe('Building Userscripts with Bun');
      expect(meta.channel).toBe('Tech Dev');
      expect(meta.views).toBe(250000);
      expect(meta.daysAgo).toBe(4);
      expect(meta.duration).toBe(14);
      expect(meta.isWatched).toBe(true);
    });

    it('extracts channel name from @handle links in modern YouTube lockups', () => {
      const card = document.createElement('yt-lockup-view-model');
      const channelLink = document.createElement('a');
      channelLink.href = '/@Fireship';
      channelLink.textContent = 'Fireship';
      card.appendChild(channelLink);

      const meta = getVideoMeta(card);
      expect(meta.channel).toBe('Fireship');
    });
  });

  describe('matchesFilter & evaluateVideo', () => {
    const activeFilters: FilterState = {
      minViews: 50000,
      maxViews: 500000,
      minDays: 1,
      maxDays: 30,
      minDuration: 5,
      maxDuration: 30,
      keywordBlacklist: ['clickbait', 'prank'],
      channelBlacklist: ['SpamChannel'],
      channelWhitelist: ['FavoriteCreator'],
      watchedMode: 'dim',
      hideShorts: false,
      hidePosts: false,
      enabled: true
    };

    it('allows all videos when filter is disabled', () => {
      const card = createVideoCard({
        views: '10 views',
        time: '5 years ago',
        duration: '1:00'
      });
      expect(matchesFilter(card, { ...activeFilters, enabled: false })).toBe(true);
    });

    it('grants immunity to VIP whitelisted channels even if view/duration limits fail', () => {
      const vipCard = createVideoCard({
        title: 'VIP Creator Special',
        channel: 'FavoriteCreator',
        views: '10 views', // below minViews
        duration: '1:00', // below minDuration
        time: '2 years ago' // above maxDays
      });
      expect(evaluateVideo(vipCard, activeFilters)).toBe('show');
    });

    it('hides blacklisted channels immediately', () => {
      const spamCard = createVideoCard({
        title: 'High View Video',
        channel: 'SpamChannel',
        views: '100K views',
        duration: '10:00',
        time: '5 days ago'
      });
      expect(evaluateVideo(spamCard, activeFilters)).toBe('hide');
    });

    it('hides titles matching keyword blacklist', () => {
      const clickbaitCard = createVideoCard({
        title: 'Insane Prank You Must See',
        views: '100K views',
        duration: '10:00',
        time: '5 days ago'
      });
      expect(evaluateVideo(clickbaitCard, activeFilters)).toBe('hide');
    });

    it('does not hide upcoming or live premiere badges when minDuration is set', () => {
      const upcomingCard = createVideoCard({
        title: 'Upcoming Tech Keynote',
        views: '100K views',
        time: '2 days ago',
        duration: 'UPCOMING'
      });
      // Duration is NaN (unknown/exempt), so duration filter must not hide it
      expect(evaluateVideo(upcomingCard, activeFilters)).toBe('show');
    });

    it('correctly filters videos based on upload date range', () => {
      const dateFilters: FilterState = {
        ...activeFilters,
        minViews: 0,
        maxViews: Infinity,
        minDuration: 0,
        maxDuration: Infinity,
        keywordBlacklist: [],
        channelBlacklist: [],
        minDays: 0,
        maxDays: 7
      };

      const freshVideo = createVideoCard({ views: '1K views', time: 'just now', duration: '10:00' });
      expect(evaluateVideo(freshVideo, dateFilters)).toBe('show');

      const fiveDayVideo = createVideoCard({ views: '1K views', time: '5 days ago', duration: '10:00' });
      expect(evaluateVideo(fiveDayVideo, dateFilters)).toBe('show');

      const oldVideo = createVideoCard({ views: '1K views', time: '20 days ago', duration: '10:00' });
      expect(evaluateVideo(oldVideo, dateFilters)).toBe('hide');
    });

    it('hides shorts when hideShorts is true, preserves when false', () => {
      const shortsCard = createVideoCard({ isShorts: true });
      expect(evaluateVideo(shortsCard, { ...activeFilters, hideShorts: true, hidePosts: false })).toBe('hide');
      expect(evaluateVideo(shortsCard, { ...activeFilters, hideShorts: false, hidePosts: false })).toBe('show');
    });

    it('hides community posts when hidePosts is true, preserves when false', () => {
      const postCard = document.createElement('ytd-post-renderer');
      expect(evaluateVideo(postCard, { ...activeFilters, hideShorts: false, hidePosts: true })).toBe('hide');
      expect(evaluateVideo(postCard, { ...activeFilters, hideShorts: false, hidePosts: false })).toBe('show');
    });

    it('correctly filters home feed cards with combined views and time strings', () => {
      const homeFeedCard = createVideoCard({
        title: 'Learn React in 2026',
        views: '124K views • 2 days ago',
        duration: '15:00'
      });

      // Filter requiring minViews 50000: 124K views is >= 50000 -> show
      expect(evaluateVideo(homeFeedCard, { ...activeFilters, minViews: 50000, hideShorts: false, hidePosts: false })).toBe('show');

      // Filter requiring minViews 500000: 124K views is < 500000 -> hide
      expect(evaluateVideo(homeFeedCard, { ...activeFilters, minViews: 500000, hideShorts: false, hidePosts: false })).toBe('hide');
    });

    it('returns "dim" for watched videos when watchedMode is "dim"', () => {
      const watchedCard = createVideoCard({
        title: 'Great Tutorial',
        views: '100K views',
        duration: '10:00',
        time: '5 days ago',
        isWatched: true
      });
      expect(evaluateVideo(watchedCard, activeFilters)).toBe('dim');
    });

    it('returns "hide" for watched videos when watchedMode is "hide"', () => {
      const watchedCard = createVideoCard({
        title: 'Great Tutorial',
        views: '100K views',
        duration: '10:00',
        time: '5 days ago',
        isWatched: true
      });
      expect(evaluateVideo(watchedCard, { ...activeFilters, watchedMode: 'hide' })).toBe('hide');
    });
  });

  describe('applyFiltersToDOM', () => {
    it('applies ytf-hidden and ytf-dimmed classes appropriately', () => {
      const matchCard = createVideoCard({
        title: 'Good Video',
        views: '100K views',
        time: '5 days ago',
        duration: '10:00'
      });
      const dimmedCard = createVideoCard({
        title: 'Watched Video',
        views: '100K views',
        time: '5 days ago',
        duration: '10:00',
        isWatched: true
      });
      const rejectCard = createVideoCard({
        title: 'Low View Video',
        views: '10 views',
        time: '5 days ago',
        duration: '10:00'
      });

      document.body.appendChild(matchCard);
      document.body.appendChild(dimmedCard);
      document.body.appendChild(rejectCard);

      const filters: FilterState = {
        minViews: 50000,
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
        enabled: true
      };

      const stats = applyFiltersToDOM(filters);
      expect(stats.total).toBe(3);
      expect(stats.visible).toBe(2);
      expect(stats.dimmed).toBe(1);

      expect(matchCard.classList.contains('ytf-hidden')).toBe(false);
      expect(matchCard.classList.contains('ytf-dimmed')).toBe(false);

      expect(dimmedCard.classList.contains('ytf-hidden')).toBe(false);
      expect(dimmedCard.classList.contains('ytf-dimmed')).toBe(true);

      expect(rejectCard.classList.contains('ytf-hidden')).toBe(true);
    });

    it('deduplicates nested host elements (e.g. yt-lockup-view-model inside ytd-rich-item-renderer)', () => {
      const outerCard = document.createElement('ytd-rich-item-renderer');
      const innerLockup = document.createElement('yt-lockup-view-model');
      outerCard.appendChild(innerLockup);

      const titleLink = document.createElement('a');
      titleLink.id = 'video-title';
      titleLink.textContent = 'Nested Video';
      innerLockup.appendChild(titleLink);

      const metaLine = document.createElement('div');
      metaLine.id = 'metadata-line';
      const vSpan = document.createElement('span');
      vSpan.textContent = '100K views';
      metaLine.appendChild(vSpan);
      innerLockup.appendChild(metaLine);

      document.body.appendChild(outerCard);

      const filters: FilterState = {
        minViews: 50000,
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
        enabled: true
      };

      const stats = applyFiltersToDOM(filters);
      expect(stats.total).toBe(1); // Not 2!
      expect(stats.visible).toBe(1);
    });
  });
});

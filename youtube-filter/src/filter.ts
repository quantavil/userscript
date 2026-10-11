import { VIDEO_HOST_SELECTORS } from './config';
import { byText, qs, qsa } from './dom';
import { parseDaysAgo, parseDuration, parseViews } from './parser';
import type { FilterState, VideoMeta } from './types';

/**
 * Determines whether a YouTube host element is a Short or Shorts shelf.
 */
export const isShorts = (host: Element): boolean => {
  if (host.hasAttribute('is-shorts')) return true;
  const tag = host.tagName.toLowerCase();
  if (tag === 'ytd-reel-item-renderer' || tag === 'ytm-reel-item-renderer' || tag === 'ytd-reel-shelf-renderer') return true;
  if (host.hasAttribute('overlay-style') && host.getAttribute('overlay-style') === 'SHORTS') return true;
  if (qs(host, 'a[href*="/shorts/"], a[href^="/shorts/"], [is-shorts], [overlay-style="SHORTS"], ytd-reel-item-renderer, ytd-reel-shelf-renderer, yt-reel-item-view-model')) return true;
  return false;
};

/**
 * Determines whether a YouTube host element is a Community Post.
 */
export const isPost = (host: Element): boolean => {
  const tag = host.tagName.toLowerCase();
  if (tag === 'ytd-post-renderer' || tag === 'ytd-backstage-post-renderer' || tag === 'yt-post-item-view-model' || tag === 'ytd-shared-post-renderer') return true;
  if (host.hasAttribute('is-posts-shelf')) return true;
  if (qs(host, 'ytd-post-renderer, ytd-backstage-post-renderer, yt-post-item-view-model, ytd-shared-post-renderer, a[href*="/post/"], a[href*="/community/"]')) return true;
  return false;
};

/**
 * Detects whether a video has been watched based on YouTube's red playback progress bar.
 */
export const isVideoWatched = (host: Element): boolean => {
  // Check resume playback renderer progress bar
  const progressBar =
    qs(host, 'ytd-thumbnail-overlay-resume-playback-renderer #progress') ||
    qs(host, '.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment') ||
    qs(host, 'yt-thumbnail-overlay-progress-bar-view-model [style*="width"]') ||
    qs(host, 'yt-thumbnail-overlay-progress-bar-view-model');

  if (progressBar) {
    const htmlEl = progressBar as HTMLElement;
    const inlineWidth = htmlEl.style?.width || '';
    const styleAttr = progressBar.getAttribute('style') || '';

    const widthCombined = `${inlineWidth} ${styleAttr}`;
    const match = widthCombined.match(/(\d+)%/);
    if (match) {
      const percent = parseInt(match[1], 10);
      return percent >= 70; // 70% or more watched
    }

    // Check inner child for width
    const childWithWidth = qs(progressBar, '[style*="width"]');
    if (childWithWidth) {
      const childMatch = (childWithWidth.getAttribute('style') || '').match(/(\d+)%/);
      if (childMatch) {
        return parseInt(childMatch[1], 10) >= 70;
      }
    }
    return false;
  }

  return false;
};

/**
 * Extracts metadata (view count, relative age in days, duration, title, channel, watched status)
 * from a video card element.
 */
export const getVideoMeta = (host: Element): VideoMeta => {
  const metaLineSpans = qsa(
    host,
    '#metadata-line span, .inline-metadata-item, .yt-content-metadata-view-model__metadata-row span, .yt-core-attributed-string, .badge-shape-wiz__text, [class*="metadata-text"]'
  );

  const viewsTxt = byText(metaLineSpans, (t) => /view/i.test(t) && !/watching/i.test(t));
  const timeTxt = byText(metaLineSpans, (t) => /(ago|streamed|premiered|just now|moments? ago)/i.test(t));

  // Enhanced duration detection with 2026 YouTube fallback chain
  let durationTxt =
    (qs(host, 'ytd-thumbnail-overlay-time-status-renderer #text')?.textContent || '').trim() ||
    (qs(host, 'ytd-thumbnail-overlay-time-status-renderer [id="text"]')?.textContent || '').trim() ||
    (qs(host, '.yt-thumbnail-overlay-badge-view-model .yt-badge-shape__text')?.textContent || '').trim() ||
    (qs(host, 'badge-shape-wiz .badge-shape-wiz__text')?.textContent || '').trim() ||
    (qs(host, 'yt-badge-shape .yt-badge-shape__text')?.textContent || '').trim() ||
    '';

  // Fallback: Try aria-label on thumbnail or link
  if (!durationTxt) {
    const thumb =
      qs(host, 'ytd-thumbnail[aria-label]') ||
      qs(host, 'a#thumbnail[aria-label]') ||
      qs(host, 'a[aria-label*="views"]');

    const ariaLabel = thumb?.getAttribute('aria-label') || '';
    const match = ariaLabel.match(/(\d+:\d+(?::\d+)?)/);
    if (match) durationTxt = match[1];
  }

  // Extract Title
  const titleEl =
    qs(host, '#video-title') ||
    qs(host, 'yt-formatted-string#video-title') ||
    qs(host, '.yt-lockup-metadata-view-model__heading-reset') ||
    qs(host, 'a#video-title-link') ||
    qs(host, 'h3 a');

  const title = (titleEl?.getAttribute('title') || titleEl?.textContent || '').trim();

  // Extract Channel Name with 2026 @handle support
  const channelEl =
    qs(host, 'ytd-channel-name #text') ||
    qs(host, 'ytd-channel-name a') ||
    qs(host, 'a[href^="/@"]') ||
    qs(host, 'a[href*="/channel/"]') ||
    qs(host, 'a[href*="/user/"]') ||
    qs(host, 'a[href*="/c/"]') ||
    qs(host, '.yt-content-metadata-view-model__metadata-row .yt-core-attributed-string') ||
    qs(host, '#channel-name a') ||
    qs(host, '#byline a') ||
    qs(host, '.ytd-channel-name');

  const channel = (channelEl?.textContent || '').trim();

  return {
    views: parseViews(viewsTxt),
    daysAgo: parseDaysAgo(timeTxt),
    duration: parseDuration(durationTxt),
    title,
    channel,
    isWatched: isVideoWatched(host)
  };
};

/**
 * Normalizes strings for robust case-insensitive comparison.
 */
const normalize = (str: string): string => str.toLowerCase().trim();

/**
 * Checks if a title matches any blacklist keyword or regex pattern.
 * Preserves exact regex patterns and flags without forced lowercase conversion.
 */
export const matchesKeywordBlacklist = (title: string, keywords: string[]): boolean => {
  if (!title || keywords.length === 0) return false;
  const normTitle = normalize(title);

  for (const kw of keywords) {
    const trimmed = (kw || '').trim();
    if (!trimmed) continue;

    // Check if keyword is regex (e.g. "/pattern/i" or "/[A-Z]{4,}/")
    if (trimmed.startsWith('/') && trimmed.lastIndexOf('/') > 0) {
      try {
        const lastSlash = trimmed.lastIndexOf('/');
        const pattern = trimmed.slice(1, lastSlash);
        const flags = trimmed.slice(lastSlash + 1);
        const re = new RegExp(pattern, flags);
        if (re.test(title)) return true;
      } catch {
        // Fallback to substring if regex fails to parse
        if (normTitle.includes(normalize(trimmed))) return true;
      }
    } else {
      if (normTitle.includes(normalize(trimmed))) return true;
    }
  }
  return false;
};

/**
 * Checks if a channel name matches a channel list (exact or substring).
 */
export const matchesChannelList = (channel: string, list: string[]): boolean => {
  if (!channel || list.length === 0) return false;
  const normChannel = normalize(channel);
  return list.some((item) => {
    const normItem = normalize(item);
    return normItem && (normChannel === normItem || normChannel.includes(normItem));
  });
};

export type FilterDecision = 'show' | 'dim' | 'hide';

/**
 * Evaluates the filter decision for a video card element.
 */
export const evaluateVideo = (host: Element, filters: FilterState): FilterDecision => {
  if (!filters.enabled) return 'show';

  // Handle Shorts
  if (isShorts(host)) {
    return filters.hideShorts ? 'hide' : 'show';
  }

  // Handle Community Posts
  if (isPost(host)) {
    return filters.hidePosts ? 'hide' : 'show';
  }

  const meta = getVideoMeta(host);

  // VIP Channel Whitelist: if channel is whitelisted, grant immunity from view/duration filters
  const isWhitelisted = matchesChannelList(meta.channel, filters.channelWhitelist);

  if (!isWhitelisted) {
    // Channel Blacklist Check
    if (matchesChannelList(meta.channel, filters.channelBlacklist)) {
      return 'hide';
    }

    // Title Keyword Blacklist Check
    if (matchesKeywordBlacklist(meta.title, filters.keywordBlacklist)) {
      return 'hide';
    }

    // Reject videos with unknown upload date if a date filter is active
    const dateFilterActive = filters.minDays > 0 || filters.maxDays < Infinity;
    if (meta.daysAgo === Infinity && dateFilterActive) return 'hide';

    // View count bounds
    if (meta.views < filters.minViews || meta.views > filters.maxViews) return 'hide';

    // Date bounds
    if (meta.daysAgo < filters.minDays || meta.daysAgo > filters.maxDays) return 'hide';

    // Duration bounds (applied only when duration is known and finite)
    const durationKnown = Number.isFinite(meta.duration) && meta.duration >= 0;
    if (durationKnown && (meta.duration < filters.minDuration || meta.duration > filters.maxDuration)) {
      return 'hide';
    }
  }

  // Watched video handling
  if (meta.isWatched) {
    if (filters.watchedMode === 'hide') return 'hide';
    if (filters.watchedMode === 'dim') return 'dim';
  }

  return 'show';
};

/**
 * Backward-compatible boolean matcher.
 */
export const matchesFilter = (host: Element, filters: FilterState): boolean => {
  const decision = evaluateVideo(host, filters);
  return decision !== 'hide';
};

/**
 * Scans all video elements on the page, updating their .ytf-hidden and .ytf-dimmed classes.
 * Automatically deduplicates nested video host elements (e.g. yt-lockup-view-model inside ytd-rich-item-renderer).
 */
export const applyFiltersToDOM = (
  filters: FilterState
): { visible: number; total: number; dimmed: number } => {
  const allNodes = Array.from(document.querySelectorAll(VIDEO_HOST_SELECTORS.join(',')));

  // Deduplicate nested nodes: if host is inside another host in allNodes, process only the topmost host
  const nodes = allNodes.filter((el) => {
    const parentHost = el.parentElement?.closest(VIDEO_HOST_SELECTORS.join(','));
    return !parentHost;
  });

  // Fast path: if filters are disabled, quickly unhide/undim everything and return
  if (!filters.enabled) {
    for (const n of nodes) {
      n.classList.remove('ytf-hidden', 'ytf-dimmed');
    }
    return { visible: nodes.length, total: nodes.length, dimmed: 0 };
  }

  let total = 0;
  let hidden = 0;
  let dimmed = 0;

  for (const host of nodes) {
    total++;
    const decision = evaluateVideo(host, filters);

    if (decision === 'hide') {
      host.classList.add('ytf-hidden');
      host.classList.remove('ytf-dimmed');
      hidden++;
    } else if (decision === 'dim') {
      host.classList.remove('ytf-hidden');
      host.classList.add('ytf-dimmed');
      dimmed++;
    } else {
      host.classList.remove('ytf-hidden', 'ytf-dimmed');
    }
  }

  return {
    visible: total - hidden,
    total,
    dimmed
  };
};

export interface ScannerController {
  schedule: () => void;
  destroy: () => void;
}

/**
 * Sets up mutation observers and YouTube SPA navigation listeners with 100ms debouncing.
 */
export const createScanner = (onScan: () => void): ScannerController => {
  let raf = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | 0 = 0;

  const schedule = () => {
    if (raf) cancelAnimationFrame(raf);
    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      raf = requestAnimationFrame(() => {
        onScan();
        raf = 0;
      });
    }, 100);
  };

  const root = document.querySelector('ytd-app') || document.body;
  const observer = new MutationObserver(() => schedule());

  if (root) {
    observer.observe(root, { childList: true, subtree: true });
  }

  const onNavStart = () => schedule();
  const onNavFinish = () => {
    requestAnimationFrame(() => schedule());
  };
  const onGenericNav = () => schedule();

  window.addEventListener('yt-navigate-start', onNavStart, true);
  window.addEventListener('yt-navigate-finish', onNavFinish, true);
  window.addEventListener('yt-page-data-updated', onGenericNav, true);
  window.addEventListener('load', onGenericNav, true);
  window.addEventListener('popstate', onGenericNav, true);
  window.addEventListener('hashchange', onGenericNav, true);

  const destroy = () => {
    if (raf) cancelAnimationFrame(raf);
    if (debounceTimer) clearTimeout(debounceTimer);
    observer.disconnect();
    window.removeEventListener('yt-navigate-start', onNavStart, true);
    window.removeEventListener('yt-navigate-finish', onNavFinish, true);
    window.removeEventListener('yt-page-data-updated', onGenericNav, true);
    window.removeEventListener('load', onGenericNav, true);
    window.removeEventListener('popstate', onGenericNav, true);
    window.removeEventListener('hashchange', onGenericNav, true);
  };

  return { schedule, destroy };
};

/**
 * Centralized typed selector registry for Reddit Reels.
 * Eliminates scattered string literals across core, ui, styles, and extractors.
 */

export const POST_SELECTORS = 'shreddit-post, article, [data-testid="post-container"], .Post';

export const FEED_CONTAINER_SELECTORS =
  'shreddit-feed, #posts-container, [data-testid="feed-container"], main';

export const NATIVE_SUPPRESSION_SELECTORS =
  '[slot="credit-bar"], [slot="post-credit-bar"], [slot="title-and-metadata"], [slot="title"], [slot="action-row"], [slot="text-body"], shreddit-post-action-row, feed-post-action-row, shreddit-action-bar, rpl-action-bar, shreddit-post-credit-bar, faceplate-tracker, shreddit-interaction-container';

export const VOTE_OFFSCREEN_SELECTORS =
  '[slot="vote"], [slot="vote-button"], shreddit-post-vote-control, [data-testid="post-vote-control"]';

export const GALLERY_SELECTORS =
  'gallery-carousel, faceplate-carousel, [data-testid="media-gallery"]';

export const VIDEO_IFRAME_HOSTS_REGEX =
  /(?:redgifs\.com|streamable\.com|gfycat\.com|youtube\.com|youtu\.be|v\.redd\.it)/i;

export const SELECTORS = {
  POSTS: {
    ALL: POST_SELECTORS,
    SHREDDIT: 'shreddit-post',
  },
  FEED: FEED_CONTAINER_SELECTORS,
  NATIVE_SUPPRESSED: NATIVE_SUPPRESSION_SELECTORS,
  VOTE_OFFSCREEN: VOTE_OFFSCREEN_SELECTORS,
  GALLERY: GALLERY_SELECTORS,
  CLASSES: {
    CONTAIN: 'rr-fit-contain',
    COVER: 'rr-fit-cover',
  },
} as const;

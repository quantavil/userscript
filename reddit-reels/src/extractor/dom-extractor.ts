import { ReelPost, PostType } from './types';

/**
 * Parses numeric score strings (e.g. "1.5k", "12M", "-3", "•", "Vote") into an integer.
 */
export function parseScore(val: string | null | undefined): number {
  if (!val) return 0;
  const trimmed = val.trim();
  if (!trimmed || trimmed === '•' || trimmed.toLowerCase() === 'vote') return 0;

  const kMatch = trimmed.match(/^([+-]?\d+(?:\.\d+)?)\s*k$/i);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000);
  }
  const mMatch = trimmed.match(/^([+-]?\d+(?:\.\d+)?)\s*m$/i);
  if (mMatch) {
    return Math.round(parseFloat(mMatch[1]) * 1000000);
  }

  const parsed = parseInt(trimmed.replace(/,/g, ''), 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parses comment count strings into an integer.
 */
export function parseCommentCount(val: string | null | undefined): number {
  if (!val) return 0;
  const trimmed = val.trim();
  const match = trimmed.match(/^([+-]?\d+(?:\.\d+)?)\s*([km])?/i);
  if (match) {
    let num = parseFloat(match[1]);
    const multiplier = match[2]?.toLowerCase();
    if (multiplier === 'k') num *= 1000;
    else if (multiplier === 'm') num *= 1000000;
    return Math.round(num);
  }
  const parsed = parseInt(trimmed.replace(/,/g, ''), 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Extracts post ID from element attributes or permalink.
 */
export function extractPostId(element: HTMLElement, permalink: string): string {
  const attrId = element.getAttribute('id');
  if (attrId && attrId.trim()) {
    return attrId.trim();
  }

  const dataId = element.getAttribute('data-post-id') || element.getAttribute('data-fullname');
  if (dataId && dataId.trim()) {
    return dataId.trim();
  }

  const permalinkMatch = permalink.match(/(?:comments|post)\/([a-z0-9]+)/i);
  if (permalinkMatch) {
    return `t3_${permalinkMatch[1]}`;
  }

  if (element.dataset.reelPostId) {
    return element.dataset.reelPostId;
  }
  const generatedId = `t3_gen_${Math.random().toString(36).slice(2, 10)}`;
  element.dataset.reelPostId = generatedId;
  return generatedId;
}

/**
 * Extracts title from post element.
 */
export function extractTitle(element: HTMLElement): string {
  const postTitle = element.getAttribute('post-title');
  if (postTitle && postTitle.trim()) {
    return postTitle.trim();
  }

  const titleSlot = element.querySelector<HTMLElement>('[slot="title"]');
  if (titleSlot && titleSlot.textContent?.trim()) {
    return titleSlot.textContent.trim();
  }

  const heading = element.querySelector<HTMLElement>(
    'h1, h2, [data-test-id="post-content"] h1, [data-test-id="post-content"] h2'
  );
  if (heading && heading.textContent?.trim()) {
    return heading.textContent.trim();
  }

  const bodyAnchor = element.querySelector<HTMLAnchorElement>('a[data-click-id="body"]');
  if (bodyAnchor && bodyAnchor.textContent?.trim()) {
    return bodyAnchor.textContent.trim();
  }

  return '';
}

/**
 * Extracts author username without u/ prefix.
 */
export function extractAuthor(element: HTMLElement): string {
  const authorAttr = element.getAttribute('author');
  if (authorAttr && authorAttr.trim()) {
    return authorAttr.trim().replace(/^u\//, '');
  }

  const dataAuthor = element.getAttribute('data-author');
  if (dataAuthor && dataAuthor.trim()) {
    return dataAuthor.trim().replace(/^u\//, '');
  }

  const authorLink = element.querySelector<HTMLElement>(
    'a[href*="/user/"], [data-testid="post_author_link"], [data-click-id="user"], [slot="authorName"]'
  );
  if (authorLink && authorLink.textContent?.trim()) {
    return authorLink.textContent.trim().replace(/^u\//, '');
  }

  return '';
}

/**
 * Extracts subreddit name with "r/" prefix.
 */
export function extractSubreddit(element: HTMLElement, permalink: string): string {
  const prefixed = element.getAttribute('subreddit-prefixed-name');
  if (prefixed && prefixed.trim()) {
    return prefixed.startsWith('r/') ? prefixed.trim() : `r/${prefixed.trim()}`;
  }

  const subName = element.getAttribute('subreddit-name') || element.getAttribute('subreddit');
  if (subName && subName.trim()) {
    return `r/${subName.trim()}`;
  }

  // Check permalink next as it is very reliable (e.g. /r/videos/comments/...)
  const permalinkMatch = permalink.match(/(?:\/|^)r\/([a-zA-Z0-9_]+)/i);
  if (permalinkMatch) {
    return `r/${permalinkMatch[1]}`;
  }

  const subLink = element.querySelector<HTMLElement>(
    'a[data-click-id="subreddit"], a[href^="/r/"]:not([href*="/comments/"]), a[href*="reddit.com/r/"]:not([href*="/comments/"])'
  );
  if (subLink && subLink.textContent?.trim()) {
    const text = subLink.textContent.trim();
    return text.startsWith('r/') ? text : `r/${text}`;
  }

  return '';
}

/**
 * Extracts permalink.
 */
export function extractPermalink(element: HTMLElement): string {
  const permalinkAttr = element.getAttribute('permalink');
  if (permalinkAttr && permalinkAttr.trim()) {
    return permalinkAttr.trim();
  }

  const commentsLink = element.querySelector<HTMLAnchorElement>(
    'a[data-click-id="comments"], a[slot="full-post-link"], a[href*="/comments/"]'
  );
  if (commentsLink) {
    const href = commentsLink.getAttribute('href');
    if (href) return href;
  }

  return '';
}

/**
 * Extracts content URL (video src, image src, or article link).
 */
export function extractContentHref(element: HTMLElement, permalink: string): string {
  const contentHref = element.getAttribute('content-href');
  if (contentHref && contentHref.trim()) {
    return contentHref.trim();
  }

  const player = element.querySelector<HTMLElement>('shreddit-player-2, [data-testid="shreddit-player"]');
  if (player) {
    const src = player.getAttribute('src') || player.getAttribute('stream-url');
    if (src) return src;
  }

  const video = element.querySelector<HTMLVideoElement>('video');
  if (video) {
    if (video.src) return video.src;
    const source = video.querySelector<HTMLSourceElement>('source');
    if (source?.src) return source.src;
  }

  const img = element.querySelector<HTMLImageElement>(
    'img#post-image, [data-post-media-primary], [slot="post-media-container"] img:not(.shreddit-subreddit-icon__icon):not(.post-background-image-filter), shreddit-aspect-ratio:not(:has(video)) img:not(.shreddit-subreddit-icon__icon), [data-testid="post-image"] img, img.preview-img, img.media-lightbox-img:not(.post-background-image-filter), img.preview'
  );
  if (img?.src) {
    return img.src;
  }

  const linkAnchor = element.querySelector<HTMLAnchorElement>(
    'a[data-click-id="body"], a.title, [slot="post-media-container"] a'
  );
  if (linkAnchor?.href) {
    return linkAnchor.href;
  }

  return permalink;
}

/**
 * Detects the PostType ('video' | 'image' | 'gallery' | 'link' | 'text').
 */
export function determinePostType(element: HTMLElement, contentHref: string): PostType {
  const rawType = element.getAttribute('post-type')?.toLowerCase();
  const domain = element.getAttribute('domain')?.toLowerCase() || '';

  // 1. Crossposts embed the ORIGINAL post's media. Classify by the embedded media
  if (rawType === 'crosspost') {
    if (
      element.querySelector('shreddit-gallery, gallery-carousel, faceplate-carousel, [data-testid="media-gallery"], shreddit-async-loader[bundlename*="gallery"]') !== null
    ) {
      return 'gallery';
    }
    if (
      element.querySelector('shreddit-player-2, video, [data-testid="shreddit-player"]') !== null ||
      /(\.mp4|\.webm|\.m3u8|v\.redd\.it|redgifs\.com|streamable\.com|youtube\.com|youtu\.be|tiktok\.com|vimeo\.com)/i.test(contentHref)
    ) {
      return 'video';
    }
    const crosspostImg = element.querySelector(
      'img#post-image, [data-post-media-primary], shreddit-aspect-ratio:not(:has(video)) img:not(.shreddit-subreddit-icon__icon), [data-testid="post-image"] img, img.preview-img, img.media-lightbox-img:not(.post-background-image-filter), [slot="post-media-container"] img:not(.shreddit-subreddit-icon__icon):not(.post-background-image-filter)'
    );
    if (
      crosspostImg !== null ||
      /(\.jpg|\.jpeg|\.png|\.webp|\.gif|i\.redd\.it|i\.imgur\.com)/i.test(contentHref) ||
      domain === 'i.redd.it' ||
      domain === 'i.imgur.com'
    ) {
      return 'image';
    }
    if (
      element.querySelector('[slot="text-body"], shreddit-post-text-body, .usertext-body, [data-testid="post-content"] .md, [data-click-id="text"]') !== null
    ) {
      return 'text';
    }
    return 'link';
  }

  // 2. Video detection (explicit post-type, video element, external video host, or video URL)
  const isVideoHost =
    /(redgifs\.com|streamable\.com|gfycat\.com)/i.test(domain) ||
    /(redgifs\.com|streamable\.com|gfycat\.com)/i.test(contentHref);

  const isVideo =
    rawType === 'video' ||
    isVideoHost ||
    element.querySelector('shreddit-player-2, video, [data-testid="shreddit-player"]') !== null ||
    /(\.mp4|\.webm|\.m3u8|v\.redd\.it|redgifs\.com|streamable\.com|gfycat\.com|youtube\.com|youtu\.be)/i.test(contentHref);

  if (isVideo) {
    return 'video';
  }

  // 3. Gallery detection
  if (
    rawType === 'gallery' ||
    element.querySelector('shreddit-gallery, gallery-carousel, faceplate-carousel, [data-testid="media-gallery"], shreddit-async-loader[bundlename*="gallery"]') !== null
  ) {
    return 'gallery';
  }

  // 4. Link post (explicit post-type="link" whose destination is not a video)
  if (rawType === 'link') {
    return 'link';
  }

  // 5. Image post (explicit post-type="image")
  if (rawType === 'image') {
    return 'image';
  }

  // 6. Text post (explicit post-type or self post)
  const hasTextBody =
    element.querySelector('[slot="text-body"], shreddit-post-text-body, .usertext-body, [data-testid="post-content"] .md, [data-click-id="text"]') !== null;

  if (rawType === 'text' || domain.startsWith('self.')) {
    return 'text';
  }

  // 7. Fallback DOM image inspection (excluding subreddit icons and blur filters)
  const primaryImgEl = element.querySelector(
    'img#post-image, [data-post-media-primary], shreddit-aspect-ratio:not(:has(video)) img:not(.shreddit-subreddit-icon__icon), [data-testid="post-image"] img, img.preview-img, img.media-lightbox-img:not(.post-background-image-filter), [slot="post-media-container"] img:not(.shreddit-subreddit-icon__icon):not(.post-background-image-filter)'
  );
  const isImageHref =
    /(\.jpg|\.jpeg|\.png|\.webp|\.gif|i\.redd\.it|i\.imgur\.com)/i.test(contentHref) ||
    domain === 'i.redd.it' ||
    domain === 'i.imgur.com';

  if (primaryImgEl !== null || isImageHref) {
    return 'image';
  }

  if (hasTextBody) {
    return 'text';
  }

  // 8. External web link fallback
  const isExternalLink =
    contentHref &&
    /^https?:\/\//i.test(contentHref) &&
    !/(v\.redd\.it|i\.redd\.it|preview\.redd\.it|i\.imgur\.com|\.mp4|\.webm|\.m3u8|\.jpg|\.jpeg|\.png|\.webp|\.gif)/i.test(contentHref) &&
    !/\/comments\//i.test(contentHref);

  if (isExternalLink) {
    return 'link';
  }

  // 9. Internal discussion fallback
  if (!contentHref || /\/comments\//i.test(contentHref) || /reddit\.com/i.test(contentHref)) {
    return 'text';
  }

  return 'link';
}

/**
 * Upvote and downvote button selector candidates across Reddit desktop and mobile layouts.
 */
export const UPVOTE_SELECTORS = [
  '[data-action-bar-action="upvote"]',
  'button[upvote]',
  'button[aria-label*="upvote" i]',
  'button[name="upvote"]',
  '[slot="upvote-button"] button',
  '[slot="upvote-button"]',
  'button[data-click-id="upvote"]',
  'button[id*="upvote" i]',
  'faceplate-tracker[action="upvote"] button',
  'shreddit-post-action-row button[aria-label*="upvote" i]',
  '[data-testid="upvote-button"]',
  '.arrow.up',
  '.arrow.upmod',
];

export const DOWNVOTE_SELECTORS = [
  '[data-action-bar-action="downvote"]',
  'button[downvote]',
  'button[aria-label*="downvote" i]',
  'button[name="downvote"]',
  '[slot="downvote-button"] button',
  '[slot="downvote-button"]',
  'button[data-click-id="downvote"]',
  'button[id*="downvote" i]',
  'faceplate-tracker[action="downvote"] button',
  'shreddit-post-action-row button[aria-label*="downvote" i]',
  '[data-testid="downvote-button"]',
  '.arrow.down',
  '.arrow.downmod',
];

/**
 * Helper to query selectors including inside open shadow roots.
 * Recursively pierces nested shadowRoots (post -> vote-control -> button)
 * and prefers real <button> hits over wrapper containers.
 */
export function queryDeep(root: HTMLElement, selectors: string[]): HTMLElement | null {
  const isHidden = (el: HTMLElement): boolean => {
    try {
      if (el.hidden) return true;
      const style = el.getAttribute('style') || '';
      if (/display\s*:\s*none/i.test(style)) return true;
      if (el.classList?.contains('rr-native-suppressed')) return true;

      // Check ancestor chain up to root
      let curr: HTMLElement | null = el.parentElement;
      while (curr && curr !== root) {
        if (curr.hidden || curr.classList?.contains('rr-native-suppressed')) return true;
        const parentStyle = curr.getAttribute('style') || '';
        if (/display\s*:\s*none/i.test(parentStyle)) return true;
        curr = curr.parentElement;
      }
    } catch {}
    return false;
  };

  const collect = (node: Node, out: HTMLElement[]): void => {
    if (!node) return;
    const HTMLElementCtor = (globalThis as any).HTMLElement;
    const isElement = HTMLElementCtor ? node instanceof HTMLElementCtor : (node as any)?.nodeType === 1;
    if (isElement) {
      const el = node as HTMLElement;
      for (const selector of selectors) {
        try {
          if (el.matches?.(selector)) out.push(el);
        } catch {}
      }
      const sr = (el as HTMLElement).shadowRoot as ShadowRoot | null;
      if (sr) {
        for (let i = 0; i < sr.childNodes.length; i++) collect(sr.childNodes[i], out);
      }
    } else if ((node as any)?.nodeType === 11) {
      // ShadowRoot / DocumentFragment (avoids referencing global ShadowRoot).
      const frag = node as unknown as { childNodes: NodeListOf<ChildNode> };
      for (let i = 0; i < frag.childNodes.length; i++) collect(frag.childNodes[i] as unknown as Node, out);
      return;
    }
    const children = (node as ParentNode).childNodes;
    if (children) {
      for (let i = 0; i < children.length; i++) {
        collect(children[i] as unknown as Node, out);
      }
    }
  };

  // Fast path: direct light-DOM / single shadow queries first.
  for (const selector of selectors) {
    try {
      const found = root.querySelector<HTMLElement>(selector);
      if (found && !isHidden(found)) {
        if (found.tagName.toLowerCase() === 'button') return found;
      }
    } catch {}
  }
  if (root.shadowRoot) {
    for (const selector of selectors) {
      try {
        const found = root.shadowRoot.querySelector<HTMLElement>(selector);
        if (found && !isHidden(found)) {
          if (found.tagName.toLowerCase() === 'button') return found;
        }
      } catch {}
    }
  }

  const all: HTMLElement[] = [];
  collect(root, all);
  const visible = all.filter((el) => !isHidden(el));
  const btn = visible.find((el) => el.tagName.toLowerCase() === 'button');
  if (btn) return btn;
  return visible[0] || null;
}

/**
 * Checks if the post is currently upvoted natively.
 */
export function checkIsUpvoted(element: HTMLElement): boolean {
  const voteState = element.getAttribute('vote-state') || element.getAttribute('score-state');
  if (voteState === 'upvoted' || voteState === 'upvote') return true;
  if (element.getAttribute('liked') === 'true') return true;
  if (element.classList.contains('likes')) return true;

  const btn = queryDeep(element, UPVOTE_SELECTORS);
  if (btn) {
    if (btn.getAttribute('aria-pressed') === 'true') return true;
    if (btn.getAttribute('aria-checked') === 'true') return true;
    if (btn.getAttribute('data-selected') === 'true') return true;
    if (
      btn.classList.contains('active') ||
      btn.classList.contains('upvoted') ||
      btn.classList.contains('upmod') ||
      btn.classList.contains('text-interactive-pressed')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if the post is currently downvoted natively.
 */
export function checkIsDownvoted(element: HTMLElement): boolean {
  const voteState = element.getAttribute('vote-state') || element.getAttribute('score-state');
  if (voteState === 'downvoted' || voteState === 'downvote') return true;
  if (element.getAttribute('liked') === 'false') return true;
  if (element.classList.contains('dislikes')) return true;

  const btn = queryDeep(element, DOWNVOTE_SELECTORS);
  if (btn) {
    if (btn.getAttribute('aria-pressed') === 'true') return true;
    if (btn.getAttribute('aria-checked') === 'true') return true;
    if (btn.getAttribute('data-selected') === 'true') return true;
    if (
      btn.classList.contains('active') ||
      btn.classList.contains('downvoted') ||
      btn.classList.contains('downmod') ||
      btn.classList.contains('text-interactive-pressed')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Converts a raw post HTMLElement into a ReelPost object.
 */
export function parsePostElement(element: HTMLElement): ReelPost {
  const permalink = extractPermalink(element);
  const id = extractPostId(element, permalink);
  const title = extractTitle(element);
  const author = extractAuthor(element);
  const subreddit = extractSubreddit(element, permalink);
  const contentHref = extractContentHref(element, permalink);
  const postType = determinePostType(element, contentHref);

  let score = 0;
  let isScoreHidden = false;
  const scoreAttr = element.getAttribute('score');
  if (scoreAttr !== null) {
    const trimmed = scoreAttr.trim();
    if (trimmed === '•' || trimmed.toLowerCase() === 'vote') {
      isScoreHidden = true;
    }
    score = parseScore(scoreAttr);
  } else {
    const scoreElem =
      element.querySelector('shreddit-post-vote-control [slot="score"], faceplate-number, [data-test-id="post-score"], .score, [slot="credit-bar"]') ||
      element.shadowRoot?.querySelector('faceplate-number, [data-testid="action-row"] faceplate-number');
    if (scoreElem) {
      const trimmed = scoreElem.textContent?.trim() || '';
      if (trimmed === '•' || trimmed.toLowerCase() === 'vote') {
        isScoreHidden = true;
      }
      score = parseScore(trimmed);
    }
  }

  // Cache postType on element so downstream callers do not need to re-parse
  if (element.dataset) {
    element.dataset.rrPostType = postType;
  }

  let commentCount = 0;
  const commentAttr = element.getAttribute('comment-count');
  if (commentAttr !== null) {
    commentCount = parseCommentCount(commentAttr);
  } else {
    const commentElem =
      element.querySelector('a[data-click-id="comments"], [slot="comment-count"], a[href*="/comments/"]') ||
      element.shadowRoot?.querySelector('[data-action-bar-action="comments"] faceplate-number, a[name="comments-action-button"] faceplate-number');
    if (commentElem) {
      commentCount = parseCommentCount(commentElem.textContent);
    }
  }

  const isUpvoted = checkIsUpvoted(element);
  const isDownvoted = checkIsDownvoted(element);

  // Extract mediaUrl fallback if present
  let mediaUrl: string | undefined = undefined;
  if (postType === 'video') {
    const player = element.querySelector('shreddit-player-2');
    const videoEl = element.querySelector('video');
    mediaUrl =
      player?.getAttribute('stream-url') ||
      player?.getAttribute('src') ||
      videoEl?.getAttribute('src') ||
      contentHref ||
      undefined;
  } else if (postType === 'image') {
    const img = element.querySelector<HTMLImageElement>(
      'img#post-image, [data-post-media-primary], [slot="post-media-container"] img:not(.shreddit-subreddit-icon__icon):not(.post-background-image-filter), shreddit-aspect-ratio:not(:has(video)) img:not(.shreddit-subreddit-icon__icon), [data-testid="post-image"] img, img.preview-img, img.media-lightbox-img:not(.post-background-image-filter), img.preview'
    );
    mediaUrl = img?.src || img?.getAttribute('src') || contentHref || undefined;
  } else if (postType === 'link') {
    const img = element.querySelector<HTMLImageElement>(
      'shreddit-aspect-ratio img, [slot="post-media-container"] img:not(.shreddit-subreddit-icon__icon):not(.post-background-image-filter), img.preview-img, img.preview'
    );
    mediaUrl = img?.src || img?.getAttribute('src') || undefined;
  }

  // Extract text body if text post (plain text only; cards escape-rebuild <p> tags)
  let textBody: string | undefined = undefined;
  if (postType === 'text') {
    const textBodyEl = element.querySelector<HTMLElement>(
      '[slot="text-body"], shreddit-post-text-body, .usertext-body, [data-testid="post-content"] .md, [data-click-id="text"]'
    );
    if (textBodyEl) {
      const contentEl =
        textBodyEl.querySelector<HTMLElement>('[property="schema:articleBody"], .md, .text-neutral-content') ||
        textBodyEl;
      textBody = contentEl.textContent?.trim() || '';
    }
  }

  return {
    id,
    title,
    author,
    subreddit,
    score,
    commentCount,
    permalink,
    contentHref,
    postType,
    element,
    mediaUrl,
    textBody,
    isUpvoted,
    isDownvoted,
    isScoreHidden,
  };
}

/**
 * Finds all post container elements inside the root or returns root if it is a post.
 */
function findPostElements(root: Document | HTMLElement): HTMLElement[] {
  if (
    'matches' in root &&
    (root.matches('shreddit-post') || root.matches('[data-testid="post-container"]') || root.matches('.Post'))
  ) {
    return [root as HTMLElement];
  }

  const shredditPosts = Array.from(root.querySelectorAll<HTMLElement>('shreddit-post'));
  if (shredditPosts.length > 0) {
    return shredditPosts;
  }

  const elements: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();

  const fallbackPosts = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="post-container"], .Post, article'));
  for (const el of fallbackPosts) {
    if (!seen.has(el) && !fallbackPosts.some((p) => p !== el && p.contains(el))) {
      elements.push(el);
      seen.add(el);
    }
  }

  return elements;
}

/**
 * Extracts ReelPost objects from a document or container element.
 */
export function extractPosts(root?: Document | HTMLElement): ReelPost[] {
  const targetRoot = root ?? (typeof document !== 'undefined' ? document : null);
  if (!targetRoot) return [];

  const postElements = findPostElements(targetRoot);
  const posts: ReelPost[] = [];
  const seenIds = new Set<string>();

  for (const el of postElements) {
    const post = parsePostElement(el);
    if (!seenIds.has(post.id)) {
      seenIds.add(post.id);
      posts.push(post);
    }
  }

  return posts;
}

/**
 * Attaches a MutationObserver to watch for newly appended posts.
 * Debounces slightly, filters out duplicates, and invokes onNewPosts.
 * Returns an unsubscribe/disconnect function.
 */
export function observeNewPosts(onNewPosts: (posts: ReelPost[]) => void): () => void {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
    return () => {};
  }

  const seenIds = new Set<string>();
  const initialPosts = extractPosts(document);
  for (const post of initialPosts) {
    seenIds.add(post.id);
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const processMutations = () => {
    const currentPosts = extractPosts(document);
    const newPosts: ReelPost[] = [];

    for (const post of currentPosts) {
      if (!seenIds.has(post.id)) {
        seenIds.add(post.id);
        newPosts.push(post);
      }
    }

    if (newPosts.length > 0) {
      onNewPosts(newPosts);
    }
  };

  const observer = new MutationObserver((mutations) => {
    let hasRelevantChanges = false;

    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            if (
              el.matches?.('shreddit-post, [data-testid="post-container"], .Post') ||
              el.querySelector?.('shreddit-post, [data-testid="post-container"], .Post')
            ) {
              hasRelevantChanges = true;
              break;
            }
          }
        }
      }
      if (hasRelevantChanges) break;
    }

    if (hasRelevantChanges) {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        processMutations();
      }, 150);
    }
  });

  const target =
    document.querySelector('shreddit-feed') ||
    document.querySelector('main') ||
    document.body ||
    document.documentElement;

  if (target) {
    observer.observe(target, {
      childList: true,
      subtree: true,
    });
  }

  return () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    observer.disconnect();
  };
}

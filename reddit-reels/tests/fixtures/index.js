(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  function __accessProp(key) {
    return this[key];
  }
  var __toCommonJS = (from) => {
    var entry = (__moduleCache ??= new WeakMap).get(from), desc;
    if (entry)
      return entry;
    entry = __defProp({}, "__esModule", { value: true });
    if (from && typeof from === "object" || typeof from === "function") {
      for (var key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(entry, key))
          __defProp(entry, key, {
            get: __accessProp.bind(from, key),
            enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
          });
    }
    __moduleCache.set(from, entry);
    return entry;
  };
  var __moduleCache;
  var __returnValue = (v) => v;
  function __exportSetter(name, newValue) {
    this[name] = __returnValue.bind(null, newValue);
  }
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, {
        get: all[name],
        enumerable: true,
        configurable: true,
        set: __exportSetter.bind(all, name)
      });
  };

  // src/index.ts
  var exports_src = {};
  __export(exports_src, {
    AudioManager: () => AudioManager,
    DOWNVOTE_SELECTORS: () => DOWNVOTE_SELECTORS,
    REDGIFS_MESSAGE_SOURCE: () => REDGIFS_MESSAGE_SOURCE,
    UPVOTE_SELECTORS: () => UPVOTE_SELECTORS,
    applyAudioState: () => applyAudioState,
    audioManager: () => audioManager,
    blurIframes: () => blurIframes,
    checkIsDownvoted: () => checkIsDownvoted,
    checkIsUpvoted: () => checkIsUpvoted,
    deepFindMediaElements: () => deepFindMediaElements,
    determinePostType: () => determinePostType,
    ensureAutoplayAttrs: () => ensureAutoplayAttrs,
    extractAuthor: () => extractAuthor,
    extractContentHref: () => extractContentHref,
    extractPermalink: () => extractPermalink,
    extractPostId: () => extractPostId,
    extractPosts: () => extractPosts,
    extractSubreddit: () => extractSubreddit,
    extractTitle: () => extractTitle,
    hydrateVideoFromPlayer: () => hydrateVideoFromPlayer,
    initRedGifsBridge: () => initRedGifsBridge,
    isRedGifsFrame: () => isRedGifsFrame,
    listenForRedGifsReady: () => listenForRedGifsReady,
    normalizeIframeSrc: () => normalizeIframeSrc,
    observeNewPosts: () => observeNewPosts,
    parseCommentCount: () => parseCommentCount,
    parsePostElement: () => parsePostElement,
    parseScore: () => parseScore,
    proxyDownvote: () => proxyDownvote,
    proxyUpvote: () => proxyUpvote,
    queryDeep: () => queryDeep,
    resolveMedia: () => resolveMedia,
    sendIframePlay: () => sendIframePlay,
    unconstrainPostMedia: () => unconstrainPostMedia,
    unlockAudio: () => unlockAudio
  });

  // src/extractor/dom-extractor.ts
  function parseScore(val) {
    if (!val)
      return 0;
    const trimmed = val.trim();
    if (!trimmed || trimmed === "•" || trimmed.toLowerCase() === "vote")
      return 0;
    const kMatch = trimmed.match(/^([+-]?\d+(?:\.\d+)?)\s*k$/i);
    if (kMatch) {
      return Math.round(parseFloat(kMatch[1]) * 1000);
    }
    const mMatch = trimmed.match(/^([+-]?\d+(?:\.\d+)?)\s*m$/i);
    if (mMatch) {
      return Math.round(parseFloat(mMatch[1]) * 1e6);
    }
    const parsed = parseInt(trimmed.replace(/,/g, ""), 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  function parseCommentCount(val) {
    if (!val)
      return 0;
    const trimmed = val.trim();
    const match = trimmed.match(/^([+-]?\d+(?:\.\d+)?)\s*([km])?/i);
    if (match) {
      let num = parseFloat(match[1]);
      const multiplier = match[2]?.toLowerCase();
      if (multiplier === "k")
        num *= 1000;
      else if (multiplier === "m")
        num *= 1e6;
      return Math.round(num);
    }
    const parsed = parseInt(trimmed.replace(/,/g, ""), 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  function extractPostId(element, permalink) {
    const attrId = element.getAttribute("id");
    if (attrId && attrId.trim()) {
      return attrId.trim();
    }
    const dataId = element.getAttribute("data-post-id") || element.getAttribute("data-fullname");
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
  function extractTitle(element) {
    const postTitle = element.getAttribute("post-title");
    if (postTitle && postTitle.trim()) {
      return postTitle.trim();
    }
    const titleSlot = element.querySelector('[slot="title"]');
    if (titleSlot && titleSlot.textContent?.trim()) {
      return titleSlot.textContent.trim();
    }
    const heading = element.querySelector('h1, h2, [data-test-id="post-content"] h1, [data-test-id="post-content"] h2');
    if (heading && heading.textContent?.trim()) {
      return heading.textContent.trim();
    }
    const bodyAnchor = element.querySelector('a[data-click-id="body"]');
    if (bodyAnchor && bodyAnchor.textContent?.trim()) {
      return bodyAnchor.textContent.trim();
    }
    return "";
  }
  function extractAuthor(element) {
    const authorAttr = element.getAttribute("author");
    if (authorAttr && authorAttr.trim()) {
      return authorAttr.trim().replace(/^u\//, "");
    }
    const dataAuthor = element.getAttribute("data-author");
    if (dataAuthor && dataAuthor.trim()) {
      return dataAuthor.trim().replace(/^u\//, "");
    }
    const authorLink = element.querySelector('a[href*="/user/"], [data-testid="post_author_link"], [data-click-id="user"], [slot="authorName"]');
    if (authorLink && authorLink.textContent?.trim()) {
      return authorLink.textContent.trim().replace(/^u\//, "");
    }
    return "";
  }
  function extractSubreddit(element, permalink) {
    const prefixed = element.getAttribute("subreddit-prefixed-name");
    if (prefixed && prefixed.trim()) {
      return prefixed.startsWith("r/") ? prefixed.trim() : `r/${prefixed.trim()}`;
    }
    const subName = element.getAttribute("subreddit-name") || element.getAttribute("subreddit");
    if (subName && subName.trim()) {
      return `r/${subName.trim()}`;
    }
    const permalinkMatch = permalink.match(/(?:\/|^)r\/([a-zA-Z0-9_]+)/i);
    if (permalinkMatch) {
      return `r/${permalinkMatch[1]}`;
    }
    const subLink = element.querySelector('a[data-click-id="subreddit"], a[href^="/r/"]:not([href*="/comments/"]), a[href*="reddit.com/r/"]:not([href*="/comments/"])');
    if (subLink && subLink.textContent?.trim()) {
      const text = subLink.textContent.trim();
      return text.startsWith("r/") ? text : `r/${text}`;
    }
    return "";
  }
  function extractPermalink(element) {
    const permalinkAttr = element.getAttribute("permalink");
    if (permalinkAttr && permalinkAttr.trim()) {
      return permalinkAttr.trim();
    }
    const commentsLink = element.querySelector('a[data-click-id="comments"], a[slot="full-post-link"], a[href*="/comments/"]');
    if (commentsLink) {
      const href = commentsLink.getAttribute("href");
      if (href)
        return href;
    }
    return "";
  }
  function extractContentHref(element, permalink) {
    const contentHref = element.getAttribute("content-href");
    if (contentHref && contentHref.trim()) {
      return contentHref.trim();
    }
    const player = element.querySelector('shreddit-player-2, [data-testid="shreddit-player"]');
    if (player) {
      const src = player.getAttribute("src") || player.getAttribute("stream-url");
      if (src)
        return src;
    }
    const video = element.querySelector("video");
    if (video) {
      if (video.src)
        return video.src;
      const source = video.querySelector("source");
      if (source?.src)
        return source.src;
    }
    const img = element.querySelector('img#post-image, [data-post-media-primary], [slot="post-media-container"] img:not(.shreddit-subreddit-icon__icon):not(.post-background-image-filter), shreddit-aspect-ratio:not(:has(video)) img:not(.shreddit-subreddit-icon__icon), [data-testid="post-image"] img, img.preview-img, img.media-lightbox-img:not(.post-background-image-filter), img.preview');
    if (img?.src) {
      return img.src;
    }
    const linkAnchor = element.querySelector('a[data-click-id="body"], a.title, [slot="post-media-container"] a');
    if (linkAnchor?.href) {
      return linkAnchor.href;
    }
    return permalink;
  }
  function determinePostType(element, contentHref) {
    const rawType = element.getAttribute("post-type")?.toLowerCase();
    const domain = element.getAttribute("domain")?.toLowerCase() || "";
    if (rawType === "crosspost") {
      if (element.querySelector('shreddit-gallery, gallery-carousel, faceplate-carousel, [data-testid="media-gallery"], shreddit-async-loader[bundlename*="gallery"]') !== null) {
        return "gallery";
      }
      if (element.querySelector('shreddit-player-2, video, [data-testid="shreddit-player"]') !== null || /(\.mp4|\.webm|\.m3u8|v\.redd\.it|redgifs\.com|streamable\.com|youtube\.com|youtu\.be|tiktok\.com|vimeo\.com)/i.test(contentHref)) {
        return "video";
      }
      const crosspostImg = element.querySelector('img#post-image, [data-post-media-primary], shreddit-aspect-ratio:not(:has(video)) img:not(.shreddit-subreddit-icon__icon), [data-testid="post-image"] img, img.preview-img, img.media-lightbox-img:not(.post-background-image-filter), [slot="post-media-container"] img:not(.shreddit-subreddit-icon__icon):not(.post-background-image-filter)');
      if (crosspostImg !== null || /(\.jpg|\.jpeg|\.png|\.webp|\.gif|i\.redd\.it|i\.imgur\.com)/i.test(contentHref) || domain === "i.redd.it" || domain === "i.imgur.com") {
        return "image";
      }
      if (element.querySelector('[slot="text-body"], shreddit-post-text-body, .usertext-body, [data-testid="post-content"] .md, [data-click-id="text"]') !== null) {
        return "text";
      }
      return "link";
    }
    const isVideoHost = /(redgifs\.com|streamable\.com|gfycat\.com)/i.test(domain) || /(redgifs\.com|streamable\.com|gfycat\.com)/i.test(contentHref);
    const isVideo = rawType === "video" || isVideoHost || element.querySelector('shreddit-player-2, video, [data-testid="shreddit-player"]') !== null || /(\.mp4|\.webm|\.m3u8|v\.redd\.it|redgifs\.com|streamable\.com|youtube\.com|youtu\.be|tiktok\.com|vimeo\.com)/i.test(contentHref);
    if (isVideo) {
      return "video";
    }
    if (rawType === "gallery" || element.querySelector('shreddit-gallery, gallery-carousel, faceplate-carousel, [data-testid="media-gallery"], shreddit-async-loader[bundlename*="gallery"]') !== null) {
      return "gallery";
    }
    if (rawType === "link") {
      return "link";
    }
    if (rawType === "image") {
      return "image";
    }
    const hasTextBody = element.querySelector('[slot="text-body"], shreddit-post-text-body, .usertext-body, [data-testid="post-content"] .md, [data-click-id="text"]') !== null;
    if (rawType === "text" || domain.startsWith("self.")) {
      return "text";
    }
    const primaryImgEl = element.querySelector('img#post-image, [data-post-media-primary], shreddit-aspect-ratio:not(:has(video)) img:not(.shreddit-subreddit-icon__icon), [data-testid="post-image"] img, img.preview-img, img.media-lightbox-img:not(.post-background-image-filter), [slot="post-media-container"] img:not(.shreddit-subreddit-icon__icon):not(.post-background-image-filter)');
    const isImageHref = /(\.jpg|\.jpeg|\.png|\.webp|\.gif|i\.redd\.it|i\.imgur\.com)/i.test(contentHref) || domain === "i.redd.it" || domain === "i.imgur.com";
    if (primaryImgEl !== null || isImageHref) {
      return "image";
    }
    if (hasTextBody) {
      return "text";
    }
    const isExternalLink = contentHref && /^https?:\/\//i.test(contentHref) && !/(v\.redd\.it|i\.redd\.it|preview\.redd\.it|i\.imgur\.com|\.mp4|\.webm|\.m3u8|\.jpg|\.jpeg|\.png|\.webp|\.gif)/i.test(contentHref) && !/\/comments\//i.test(contentHref);
    if (isExternalLink) {
      return "link";
    }
    if (!contentHref || /\/comments\//i.test(contentHref) || /reddit\.com/i.test(contentHref)) {
      return "text";
    }
    return "link";
  }
  var UPVOTE_SELECTORS = [
    '[data-action-bar-action="upvote"]',
    "button[upvote]",
    'button[aria-label*="upvote" i]',
    'button[name="upvote"]',
    '[slot="upvote-button"] button',
    '[slot="upvote-button"]',
    'button[data-click-id="upvote"]',
    'button[id*="upvote" i]',
    'faceplate-tracker[action="upvote"] button',
    'shreddit-post-action-row button[aria-label*="upvote" i]',
    '[data-testid="upvote-button"]',
    ".arrow.up",
    ".arrow.upmod"
  ];
  var DOWNVOTE_SELECTORS = [
    '[data-action-bar-action="downvote"]',
    "button[downvote]",
    'button[aria-label*="downvote" i]',
    'button[name="downvote"]',
    '[slot="downvote-button"] button',
    '[slot="downvote-button"]',
    'button[data-click-id="downvote"]',
    'button[id*="downvote" i]',
    'faceplate-tracker[action="downvote"] button',
    'shreddit-post-action-row button[aria-label*="downvote" i]',
    '[data-testid="downvote-button"]',
    ".arrow.down",
    ".arrow.downmod"
  ];
  function queryDeep(root, selectors) {
    const isHidden = (el) => {
      try {
        if (el.hidden)
          return true;
        const style = el.getAttribute("style") || "";
        if (/display\s*:\s*none/i.test(style))
          return true;
        if (el.classList?.contains("rr-native-suppressed"))
          return true;
      } catch {}
      return false;
    };
    const collect = (node, out) => {
      if (!node)
        return;
      const HTMLElementCtor = globalThis.HTMLElement;
      const isElement = HTMLElementCtor ? node instanceof HTMLElementCtor : node?.nodeType === 1;
      if (isElement) {
        const el = node;
        for (const selector of selectors) {
          try {
            if (el.matches?.(selector))
              out.push(el);
          } catch {}
        }
        const sr = el.shadowRoot;
        if (sr) {
          for (let i = 0;i < sr.childNodes.length; i++)
            collect(sr.childNodes[i], out);
        }
      } else if (node?.nodeType === 11) {
        const frag = node;
        for (let i = 0;i < frag.childNodes.length; i++)
          collect(frag.childNodes[i], out);
        return;
      }
      const children = node.childNodes;
      if (children) {
        for (let i = 0;i < children.length; i++) {
          collect(children[i], out);
        }
      }
    };
    for (const selector of selectors) {
      try {
        const found = root.querySelector(selector);
        if (found && !isHidden(found)) {
          if (found.tagName.toLowerCase() === "button")
            return found;
        }
      } catch {}
    }
    if (root.shadowRoot) {
      for (const selector of selectors) {
        try {
          const found = root.shadowRoot.querySelector(selector);
          if (found && !isHidden(found)) {
            if (found.tagName.toLowerCase() === "button")
              return found;
          }
        } catch {}
      }
    }
    const all = [];
    collect(root, all);
    const visible = all.filter((el) => !isHidden(el));
    const btn = visible.find((el) => el.tagName.toLowerCase() === "button");
    if (btn)
      return btn;
    return visible[0] || null;
  }
  function checkIsUpvoted(element) {
    const voteState = element.getAttribute("vote-state") || element.getAttribute("score-state");
    if (voteState === "upvoted" || voteState === "upvote")
      return true;
    if (element.getAttribute("liked") === "true")
      return true;
    if (element.classList.contains("likes"))
      return true;
    const btn = queryDeep(element, UPVOTE_SELECTORS);
    if (btn) {
      if (btn.getAttribute("aria-pressed") === "true")
        return true;
      if (btn.getAttribute("aria-checked") === "true")
        return true;
      if (btn.getAttribute("data-selected") === "true")
        return true;
      if (btn.classList.contains("active") || btn.classList.contains("upvoted") || btn.classList.contains("upmod") || btn.classList.contains("text-interactive-pressed")) {
        return true;
      }
    }
    return false;
  }
  function checkIsDownvoted(element) {
    const voteState = element.getAttribute("vote-state") || element.getAttribute("score-state");
    if (voteState === "downvoted" || voteState === "downvote")
      return true;
    if (element.getAttribute("liked") === "false")
      return true;
    if (element.classList.contains("dislikes"))
      return true;
    const btn = queryDeep(element, DOWNVOTE_SELECTORS);
    if (btn) {
      if (btn.getAttribute("aria-pressed") === "true")
        return true;
      if (btn.getAttribute("aria-checked") === "true")
        return true;
      if (btn.getAttribute("data-selected") === "true")
        return true;
      if (btn.classList.contains("active") || btn.classList.contains("downvoted") || btn.classList.contains("downmod") || btn.classList.contains("text-interactive-pressed")) {
        return true;
      }
    }
    return false;
  }
  function parsePostElement(element) {
    const permalink = extractPermalink(element);
    const id = extractPostId(element, permalink);
    const title = extractTitle(element);
    const author = extractAuthor(element);
    const subreddit = extractSubreddit(element, permalink);
    const contentHref = extractContentHref(element, permalink);
    const postType = determinePostType(element, contentHref);
    let score = 0;
    let isScoreHidden = false;
    const scoreAttr = element.getAttribute("score");
    if (scoreAttr !== null) {
      const trimmed = scoreAttr.trim();
      if (trimmed === "•" || trimmed.toLowerCase() === "vote") {
        isScoreHidden = true;
      }
      score = parseScore(scoreAttr);
    } else {
      const scoreElem = element.querySelector('shreddit-post-vote-control [slot="score"], faceplate-number, [data-test-id="post-score"], .score, [slot="credit-bar"]') || element.shadowRoot?.querySelector('faceplate-number, [data-testid="action-row"] faceplate-number');
      if (scoreElem) {
        const trimmed = scoreElem.textContent?.trim() || "";
        if (trimmed === "•" || trimmed.toLowerCase() === "vote") {
          isScoreHidden = true;
        }
        score = parseScore(trimmed);
      }
    }
    if (element.dataset) {
      element.dataset.rrPostType = postType;
    }
    let commentCount = 0;
    const commentAttr = element.getAttribute("comment-count");
    if (commentAttr !== null) {
      commentCount = parseCommentCount(commentAttr);
    } else {
      const commentElem = element.querySelector('a[data-click-id="comments"], [slot="comment-count"], a[href*="/comments/"]') || element.shadowRoot?.querySelector('[data-action-bar-action="comments"] faceplate-number, a[name="comments-action-button"] faceplate-number');
      if (commentElem) {
        commentCount = parseCommentCount(commentElem.textContent);
      }
    }
    const isUpvoted = checkIsUpvoted(element);
    const isDownvoted = checkIsDownvoted(element);
    let mediaUrl = undefined;
    if (postType === "video") {
      const player = element.querySelector("shreddit-player-2");
      const videoEl = element.querySelector("video");
      mediaUrl = player?.getAttribute("stream-url") || player?.getAttribute("src") || videoEl?.getAttribute("src") || contentHref || undefined;
    } else if (postType === "image") {
      const img = element.querySelector('img#post-image, [data-post-media-primary], [slot="post-media-container"] img:not(.shreddit-subreddit-icon__icon):not(.post-background-image-filter), shreddit-aspect-ratio:not(:has(video)) img:not(.shreddit-subreddit-icon__icon), [data-testid="post-image"] img, img.preview-img, img.media-lightbox-img:not(.post-background-image-filter), img.preview');
      mediaUrl = img?.src || img?.getAttribute("src") || contentHref || undefined;
    } else if (postType === "link") {
      const img = element.querySelector('shreddit-aspect-ratio img, [slot="post-media-container"] img:not(.shreddit-subreddit-icon__icon):not(.post-background-image-filter), img.preview-img, img.preview');
      mediaUrl = img?.src || img?.getAttribute("src") || undefined;
    }
    let textBody = undefined;
    if (postType === "text") {
      const textBodyEl = element.querySelector('[slot="text-body"], shreddit-post-text-body, .usertext-body, [data-testid="post-content"] .md, [data-click-id="text"]');
      if (textBodyEl) {
        const contentEl = textBodyEl.querySelector('[property="schema:articleBody"], .md, .text-neutral-content') || textBodyEl;
        textBody = contentEl.textContent?.trim() || "";
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
      isScoreHidden
    };
  }
  function findPostElements(root) {
    if ("matches" in root && (root.matches("shreddit-post") || root.matches('[data-testid="post-container"]') || root.matches(".Post"))) {
      return [root];
    }
    const shredditPosts = Array.from(root.querySelectorAll("shreddit-post"));
    if (shredditPosts.length > 0) {
      return shredditPosts;
    }
    const elements = [];
    const seen = new Set;
    const fallbackPosts = Array.from(root.querySelectorAll('[data-testid="post-container"], .Post, article'));
    for (const el of fallbackPosts) {
      if (!seen.has(el) && !fallbackPosts.some((p) => p !== el && p.contains(el))) {
        elements.push(el);
        seen.add(el);
      }
    }
    return elements;
  }
  function extractPosts(root) {
    const targetRoot = root ?? (typeof document !== "undefined" ? document : null);
    if (!targetRoot)
      return [];
    const postElements = findPostElements(targetRoot);
    const posts = [];
    const seenIds = new Set;
    for (const el of postElements) {
      const post = parsePostElement(el);
      if (!seenIds.has(post.id)) {
        seenIds.add(post.id);
        posts.push(post);
      }
    }
    return posts;
  }
  function observeNewPosts(onNewPosts) {
    if (typeof document === "undefined" || typeof MutationObserver === "undefined") {
      return () => {};
    }
    const seenIds = new Set;
    const initialPosts = extractPosts(document);
    for (const post of initialPosts) {
      seenIds.add(post.id);
    }
    let debounceTimer = null;
    const processMutations = () => {
      const currentPosts = extractPosts(document);
      const newPosts = [];
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
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          for (let i = 0;i < mutation.addedNodes.length; i++) {
            const node = mutation.addedNodes[i];
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node;
              if (el.matches?.('shreddit-post, [data-testid="post-container"], .Post') || el.querySelector?.('shreddit-post, [data-testid="post-container"], .Post')) {
                hasRelevantChanges = true;
                break;
              }
            }
          }
        }
        if (hasRelevantChanges)
          break;
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
    const target = document.querySelector("shreddit-feed") || document.querySelector("main") || document.body || document.documentElement;
    if (target) {
      observer.observe(target, {
        childList: true,
        subtree: true
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

  // src/extractor/vote-proxy.ts
  function deepInnerButton(element) {
    if (element.tagName.toLowerCase() === "button")
      return element;
    try {
      const direct = element.querySelector("button");
      if (direct)
        return direct;
    } catch {}
    try {
      const sr = element.shadowRoot;
      const inner = sr?.querySelector("button");
      if (inner)
        return inner;
    } catch {}
    try {
      const nested = element.querySelectorAll("*");
      for (let i = 0;i < nested.length; i++) {
        const el = nested[i];
        try {
          const btn = el.shadowRoot?.querySelector("button");
          if (btn)
            return btn;
        } catch {}
      }
    } catch {}
    return element;
  }
  function clickButton(element) {
    const target = deepInnerButton(element);
    try {
      target.click();
      return true;
    } catch {
      try {
        const clickEvent = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window
        });
        return target.dispatchEvent(clickEvent);
      } catch {
        return false;
      }
    }
  }
  function proxyUpvote(post, onSync) {
    if (!post || !post.element)
      return false;
    const button = queryDeep(post.element, UPVOTE_SELECTORS);
    if (!button)
      return false;
    const wasUpvoted = !!post.isUpvoted;
    const wasDownvoted = !!post.isDownvoted;
    const success = clickButton(button);
    if (success && post.element) {
      if (wasUpvoted) {
        post.isUpvoted = false;
      } else {
        post.isUpvoted = true;
        post.isDownvoted = false;
      }
      const liveUp = checkIsUpvoted(post.element);
      const liveDown = checkIsDownvoted(post.element);
      if (liveUp !== wasUpvoted || liveDown !== wasDownvoted) {
        post.isUpvoted = liveUp;
        post.isDownvoted = liveDown;
      }
      setTimeout(() => {
        if (post.element) {
          post.isUpvoted = checkIsUpvoted(post.element);
          post.isDownvoted = checkIsDownvoted(post.element);
        }
        onSync?.();
      }, 50);
    }
    return success;
  }
  function proxyDownvote(post, onSync) {
    if (!post || !post.element)
      return false;
    const button = queryDeep(post.element, DOWNVOTE_SELECTORS);
    if (!button)
      return false;
    const wasUpvoted = !!post.isUpvoted;
    const wasDownvoted = !!post.isDownvoted;
    const success = clickButton(button);
    if (success && post.element) {
      if (wasDownvoted) {
        post.isDownvoted = false;
      } else {
        post.isDownvoted = true;
        post.isUpvoted = false;
      }
      const liveUp = checkIsUpvoted(post.element);
      const liveDown = checkIsDownvoted(post.element);
      if (liveUp !== wasUpvoted || liveDown !== wasDownvoted) {
        post.isUpvoted = liveUp;
        post.isDownvoted = liveDown;
      }
      setTimeout(() => {
        if (post.element) {
          post.isUpvoted = checkIsUpvoted(post.element);
          post.isDownvoted = checkIsDownvoted(post.element);
        }
        onSync?.();
      }, 50);
    }
    return success;
  }

  // src/media/video-hydrator.ts
  function readPlayerSrc(player) {
    try {
      const direct = player.getAttribute("stream-url") || player.getAttribute("src");
      if (direct)
        return direct;
      const packed = player.getAttribute("packaged-media-json");
      if (packed) {
        try {
          const json = JSON.parse(packed);
          const url = json?.playbackMp4Url || json?.playback_url || json?.hlsUrl;
          if (typeof url === "string" && url)
            return url;
        } catch {}
      }
    } catch {}
    return "";
  }
  function hydrateVideoFromPlayer(container, video) {
    try {
      if (video.currentSrc)
        return true;
      if (video.readyState > 0 && video.src)
        return true;
      const player = video.closest?.("shreddit-player-2") || container.querySelector?.("shreddit-player-2");
      if (!player)
        return !!video.src;
      const src = readPlayerSrc(player);
      if (!src)
        return !!video.src;
      video.src = src;
      video.preload = "auto";
      video.setAttribute("muted", "");
      video.muted = true;
      try {
        video.load();
      } catch {}
      return true;
    } catch {
      return false;
    }
  }
  function ensureAutoplayAttrs(video) {
    try {
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.preload = "auto";
    } catch {}
  }

  // src/media/audio-manager.ts
  var STORAGE_KEY = "reddit_reels_muted";
  function getInitialMuteState() {
    try {
      if (typeof GM_getValue === "function") {
        const gmVal = GM_getValue(STORAGE_KEY, null);
        if (gmVal !== null && typeof gmVal === "boolean") {
          return gmVal;
        }
      }
    } catch {}
    try {
      if (typeof localStorage !== "undefined") {
        const localVal = localStorage.getItem(STORAGE_KEY);
        if (localVal !== null) {
          return localVal === "true";
        }
      }
    } catch {}
    return false;
  }
  function persistMuteState(muted) {
    try {
      if (typeof GM_setValue === "function") {
        GM_setValue(STORAGE_KEY, muted);
      }
    } catch {}
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, String(muted));
      }
    } catch {}
  }
  var VOLUME_KEY = "reddit_reels_volume";
  function getInitialVolume() {
    try {
      if (typeof GM_getValue === "function") {
        const gmVal = GM_getValue(VOLUME_KEY, null);
        if (typeof gmVal === "number" && gmVal >= 0 && gmVal <= 1)
          return gmVal;
      }
    } catch {}
    try {
      if (typeof localStorage !== "undefined") {
        const raw = localStorage.getItem(VOLUME_KEY);
        if (raw !== null) {
          const n = parseFloat(raw);
          if (!Number.isNaN(n) && n >= 0 && n <= 1)
            return n;
        }
      }
    } catch {}
    return 1;
  }
  function persistVolume(volume) {
    try {
      if (typeof GM_setValue === "function") {
        GM_setValue(VOLUME_KEY, volume);
      }
    } catch {}
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(VOLUME_KEY, String(volume));
      }
    } catch {}
  }
  function normalizeIframeSrc(src, isMuted) {
    if (!src || src === "about:blank")
      return src;
    const target = isMuted ? "muted=1" : "muted=0";
    if (/[?&]muted=[01]/.test(src)) {
      return src.replace(/([?&]muted=)[01]/g, `$1${isMuted ? "1" : "0"}`);
    }
    const sep = src.includes("?") ? "&" : "?";
    return `${src}${sep}${target}`;
  }
  function sendIframePlay(ifr) {
    try {
      if (!ifr.src || ifr.src === "about:blank")
        return;
      ifr.contentWindow?.postMessage({ source: "reddit-reels", type: "PLAY" }, "*");
      ifr.contentWindow?.postMessage({ action: "play", type: "play" }, "*");
    } catch {}
  }
  function listenForRedGifsReady(getState) {
    const handler = (event) => {
      try {
        const data = event.data;
        if (!data || data.source !== "redgifs-bridge" || data.type !== "READY")
          return;
        const src = event.source;
        if (!src || typeof src.postMessage !== "function")
          return;
        const { muted, volume } = getState();
        src.postMessage({ source: "reddit-reels", type: "SET_AUDIO", muted, volume }, "*");
        src.postMessage({ source: "reddit-reels", type: "PLAY" }, "*");
      } catch {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }
  function blurIframes(container) {
    try {
      container.querySelectorAll("iframe").forEach((ifr) => {
        try {
          ifr.tabIndex = -1;
          ifr.blur();
        } catch {}
      });
    } catch {}
  }
  var sharedAudioCtx = null;
  function unlockAudio() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx)
        return;
      if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
        sharedAudioCtx = new AudioCtx;
      }
      const ctx = sharedAudioCtx;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch {}
  }
  function deepFindMediaElements(root) {
    const videos = [];
    const audios = [];
    const players = [];
    function traverse(node) {
      if (!node)
        return;
      if (typeof HTMLVideoElement !== "undefined" && node instanceof HTMLVideoElement || node.tagName?.toLowerCase() === "video") {
        videos.push(node);
      } else if (typeof HTMLAudioElement !== "undefined" && node instanceof HTMLAudioElement || node.tagName?.toLowerCase() === "audio") {
        audios.push(node);
      } else if (node instanceof HTMLElement) {
        const tag = node.tagName.toLowerCase();
        if (tag.includes("player") || tag.includes("vds-media") || tag.includes("vds-video") || tag.includes("vds-audio")) {
          players.push(node);
        }
        if (node.shadowRoot) {
          traverse(node.shadowRoot);
        }
      }
      if (node.childNodes && node.childNodes.length > 0) {
        for (let i = 0;i < node.childNodes.length; i++) {
          traverse(node.childNodes[i]);
        }
      }
    }
    traverse(root);
    return { videos, audios, players };
  }
  function applyAudioState(container, isMuted, volume = 1) {
    if (!container)
      return;
    const level = isMuted ? 0 : volume;
    const { videos, audios, players } = deepFindMediaElements(container);
    for (const video of videos) {
      try {
        video.muted = isMuted;
        video.volume = level;
        if (!isMuted && video.paused) {
          video.play().catch(() => {});
        }
      } catch {}
    }
    for (const audio of audios) {
      try {
        audio.muted = isMuted;
        audio.volume = level;
        if (!isMuted && audio.paused) {
          audio.play().catch(() => {});
        }
      } catch {}
    }
    for (const player of players) {
      try {
        if (isMuted) {
          player.setAttribute("muted", "");
          player.muted = true;
        } else {
          player.removeAttribute("muted");
          player.muted = false;
          player.volume = level;
        }
      } catch {}
    }
    const iframes = container.querySelectorAll("iframe");
    for (const ifr of iframes) {
      try {
        if (!ifr.src || ifr.src === "about:blank")
          continue;
        ifr.contentWindow?.postMessage({
          source: "reddit-reels",
          type: "SET_AUDIO",
          muted: isMuted,
          volume: level
        }, "*");
        ifr.contentWindow?.postMessage({
          action: isMuted ? "mute" : "unmute",
          type: isMuted ? "mute" : "unmute",
          muted: isMuted,
          volume: level
        }, "*");
      } catch {}
    }
  }

  class AudioManager {
    _isMuted;
    _volume;
    activeContainer = null;
    activeVideo = null;
    videoCache = new WeakMap;
    constructor(initialMuted, initialVolume) {
      this._isMuted = initialMuted !== undefined ? initialMuted : getInitialMuteState();
      this._volume = initialVolume !== undefined ? initialVolume : getInitialVolume();
    }
    get isMuted() {
      return this._isMuted;
    }
    set isMuted(value) {
      this._isMuted = value;
      persistMuteState(this._isMuted);
      this.syncActiveMute();
    }
    get volume() {
      return this._volume;
    }
    setVolume(level, container) {
      const clamped = Number.isFinite(level) ? Math.min(1, Math.max(0, level)) : 1;
      this._volume = clamped;
      persistVolume(clamped);
      if (clamped === 0 && !this._isMuted) {
        this._isMuted = true;
        persistMuteState(true);
      } else if (clamped > 0 && this._isMuted) {
        this._isMuted = false;
        persistMuteState(false);
      }
      const target = container || this.activeContainer;
      if (target)
        applyAudioState(target, this._isMuted, this._volume);
      this.syncActiveMute();
      return this._volume;
    }
    adjustVolume(delta, container) {
      return this.setVolume(this._volume + delta, container);
    }
    getActiveVideo() {
      return this.activeVideo;
    }
    getActiveContainer() {
      return this.activeContainer;
    }
    requestPlayback(target) {
      if (!target)
        return;
      let targetVideo = null;
      let targetContainer = null;
      const isVideo = typeof HTMLVideoElement !== "undefined" && target instanceof HTMLVideoElement || target.tagName?.toLowerCase() === "video" || typeof target.play === "function";
      if (isVideo) {
        targetVideo = target;
        targetContainer = typeof target.closest === "function" ? target.closest("shreddit-post, [data-post-id], article") : null;
      } else {
        targetContainer = target;
        targetVideo = this.findVideo(target);
      }
      if (this.activeVideo && this.activeVideo !== targetVideo) {
        try {
          this.activeVideo.pause();
          this.activeVideo.muted = true;
          this.activeVideo.currentTime = 0;
        } catch {}
      }
      if (this.activeContainer && this.activeContainer !== targetContainer) {
        applyAudioState(this.activeContainer, true);
      }
      this.activeContainer = targetContainer;
      this.activeVideo = targetVideo;
      if (typeof document !== "undefined") {
        const allVideos = document.querySelectorAll("video");
        allVideos.forEach((v) => {
          if (v !== targetVideo) {
            try {
              if (!v.paused)
                v.pause();
              v.muted = true;
              v.currentTime = 0;
            } catch {}
          }
        });
        const allAudios = document.querySelectorAll("audio");
        allAudios.forEach((a) => {
          try {
            if (!a.paused)
              a.pause();
            a.muted = true;
            a.currentTime = 0;
          } catch {}
        });
        const allIframes = document.querySelectorAll("iframe");
        allIframes.forEach((ifr) => {
          if (!targetContainer || !targetContainer.contains(ifr)) {
            if (ifr.src && ifr.src !== "about:blank") {
              ifr.dataset.rrSrc = ifr.src;
              ifr.src = "about:blank";
            }
          }
        });
      }
      if (targetContainer) {
        const iframes = targetContainer.querySelectorAll("iframe");
        iframes.forEach((ifr) => {
          try {
            const stored = ifr.dataset.rrSrc;
            if (ifr.src === "about:blank" && stored) {
              ifr.src = normalizeIframeSrc(stored, this._isMuted);
            }
            ifr.tabIndex = -1;
          } catch {}
        });
        applyAudioState(targetContainer, this._isMuted, this._volume);
        iframes.forEach((ifr) => sendIframePlay(ifr));
        blurIframes(targetContainer);
      }
      if (targetVideo) {
        if (targetContainer && targetContainer === this.activeContainer && !targetVideo.paused && targetVideo.currentSrc) {
          applyAudioState(targetContainer, this._isMuted, this._volume);
          return;
        }
        ensureAutoplayAttrs(targetVideo);
        if (targetContainer && (!targetVideo.currentSrc || targetVideo.readyState === 0)) {
          hydrateVideoFromPlayer(targetContainer, targetVideo);
        }
        targetVideo.muted = this._isMuted;
        targetVideo.volume = this._isMuted ? 0 : this._volume;
        targetVideo.play().catch((err) => {
          if (!targetVideo)
            return;
          const name = err && err.name || "";
          if (name === "NotSupportedError") {
            if (targetContainer)
              hydrateVideoFromPlayer(targetContainer, targetVideo);
            targetVideo.muted = true;
            targetVideo.play().catch(() => {});
            return;
          }
          if (!targetVideo.muted && (name === "NotAllowedError" || name === "AbortError")) {
            targetVideo.muted = true;
            targetVideo.play().catch(() => {});
          }
        });
      }
    }
    findVideo(container) {
      if (!container)
        return null;
      if (container === this.activeContainer && this.activeVideo && container.contains(this.activeVideo)) {
        return this.activeVideo;
      }
      const cached = this.videoCache.get(container);
      if (cached && Date.now() - cached.time < 1000 && (cached.video === null || container.contains(cached.video))) {
        return cached.video;
      }
      const { videos } = deepFindMediaElements(container);
      const found = videos.length > 0 ? videos[0] : null;
      try {
        this.videoCache.set(container, { video: found, time: Date.now() });
      } catch {}
      return found;
    }
    invalidateVideoCache(container) {
      try {
        if (container) {
          this.videoCache.delete(container);
        }
      } catch {}
    }
    toggleMute(container) {
      this._isMuted = !this._isMuted;
      persistMuteState(this._isMuted);
      const target = container || this.activeContainer;
      if (target) {
        applyAudioState(target, this._isMuted, this._volume);
      }
      this.syncActiveMute();
      return this._isMuted;
    }
    reassertActiveIframeUnmute() {
      if (this._isMuted || !this.activeContainer)
        return;
      try {
        const iframes = this.activeContainer.querySelectorAll("iframe");
        iframes.forEach((ifr) => {
          try {
            const stored = ifr.dataset.rrSrc;
            if (ifr.src === "about:blank" && stored) {
              ifr.src = normalizeIframeSrc(stored, false);
            }
          } catch {}
        });
        applyAudioState(this.activeContainer, false, this._volume);
        iframes.forEach((ifr) => sendIframePlay(ifr));
      } catch {}
    }
    syncActiveMute() {
      if (this.activeContainer) {
        applyAudioState(this.activeContainer, this._isMuted, this._volume);
      } else if (this.activeVideo) {
        try {
          this.activeVideo.muted = this._isMuted;
          this.activeVideo.volume = this._isMuted ? 0 : this._volume;
          if (!this._isMuted && this.activeVideo.paused) {
            this.activeVideo.play().catch(() => {});
          }
        } catch {}
      }
    }
    stopAll() {
      if (this.activeContainer) {
        applyAudioState(this.activeContainer, true);
      }
      if (this.activeVideo) {
        try {
          this.activeVideo.pause();
          this.activeVideo.muted = true;
          this.activeVideo.currentTime = 0;
        } catch {}
      }
      this.activeVideo = null;
      this.activeContainer = null;
      if (typeof document !== "undefined") {
        const allVideos = document.querySelectorAll("video");
        allVideos.forEach((v) => {
          try {
            if (!v.paused)
              v.pause();
            v.muted = true;
            v.currentTime = 0;
          } catch {}
        });
        const allAudios = document.querySelectorAll("audio");
        allAudios.forEach((a) => {
          try {
            if (!a.paused)
              a.pause();
            a.muted = true;
            a.currentTime = 0;
          } catch {}
        });
        const allIframes = document.querySelectorAll("iframe");
        allIframes.forEach((ifr) => {
          try {
            ifr.contentWindow?.postMessage({ source: "reddit-reels", type: "PAUSE", muted: true }, "*");
            ifr.contentWindow?.postMessage({ action: "pause", muted: true }, "*");
          } catch {}
        });
      }
    }
  }
  var audioManager = new AudioManager;
  // src/media/redgifs-bridge.ts
  var REDGIFS_MESSAGE_SOURCE = "reddit-reels";
  function isRedGifsFrame() {
    if (typeof window === "undefined")
      return false;
    return /redgifs\.com/i.test(window.location.hostname);
  }
  function getStoredMute() {
    try {
      if (typeof GM_getValue === "function") {
        const gm = GM_getValue("reddit_reels_muted", null);
        if (typeof gm === "boolean")
          return gm;
      }
    } catch {}
    return false;
  }
  function getStoredVolume() {
    try {
      if (typeof GM_getValue === "function") {
        const gm = GM_getValue("reddit_reels_volume", null);
        if (typeof gm === "number" && gm >= 0 && gm <= 1)
          return gm;
      }
    } catch {}
    return 1;
  }
  function initRedGifsBridge() {
    if (!isRedGifsFrame())
      return () => {};
    let currentMuted = getStoredMute();
    let currentVolume = getStoredVolume();
    const applyToVideo = (video) => {
      try {
        video.muted = currentMuted;
        video.volume = currentVolume;
        if (!currentMuted && video.paused) {
          video.play().catch(() => {
            try {
              video.muted = true;
              video.play().catch(() => {});
            } catch {}
          });
        } else if (currentMuted && video.paused) {
          video.play().catch(() => {});
        }
      } catch {}
    };
    const syncActiveVideo = () => {
      const video = document.querySelector("video");
      if (video)
        applyToVideo(video);
    };
    const handleMessage = (event) => {
      const data = event.data;
      if (!data || data.source !== REDGIFS_MESSAGE_SOURCE)
        return;
      const video = document.querySelector("video");
      if (data.type === "SET_AUDIO" || data.type === "SET_MUTE") {
        if (typeof data.muted === "boolean") {
          currentMuted = data.muted;
        }
        if (typeof data.volume === "number") {
          currentVolume = Math.min(1, Math.max(0, data.volume));
        }
        if (video)
          applyToVideo(video);
      } else if (data.type === "PAUSE") {
        if (video && !video.paused) {
          video.pause();
          video.muted = true;
        }
      } else if (data.type === "PLAY") {
        if (video) {
          applyToVideo(video);
          video.play().catch(() => {});
        }
      }
    };
    window.addEventListener("message", handleMessage);
    const observer = new MutationObserver(() => {
      const video = document.querySelector("video");
      if (video) {
        applyToVideo(video);
        if (!video.dataset.rrBridgeWired) {
          video.dataset.rrBridgeWired = "1";
          video.addEventListener("play", () => applyToVideo(video), { once: true });
        }
      }
    });
    if (document.body || document.documentElement) {
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
      });
    }
    syncActiveVideo();
    const handleUserGesture = () => {
      syncActiveVideo();
    };
    window.addEventListener("click", handleUserGesture, true);
    window.addEventListener("pointerdown", handleUserGesture, true);
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ source: "redgifs-bridge", type: "READY" }, "*");
      }
    } catch {}
    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("click", handleUserGesture, true);
      window.removeEventListener("pointerdown", handleUserGesture, true);
      observer.disconnect();
    };
  }

  // src/media/index.ts
  function resolveMedia(post) {
    const el = post.element;
    if (!el) {
      return {
        type: "image",
        src: post.mediaUrl || post.contentHref || "",
        hasAudio: false
      };
    }
    const video = el.querySelector("video");
    const player = el.querySelector("shreddit-player-2");
    if (video || player) {
      const src = video?.currentSrc || video?.src || player?.getAttribute("stream-url") || player?.getAttribute("src") || post.mediaUrl || post.contentHref || "";
      const poster = video?.poster || player?.getAttribute("poster") || player?.getAttribute("preview") || undefined;
      return {
        type: "video",
        src,
        poster,
        hasAudio: player?.getAttribute("has-audio") !== "false",
        element: video || player || undefined
      };
    }
    const iframe = el.querySelector("iframe");
    if (iframe && iframe.src) {
      let src = normalizeIframeSrc(iframe.src, audioManager.isMuted);
      if (/redgifs\.com|streamable\.com|gfycat\.com/i.test(src) && !/[?&]autoplay=/.test(src)) {
        src += (src.includes("?") ? "&" : "?") + "autoplay=1";
      }
      return {
        type: "iframe",
        src,
        hasAudio: true,
        element: iframe
      };
    }
    if (post.contentHref && /redgifs\.com/i.test(post.contentHref)) {
      const match = post.contentHref.match(/redgifs\.com\/(?:watch|ifr|v)\/([a-zA-Z0-9_-]+)/i);
      if (!match) {
        const imgFallback = el.querySelector("img");
        const fallbackSrc = imgFallback?.src || post.mediaUrl || post.contentHref || "";
        return {
          type: "image",
          src: fallbackSrc,
          poster: fallbackSrc,
          hasAudio: false
        };
      }
      return {
        type: "iframe",
        src: normalizeIframeSrc(`https://www.redgifs.com/ifr/${match[1]}?autoplay=1&muted=1`, audioManager.isMuted),
        hasAudio: true
      };
    }
    const img = el.querySelector('img[src*="i.redd.it"], img[src*="preview.redd.it"], [slot="post-media-container"] img, img');
    const imgSrc = img?.src || post.mediaUrl || post.contentHref || "";
    return {
      type: "image",
      src: imgSrc,
      poster: imgSrc,
      hasAudio: false
    };
  }

  // node_modules/preact/dist/preact.module.js
  var n;
  var l;
  var u;
  var t;
  var i;
  var r;
  var o;
  var e;
  var f;
  var c;
  var a;
  var s;
  var h;
  var p;
  var v;
  var y;
  var d = {};
  var w = [];
  var _ = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
  var g = Array.isArray;
  function m(n, l) {
    for (var u in l)
      n[u] = l[u];
    return n;
  }
  function b(n) {
    n && n.parentNode && n.parentNode.removeChild(n);
  }
  function k(l, u, t) {
    var i, r, o, e = {};
    for (o in u)
      o == "key" ? i = u[o] : o == "ref" ? r = u[o] : e[o] = u[o];
    if (arguments.length > 2 && (e.children = arguments.length > 3 ? n.call(arguments, 2) : t), typeof l == "function" && l.defaultProps != null)
      for (o in l.defaultProps)
        e[o] === undefined && (e[o] = l.defaultProps[o]);
    return x(l, e, i, r, null);
  }
  function x(n, t, i, r, o) {
    var e = { type: n, props: t, key: i, ref: r, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: undefined, __v: o == null ? ++u : o, __i: -1, __u: 0 };
    return o == null && l.vnode != null && l.vnode(e), e;
  }
  function S(n) {
    return n.children;
  }
  function C(n, l) {
    this.props = n, this.context = l;
  }
  function $(n, l) {
    if (l == null)
      return n.__ ? $(n.__, n.__i + 1) : null;
    for (var u;l < n.__k.length; l++)
      if ((u = n.__k[l]) != null && u.__e != null)
        return u.__e;
    return typeof n.type == "function" ? $(n) : null;
  }
  function I(n) {
    if (n.__P && n.__d) {
      var u = n.__v, t = u.__e, i = [], r = [], o = m({}, u);
      o.__v = u.__v + 1, l.vnode && l.vnode(o), q(n.__P, o, u, n.__n, n.__P.namespaceURI, 32 & u.__u ? [t] : null, i, t == null ? $(u) : t, !!(32 & u.__u), r), o.__v = u.__v, o.__.__k[o.__i] = o, D(i, o, r), u.__e = u.__ = null, o.__e != t && P(o);
    }
  }
  function P(n) {
    if ((n = n.__) != null && n.__c != null)
      return n.__e = n.__c.base = null, n.__k.some(function(l) {
        if (l != null && l.__e != null)
          return n.__e = n.__c.base = l.__e;
      }), P(n);
  }
  function A(n) {
    (!n.__d && (n.__d = true) && i.push(n) && !H.__r++ || r != l.debounceRendering) && ((r = l.debounceRendering) || o)(H);
  }
  function H() {
    try {
      for (var n, l = 1;i.length; )
        i.length > l && i.sort(e), n = i.shift(), l = i.length, I(n);
    } finally {
      i.length = H.__r = 0;
    }
  }
  function L(n, l, u, t, i, r, o, e, f, c, a) {
    var s, h, p, v, y, _, g = t && t.__k || w, m = l.length;
    for (f = T(u, l, g, f, m), s = 0;s < m; s++)
      (p = u.__k[s]) != null && (h = p.__i != -1 && g[p.__i] || d, p.__i = s, _ = q(n, p, h, i, r, o, e, f, c, a), v = p.__e, p.ref && h.ref != p.ref && (h.ref && J(h.ref, null, p), a.push(p.ref, p.__c || v, p)), y == null && v != null && (y = v), 4 & p.__u ? (f = j(p, f, n), h.__e && (h.__e = null)) : typeof p.type == "function" && _ !== undefined ? f = _ : v && (f = v.nextSibling), p.__u &= -7);
    return u.__e = y, f;
  }
  function T(n, l, u, t, i) {
    var r, o, e, f, c, a = u.length, s = a, h = 0;
    for (n.__k = new Array(i), r = 0;r < i; r++)
      (o = l[r]) != null && typeof o != "boolean" && typeof o != "function" ? (typeof o == "string" || typeof o == "number" || typeof o == "bigint" || o.constructor == String ? o = n.__k[r] = x(null, o, null, null, null) : g(o) ? o = n.__k[r] = x(S, { children: o }, null, null, null) : o.constructor === undefined && o.__b > 0 ? o = n.__k[r] = x(o.type, o.props, o.key, o.ref ? o.ref : null, o.__v) : n.__k[r] = o, f = r + h, o.__ = n, o.__b = n.__b + 1, e = null, (c = o.__i = O(o, u, f, s)) != -1 && (s--, (e = u[c]) && (e.__u |= 2)), e == null || e.__v == null ? (c == -1 && (i > a ? h-- : i < a && h++), typeof o.type != "function" && (o.__u |= 4)) : c != f && (c == f - 1 ? h-- : c == f + 1 ? h++ : (c > f ? h-- : h++, o.__u |= 4))) : n.__k[r] = null;
    if (s)
      for (r = 0;r < a; r++)
        (e = u[r]) != null && (2 & e.__u) == 0 && (e.__e == t && (t = $(e)), K(e, e));
    return t;
  }
  function j(n, l, u) {
    var t, i;
    if (typeof n.type == "function") {
      for (t = n.__k, i = 0;t && i < t.length; i++)
        t[i] && (t[i].__ = n, l = j(t[i], l, u));
      return l;
    }
    n.__e != l && (l && n.type && !l.parentNode && (l = $(n)), l = u.insertBefore(n.__e, l || null));
    do {
      l = l && l.nextSibling;
    } while (l != null && l.nodeType == 8);
    return l;
  }
  function O(n, l, u, t) {
    var i, r, o, { key: e, type: f } = n, c = l[u], a = c != null && (2 & c.__u) == 0;
    if (c === null && e == null || a && e == c.key && f == c.type)
      return u;
    if (t > (a ? 1 : 0)) {
      for (i = u - 1, r = u + 1;i >= 0 || r < l.length; )
        if ((c = l[o = i >= 0 ? i-- : r++]) != null && (2 & c.__u) == 0 && e == c.key && f == c.type)
          return o;
    }
    return -1;
  }
  function z(n, l, u) {
    l[0] == "-" ? n.setProperty(l, u == null ? "" : u) : n[l] = u == null ? "" : typeof u != "number" || _.test(l) ? u : u + "px";
  }
  function N(n, l, u, t, i) {
    var r, o;
    n:
      if (l == "style")
        if (typeof u == "string")
          n.style.cssText = u;
        else {
          if (typeof t == "string" && (n.style.cssText = t = ""), t)
            for (l in t)
              u && l in u || z(n.style, l, "");
          if (u)
            for (l in u)
              t && u[l] == t[l] || z(n.style, l, u[l]);
        }
      else if (l[0] == "o" && l[1] == "n")
        r = l != (l = l.replace(s, "$1")), o = l.toLowerCase(), l = o in n || l == "onFocusOut" || l == "onFocusIn" ? o.slice(2) : l.slice(2), n.l || (n.l = {}), n.l[l + r] = u, u ? t ? u[a] = t[a] : (u[a] = h, n.addEventListener(l, r ? v : p, r)) : n.removeEventListener(l, r ? v : p, r);
      else {
        if (i == "http://www.w3.org/2000/svg")
          l = l.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
        else if (l != "width" && l != "height" && l != "href" && l != "list" && l != "form" && l != "tabIndex" && l != "download" && l != "rowSpan" && l != "colSpan" && l != "role" && l != "popover" && l in n)
          try {
            n[l] = u == null ? "" : u;
            break n;
          } catch (n) {}
        typeof u == "function" || (u == null || u === false && l[4] != "-" ? n.removeAttribute(l) : n.setAttribute(l, l == "popover" && u == 1 ? "" : u));
      }
  }
  function V(n) {
    return function(u) {
      if (this.l) {
        var t = this.l[u.type + n];
        if (u[c] == null)
          u[c] = h++;
        else if (u[c] < t[a])
          return;
        return t(l.event ? l.event(u) : u);
      }
    };
  }
  function q(n, u, t, i, r, o, e, f, c, a) {
    var s, h, p, v, y, d, _, k, x, M, I, P, A, H, T, j, F = u.type;
    if (u.constructor !== undefined)
      return null;
    128 & t.__u && (c = !!(32 & t.__u), o = [f = u.__e = t.__e]), (s = l.__b) && s(u);
    n:
      if (typeof F == "function") {
        h = e.length;
        try {
          if (x = u.props, M = F.prototype && F.prototype.render, I = (s = F.contextType) && i[s.__c], P = s ? I ? I.props.value : s.__ : i, t.__c ? k = (p = u.__c = t.__c).__ = p.__E : (M ? u.__c = p = new F(x, P) : (u.__c = p = new C(x, P), p.constructor = F, p.render = Q), I && I.sub(p), p.state || (p.state = {}), p.__n = i, v = p.__d = true, p.__h = [], p._sb = []), M && p.__s == null && (p.__s = p.state), M && F.getDerivedStateFromProps != null && (p.__s == p.state && (p.__s = m({}, p.__s)), m(p.__s, F.getDerivedStateFromProps(x, p.__s))), y = p.props, d = p.state, p.__v = u, v)
            M && F.getDerivedStateFromProps == null && p.componentWillMount != null && p.componentWillMount(), M && p.componentDidMount != null && p.__h.push(p.componentDidMount);
          else {
            if (M && F.getDerivedStateFromProps == null && x !== y && p.componentWillReceiveProps != null && p.componentWillReceiveProps(x, P), u.__v == t.__v || !p.__e && p.shouldComponentUpdate != null && p.shouldComponentUpdate(x, p.__s, P) === false) {
              u.__v != t.__v && (p.props = x, p.state = p.__s, p.__d = false), u.__e = t.__e, u.__k = t.__k, u.__k.some(function(n) {
                n && (n.__ = u);
              }), w.push.apply(p.__h, p._sb), p._sb = [], p.__h.length && e.push(p), f = $(t);
              break n;
            }
            p.componentWillUpdate != null && p.componentWillUpdate(x, p.__s, P), M && p.componentDidUpdate != null && p.__h.push(function() {
              p.componentDidUpdate(y, d, _);
            });
          }
          if (p.context = P, p.props = x, p.__P = n, p.__e = false, A = l.__r, H = 0, M)
            p.state = p.__s, p.__d = false, A && A(u), s = p.render(p.props, p.state, p.context), w.push.apply(p.__h, p._sb), p._sb = [];
          else
            do {
              p.__d = false, A && A(u), s = p.render(p.props, p.state, p.context), p.state = p.__s;
            } while (p.__d && ++H < 25);
          p.state = p.__s, p.getChildContext != null && (i = m(m({}, i), p.getChildContext())), M && !v && p.getSnapshotBeforeUpdate != null && (_ = p.getSnapshotBeforeUpdate(y, d)), T = s != null && s.type === S && s.key == null ? E(s.props.children) : s, f = L(n, g(T) ? T : [T], u, t, i, r, o, e, f, c, a), p.base = u.__e, u.__u &= -161, p.__h.length && e.push(p), k && (p.__E = p.__ = null);
        } catch (n) {
          if (e.length = h, u.__v = null, c || o != null) {
            if (n.then) {
              for (u.__u |= c ? 160 : 128;f && f.nodeType == 8 && f.nextSibling; )
                f = f.nextSibling;
              o != null && (o[o.indexOf(f)] = null), u.__e = f;
            } else if (o != null)
              for (j = o.length;j--; )
                b(o[j]);
          } else
            u.__e = t.__e;
          u.__k == null && (u.__k = t.__k || []), n.then || B(u), l.__e(n, u, t);
        }
      } else
        o == null && u.__v == t.__v ? (u.__k = t.__k, u.__e = t.__e) : f = u.__e = G(t.__e, u, t, i, r, o, e, c, a);
    return (s = l.diffed) && s(u), 128 & u.__u ? undefined : f;
  }
  function B(n) {
    n && (n.__c && (n.__c.__e = true), n.__k && n.__k.some(B));
  }
  function D(n, u, t) {
    for (var i = 0;i < t.length; i++)
      J(t[i], t[++i], t[++i]);
    l.__c && l.__c(u, n), n.some(function(u) {
      try {
        n = u.__h, u.__h = [], n.some(function(n) {
          n.call(u);
        });
      } catch (n) {
        l.__e(n, u.__v);
      }
    });
  }
  function E(n) {
    return typeof n != "object" || n == null || n.__b > 0 ? n : g(n) ? n.map(E) : n.constructor !== undefined ? null : m({}, n);
  }
  function G(u, t, i, r, o, e, f, c, a) {
    var s, h, p, v, y, w, _, m = i.props || d, { props: k, type: x } = t;
    if (x == "svg" ? o = "http://www.w3.org/2000/svg" : x == "math" ? o = "http://www.w3.org/1998/Math/MathML" : o || (o = "http://www.w3.org/1999/xhtml"), e != null) {
      for (s = 0;s < e.length; s++)
        if ((y = e[s]) && "setAttribute" in y == !!x && (x ? y.localName == x : y.nodeType == 3)) {
          u = y, e[s] = null;
          break;
        }
    }
    if (u == null) {
      if (x == null)
        return document.createTextNode(k);
      u = document.createElementNS(o, x, k.is && k), c && (l.__m && l.__m(t, e), c = false), e = null;
    }
    if (x == null)
      m === k || c && u.data == k || (u.data = k);
    else {
      if (e = x == "textarea" && k.defaultValue != null ? null : e && n.call(u.childNodes), !c && e != null)
        for (m = {}, s = 0;s < u.attributes.length; s++)
          m[(y = u.attributes[s]).name] = y.value;
      for (s in m)
        y = m[s], s == "dangerouslySetInnerHTML" ? p = y : s == "children" || (s in k) || s == "value" && ("defaultValue" in k) || s == "checked" && ("defaultChecked" in k) || N(u, s, null, y, o);
      for (s in k)
        y = k[s], s == "children" ? v = y : s == "dangerouslySetInnerHTML" ? h = y : s == "value" ? w = y : s == "checked" ? _ = y : c && typeof y != "function" || m[s] === y || N(u, s, y, m[s], o);
      if (h)
        c || p && (h.__html == p.__html || h.__html == u.innerHTML) || (u.innerHTML = h.__html), t.__k = [];
      else if (p && (u.innerHTML = ""), L(t.type == "template" ? u.content : u, g(v) ? v : [v], t, i, r, x == "foreignObject" ? "http://www.w3.org/1999/xhtml" : o, e, f, e ? e[0] : i.__k && $(i, 0), c, a), e != null)
        for (s = e.length;s--; )
          b(e[s]);
      c && x != "textarea" || (s = "value", x == "progress" && w == null ? u.removeAttribute("value") : w != null && (w !== u[s] || x == "progress" && !w || x == "option" && w != m[s]) && N(u, s, w, m[s], o), s = "checked", _ != null && _ != u[s] && N(u, s, _, m[s], o));
    }
    return u;
  }
  function J(n, u, t) {
    try {
      if (typeof n == "function") {
        var i = typeof n.__u == "function";
        i && n.__u(), i && u == null || (n.__u = n(u));
      } else
        n.current = u;
    } catch (n) {
      l.__e(n, t);
    }
  }
  function K(n, u, t) {
    var i, r;
    if (l.unmount && l.unmount(n), (i = n.ref) && (i.current && i.current != n.__e || J(i, null, u)), (i = n.__c) != null) {
      if (i.componentWillUnmount)
        try {
          i.componentWillUnmount();
        } catch (n) {
          l.__e(n, u);
        }
      i.base = i.__P = i.__n = null;
    }
    if (i = n.__k)
      for (r = 0;r < i.length; r++)
        i[r] && K(i[r], u, t || typeof n.type != "function");
    t || b(n.__e), n.__c = n.__ = n.__e = undefined;
  }
  function Q(n, l, u) {
    return this.constructor(n, u);
  }
  function R(u, t, i) {
    var r, o, e, f;
    t == document && (t = document.documentElement), l.__ && l.__(u, t), o = (r = typeof i == "function") ? null : i && i.__k || t.__k, e = [], f = [], q(t, u = (!r && i || t).__k = k(S, null, [u]), o || d, d, t.namespaceURI, !r && i ? [i] : o ? null : t.firstChild ? n.call(t.childNodes) : null, e, !r && i ? i : o ? o.__e : t.firstChild, r, f), D(e, u, f), u.props.children = null;
  }
  n = w.slice, l = { __e: function(n, l, u, t) {
    for (var i, r, o;l = l.__; )
      if ((i = l.__c) && !i.__)
        try {
          if ((r = i.constructor) && r.getDerivedStateFromError != null && (i.setState(r.getDerivedStateFromError(n)), o = i.__d), i.componentDidCatch != null && (i.componentDidCatch(n, t || {}), o = i.__d), o)
            return i.__E = i;
        } catch (l) {
          n = l;
        }
    throw n;
  } }, u = 0, t = function(n) {
    return n != null && n.constructor === undefined;
  }, C.prototype.setState = function(n, l) {
    var u;
    u = this.__s != null && this.__s != this.state ? this.__s : this.__s = m({}, this.state), typeof n == "function" && (n = n(m({}, u), this.props)), n && m(u, n), n != null && this.__v && (l && this._sb.push(l), A(this));
  }, C.prototype.forceUpdate = function(n) {
    this.__v && (this.__e = true, n && this.__h.push(n), A(this));
  }, C.prototype.render = S, i = [], o = typeof Promise == "function" ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e = function(n, l) {
    return n.__v.__b - l.__v.__b;
  }, H.__r = 0, f = Math.random().toString(8), c = "__d" + f, a = "__a" + f, s = /(PointerCapture)$|Capture$/i, h = 0, p = V(false), v = V(true), y = 0;
  // node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js
  var f2 = 0;
  function u2(e, t, n, o, i, u) {
    t || (t = {});
    var a, c, p = t;
    if ("ref" in p)
      for (c in p = {}, t)
        c == "ref" ? a = t[c] : p[c] = t[c];
    var l2 = { type: e, props: p, key: n, ref: a, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: undefined, __v: --f2, __i: -1, __u: 0, __source: i, __self: u };
    if (typeof e == "function" && (a = e.defaultProps))
      for (c in a)
        p[c] === undefined && (p[c] = a[c]);
    return l.vnode && l.vnode(l2), l2;
  }

  // src/ui/FabButton.tsx
  function FabButton({ onClick }) {
    return /* @__PURE__ */ u2("button", {
      type: "button",
      id: "rr-fab",
      class: "rr-fab",
      onClick,
      "aria-label": "Open Reddit Reel Mode",
      title: "Open Reddit Reel Mode",
      children: /* @__PURE__ */ u2("svg", {
        class: "rr-fab-icon",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        children: [
          /* @__PURE__ */ u2("rect", {
            x: "2.5",
            y: "2.5",
            width: "19",
            height: "19",
            rx: "4.5"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u2("path", {
            d: "M2.5 8.5h19"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u2("path", {
            d: "m6.5 2.5 3 6"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u2("path", {
            d: "m11.5 2.5 3 6"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u2("path", {
            d: "m16.5 2.5 3 6"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u2("polygon", {
            points: "10 11.5 15.5 14.75 10 18 10 11.5",
            fill: "currentColor",
            stroke: "none"
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    }, undefined, false, undefined, this);
  }
  // src/ui/pulse.ts
  function showPlayPulse(isPlaying) {
    const existing = document.querySelector(".rr-play-pulse");
    if (existing)
      existing.remove();
    const pulse = document.createElement("div");
    pulse.className = "rr-play-pulse";
    pulse.innerHTML = isPlaying ? `<svg width="44" height="44" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>` : `<svg width="44" height="44" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
    document.body.appendChild(pulse);
    setTimeout(() => pulse.remove(), 550);
  }
  function showScalePulse(mode) {
    const existing = document.querySelector(".rr-scale-pulse");
    if (existing)
      existing.remove();
    const pulse = document.createElement("div");
    pulse.className = "rr-scale-pulse";
    pulse.textContent = mode;
    document.body.appendChild(pulse);
    setTimeout(() => pulse.remove(), 650);
  }
  function showVotePulse(upvoted) {
    const existing = document.querySelector(".rr-play-pulse");
    if (existing)
      existing.remove();
    const pulse = document.createElement("div");
    pulse.className = "rr-play-pulse";
    pulse.innerHTML = upvoted ? `<svg width="44" height="44" viewBox="0 0 24 24" fill="#ff4500"><path d="M12 21s-7.5-4.9-10-9.5C.4 8.6 2.4 5 5.8 5c2 0 3.4 1.1 4.2 2.3h4C14.8 6.1 16.2 5 18.2 5c3.4 0 5.4 3.6 3.8 6.5C19.5 16.1 12 21 12 21z" transform="scale(0.9) translate(1.3,1.3)"></path></svg>` : `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#7193ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    document.body.appendChild(pulse);
    setTimeout(() => pulse.remove(), 550);
  }
  function showVolumePulse(level, muted) {
    const existing = document.querySelector(".rr-scale-pulse");
    if (existing)
      existing.remove();
    const pct = Math.round(level * 100);
    const pulse = document.createElement("div");
    pulse.className = "rr-scale-pulse";
    pulse.textContent = muted || pct === 0 ? "Muted" : `Volume ${pct}%`;
    document.body.appendChild(pulse);
    setTimeout(() => pulse.remove(), 650);
  }
  // src/ui/top-bar.ts
  function getSoundIconSvg(isMuted) {
    return isMuted ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>` : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
  }
  function getFilterIconSvg() {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.5"></rect><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"></path></svg>`;
  }
  function getFilterLabelHtml(videosOnly) {
    return `<span class="rr-filter-icon">${getFilterIconSvg()}</span><span>${videosOnly ? "Videos Only" : "All Reels"}</span>`;
  }
  function createTopBar(isMuted, videosOnly, handlers) {
    const topBar = document.createElement("div");
    topBar.className = "rr-top-bar";
    const exitBtn = document.createElement("button");
    exitBtn.type = "button";
    exitBtn.className = "rr-exit-btn";
    exitBtn.setAttribute("aria-label", "Exit Reel Mode");
    exitBtn.title = "Exit Reel Mode";
    exitBtn.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
    exitBtn.onclick = (e) => {
      e.stopPropagation();
      handlers.onExit();
    };
    const controls = document.createElement("div");
    controls.className = "rr-top-controls";
    const filterBtn = document.createElement("button");
    filterBtn.type = "button";
    filterBtn.className = `rr-filter-btn-top ${videosOnly ? "is-active" : ""}`;
    filterBtn.setAttribute("aria-label", "Toggle Videos Only Filter");
    filterBtn.title = videosOnly ? "Showing Videos Only (Click to show all)" : "Showing All Reels (Click for videos only)";
    filterBtn.innerHTML = getFilterLabelHtml(videosOnly);
    filterBtn.onclick = (e) => {
      e.stopPropagation();
      handlers.onToggleFilter();
    };
    const soundBtn = document.createElement("button");
    soundBtn.type = "button";
    soundBtn.className = `rr-sound-btn-top ${isMuted ? "is-muted" : ""}`;
    soundBtn.setAttribute("aria-label", isMuted ? "Unmute" : "Mute");
    soundBtn.title = isMuted ? "Unmute" : "Mute";
    soundBtn.innerHTML = getSoundIconSvg(isMuted);
    soundBtn.onclick = (e) => {
      e.stopPropagation();
      handlers.onToggleMute();
    };
    controls.appendChild(filterBtn);
    controls.appendChild(soundBtn);
    topBar.appendChild(exitBtn);
    topBar.appendChild(controls);
    return topBar;
  }
  function syncTopBarState(topBar, isMuted, videosOnly) {
    if (!topBar)
      return;
    const filterBtn = topBar.querySelector(".rr-filter-btn-top");
    if (filterBtn) {
      filterBtn.classList.toggle("is-active", videosOnly);
      filterBtn.title = videosOnly ? "Showing Videos Only (Click to show all)" : "Showing All Reels (Click for videos only)";
      filterBtn.innerHTML = getFilterLabelHtml(videosOnly);
    }
    const soundBtn = topBar.querySelector(".rr-sound-btn-top");
    if (soundBtn) {
      soundBtn.classList.toggle("is-muted", isMuted);
      soundBtn.setAttribute("aria-label", isMuted ? "Unmute" : "Mute");
      soundBtn.title = isMuted ? "Unmute" : "Mute";
      soundBtn.innerHTML = getSoundIconSvg(isMuted);
    }
  }
  // src/utils.ts
  function formatCount(num) {
    if (!num || isNaN(num))
      return "0";
    if (Math.abs(num) >= 1e6)
      return (num / 1e6).toFixed(1).replace(/\.0$/, "") + "m";
    if (Math.abs(num) >= 1000)
      return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    return num.toString();
  }
  function escapeHtml(str) {
    if (!str)
      return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function extractDomain(url) {
    if (!url)
      return "";
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      return parsed.hostname.replace(/^www\./, "");
    } catch {
      return url.replace(/^https?:\/\//, "").split("/")[0];
    }
  }
  function openUrl(url) {
    if (!url)
      return;
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      window.location.href = url;
    }
  }

  // src/ui/overlay.ts
  function getUpvoteIconSvg(isUpvoted) {
    return `<svg width="26" height="26" viewBox="0 0 24 24" fill="${isUpvoted ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
  }
  function getDownvoteIconSvg(isDownvoted) {
    return `<svg width="26" height="26" viewBox="0 0 24 24" fill="${isDownvoted ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
  }
  function getCcIconSvg(_enabled) {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="3" ry="3"></rect>
    <path d="M7 15h0a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h1"></path>
    <path d="M15 15h0a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h1"></path>
  </svg>`;
  }
  function getCommentIconSvg() {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
  </svg>`;
  }
  function renderReelOverlay(postEl, post, options) {
    if (postEl.querySelector(".rr-post-overlay"))
      return null;
    const overlay = document.createElement("div");
    overlay.className = "rr-post-overlay";
    const isUpvoted = !!post.isUpvoted;
    const isDownvoted = !!post.isDownvoted;
    const isSubtitles = options.isSubtitlesEnabled ? options.isSubtitlesEnabled() : false;
    const initialVoteVal = isUpvoted ? 1 : isDownvoted ? -1 : 0;
    const baseScore = post.score;
    const isHiddenScore = !!post.isScoreHidden;
    const formatScoreDisplay = (currentScore, hasVoted) => {
      if (isHiddenScore && !hasVoted)
        return "Vote";
      return formatCount(currentScore);
    };
    const cleanSub = post.subreddit ? post.subreddit.replace(/^\/?/, "") : "";
    overlay.innerHTML = `
    <!-- Bottom-Left Post Information -->
    <div class="rr-post-info">
      <div class="rr-post-meta">
        ${post.subreddit ? `<a class="rr-sub-badge" role="link" tabindex="0" href="https://www.reddit.com/${escapeHtml(cleanSub)}/" target="_blank" rel="noopener noreferrer">${escapeHtml(post.subreddit)}</a>` : ""}
        ${post.subreddit && post.author ? `<span class="rr-dot">•</span>` : ""}
        ${post.author ? `<a class="rr-author" role="link" tabindex="0" href="https://www.reddit.com/user/${escapeHtml(post.author.replace(/^u\//, ""))}/" target="_blank" rel="noopener noreferrer">u/${escapeHtml(post.author.replace(/^u\//, ""))}</a>` : ""}
      </div>
      <div class="rr-post-title" title="${escapeHtml(post.title)}">${escapeHtml(post.title)}</div>
    </div>

    <!-- Bottom-Right Vertical Action Rail (NO SHARE BUTTON, NO SOUND BUTTON — mute lives in top bar) -->
    <div class="rr-action-rail">
      <!-- 1. Subtitles Toggle (ONLY rendered if post has video) -->
      ${options.hasVideo && options.onToggleSubtitles ? `
          <div class="rr-action-item">
            <button
              type="button"
              class="rr-action-btn rr-cc-btn ${isSubtitles ? "is-active-cc" : ""}"
              aria-label="${isSubtitles ? "Disable Subtitles" : "Enable Subtitles"}"
              title="${isSubtitles ? "Disable Subtitles" : "Enable Subtitles"}"
            >
              ${getCcIconSvg(isSubtitles)}
            </button>
          </div>
          ` : ""}

      <!-- 2. Vote Cluster (Upvote, Score, Downvote) -->
      <div class="rr-action-item rr-vote-group">
        <button
          type="button"
          class="rr-action-btn rr-upvote-btn ${isUpvoted ? "is-active-up" : ""}"
          aria-label="Upvote"
          title="Upvote"
        >
          ${getUpvoteIconSvg(isUpvoted)}
        </button>
        <span class="rr-action-label rr-score-label">${formatScoreDisplay(post.score, isUpvoted || isDownvoted)}</span>
        <button
          type="button"
          class="rr-action-btn rr-downvote-btn ${isDownvoted ? "is-active-down" : ""}"
          aria-label="Downvote"
          title="Downvote"
        >
          ${getDownvoteIconSvg(isDownvoted)}
        </button>
      </div>

      <!-- 3. Reddit Comments (Directly opens Reddit comments) -->
      <div class="rr-action-item">
        <button
          type="button"
          class="rr-action-btn rr-comment-btn"
          aria-label="Open Reddit comments"
          title="Open Reddit comments"
        >
          ${getCommentIconSvg()}
        </button>
        <span class="rr-action-label">${formatCount(post.commentCount)}</span>
      </div>
    </div>
  `;
    const upvoteBtn = overlay.querySelector(".rr-upvote-btn");
    const downvoteBtn = overlay.querySelector(".rr-downvote-btn");
    const commentBtn = overlay.querySelector(".rr-comment-btn");
    const ccBtn = overlay.querySelector(".rr-cc-btn");
    const scoreLabel = overlay.querySelector(".rr-score-label");
    const subBadge = overlay.querySelector(".rr-sub-badge");
    const authorBadge = overlay.querySelector(".rr-author");
    if (upvoteBtn) {
      upvoteBtn.onclick = (e) => {
        e.stopPropagation();
        const ok = proxyUpvote(post, () => syncVoteUI());
        syncVoteUI(!ok);
      };
    }
    if (downvoteBtn) {
      downvoteBtn.onclick = (e) => {
        e.stopPropagation();
        const ok = proxyDownvote(post, () => syncVoteUI());
        syncVoteUI(!ok);
      };
    }
    function syncVoteUI(revert = false) {
      const isUp = revert ? initialVoteVal === 1 : !!post.isUpvoted;
      const isDown = revert ? initialVoteVal === -1 : !!post.isDownvoted;
      if (upvoteBtn) {
        upvoteBtn.classList.toggle("is-active-up", isUp);
        upvoteBtn.innerHTML = getUpvoteIconSvg(isUp);
      }
      if (downvoteBtn) {
        downvoteBtn.classList.toggle("is-active-down", isDown);
        downvoteBtn.innerHTML = getDownvoteIconSvg(isDown);
      }
      if (scoreLabel) {
        const curVal = isUp ? 1 : isDown ? -1 : 0;
        const newScore = baseScore + (curVal - initialVoteVal);
        scoreLabel.textContent = formatScoreDisplay(newScore, isUp || isDown);
      }
    }
    if (commentBtn) {
      commentBtn.onclick = (e) => {
        e.stopPropagation();
        if (post.permalink) {
          const url = post.permalink.startsWith("http") ? post.permalink : `https://www.reddit.com${post.permalink}`;
          openUrl(url);
        }
      };
    }
    if (ccBtn && options.onToggleSubtitles) {
      ccBtn.onclick = (e) => {
        e.stopPropagation();
        options.onToggleSubtitles();
      };
    }
    if (subBadge) {
      subBadge.onclick = (e) => {
        e.stopPropagation();
      };
    }
    if (authorBadge) {
      authorBadge.onclick = (e) => {
        e.stopPropagation();
      };
    }
    postEl.appendChild(overlay);
    return overlay;
  }
  function syncOverlaySubtitlesButtons(enabled) {
    document.querySelectorAll(".rr-cc-btn").forEach((btn) => {
      btn.classList.toggle("is-active-cc", enabled);
      btn.setAttribute("aria-label", enabled ? "Disable Subtitles" : "Enable Subtitles");
      btn.setAttribute("title", enabled ? "Disable Subtitles" : "Enable Subtitles");
      btn.innerHTML = getCcIconSvg(enabled);
    });
  }
  // src/core/unconstrainer.ts
  var CAPTION_BUTTON_SELECTORS = [
    'button[aria-label*="caption" i]',
    'button[aria-label*="subtitle" i]',
    'button[aria-label*="closed caption" i]',
    'button[data-testid*="caption" i]',
    'button[data-testid*="subtitle" i]',
    '[data-testid*="caption" i] button',
    '[data-testid*="subtitle" i] button'
  ];
  function isPressed(btn) {
    if (btn.getAttribute("aria-pressed") === "true")
      return true;
    if (btn.getAttribute("aria-pressed") === "false")
      return false;
    if (btn.getAttribute("aria-checked") === "true")
      return true;
    if (btn.getAttribute("aria-checked") === "false")
      return false;
    if (btn.getAttribute("data-selected") === "true")
      return true;
    if (btn.getAttribute("data-selected") === "false")
      return false;
    if (btn.classList.contains("active") || btn.classList.contains("selected") || btn.classList.contains("enabled"))
      return true;
    return null;
  }
  function findCaptionButton(root) {
    for (const selector of CAPTION_BUTTON_SELECTORS) {
      try {
        const found = root.querySelector?.(selector);
        if (found)
          return found;
      } catch {}
    }
    return null;
  }
  function syncPlayerCaptionsControl(player, enabled) {
    try {
      const scopes = [player];
      if (player.shadowRoot)
        scopes.push(player.shadowRoot);
      for (const child of Array.from(player.children)) {
        if (child.shadowRoot)
          scopes.push(child.shadowRoot);
      }
      for (const scope of scopes) {
        const btn = findCaptionButton(scope);
        if (!btn)
          continue;
        const pressed = isPressed(btn);
        if (pressed === null || pressed === enabled)
          continue;
        btn.click();
        return;
      }
    } catch {}
  }
  function applySubtitlesState(container, enabled) {
    try {
      container.dataset.rrCaptions = enabled ? "on" : "off";
    } catch {}
    const { videos, players } = deepFindMediaElements(container);
    videos.forEach((v) => {
      if (v.textTracks && v.textTracks.length > 0) {
        for (let i = 0;i < v.textTracks.length; i++) {
          try {
            v.textTracks[i].mode = enabled ? "showing" : "disabled";
          } catch {}
        }
      }
    });
    players.forEach((p) => {
      p.classList.toggle("rr-hide-captions", !enabled);
      syncPlayerCaptionsControl(p, enabled);
    });
    if (enabled) {
      container.classList.remove("rr-hide-captions");
    } else {
      container.classList.add("rr-hide-captions");
    }
  }
  function promoteGalleryMedia(container) {
    container.querySelectorAll("picture source, source").forEach((source) => {
      try {
        const ds = source.dataset;
        const lazySrcset = ds?.srcset || ds?.lazySrcset || source.getAttribute("data-srcset") || source.getAttribute("data-lazy-srcset");
        if (lazySrcset && (!source.srcset || source.srcset.startsWith("data:image/gif"))) {
          source.srcset = lazySrcset;
        }
      } catch {}
    });
    container.querySelectorAll("img").forEach((img) => {
      try {
        if (img.classList.contains("post-background-image-filter") || img.classList.contains("shreddit-subreddit-icon__icon")) {
          return;
        }
        img.setAttribute("loading", "eager");
        img.setAttribute("fetchpriority", "high");
        img.removeAttribute("decoding");
        const ds = img.dataset;
        const lazySrc = ds?.src || ds?.lazySrc || img.getAttribute("data-src") || img.getAttribute("data-lazy-src");
        const isPlaceholder = !img.src || img.src === "about:blank" || img.src.startsWith("data:image/gif") || img.src.startsWith("data:image/svg");
        if (lazySrc && isPlaceholder) {
          img.src = lazySrc;
        }
        const lazySrcset = ds?.srcset || ds?.lazySrcset || img.getAttribute("data-srcset") || img.getAttribute("data-lazy-srcset");
        if (lazySrcset && (!img.srcset || img.srcset.startsWith("data:image/gif"))) {
          img.srcset = lazySrcset;
        }
        img.style.removeProperty("display");
      } catch {}
    });
  }
  function unconstrainPlayerShadow(player) {
    player.style.setProperty("--max-height", "100dvh", "important");
    player.style.setProperty("--max-width", "100vw", "important");
    player.style.setProperty("max-height", "100dvh", "important");
    player.style.setProperty("max-width", "100vw", "important");
    player.style.setProperty("height", "100dvh", "important");
    player.style.setProperty("width", "100vw", "important");
    player.style.setProperty("position", "absolute", "important");
    player.style.setProperty("inset", "0", "important");
    if (player.shadowRoot) {
      if (!player.shadowRoot.querySelector("#rr-unconstrain-style")) {
        const shadowStyle = document.createElement("style");
        shadowStyle.id = "rr-unconstrain-style";
        shadowStyle.textContent = `
        :host {
          display: block !important;
          width: 100% !important;
          height: 100% !important;
          max-width: 100vw !important;
          max-height: 100dvh !important;
          background: transparent !important;
        }
        video {
          width: 100% !important;
          height: 100% !important;
          max-width: 100vw !important;
          max-height: 100dvh !important;
          object-fit: contain !important;
          background: transparent !important;
        }
        :host(.rr-vertical-video) video,
        :host([data-is-vertical="true"]) video,
        video.rr-vertical-video {
          object-fit: cover !important;
        }
        :host(.rr-fit-cover) video,
        video.rr-fit-cover {
          object-fit: cover !important;
        }
        :host(.rr-fit-contain) video,
        video.rr-fit-contain {
          object-fit: contain !important;
        }
        /* Subtitles / captions toggle: works cross-browser via host class */
        :host(.rr-hide-captions) ::cue,
        :host(.rr-hide-captions) .captions-display,
        :host(.rr-hide-captions) [data-testid="captions"],
        :host(.rr-hide-captions) shreddit-player-captions,
        :host(.rr-hide-captions) .caption-wrapper,
        :host(.rr-hide-captions) .caption-container,
        :host(.rr-hide-captions) [part="captions"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }
      `;
        player.shadowRoot.appendChild(shadowStyle);
      }
    }
  }
  function unconstrainPostMedia(postEl) {
    postEl.querySelectorAll('shreddit-aspect-ratio, [slot="post-media-container"], [data-aspect-ratio-container], .media-container, gallery-carousel, faceplate-carousel, shreddit-async-loader, .media-lightbox-img, shreddit-media-lightbox-listener').forEach((el) => {
      el.style.setProperty("--max-height", "100dvh", "important");
      el.style.setProperty("--max-width", "100vw", "important");
      el.style.setProperty("max-height", "100dvh", "important");
      el.style.setProperty("max-width", "100vw", "important");
      el.style.setProperty("height", "100dvh", "important");
      el.style.setProperty("width", "100vw", "important");
      el.style.setProperty("min-height", "100dvh", "important");
      el.style.setProperty("--gallery-initial-height", "100dvh", "important");
      el.style.setProperty("aspect-ratio", "unset", "important");
      if (el.hasAttribute("aspect-ratio") && !el.dataset.rrOrigAspectRatio) {
        el.dataset.rrOrigAspectRatio = el.getAttribute("aspect-ratio") || "";
      }
      if (el.hasAttribute("max-height") && !el.dataset.rrOrigMaxHeight) {
        el.dataset.rrOrigMaxHeight = el.getAttribute("max-height") || "";
      }
      el.removeAttribute("aspect-ratio");
      el.removeAttribute("max-height");
    });
    postEl.querySelectorAll("shreddit-player-2").forEach((player) => {
      unconstrainPlayerShadow(player);
    });
    postEl.querySelectorAll('gallery-carousel, faceplate-carousel, [data-testid="media-gallery"]').forEach((carousel) => {
      promoteGalleryMedia(carousel);
      const wired = carousel;
      if (!wired.dataset.rrGalleryWired) {
        wired.dataset.rrGalleryWired = "1";
        carousel.addEventListener("scroll", () => promoteGalleryMedia(carousel), { passive: true });
        carousel.addEventListener("click", () => {
          setTimeout(() => promoteGalleryMedia(carousel), 50);
        }, { passive: true });
      }
    });
    const { videos } = deepFindMediaElements(postEl);
    videos.forEach((v) => {
      const handleSizing = () => {
        const w = v.videoWidth;
        const h = v.videoHeight;
        if (w > 0 && h > 0) {
          const isVertical = h / w >= 1.5;
          if (isVertical) {
            v.classList.add("rr-vertical-video");
            v.style.setProperty("object-fit", "cover", "important");
            postEl.classList.add("rr-has-vertical-video");
            postEl.setAttribute("data-vertical-video", "true");
            const player = v.closest("shreddit-player-2") || postEl.querySelector("shreddit-player-2");
            if (player) {
              player.classList.add("rr-vertical-video");
              player.setAttribute("data-is-vertical", "true");
            }
          } else {
            v.classList.remove("rr-vertical-video");
            v.style.setProperty("object-fit", "contain", "important");
            postEl.classList.remove("rr-has-vertical-video");
            postEl.removeAttribute("data-vertical-video");
          }
        }
      };
      handleSizing();
      const wired = v;
      if (!wired.dataset.rrWired) {
        wired.dataset.rrWired = "1";
        v.addEventListener("loadedmetadata", handleSizing);
        v.addEventListener("resize", handleSizing);
        v.addEventListener("loadedmetadata", () => {
          const pref = postEl.dataset?.rrCaptions;
          if (pref !== "on" && pref !== "off")
            return;
          const wantOn = pref === "on";
          try {
            const tracks = v.textTracks;
            for (let i = 0;i < (tracks?.length || 0); i++) {
              try {
                tracks[i].mode = wantOn ? "showing" : "disabled";
              } catch {}
            }
          } catch {}
        });
      }
    });
  }
  function restorePostMedia(postEl) {
    postEl.querySelectorAll('shreddit-aspect-ratio, [slot="post-media-container"], [data-aspect-ratio-container], .media-container, gallery-carousel, faceplate-carousel, shreddit-async-loader, .media-lightbox-img, shreddit-media-lightbox-listener').forEach((el) => {
      el.style.removeProperty("--max-height");
      el.style.removeProperty("--max-width");
      el.style.removeProperty("max-height");
      el.style.removeProperty("max-width");
      el.style.removeProperty("height");
      el.style.removeProperty("width");
      el.style.removeProperty("min-height");
      el.style.removeProperty("--gallery-initial-height");
      el.style.removeProperty("aspect-ratio");
      if (el.dataset.rrOrigAspectRatio !== undefined) {
        el.setAttribute("aspect-ratio", el.dataset.rrOrigAspectRatio);
        delete el.dataset.rrOrigAspectRatio;
      }
      if (el.dataset.rrOrigMaxHeight !== undefined) {
        el.setAttribute("max-height", el.dataset.rrOrigMaxHeight);
        delete el.dataset.rrOrigMaxHeight;
      }
    });
    postEl.querySelectorAll("shreddit-player-2").forEach((player) => {
      player.style.removeProperty("--max-height");
      player.style.removeProperty("--max-width");
      player.style.removeProperty("max-height");
      player.style.removeProperty("max-width");
      player.style.removeProperty("height");
      player.style.removeProperty("width");
      player.style.removeProperty("position");
      player.style.removeProperty("inset");
      player.classList.remove("rr-vertical-video", "rr-hide-captions");
      player.removeAttribute("data-is-vertical");
      if (player.shadowRoot) {
        const shadowStyle = player.shadowRoot.querySelector("#rr-unconstrain-style");
        shadowStyle?.remove();
      }
    });
    postEl.querySelectorAll('gallery-carousel, faceplate-carousel, [data-testid="media-gallery"]').forEach((carousel) => {
      if (carousel.shadowRoot) {
        const style = carousel.shadowRoot.querySelector("#rr-carousel-style");
        style?.remove();
      }
      delete carousel.dataset.rrGalleryWired;
    });
    const { videos } = deepFindMediaElements(postEl);
    videos.forEach((v) => {
      v.classList.remove("rr-vertical-video");
      v.style.removeProperty("object-fit");
    });
    postEl.classList.remove("rr-has-vertical-video", "rr-hide-captions");
    postEl.removeAttribute("data-vertical-video");
    delete postEl.dataset.rrCaptions;
  }
  // src/core/input-controller.ts
  var POST_SELECTORS = 'shreddit-post, article, [data-testid="post-container"], .Post';
  var VOLUME_STEP = 0.1;
  var TAP_WINDOW_MS = 320;
  var SWIPE_CANCEL_PX = 10;

  class InputController {
    options;
    lastTapTimestamp = 0;
    lastTapPost = null;
    tapCount = 0;
    singleTapTimer = null;
    clickListener = null;
    keydownListener = null;
    pointerListener = null;
    downX = 0;
    downY = 0;
    downActive = false;
    constructor(options) {
      this.options = options;
    }
    attach() {
      if (!this.clickListener) {
        this.clickListener = (e) => this.handleTap(e);
        document.addEventListener("click", this.clickListener, true);
      }
      if (!this.keydownListener) {
        this.keydownListener = (e) => this.handleKeyDown(e);
        window.addEventListener("keydown", this.keydownListener, true);
      }
      if (!this.pointerListener) {
        this.pointerListener = (e) => {
          if (e.type === "pointerdown") {
            this.downX = e.clientX;
            this.downY = e.clientY;
            this.downActive = true;
          } else {
            this.downActive = false;
          }
        };
        document.addEventListener("pointerdown", this.pointerListener, true);
        document.addEventListener("pointerup", this.pointerListener, true);
      }
    }
    detach() {
      if (this.clickListener) {
        document.removeEventListener("click", this.clickListener, true);
        this.clickListener = null;
      }
      if (this.keydownListener) {
        window.removeEventListener("keydown", this.keydownListener, true);
        this.keydownListener = null;
      }
      if (this.pointerListener) {
        document.removeEventListener("pointerdown", this.pointerListener, true);
        document.removeEventListener("pointerup", this.pointerListener, true);
        this.pointerListener = null;
      }
      this.lastTapTimestamp = 0;
      this.lastTapPost = null;
      this.tapCount = 0;
      this.downActive = false;
      if (this.singleTapTimer) {
        clearTimeout(this.singleTapTimer);
        this.singleTapTimer = null;
      }
    }
    fireSingleTap(post) {
      if (!this.options.isReelModeActive())
        return;
      const video = audioManager.findVideo(post);
      if (video) {
        const wasPaused = video.paused;
        if (wasPaused) {
          applyAudioState(post, audioManager.isMuted, audioManager.volume);
          video.play().catch(() => {});
        } else {
          video.pause();
        }
        showPlayPulse(wasPaused);
      } else if (post.querySelector("iframe")) {}
    }
    fireDoubleTapUpvote() {
      if (!this.options.isReelModeActive())
        return;
      const getPost = this.options.getActiveReelPost;
      const reel = getPost ? getPost() : null;
      if (!reel)
        return;
      const ok = proxyUpvote(reel);
      showVotePulse(ok ? !!reel.isUpvoted : false);
    }
    toggleFitFill(post) {
      const isCurrentlyContain = post.classList.contains("rr-fit-contain");
      if (isCurrentlyContain) {
        post.classList.remove("rr-fit-contain");
        post.classList.add("rr-fit-cover");
        showScalePulse("Fill (Full Bleed)");
      } else {
        post.classList.remove("rr-fit-cover");
        post.classList.add("rr-fit-contain");
        showScalePulse("Fit (Original)");
      }
    }
    handleTap(e) {
      if (!this.options.isReelModeActive())
        return;
      const target = e.target;
      if (target.closest('.rr-action-rail, .rr-post-info, .rr-top-bar, .rr-link-card-container, .rr-text-card-container, button, a, shreddit-post-action-row, [slot="action-row"], [slot="vote"]')) {
        return;
      }
      const post = target.closest(POST_SELECTORS);
      if (!post)
        return;
      e.preventDefault();
      e.stopPropagation();
      if (this.wasSwipe(e)) {
        this.resetTapState();
        return;
      }
      unlockAudio();
      audioManager.reassertActiveIframeUnmute();
      const now = Date.now();
      const samePost = this.lastTapPost === post;
      const inWindow = now - this.lastTapTimestamp < TAP_WINDOW_MS;
      if (inWindow && samePost) {
        this.tapCount += 1;
      } else {
        this.tapCount = 1;
      }
      this.lastTapTimestamp = now;
      this.lastTapPost = post;
      if (this.tapCount === 2) {
        if (this.singleTapTimer) {
          clearTimeout(this.singleTapTimer);
          this.singleTapTimer = null;
        }
        this.fireDoubleTapUpvote();
        return;
      }
      if (this.tapCount === 3) {
        if (this.singleTapTimer) {
          clearTimeout(this.singleTapTimer);
          this.singleTapTimer = null;
        }
        this.resetTapState();
        this.toggleFitFill(post);
        return;
      }
      if (this.singleTapTimer) {
        clearTimeout(this.singleTapTimer);
      }
      this.singleTapTimer = setTimeout(() => {
        this.singleTapTimer = null;
        this.resetTapState();
        this.fireSingleTap(post);
      }, TAP_WINDOW_MS);
    }
    wasSwipe(e) {
      try {
        const dx = e.clientX - this.downX;
        const dy = e.clientY - this.downY;
        return Math.hypot(dx, dy) > SWIPE_CANCEL_PX;
      } catch {
        return false;
      }
    }
    resetTapState() {
      this.lastTapTimestamp = 0;
      this.lastTapPost = null;
      this.tapCount = 0;
    }
    handleKeyDown(e) {
      if (!this.options.isReelModeActive())
        return;
      const target = e.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable))
        return;
      if (e.key === "Escape") {
        this.options.onExit();
      } else if (e.key === "m" || e.key === "M") {
        this.options.onToggleMute();
      } else if (e.key === "f" || e.key === "F") {
        const post = this.options.getActivePost();
        if (post)
          this.toggleFitFill(post);
      } else if (e.key === "+" || e.key === "=" || e.shiftKey && e.key === "ArrowUp") {
        e.preventDefault();
        this.changeVolume(VOLUME_STEP);
      } else if (e.key === "-" || e.key === "_" || e.shiftKey && e.key === "ArrowDown") {
        e.preventDefault();
        this.changeVolume(-VOLUME_STEP);
      } else if (e.key === "c" || e.key === "C") {
        this.options.onToggleSubtitles?.();
      } else if (e.key === "j" || e.key === "J" || !e.shiftKey && e.key === "ArrowDown") {
        e.preventDefault();
        this.options.onNextPost?.();
      } else if (e.key === "k" || e.key === "K" || !e.shiftKey && e.key === "ArrowUp") {
        e.preventDefault();
        this.options.onPrevPost?.();
      }
    }
    changeVolume(delta) {
      unlockAudio();
      const post = this.options.getActivePost();
      const level = audioManager.adjustVolume(delta, post || undefined);
      audioManager.reassertActiveIframeUnmute();
      showVolumePulse(level, audioManager.isMuted);
      this.options.onVolumeChange?.(level, audioManager.isMuted);
    }
  }
  // src/cards/text-card.ts
  function renderTextCard(postEl, post) {
    if (postEl.querySelector(".rr-text-card-container"))
      return;
    const targetUrl = post.permalink ? post.permalink.startsWith("http") ? post.permalink : `https://www.reddit.com${post.permalink}` : post.contentHref || "";
    const container = document.createElement("div");
    container.className = "rr-text-card-container";
    let rawBody = (post.textBody || "").trim();
    if (post.title) {
      const trimmedTitle = post.title.trim();
      if (rawBody.startsWith(trimmedTitle)) {
        rawBody = rawBody.slice(trimmedTitle.length).trim();
      }
    }
    const paragraphs = rawBody.split(/\n\n+/).map((p) => p.trim()).filter((p) => p.length > 0);
    const formattedBodyHtml = paragraphs.length > 0 ? paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("") : rawBody ? `<p>${escapeHtml(rawBody)}</p>` : "";
    const pillText = post.subreddit ? post.subreddit : "Discussion";
    container.innerHTML = `
    <div class="rr-text-card" role="article" aria-label="${escapeHtml(post.title)}">
      <div class="rr-text-card-header">
        <div class="rr-text-pill" title="${escapeHtml(pillText)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span>${escapeHtml(pillText)}</span>
        </div>
        ${targetUrl ? `<a href="${escapeHtml(targetUrl)}" target="_blank" rel="noopener noreferrer" class="rr-text-open-btn" title="Open full post on Reddit">
                <span>Read Full</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>` : ""}
      </div>
      <h2 class="rr-text-card-title">${escapeHtml(post.title)}</h2>
      ${formattedBodyHtml ? `<div class="rr-text-card-body">${formattedBodyHtml}</div>` : ""}
    </div>
  `;
    const openBtn = container.querySelector(".rr-text-open-btn");
    if (openBtn) {
      openBtn.addEventListener("click", (e) => {
        e.stopPropagation();
      });
    }
    const cardBody = container.querySelector(".rr-text-card-body");
    if (cardBody) {
      cardBody.addEventListener("wheel", (e) => {
        e.stopPropagation();
      }, { passive: true });
      cardBody.addEventListener("touchmove", (e) => {
        e.stopPropagation();
      }, { passive: true });
    }
    const titleEl = container.querySelector(".rr-text-card-title");
    if (titleEl && targetUrl) {
      titleEl.style.cursor = "pointer";
      titleEl.addEventListener("click", (e) => {
        e.stopPropagation();
        openUrl(targetUrl);
      });
    }
    postEl.appendChild(container);
  }
  // src/cards/link-card.ts
  function findThumbnailUrl(postEl, post) {
    if (post.mediaUrl && !post.mediaUrl.endsWith(".mp4") && !post.mediaUrl.endsWith(".m3u8")) {
      return post.mediaUrl;
    }
    const img = postEl.querySelector('img#post-image, [data-post-media-primary], shreddit-aspect-ratio img, [slot="post-media-container"] img:not(.shreddit-subreddit-icon__icon), img.preview-img, img.preview');
    if (img?.src && !img.src.startsWith("data:image/svg")) {
      return img.src;
    }
    return;
  }
  function renderLinkCard(postEl, post) {
    if (postEl.querySelector(".rr-link-card-container"))
      return;
    const domain = extractDomain(post.contentHref);
    const thumbUrl = findThumbnailUrl(postEl, post);
    const targetUrl = post.contentHref || (post.permalink.startsWith("http") ? post.permalink : `https://www.reddit.com${post.permalink}`);
    const container = document.createElement("div");
    container.className = "rr-link-card-container";
    container.innerHTML = `
    <div class="rr-link-card" tabindex="0" role="link" aria-label="Open ${escapeHtml(post.title)} on ${escapeHtml(domain)}">
      ${thumbUrl ? `<div class="rr-link-card-thumb-wrap">
               <img src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(post.title)}" class="rr-link-card-thumb" />
             </div>` : ""}
      <div class="rr-link-card-body">
        ${domain ? `<div class="rr-link-card-domain rr-link-domain-badge">
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                   <circle cx="12" cy="12" r="10"></circle>
                   <line x1="2" y1="12" x2="22" y2="12"></line>
                   <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path>
                 </svg>
                 <span>${escapeHtml(domain)}</span>
               </div>` : ""}
        <h3 class="rr-link-card-title">${escapeHtml(post.title)}</h3>
        <button type="button" class="rr-link-card-cta">
          <span>Read Article</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </button>
      </div>
    </div>
  `;
    const linkCard = container.querySelector(".rr-link-card");
    const ctaBtn = container.querySelector(".rr-link-card-cta");
    const openLink = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (targetUrl) {
        openUrl(targetUrl);
      }
    };
    linkCard?.addEventListener("click", openLink);
    linkCard?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        openLink(e);
      }
    });
    ctaBtn?.addEventListener("click", openLink);
    postEl.appendChild(container);
  }
  // src/core/feed-manager.ts
  var VIDEOS_ONLY_KEY = "@reddit-reels/videos-only";
  var SUBTITLES_KEY = "@reddit-reels/subtitles";
  function readPref(key) {
    try {
      if (typeof GM_getValue === "function") {
        const gmVal = GM_getValue(key, null);
        if (gmVal !== null)
          return gmVal === "1";
      }
    } catch {}
    try {
      return localStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  }
  function writePref(key, value) {
    try {
      if (typeof GM_setValue === "function") {
        GM_setValue(key, value ? "1" : "0");
      }
    } catch {}
    try {
      localStorage.setItem(key, value ? "1" : "0");
    } catch {}
  }
  function hasVideoContent(postEl, postType) {
    const resolvedType = postType ?? postEl.dataset?.rrPostType;
    if (resolvedType === "video")
      return true;
    if (resolvedType === undefined) {
      if (postEl.getAttribute("post-type") === "video")
        return true;
      const domain = postEl.getAttribute("domain") || "";
      const contentHref = postEl.getAttribute("content-href") || "";
      if (/(redgifs\.com|streamable\.com|gfycat\.com)/i.test(domain + " " + contentHref))
        return true;
      if (postEl.querySelector("iframe"))
        return true;
      try {
        const parsed = parsePostElement(postEl);
        if (parsed.postType === "video")
          return true;
      } catch {}
    }
    return !!audioManager.findVideo(postEl) || !!postEl.querySelector("iframe");
  }
  function getPostElements() {
    const shredditPosts = Array.from(document.querySelectorAll("shreddit-post"));
    if (shredditPosts.length > 0) {
      return shredditPosts;
    }
    const rawPosts = Array.from(document.querySelectorAll('article, [data-testid="post-container"], .Post'));
    return rawPosts.filter((el) => {
      return !rawPosts.some((other) => other !== el && other.contains(el));
    });
  }
  function getClosestPostToViewport() {
    const posts = getPostElements().filter((p) => !p.classList.contains("rr-filtered-out"));
    if (posts.length === 0)
      return null;
    const viewportCenter = window.innerHeight / 2;
    let closest = null;
    let minDistance = Infinity;
    for (const post of posts) {
      const rect = post.getBoundingClientRect();
      const postCenter = rect.top + rect.height / 2;
      const distance = Math.abs(postCenter - viewportCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closest = post;
      }
    }
    return closest || posts[0];
  }

  class FeedManager {
    options;
    feedObserver = null;
    mutationObserver = null;
    mutationDebounce = null;
    videosOnlyMode = false;
    subtitlesEnabled = false;
    constructor(options) {
      this.options = options;
      this.videosOnlyMode = readPref(VIDEOS_ONLY_KEY);
      this.subtitlesEnabled = readPref(SUBTITLES_KEY);
    }
    get isVideosOnly() {
      return this.videosOnlyMode;
    }
    get isSubtitles() {
      return this.subtitlesEnabled;
    }
    setVideosOnly(value) {
      this.videosOnlyMode = value;
      writePref(VIDEOS_ONLY_KEY, value);
      this.applyVideosOnlyFilter();
    }
    toggleVideosOnly() {
      this.setVideosOnly(!this.videosOnlyMode);
      return this.videosOnlyMode;
    }
    toggleSubtitles() {
      this.subtitlesEnabled = !this.subtitlesEnabled;
      writePref(SUBTITLES_KEY, this.subtitlesEnabled);
      document.documentElement.classList.toggle("rr-hide-captions", !this.subtitlesEnabled);
      const posts = getPostElements();
      posts.forEach((p) => applySubtitlesState(p, this.subtitlesEnabled));
      syncOverlaySubtitlesButtons(this.subtitlesEnabled);
      return this.subtitlesEnabled;
    }
    enhancePost(postEl) {
      if (postEl.querySelector(".rr-post-overlay"))
        return;
      const post = parsePostElement(postEl);
      const hasVideo = hasVideoContent(postEl, post.postType);
      const isLinkPost = post.postType === "link";
      const isTextPost = post.postType === "text";
      if (postEl.shadowRoot) {
        if (!postEl.shadowRoot.querySelector("#rr-shadow-cleanup-style")) {
          const shadowStyle = document.createElement("style");
          shadowStyle.id = "rr-shadow-cleanup-style";
          shadowStyle.textContent = `
          rpl-action-bar,
          shreddit-action-bar,
          shreddit-post-action-row,
          feed-post-action-row,
          [data-testid="action-row"],
          [data-testid="post-vote-control"],
          shreddit-vote-animations,
          slot[name="share-button"],
          slot[name="credit-bar"],
          slot[name="action-row"] {
            display: none !important;
            visibility: hidden !important;
          }
          shreddit-post-vote-control,
          slot[name="vote"],
          slot[name="vote-button"] {
            position: absolute !important;
            width: 1px !important;
            height: 1px !important;
            opacity: 0 !important;
            pointer-events: none !important;
            overflow: hidden !important;
          }
        `;
          postEl.shadowRoot.appendChild(shadowStyle);
        }
      }
      if (isLinkPost) {
        postEl.classList.add("rr-is-link");
        renderLinkCard(postEl, post);
      } else if (isTextPost) {
        postEl.classList.add("rr-is-text");
        renderTextCard(postEl, post);
      } else {
        if (post.postType === "video" && !postEl.querySelector("video, iframe")) {
          const media = resolveMedia(post);
          if (media.type === "iframe" && media.src) {
            const container = postEl.querySelector('[slot="post-media-container"]') || postEl.querySelector(".media-container") || postEl;
            const iframe = document.createElement("iframe");
            const src = normalizeIframeSrc(media.src, audioManager.isMuted);
            iframe.src = src;
            iframe.className = "rr-embedded-iframe";
            iframe.tabIndex = -1;
            iframe.setAttribute("loading", "eager");
            iframe.setAttribute("frameborder", "0");
            iframe.setAttribute("allowfullscreen", "true");
            iframe.setAttribute("allow", "autoplay; fullscreen; encrypted-media; picture-in-picture");
            container.appendChild(iframe);
            try {
              iframe.blur();
            } catch {}
            audioManager.invalidateVideoCache(postEl);
          }
        }
        unconstrainPostMedia(postEl);
        applySubtitlesState(postEl, this.subtitlesEnabled);
      }
      if (this.videosOnlyMode && !hasVideo) {
        postEl.classList.add("rr-filtered-out");
      } else {
        postEl.classList.remove("rr-filtered-out");
      }
      postEl.style.removeProperty("display");
      const NATIVE_SUPPRESSION_SELECTORS = '[slot="credit-bar"], [slot="post-credit-bar"], [slot="title-and-metadata"], [slot="title"], [slot="action-row"], [slot="text-body"], shreddit-post-action-row, feed-post-action-row, shreddit-action-bar, rpl-action-bar, shreddit-post-credit-bar, faceplate-tracker, shreddit-interaction-container';
      const VOTE_OFFSCREEN_SELECTORS = '[slot="vote"], [slot="vote-button"], shreddit-post-vote-control, [data-testid="post-vote-control"]';
      Array.from(postEl.children).forEach((child) => {
        const el = child;
        if (el.classList?.contains("rr-post-overlay") || el.classList?.contains("rr-link-card-container") || el.classList?.contains("rr-text-card-container")) {
          return;
        }
        if (el.matches?.(NATIVE_SUPPRESSION_SELECTORS)) {
          el.classList.add("rr-native-suppressed");
          return;
        }
        if (el.matches?.(VOTE_OFFSCREEN_SELECTORS)) {
          el.classList.add("rr-native-offscreen");
          return;
        }
        if (!isLinkPost && !isTextPost && (el.matches?.('[slot="post-media-container"], shreddit-player-2, .media-container, gallery-carousel, faceplate-carousel, shreddit-aspect-ratio, shreddit-async-loader') || el.querySelector("video, img:not(.shreddit-subreddit-icon__icon), iframe, gallery-carousel, faceplate-carousel, shreddit-player-2") !== null)) {
          return;
        }
        el.classList.add("rr-native-suppressed");
      });
      postEl.querySelectorAll(NATIVE_SUPPRESSION_SELECTORS).forEach((el) => {
        el.classList.add("rr-native-suppressed");
      });
      postEl.querySelectorAll(VOTE_OFFSCREEN_SELECTORS).forEach((el) => {
        el.classList.add("rr-native-offscreen");
      });
      renderReelOverlay(postEl, post, {
        hasVideo,
        isSubtitlesEnabled: () => this.subtitlesEnabled,
        onToggleSubtitles: () => this.toggleSubtitles()
      });
    }
    restorePost(postEl) {
      postEl.querySelectorAll(".rr-post-overlay, .rr-text-card-container, .rr-link-card-container").forEach((el) => el.remove());
      postEl.querySelectorAll("iframe.rr-embedded-iframe").forEach((ifr) => {
        ifr.remove();
      });
      if (postEl.shadowRoot) {
        const cleanupStyle = postEl.shadowRoot.querySelector("#rr-shadow-cleanup-style");
        cleanupStyle?.remove();
        const shadowActionBars = postEl.shadowRoot.querySelectorAll('rpl-action-bar, [data-testid="action-row"], .shreddit-post-container, slot[name="action-row"], slot[name="share-button"], slot[name="credit-bar"]');
        shadowActionBars.forEach((el) => {
          el.style.removeProperty("display");
        });
      }
      postEl.querySelectorAll(".rr-native-suppressed, .rr-native-offscreen").forEach((el) => {
        el.classList.remove("rr-native-suppressed", "rr-native-offscreen");
        el.style.removeProperty("display");
      });
      for (let i = 0;i < postEl.children.length; i++) {
        const el = postEl.children[i];
        if (el.classList?.contains("rr-native-suppressed") || el.classList?.contains("rr-native-offscreen")) {
          el.classList.remove("rr-native-suppressed", "rr-native-offscreen");
        }
        el.style?.removeProperty("display");
      }
      restorePostMedia(postEl);
      postEl.classList.remove("rr-filtered-out", "rr-is-link", "rr-is-text");
      postEl.style.removeProperty("display");
    }
    teardownAllPosts() {
      const posts = getPostElements();
      posts.forEach((p) => this.restorePost(p));
    }
    enhanceAllPosts() {
      const posts = getPostElements();
      posts.forEach((p) => this.enhancePost(p));
    }
    applyVideosOnlyFilter() {
      const posts = getPostElements();
      for (const postEl of posts) {
        const hasVideo = hasVideoContent(postEl, postEl.dataset?.rrPostType);
        if (this.videosOnlyMode && !hasVideo) {
          postEl.classList.add("rr-filtered-out");
        } else {
          postEl.classList.remove("rr-filtered-out");
        }
        postEl.style.removeProperty("display");
      }
    }
    startObservers() {
      this.stopObservers();
      document.documentElement.classList.toggle("rr-hide-captions", !this.subtitlesEnabled);
      this.feedObserver = new IntersectionObserver((entries) => {
        if (!this.options.isReelModeActive())
          return;
        for (const entry of entries) {
          const post = entry.target;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            unconstrainPostMedia(post);
            applySubtitlesState(post, this.subtitlesEnabled);
            audioManager.requestPlayback(post);
          } else if (!entry.isIntersecting || entry.intersectionRatio < 0.2) {
            applyAudioState(post, true);
            const video = audioManager.findVideo(post);
            if (video) {
              try {
                if (!video.paused)
                  video.pause();
                video.muted = true;
              } catch {}
            }
          }
        }
      }, {
        threshold: [0.2, 0.5, 0.8]
      });
      const posts = getPostElements();
      posts.forEach((p) => this.feedObserver?.observe(p));
      this.mutationObserver = new MutationObserver((mutations) => {
        if (!this.options.isReelModeActive())
          return;
        let hasRelevantChanges = false;
        for (const mutation of mutations) {
          if (mutation.type !== "childList" || mutation.addedNodes.length === 0)
            continue;
          for (let i = 0;i < mutation.addedNodes.length; i++) {
            const node = mutation.addedNodes[i];
            if (node.nodeType !== Node.ELEMENT_NODE)
              continue;
            const el = node;
            if (el.matches?.('shreddit-post, article, [data-testid="post-container"], .Post') || el.querySelector?.('shreddit-post, article, [data-testid="post-container"], .Post')) {
              hasRelevantChanges = true;
              break;
            }
          }
          if (hasRelevantChanges)
            break;
        }
        if (!hasRelevantChanges)
          return;
        if (this.mutationDebounce)
          clearTimeout(this.mutationDebounce);
        this.mutationDebounce = setTimeout(() => {
          this.mutationDebounce = null;
          if (!this.options.isReelModeActive())
            return;
          this.enhanceAllPosts();
          this.applyVideosOnlyFilter();
          if (this.feedObserver) {
            const currentPosts = getPostElements();
            currentPosts.forEach((p) => this.feedObserver?.observe(p));
          }
        }, 150);
      });
      this.mutationObserver.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
      });
    }
    stopObservers() {
      if (this.feedObserver) {
        this.feedObserver.disconnect();
        this.feedObserver = null;
      }
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
        this.mutationObserver = null;
      }
      if (this.mutationDebounce) {
        clearTimeout(this.mutationDebounce);
        this.mutationDebounce = null;
      }
    }
    scrollToNext() {
      const posts = getPostElements().filter((p) => !p.classList.contains("rr-filtered-out"));
      const active = getClosestPostToViewport();
      if (!active || posts.length === 0)
        return;
      const currentIndex = posts.indexOf(active);
      if (currentIndex >= 0 && currentIndex < posts.length - 1) {
        posts[currentIndex + 1].scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    scrollToPrev() {
      const posts = getPostElements().filter((p) => !p.classList.contains("rr-filtered-out"));
      const active = getClosestPostToViewport();
      if (!active || posts.length === 0)
        return;
      const currentIndex = posts.indexOf(active);
      if (currentIndex > 0) {
        posts[currentIndex - 1].scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }
  // src/main.tsx
  var isReelModeActive = false;
  var topBarElement = null;
  var stopRedgifsReady = null;
  function syncTopBarSound() {
    syncTopBarState(topBarElement, audioManager.isMuted, feedManager.isVideosOnly);
  }
  function handleToggleMute() {
    unlockAudio();
    const activePost = getClosestPostToViewport();
    audioManager.toggleMute(activePost || undefined);
    audioManager.reassertActiveIframeUnmute();
    syncTopBarSound();
  }
  function handleVolumeChange() {
    syncTopBarSound();
  }
  var feedManager = new FeedManager({
    isReelModeActive: () => isReelModeActive
  });
  var inputController = new InputController({
    isReelModeActive: () => isReelModeActive,
    getActivePost: () => getClosestPostToViewport(),
    getActiveReelPost: () => {
      const el = getClosestPostToViewport();
      if (!el)
        return null;
      try {
        return parsePostElement(el);
      } catch {
        return null;
      }
    },
    onExit: () => toggleReelMode(false),
    onToggleMute: handleToggleMute,
    onVolumeChange: handleVolumeChange,
    onToggleSubtitles: () => feedManager.toggleSubtitles(),
    onNextPost: () => feedManager.scrollToNext(),
    onPrevPost: () => feedManager.scrollToPrev()
  });
  function toggleReelMode(forceState) {
    const nextState = forceState !== undefined ? forceState : !isReelModeActive;
    isReelModeActive = nextState;
    const feedContainer = document.querySelector('shreddit-feed, #posts-container, [data-testid="feed-container"]') || document.querySelector("main") || document.body;
    if (isReelModeActive) {
      unlockAudio();
      document.documentElement.classList.add("rr-active");
      feedContainer?.classList.add("rr-feed-container");
      feedManager.enhanceAllPosts();
      feedManager.applyVideosOnlyFilter();
      const activePost = getClosestPostToViewport();
      if (activePost) {
        activePost.scrollIntoView({ behavior: "instant", block: "start" });
        audioManager.requestPlayback(activePost);
      }
      if (topBarElement)
        topBarElement.remove();
      topBarElement = createTopBar(audioManager.isMuted, feedManager.isVideosOnly, {
        onExit: () => toggleReelMode(false),
        onToggleFilter: () => {
          const nextFilter = feedManager.toggleVideosOnly();
          syncTopBarState(topBarElement, audioManager.isMuted, nextFilter);
          const active = getClosestPostToViewport();
          if (active) {
            active.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        },
        onToggleMute: handleToggleMute
      });
      document.body.appendChild(topBarElement);
      feedManager.startObservers();
      inputController.attach();
      if (!stopRedgifsReady) {
        stopRedgifsReady = listenForRedGifsReady(() => ({
          muted: audioManager.isMuted,
          volume: audioManager.volume
        }));
      }
    } else {
      document.documentElement.classList.remove("rr-active");
      feedContainer?.classList.remove("rr-feed-container");
      audioManager.stopAll();
      if (topBarElement) {
        topBarElement.remove();
        topBarElement = null;
      }
      feedManager.stopObservers();
      inputController.detach();
      feedManager.teardownAllPosts();
    }
  }
  function init() {
    if (typeof window !== "undefined" && /redgifs\.com/i.test(window.location.hostname)) {
      return;
    }
    const fabContainerId = "rr-fab-container";
    let fabContainer = document.getElementById(fabContainerId);
    if (!fabContainer) {
      fabContainer = document.createElement("div");
      fabContainer.id = fabContainerId;
      document.body.appendChild(fabContainer);
    }
    R(/* @__PURE__ */ u2(FabButton, {
      onClick: () => toggleReelMode()
    }, undefined, false, undefined, this), fabContainer);
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }

  // src/index.ts
  if (typeof window !== "undefined" && isRedGifsFrame()) {
    initRedGifsBridge();
  }
  if (typeof window !== "undefined") {
    window.extractPosts = extractPosts;
    window.observeNewPosts = observeNewPosts;
    window.proxyUpvote = proxyUpvote;
    window.proxyDownvote = proxyDownvote;
    window.AudioManager = AudioManager;
    window.audioManager = audioManager;
    window.resolveMedia = resolveMedia;
    window.unconstrainPostMedia = unconstrainPostMedia;
  }
})();

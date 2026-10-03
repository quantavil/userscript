// ==UserScript==
// @name         Reddit Reels
// @namespace    https://github.com/quantavil/userscript/tree/main/reddit-reels
// @version      2.0.0
// @author       quantavil
// @description  Turns Reddit feeds into a swipeable reel in place: one post per screen, single unmuted stream, RedGifs, native player controls and voting.
// @license      MIT
// @homepage     https://github.com/quantavil/userscript/tree/main/reddit-reels
// @supportURL   https://github.com/quantavil/userscript/issues
// @match        https://*.reddit.com/*
// @match        https://reddit.com/*
// @match        https://*.redgifs.com/ifr/*
// @match        https://www.redgifs.com/ifr/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// ==/UserScript==

(function() {
	"use strict";
	var s = new Set();
	var _css = async (t) => {
		if (s.has(t)) return;
		s.add(t);
		((c) => {
			if (typeof GM_addStyle === "function") GM_addStyle(c);
			else (document.head || document.documentElement).appendChild(document.createElement("style")).append(c);
		})(t);
	};
	function parseScore(val) {
		if (!val) return 0;
		const trimmed = val.trim();
		if (!trimmed || trimmed === "•" || trimmed.toLowerCase() === "vote") return 0;
		const kMatch = trimmed.match(/^([+-]?\d+(?:\.\d+)?)\s*k$/i);
		if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1e3);
		const mMatch = trimmed.match(/^([+-]?\d+(?:\.\d+)?)\s*m$/i);
		if (mMatch) return Math.round(parseFloat(mMatch[1]) * 1e6);
		const parsed = parseInt(trimmed.replace(/,/g, ""), 10);
		return isNaN(parsed) ? 0 : parsed;
	}
	function parseCommentCount(val) {
		if (!val) return 0;
		const trimmed = val.trim();
		const match = trimmed.match(/^([+-]?\d+(?:\.\d+)?)\s*([km])?/i);
		if (match) {
			let num = parseFloat(match[1]);
			const multiplier = match[2]?.toLowerCase();
			if (multiplier === "k") num *= 1e3;
			else if (multiplier === "m") num *= 1e6;
			return Math.round(num);
		}
		const parsed = parseInt(trimmed.replace(/,/g, ""), 10);
		return isNaN(parsed) ? 0 : parsed;
	}
	function extractPostId(element, permalink) {
		const attrId = element.getAttribute("id");
		if (attrId && attrId.trim()) return attrId.trim();
		const dataId = element.getAttribute("data-post-id") || element.getAttribute("data-fullname");
		if (dataId && dataId.trim()) return dataId.trim();
		const permalinkMatch = permalink.match(/(?:comments|post)\/([a-z0-9]+)/i);
		if (permalinkMatch) return `t3_${permalinkMatch[1]}`;
		if (element.dataset.reelPostId) return element.dataset.reelPostId;
		const generatedId = `t3_gen_${typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID().replace(/-/g, "").slice(0, 10) : Math.random().toString(36).slice(2, 10)}`;
		element.dataset.reelPostId = generatedId;
		return generatedId;
	}
	function extractTitle(element) {
		const postTitle = element.getAttribute("post-title");
		if (postTitle && postTitle.trim()) return postTitle.trim();
		const titleSlot = element.querySelector("[slot=\"title\"]");
		if (titleSlot && titleSlot.textContent?.trim()) return titleSlot.textContent.trim();
		const heading = element.querySelector("h1, h2, [data-test-id=\"post-content\"] h1, [data-test-id=\"post-content\"] h2");
		if (heading && heading.textContent?.trim()) return heading.textContent.trim();
		const bodyAnchor = element.querySelector("a[data-click-id=\"body\"]");
		if (bodyAnchor && bodyAnchor.textContent?.trim()) return bodyAnchor.textContent.trim();
		return "";
	}
	function extractAuthor(element) {
		const authorAttr = element.getAttribute("author");
		if (authorAttr && authorAttr.trim()) return authorAttr.trim().replace(/^u\//, "");
		const dataAuthor = element.getAttribute("data-author");
		if (dataAuthor && dataAuthor.trim()) return dataAuthor.trim().replace(/^u\//, "");
		const authorLink = element.querySelector("a[href*=\"/user/\"], [data-testid=\"post_author_link\"], [data-click-id=\"user\"], [slot=\"authorName\"]");
		if (authorLink && authorLink.textContent?.trim()) return authorLink.textContent.trim().replace(/^u\//, "");
		return "";
	}
	function extractSubreddit(element, permalink) {
		const prefixed = element.getAttribute("subreddit-prefixed-name");
		if (prefixed && prefixed.trim()) return prefixed.startsWith("r/") ? prefixed.trim() : `r/${prefixed.trim()}`;
		const subName = element.getAttribute("subreddit-name") || element.getAttribute("subreddit");
		if (subName && subName.trim()) return `r/${subName.trim()}`;
		const permalinkMatch = permalink.match(/(?:\/|^)r\/([a-zA-Z0-9_]+)/i);
		if (permalinkMatch) return `r/${permalinkMatch[1]}`;
		const subLink = element.querySelector("a[data-click-id=\"subreddit\"], a[href^=\"/r/\"]:not([href*=\"/comments/\"]), a[href*=\"reddit.com/r/\"]:not([href*=\"/comments/\"])");
		if (subLink && subLink.textContent?.trim()) {
			const text = subLink.textContent.trim();
			return text.startsWith("r/") ? text : `r/${text}`;
		}
		return "";
	}
	function extractPermalink(element) {
		const permalinkAttr = element.getAttribute("permalink");
		if (permalinkAttr && permalinkAttr.trim()) return permalinkAttr.trim();
		const commentsLink = element.querySelector("a[data-click-id=\"comments\"], a[slot=\"full-post-link\"], a[href*=\"/comments/\"]");
		if (commentsLink) {
			const href = commentsLink.getAttribute("href");
			if (href) return href;
		}
		return "";
	}
	function extractContentHref(element, permalink) {
		const contentHref = element.getAttribute("content-href");
		if (contentHref && contentHref.trim()) return contentHref.trim();
		const player = element.querySelector("shreddit-player-2, [data-testid=\"shreddit-player\"]");
		if (player) {
			const src = player.getAttribute("src") || player.getAttribute("stream-url");
			if (src) return src;
		}
		const video = element.querySelector("video");
		if (video) {
			if (video.src) return video.src;
			const source = video.querySelector("source");
			if (source?.src) return source.src;
		}
		const img = element.querySelector("img#post-image, [data-post-media-primary], [slot=\"post-media-container\"] img:not(.shreddit-subreddit-icon__icon):not(.post-background-image-filter), shreddit-aspect-ratio:not(:has(video)) img:not(.shreddit-subreddit-icon__icon), [data-testid=\"post-image\"] img, img.preview-img, img.media-lightbox-img:not(.post-background-image-filter), img.preview");
		if (img?.src) return img.src;
		const linkAnchor = element.querySelector("a[data-click-id=\"body\"], a.title, [slot=\"post-media-container\"] a");
		if (linkAnchor?.href) return linkAnchor.href;
		return permalink;
	}
	function determinePostType(element, contentHref) {
		const rawType = element.getAttribute("post-type")?.toLowerCase();
		const domain = element.getAttribute("domain")?.toLowerCase() || "";
		if (rawType === "crosspost") {
			if (element.querySelector("shreddit-gallery, gallery-carousel, faceplate-carousel, [data-testid=\"media-gallery\"], shreddit-async-loader[bundlename*=\"gallery\"]") !== null) return "gallery";
			if (element.querySelector("shreddit-player-2, video, [data-testid=\"shreddit-player\"]") !== null || /(\.mp4|\.webm|\.m3u8|v\.redd\.it|redgifs\.com|streamable\.com|youtube\.com|youtu\.be|tiktok\.com|vimeo\.com)/i.test(contentHref)) return "video";
			if (element.querySelector("img#post-image, [data-post-media-primary], shreddit-aspect-ratio:not(:has(video)) img:not(.shreddit-subreddit-icon__icon), [data-testid=\"post-image\"] img, img.preview-img, img.media-lightbox-img:not(.post-background-image-filter), [slot=\"post-media-container\"] img:not(.shreddit-subreddit-icon__icon):not(.post-background-image-filter)") !== null || /(\.jpg|\.jpeg|\.png|\.webp|\.gif|i\.redd\.it|i\.imgur\.com)/i.test(contentHref) || domain === "i.redd.it" || domain === "i.imgur.com") return "image";
			if (element.querySelector("[slot=\"text-body\"], shreddit-post-text-body, .usertext-body, [data-testid=\"post-content\"] .md, [data-click-id=\"text\"]") !== null) return "text";
			return "link";
		}
		const isVideoHost = /(redgifs\.com|streamable\.com|gfycat\.com)/i.test(domain) || /(redgifs\.com|streamable\.com|gfycat\.com)/i.test(contentHref);
		if (rawType === "video" || isVideoHost || element.querySelector("shreddit-player-2, video, [data-testid=\"shreddit-player\"]") !== null || /(\.mp4|\.webm|\.m3u8|v\.redd\.it|redgifs\.com|streamable\.com|gfycat\.com|youtube\.com|youtu\.be)/i.test(contentHref)) return "video";
		if (rawType === "gallery" || element.querySelector("shreddit-gallery, gallery-carousel, faceplate-carousel, [data-testid=\"media-gallery\"], shreddit-async-loader[bundlename*=\"gallery\"]") !== null) return "gallery";
		if (rawType === "link") return "link";
		if (rawType === "image") return "image";
		const hasTextBody = element.querySelector("[slot=\"text-body\"], shreddit-post-text-body, .usertext-body, [data-testid=\"post-content\"] .md, [data-click-id=\"text\"]") !== null;
		if (rawType === "text" || domain.startsWith("self.")) return "text";
		const primaryImgEl = element.querySelector("img#post-image, [data-post-media-primary], shreddit-aspect-ratio:not(:has(video)) img:not(.shreddit-subreddit-icon__icon), [data-testid=\"post-image\"] img, img.preview-img, img.media-lightbox-img:not(.post-background-image-filter), [slot=\"post-media-container\"] img:not(.shreddit-subreddit-icon__icon):not(.post-background-image-filter)");
		const isImageHref = /(\.jpg|\.jpeg|\.png|\.webp|\.gif|i\.redd\.it|i\.imgur\.com)/i.test(contentHref) || domain === "i.redd.it" || domain === "i.imgur.com";
		if (primaryImgEl !== null || isImageHref) return "image";
		if (hasTextBody) return "text";
		if (contentHref && /^https?:\/\//i.test(contentHref) && !/(v\.redd\.it|i\.redd\.it|preview\.redd\.it|i\.imgur\.com|\.mp4|\.webm|\.m3u8|\.jpg|\.jpeg|\.png|\.webp|\.gif)/i.test(contentHref) && !/\/comments\//i.test(contentHref)) return "link";
		if (!contentHref || /\/comments\//i.test(contentHref) || /reddit\.com/i.test(contentHref)) return "text";
		return "link";
	}
	var UPVOTE_SELECTORS = [
		"[data-action-bar-action=\"upvote\"]",
		"button[upvote]",
		"button[aria-label*=\"upvote\" i]",
		"button[name=\"upvote\"]",
		"[slot=\"upvote-button\"] button",
		"[slot=\"upvote-button\"]",
		"button[data-click-id=\"upvote\"]",
		"button[id*=\"upvote\" i]",
		"faceplate-tracker[action=\"upvote\"] button",
		"shreddit-post-action-row button[aria-label*=\"upvote\" i]",
		"[data-testid=\"upvote-button\"]",
		".arrow.up",
		".arrow.upmod"
	];
	var DOWNVOTE_SELECTORS = [
		"[data-action-bar-action=\"downvote\"]",
		"button[downvote]",
		"button[aria-label*=\"downvote\" i]",
		"button[name=\"downvote\"]",
		"[slot=\"downvote-button\"] button",
		"[slot=\"downvote-button\"]",
		"button[data-click-id=\"downvote\"]",
		"button[id*=\"downvote\" i]",
		"faceplate-tracker[action=\"downvote\"] button",
		"shreddit-post-action-row button[aria-label*=\"downvote\" i]",
		"[data-testid=\"downvote-button\"]",
		".arrow.down",
		".arrow.downmod"
	];
	function queryDeep(root, selectors) {
		const isOurs = (el) => {
			try {
				return !!el.closest?.(".rr-post-overlay, .rr-link-card-container, .rr-text-card-container");
			} catch {
				return false;
			}
		};
		const isHidden = (el) => {
			try {
				if (el.hidden) return true;
				const style = el.getAttribute("style") || "";
				if (/display\s*:\s*none/i.test(style)) return true;
				if (el.classList?.contains("rr-native-suppressed")) return true;
				let curr = el.parentElement;
				while (curr && curr !== root) {
					if (curr.hidden || curr.classList?.contains("rr-native-suppressed")) return true;
					const parentStyle = curr.getAttribute("style") || "";
					if (/display\s*:\s*none/i.test(parentStyle)) return true;
					curr = curr.parentElement;
				}
			} catch {}
			return false;
		};
		const collect = (node, out) => {
			if (!node) return;
			const HTMLElementCtor = globalThis.HTMLElement;
			if (HTMLElementCtor ? node instanceof HTMLElementCtor : node?.nodeType === 1) {
				const el = node;
				for (const selector of selectors) try {
					if (el.matches?.(selector)) out.push(el);
				} catch {}
				const sr = el.shadowRoot;
				if (sr) for (let i = 0; i < sr.childNodes.length; i++) collect(sr.childNodes[i], out);
			} else if (node?.nodeType === 11) {
				const frag = node;
				for (let i = 0; i < frag.childNodes.length; i++) collect(frag.childNodes[i], out);
				return;
			}
			const children = node.childNodes;
			if (children) for (let i = 0; i < children.length; i++) collect(children[i], out);
		};
		for (const selector of selectors) try {
			const found = root.querySelector(selector);
			if (found && !isOurs(found) && !isHidden(found)) {
				if (found.tagName.toLowerCase() === "button") return found;
			}
		} catch {}
		if (root.shadowRoot) for (const selector of selectors) try {
			const found = root.shadowRoot.querySelector(selector);
			if (found && !isHidden(found)) {
				if (found.tagName.toLowerCase() === "button") return found;
			}
		} catch {}
		const all = [];
		collect(root, all);
		const native = all.filter((el) => !isOurs(el));
		const visible = native.filter((el) => !isHidden(el));
		const isButton = (el) => el.tagName.toLowerCase() === "button";
		return visible.find(isButton) || native.find(isButton) || visible[0] || native[0] || null;
	}
	function checkIsUpvoted(element) {
		const voteState = element.getAttribute("vote-state") || element.getAttribute("score-state");
		if (voteState === "upvoted" || voteState === "upvote") return true;
		if (element.getAttribute("liked") === "true") return true;
		if (element.classList.contains("likes")) return true;
		const btn = queryDeep(element, UPVOTE_SELECTORS);
		if (btn) {
			if (btn.getAttribute("aria-pressed") === "true") return true;
			if (btn.getAttribute("aria-checked") === "true") return true;
			if (btn.getAttribute("data-selected") === "true") return true;
			if (btn.classList.contains("active") || btn.classList.contains("upvoted") || btn.classList.contains("upmod") || btn.classList.contains("text-interactive-pressed")) return true;
		}
		return false;
	}
	function checkIsDownvoted(element) {
		const voteState = element.getAttribute("vote-state") || element.getAttribute("score-state");
		if (voteState === "downvoted" || voteState === "downvote") return true;
		if (element.getAttribute("liked") === "false") return true;
		if (element.classList.contains("dislikes")) return true;
		const btn = queryDeep(element, DOWNVOTE_SELECTORS);
		if (btn) {
			if (btn.getAttribute("aria-pressed") === "true") return true;
			if (btn.getAttribute("aria-checked") === "true") return true;
			if (btn.getAttribute("data-selected") === "true") return true;
			if (btn.classList.contains("active") || btn.classList.contains("downvoted") || btn.classList.contains("downmod") || btn.classList.contains("text-interactive-pressed")) return true;
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
			if (trimmed === "•" || trimmed.toLowerCase() === "vote") isScoreHidden = true;
			score = parseScore(scoreAttr);
		} else {
			const scoreElem = element.querySelector("shreddit-post-vote-control [slot=\"score\"], faceplate-number, [data-test-id=\"post-score\"], .score, [slot=\"credit-bar\"]") || element.shadowRoot?.querySelector("faceplate-number, [data-testid=\"action-row\"] faceplate-number");
			if (scoreElem) {
				const trimmed = scoreElem.textContent?.trim() || "";
				if (trimmed === "•" || trimmed.toLowerCase() === "vote") isScoreHidden = true;
				score = parseScore(trimmed);
			}
		}
		if (element.dataset) element.dataset.rrPostType = postType;
		let commentCount = 0;
		const commentAttr = element.getAttribute("comment-count");
		if (commentAttr !== null) commentCount = parseCommentCount(commentAttr);
		else {
			const commentElem = element.querySelector("a[data-click-id=\"comments\"], [slot=\"comment-count\"], a[href*=\"/comments/\"]") || element.shadowRoot?.querySelector("[data-action-bar-action=\"comments\"] faceplate-number, a[name=\"comments-action-button\"] faceplate-number");
			if (commentElem) commentCount = parseCommentCount(commentElem.textContent);
		}
		const isUpvoted = checkIsUpvoted(element);
		const isDownvoted = checkIsDownvoted(element);
		let mediaUrl = void 0;
		if (postType === "video") {
			const player = element.querySelector("shreddit-player-2");
			const videoEl = element.querySelector("video");
			mediaUrl = player?.getAttribute("stream-url") || player?.getAttribute("src") || videoEl?.getAttribute("src") || contentHref || void 0;
		} else if (postType === "image") {
			const img = element.querySelector("img#post-image, [data-post-media-primary], [slot=\"post-media-container\"] img:not(.shreddit-subreddit-icon__icon):not(.post-background-image-filter), shreddit-aspect-ratio:not(:has(video)) img:not(.shreddit-subreddit-icon__icon), [data-testid=\"post-image\"] img, img.preview-img, img.media-lightbox-img:not(.post-background-image-filter), img.preview");
			mediaUrl = img?.src || img?.getAttribute("src") || contentHref || void 0;
		} else if (postType === "link") {
			const img = element.querySelector("shreddit-aspect-ratio img, [slot=\"post-media-container\"] img:not(.shreddit-subreddit-icon__icon):not(.post-background-image-filter), img.preview-img, img.preview");
			mediaUrl = img?.src || img?.getAttribute("src") || void 0;
		}
		let textBody = void 0;
		if (postType === "text") {
			const textBodyEl = element.querySelector("[slot=\"text-body\"], shreddit-post-text-body, .usertext-body, [data-testid=\"post-content\"] .md, [data-click-id=\"text\"]");
			if (textBodyEl) textBody = (textBodyEl.querySelector("[property=\"schema:articleBody\"], .md, .text-neutral-content") || textBodyEl).textContent?.trim() || "";
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
		if ("matches" in root && (root.matches("shreddit-post") || root.matches("[data-testid=\"post-container\"]") || root.matches(".Post"))) return [root];
		const shredditPosts = Array.from(root.querySelectorAll("shreddit-post"));
		if (shredditPosts.length > 0) return shredditPosts;
		const elements = [];
		const seen = new Set();
		const fallbackPosts = Array.from(root.querySelectorAll("[data-testid=\"post-container\"], .Post, article"));
		for (const el of fallbackPosts) if (!seen.has(el) && !fallbackPosts.some((p) => p !== el && p.contains(el))) {
			elements.push(el);
			seen.add(el);
		}
		return elements;
	}
	function extractPosts(root) {
		const targetRoot = root ?? (typeof document !== "undefined" ? document : null);
		if (!targetRoot) return [];
		const postElements = findPostElements(targetRoot);
		const posts = [];
		const seenIds = new Set();
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
		if (typeof document === "undefined" || typeof MutationObserver === "undefined") return () => {};
		const seenIds = new Set();
		const initialPosts = extractPosts(document);
		for (const post of initialPosts) seenIds.add(post.id);
		let debounceTimer = null;
		const processMutations = () => {
			const currentPosts = extractPosts(document);
			const newPosts = [];
			for (const post of currentPosts) if (!seenIds.has(post.id)) {
				seenIds.add(post.id);
				newPosts.push(post);
			}
			if (newPosts.length > 0) onNewPosts(newPosts);
		};
		const observer = new MutationObserver((mutations) => {
			let hasRelevantChanges = false;
			for (const mutation of mutations) {
				if (mutation.type === "childList" && mutation.addedNodes.length > 0) for (let i = 0; i < mutation.addedNodes.length; i++) {
					const node = mutation.addedNodes[i];
					if (node.nodeType === Node.ELEMENT_NODE) {
						const el = node;
						if (el.matches?.("shreddit-post, [data-testid=\"post-container\"], .Post") || el.querySelector?.("shreddit-post, [data-testid=\"post-container\"], .Post")) {
							hasRelevantChanges = true;
							break;
						}
					}
				}
				if (hasRelevantChanges) break;
			}
			if (hasRelevantChanges) {
				if (debounceTimer) clearTimeout(debounceTimer);
				debounceTimer = setTimeout(() => {
					debounceTimer = null;
					processMutations();
				}, 150);
			}
		});
		const target = document.querySelector("shreddit-feed") || document.querySelector("main") || document.body || document.documentElement;
		if (target) observer.observe(target, {
			childList: true,
			subtree: true
		});
		return () => {
			if (debounceTimer) {
				clearTimeout(debounceTimer);
				debounceTimer = null;
			}
			observer.disconnect();
		};
	}
	function deepInnerButton(element) {
		if (element.tagName.toLowerCase() === "button") return element;
		try {
			const direct = element.querySelector("button");
			if (direct) return direct;
		} catch {}
		try {
			const inner = element.shadowRoot?.querySelector("button");
			if (inner) return inner;
		} catch {}
		try {
			const nested = element.querySelectorAll("*");
			for (let i = 0; i < nested.length; i++) {
				const el = nested[i];
				try {
					const btn = el.shadowRoot?.querySelector("button");
					if (btn) return btn;
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
	function scheduleVoteSync(post, expectedUp, expectedDown, onSync) {
		let attempts = 0;
		const intervals = [
			50,
			150,
			350,
			750,
			1500
		];
		const check = () => {
			if (!post.element) return;
			const liveUp = checkIsUpvoted(post.element);
			const liveDown = checkIsDownvoted(post.element);
			if (liveUp === expectedUp && liveDown === expectedDown) {
				post.isUpvoted = liveUp;
				post.isDownvoted = liveDown;
				onSync?.();
				return;
			}
			attempts++;
			if (attempts < intervals.length) setTimeout(check, intervals[attempts]);
			else {
				post.isUpvoted = liveUp;
				post.isDownvoted = liveDown;
				onSync?.();
			}
		};
		setTimeout(check, intervals[0]);
	}
	function proxyUpvote(post, onSync) {
		if (!post || !post.element) return false;
		const button = queryDeep(post.element, UPVOTE_SELECTORS);
		if (!button) return false;
		const wasUpvoted = !!post.isUpvoted;
		const success = clickButton(button);
		if (success && post.element) {
			const expectedUp = !wasUpvoted;
			const expectedDown = false;
			post.isUpvoted = expectedUp;
			if (expectedUp) post.isDownvoted = false;
			const liveUp = checkIsUpvoted(post.element);
			const liveDown = checkIsDownvoted(post.element);
			if (liveUp === expectedUp && liveDown === expectedDown) {
				post.isUpvoted = liveUp;
				post.isDownvoted = liveDown;
			}
			scheduleVoteSync(post, expectedUp, expectedDown, onSync);
		}
		return success;
	}
	function proxyDownvote(post, onSync) {
		if (!post || !post.element) return false;
		const button = queryDeep(post.element, DOWNVOTE_SELECTORS);
		if (!button) return false;
		const wasDownvoted = !!post.isDownvoted;
		const success = clickButton(button);
		if (success && post.element) {
			const expectedDown = !wasDownvoted;
			const expectedUp = false;
			post.isDownvoted = expectedDown;
			if (expectedDown) post.isUpvoted = false;
			const liveUp = checkIsUpvoted(post.element);
			const liveDown = checkIsDownvoted(post.element);
			if (liveUp === expectedUp && liveDown === expectedDown) {
				post.isUpvoted = liveUp;
				post.isDownvoted = liveDown;
			}
			scheduleVoteSync(post, expectedUp, expectedDown, onSync);
		}
		return success;
	}
	function getActiveCarouselSlide(carouselContainer) {
		const list = carouselContainer.querySelector("ul[slot=\"items\"], [slot=\"items\"], .carousel-items, ul");
		if (!list) return null;
		const items = Array.from(list.children).filter((el) => typeof HTMLElement !== "undefined" ? el instanceof HTMLElement : Boolean(el && el.nodeType === 1));
		if (items.length === 0) return null;
		if (items.length === 1) return items[0];
		const scrollLeft = list.scrollLeft;
		let closestSlide = items[0];
		let minDiff = Infinity;
		for (const item of items) {
			const diff = Math.abs(item.offsetLeft - scrollLeft);
			if (diff < minDiff) {
				minDiff = diff;
				closestSlide = item;
			}
		}
		return closestSlide;
	}
	function findActiveSlideVideo(carouselContainer) {
		const slide = getActiveCarouselSlide(carouselContainer);
		if (!slide) return null;
		return slide.querySelector("video");
	}
	function readPlayerSrc(player) {
		try {
			const direct = player.getAttribute("stream-url") || player.getAttribute("src");
			if (direct) return direct;
			const packed = player.getAttribute("packaged-media-json");
			if (packed) try {
				const json = JSON.parse(packed);
				const url = json?.playbackMp4Url || json?.playback_url || json?.hlsUrl;
				if (typeof url === "string" && url) return url;
			} catch {}
		} catch {}
		return "";
	}
	function hydrateVideoFromPlayer(container, video) {
		try {
			if (video.currentSrc) return true;
			if (video.readyState > 0 && video.src) return true;
			const player = video.closest?.("shreddit-player-2") || container.querySelector?.("shreddit-player-2");
			if (!player) return !!video.src;
			const src = readPlayerSrc(player);
			if (!src) return !!video.src;
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
	var STORAGE_KEY = "reddit_reels_muted";
	var VOLUME_KEY = "reddit_reels_volume";
	var POST_SELECTOR = "shreddit-post, [data-post-id], article";
	var EMBED_HOSTS = /(?:redgifs\.com|streamable\.com|gfycat\.com|youtube\.com|youtube-nocookie\.com|youtu\.be)/i;
	var REDGIFS_HOST = /redgifs\.com/i;
	var USER_GESTURE_MS = 1500;
	var HYDRATE_DELAY_MS = 1500;
	var MAX_REASSERTS = 3;
	function readStored(key, parse, fallback) {
		try {
			if (typeof GM_getValue === "function") {
				const v = parse(GM_getValue(key, null));
				if (v !== null) return v;
			}
		} catch {}
		try {
			if (typeof localStorage !== "undefined") {
				const raw = localStorage.getItem(key);
				if (raw !== null) {
					const v = parse(raw);
					if (v !== null) return v;
				}
			}
		} catch {}
		return fallback;
	}
	function writeStored(key, value) {
		try {
			if (typeof GM_setValue === "function") GM_setValue(key, value);
		} catch {}
		try {
			if (typeof localStorage !== "undefined") localStorage.setItem(key, String(value));
		} catch {}
	}
	var parseBool = (raw) => typeof raw === "boolean" ? raw : raw === "true" ? true : raw === "false" ? false : null;
	var parseVolume = (raw) => {
		const n = typeof raw === "number" ? raw : typeof raw === "string" ? parseFloat(raw) : NaN;
		return Number.isFinite(n) && n >= 0 && n <= 1 ? n : null;
	};
	function normalizeIframeSrc(src, isMuted) {
		if (!src || src === "about:blank") return src;
		const target = isMuted ? "muted=1" : "muted=0";
		if (/[?&]muted=[01]/.test(src)) return src.replace(/([?&]muted=)[01]/g, `$1${isMuted ? "1" : "0"}`);
		return `${src}${src.includes("?") ? "&" : "?"}${target}`;
	}
	function sendIframePlay(ifr) {
		try {
			if (!ifr.src || ifr.src === "about:blank") return;
			ifr.contentWindow?.postMessage({
				source: "reddit-reels",
				type: "PLAY"
			}, "*");
			ifr.contentWindow?.postMessage({
				action: "play",
				type: "play"
			}, "*");
		} catch {}
	}
	function listenForRedGifsReady(getState) {
		const handler = (event) => {
			try {
				const origin = event.origin || "";
				if (!/https:\/\/(?:[a-zA-Z0-9-]+\.)?redgifs\.com$/i.test(origin) && origin !== window.location.origin) return;
				const data = event.data;
				if (!data || data.source !== "redgifs-bridge" || data.type !== "READY") return;
				const src = event.source;
				if (!src || typeof src.postMessage !== "function") return;
				audioManager.markBridgeReady(src);
				const state = getState();
				const active = state.activeContainer;
				if (active) {
					if (!Array.from(active.querySelectorAll("iframe")).some((ifr) => ifr.contentWindow === src)) {
						src.postMessage({
							source: "reddit-reels",
							type: "SET_AUDIO",
							muted: true,
							volume: 0
						}, "*");
						src.postMessage({
							source: "reddit-reels",
							type: "PAUSE"
						}, "*");
						return;
					}
				}
				const { muted, volume } = state;
				src.postMessage({
					source: "reddit-reels",
					type: "SET_AUDIO",
					muted,
					volume
				}, "*");
				src.postMessage({
					source: "reddit-reels",
					type: "PLAY"
				}, "*");
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
			if (!AudioCtx) return;
			if (!sharedAudioCtx || sharedAudioCtx.state === "closed") sharedAudioCtx = new AudioCtx();
			if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume().catch(() => {});
		} catch {}
	}
	function deepFindMediaElements(root) {
		const videos = [];
		const audios = [];
		const players = [];
		function traverse(node) {
			if (!node) return;
			const tag = node.tagName?.toLowerCase?.();
			if (tag === "video") videos.push(node);
			else if (tag === "audio") audios.push(node);
			else if (tag) {
				if (tag.includes("player") || tag.includes("vds-media") || tag.includes("vds-video") || tag.includes("vds-audio")) players.push(node);
				const sr = node.shadowRoot;
				if (sr) traverse(sr);
			}
			const children = node.childNodes;
			for (let i = 0; i < (children?.length || 0); i++) traverse(children[i]);
		}
		traverse(root);
		return {
			videos,
			audios,
			players
		};
	}
	function shadowContains(container, target) {
		if (!container || !target) return false;
		let curr = target;
		while (curr) {
			if (curr === container) return true;
			curr = curr.parentNode || curr.host || null;
		}
		return false;
	}
	function isEmbedIframe(ifr) {
		return EMBED_HOSTS.test(`${ifr.src || ""} ${ifr.dataset.rrSrc || ""}`);
	}
	function applyAudioState(container, isMuted, volume = 1, activeTargetVideo) {
		if (!container) return;
		const level = isMuted ? 0 : volume;
		const { videos, audios } = deepFindMediaElements(container);
		for (const video of videos) try {
			const isTarget = activeTargetVideo !== void 0 ? video === activeTargetVideo : videos.length === 1 || video === videos[0];
			video.muted = isMuted;
			video.volume = level;
			if (isTarget) {
				if (!isMuted && video.paused) video.play().catch(() => {});
			} else if (!video.paused) video.pause();
		} catch {}
		for (const audio of audios) try {
			audio.muted = isMuted;
			audio.volume = level;
			if (isMuted && !audio.paused) audio.pause();
		} catch {}
		container.querySelectorAll("iframe").forEach((ifr) => {
			try {
				if (!ifr.src || ifr.src === "about:blank") return;
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
		});
	}
	var AudioManager = class {
		_isMuted;
		_volume;
		activeContainer = null;
		activeVideo = null;
		videoCache = new WeakMap();
		knownVideos = new Set();
		guardedVideos = new WeakSet();
		autoplayMuted = new WeakSet();
		bridgeFrames = new WeakSet();
		lastGestureAt = 0;
		reasserts = 0;
		hydrateTimer = null;
		listeners = new Set();
		constructor(initialMuted, initialVolume) {
			this._isMuted = initialMuted !== void 0 ? initialMuted : readStored(STORAGE_KEY, parseBool, false);
			this._volume = initialVolume !== void 0 ? initialVolume : readStored(VOLUME_KEY, parseVolume, 1);
			if (typeof document !== "undefined") {
				const mark = () => {
					this.lastGestureAt = Date.now();
				};
				document.addEventListener("pointerdown", mark, true);
				document.addEventListener("keydown", mark, true);
			}
		}
		get isMuted() {
			return this._isMuted;
		}
		set isMuted(value) {
			this._isMuted = value;
			writeStored(STORAGE_KEY, value);
			this.syncActive();
			this.emit();
		}
		get volume() {
			return this._volume;
		}
		onChange(cb) {
			this.listeners.add(cb);
			return () => this.listeners.delete(cb);
		}
		emit() {
			this.listeners.forEach((cb) => {
				try {
					cb();
				} catch {}
			});
		}
		markBridgeReady(win) {
			try {
				this.bridgeFrames.add(win);
			} catch {}
		}
		setVolume(level, container) {
			const clamped = Number.isFinite(level) ? Math.min(1, Math.max(0, level)) : 1;
			this._volume = clamped;
			writeStored(VOLUME_KEY, clamped);
			const nextMuted = clamped === 0;
			if (nextMuted !== this._isMuted) {
				this._isMuted = nextMuted;
				writeStored(STORAGE_KEY, nextMuted);
			}
			if (container && container !== this.activeContainer) applyAudioState(container, this._isMuted, this._volume);
			else this.syncActive();
			this.emit();
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
		guardVideo(video) {
			this.knownVideos.add(video);
			if (this.guardedVideos.has(video) || typeof video.addEventListener !== "function") return;
			this.guardedVideos.add(video);
			video.addEventListener("play", () => {
				if (!this.activeContainer) return;
				if (video === this.activeVideo) return;
				if (shadowContains(this.activeContainer, video)) {
					const prev = this.activeVideo;
					this.activeVideo = video;
					if (prev && prev !== video) this.pauseVideo(prev);
					try {
						video.muted = this._isMuted;
						video.volume = this._isMuted ? 0 : this._volume;
					} catch {}
					return;
				}
				try {
					video.pause();
					video.muted = true;
				} catch {}
			});
			video.addEventListener("volumechange", () => {
				if (video !== this.activeVideo) return;
				const level = video.muted ? 0 : video.volume;
				const expectedLevel = this._isMuted ? 0 : this._volume;
				if (video.muted === this._isMuted && Math.abs(level - expectedLevel) < .01) return;
				if (video.muted && this.autoplayMuted.has(video)) return;
				if (Date.now() - this.lastGestureAt < USER_GESTURE_MS) {
					this.autoplayMuted.delete(video);
					this._isMuted = video.muted || video.volume === 0;
					if (!video.muted && video.volume > 0) this._volume = video.volume;
					writeStored(STORAGE_KEY, this._isMuted);
					writeStored(VOLUME_KEY, this._volume);
					this.reasserts = 0;
					this.emit();
				} else if (this.reasserts < MAX_REASSERTS) {
					this.reasserts++;
					try {
						video.muted = this._isMuted;
						video.volume = expectedLevel;
					} catch {}
				}
			});
		}
		pauseVideo(v) {
			try {
				if (!v.paused) v.pause();
				v.muted = true;
			} catch {}
		}
		pauseIframe(ifr) {
			if (!ifr.src || ifr.src === "about:blank" || !isEmbedIframe(ifr)) return;
			let viaBridge = false;
			try {
				const win = ifr.contentWindow;
				viaBridge = !!win && REDGIFS_HOST.test(ifr.src) && this.bridgeFrames.has(win);
				win?.postMessage({
					source: "reddit-reels",
					type: "PAUSE"
				}, "*");
			} catch {}
			if (!viaBridge) {
				ifr.dataset.rrSrc = ifr.src;
				ifr.src = "about:blank";
			}
		}
		requestPlayback(target) {
			if (!target) return;
			let targetVideo = null;
			let targetContainer = null;
			if (target.tagName?.toLowerCase() === "video" || typeof target.play === "function") {
				targetVideo = target;
				targetContainer = target.closest?.(POST_SELECTOR) ?? null;
			} else {
				targetContainer = target;
				targetVideo = this.findVideo(targetContainer);
			}
			if (targetContainer === this.activeContainer && targetVideo === this.activeVideo && targetVideo && !targetVideo.paused) {
				if (targetContainer) applyAudioState(targetContainer, this._isMuted, this._volume, targetVideo);
				return;
			}
			if (this.hydrateTimer) {
				clearTimeout(this.hydrateTimer);
				this.hydrateTimer = null;
			}
			const previous = this.activeVideo;
			if (previous && previous !== targetVideo) {
				this.pauseVideo(previous);
				try {
					previous.currentTime = 0;
				} catch {}
			}
			this.activeContainer = targetContainer;
			this.activeVideo = targetVideo;
			this.reasserts = 0;
			if (targetVideo) this.guardVideo(targetVideo);
			if (typeof document !== "undefined") {
				document.querySelectorAll("video").forEach((v) => {
					this.knownVideos.add(v);
				});
				for (const v of this.knownVideos) {
					if (v.isConnected === false) {
						this.knownVideos.delete(v);
						continue;
					}
					if (v === targetVideo) continue;
					if (targetContainer && shadowContains(targetContainer, v) && !targetVideo) continue;
					this.pauseVideo(v);
				}
				document.querySelectorAll("audio").forEach((a) => {
					if (targetContainer && targetContainer.contains(a)) return;
					try {
						if (!a.paused) a.pause();
						a.muted = true;
					} catch {}
				});
				document.querySelectorAll("iframe").forEach((ifr) => {
					if (targetContainer && targetContainer.contains(ifr)) return;
					this.pauseIframe(ifr);
				});
			}
			if (targetContainer) {
				const iframes = targetContainer.querySelectorAll("iframe");
				iframes.forEach((ifr) => {
					try {
						const stored = ifr.dataset.rrSrc;
						if (ifr.src === "about:blank" && stored) {
							ifr.src = normalizeIframeSrc(stored, this._isMuted);
							delete ifr.dataset.rrSrc;
						}
						ifr.tabIndex = -1;
					} catch {}
				});
				applyAudioState(targetContainer, this._isMuted, this._volume, targetVideo);
				for (const ifr of iframes) sendIframePlay(ifr);
				blurIframes(targetContainer);
			}
			if (targetVideo) {
				const video = targetVideo;
				ensureAutoplayAttrs(video);
				this.playWithFallback(video);
				if (targetContainer && !video.currentSrc && !video.src) {
					const container = targetContainer;
					this.hydrateTimer = setTimeout(() => {
						this.hydrateTimer = null;
						if (this.activeVideo !== video || video.currentSrc || video.src) return;
						if (hydrateVideoFromPlayer(container, video)) this.playWithFallback(video);
					}, HYDRATE_DELAY_MS);
				}
			}
		}
		playWithFallback(video) {
			try {
				video.muted = this._isMuted;
				video.volume = this._isMuted ? 0 : this._volume;
				video.play()?.catch?.((err) => {
					if (this.activeVideo !== video) return;
					const name = err && err.name || "";
					if (!video.muted && (name === "NotAllowedError" || name === "AbortError")) {
						this.autoplayMuted.add(video);
						video.muted = true;
						video.play().catch(() => {});
					}
				});
			} catch {}
		}
		findVideo(container) {
			if (!container) return null;
			if (container === this.activeContainer && this.activeVideo && shadowContains(container, this.activeVideo)) return this.activeVideo;
			const cached = this.videoCache.get(container);
			if (cached && Date.now() - cached.time < 1e3 && (cached.video === null || shadowContains(container, cached.video))) return cached.video;
			const found = findActiveSlideVideo(container) || deepFindMediaElements(container).videos[0] || null;
			try {
				this.videoCache.set(container, {
					video: found,
					time: Date.now()
				});
			} catch {}
			if (found) this.guardVideo(found);
			return found;
		}
		togglePlayback(target) {
			if (!target) return false;
			if (this.activeContainer !== target) {
				this.requestPlayback(target);
				return true;
			}
			const video = this.activeVideo || this.findVideo(target);
			if (video) {
				if (this.autoplayMuted.has(video) && !this._isMuted) {
					this.autoplayMuted.delete(video);
					video.muted = false;
					video.volume = this._volume;
					if (video.paused) video.play().catch(() => {});
					return true;
				}
				if (video.paused) {
					this.playWithFallback(video);
					return true;
				}
				video.pause();
				return false;
			}
			const ifr = target.querySelector("iframe");
			if (ifr && ifr.src && ifr.src !== "about:blank") {
				const isPaused = ifr.dataset.rrPaused === "1";
				ifr.dataset.rrPaused = isPaused ? "0" : "1";
				if (isPaused) {
					sendIframePlay(ifr);
					return true;
				}
				ifr.contentWindow?.postMessage({
					source: "reddit-reels",
					type: "PAUSE"
				}, "*");
				ifr.contentWindow?.postMessage({
					action: "pause",
					type: "pause"
				}, "*");
				return false;
			}
			return false;
		}
		invalidateVideoCache(container) {
			if (container) this.videoCache.delete(container);
		}
		toggleMute(container) {
			this._isMuted = !this._isMuted;
			writeStored(STORAGE_KEY, this._isMuted);
			if (this.activeVideo) this.autoplayMuted.delete(this.activeVideo);
			if (container && container !== this.activeContainer) applyAudioState(container, this._isMuted, this._volume);
			else this.syncActive();
			this.emit();
			return this._isMuted;
		}
		reassertActiveIframeUnmute() {
			if (this._isMuted || !this.activeContainer) return;
			this.activeContainer.querySelectorAll("iframe").forEach((ifr) => {
				try {
					const stored = ifr.dataset.rrSrc;
					if (ifr.src === "about:blank" && stored) {
						ifr.src = normalizeIframeSrc(stored, false);
						delete ifr.dataset.rrSrc;
					}
					ifr.contentWindow?.postMessage({
						source: "reddit-reels",
						type: "SET_AUDIO",
						muted: false,
						volume: this._volume
					}, "*");
					sendIframePlay(ifr);
				} catch {}
			});
		}
		syncActive() {
			if (this.activeContainer) applyAudioState(this.activeContainer, this._isMuted, this._volume, this.activeVideo ?? void 0);
			else if (this.activeVideo) try {
				this.activeVideo.muted = this._isMuted;
				this.activeVideo.volume = this._isMuted ? 0 : this._volume;
			} catch {}
		}
		stopAll() {
			if (this.hydrateTimer) {
				clearTimeout(this.hydrateTimer);
				this.hydrateTimer = null;
			}
			this.activeVideo = null;
			this.activeContainer = null;
			if (typeof document !== "undefined") document.querySelectorAll("video").forEach((v) => {
				this.knownVideos.add(v);
			});
			for (const v of this.knownVideos) {
				if (v.isConnected === false) {
					this.knownVideos.delete(v);
					continue;
				}
				this.pauseVideo(v);
			}
			if (typeof document === "undefined") return;
			document.querySelectorAll("audio").forEach((a) => {
				try {
					if (!a.paused) a.pause();
					a.muted = true;
				} catch {}
			});
			document.querySelectorAll("iframe").forEach((ifr) => {
				try {
					ifr.contentWindow?.postMessage({
						source: "reddit-reels",
						type: "PAUSE",
						muted: true
					}, "*");
					ifr.contentWindow?.postMessage({
						action: "pause",
						muted: true
					}, "*");
				} catch {}
			});
		}
	};
	var audioManager = new AudioManager();
	function isRedGifsFrame() {
		if (typeof window === "undefined") return false;
		return /redgifs\.com/i.test(window.location.hostname);
	}
	function getStoredMute() {
		try {
			if (typeof GM_getValue === "function") {
				const gm = GM_getValue("reddit_reels_muted", null);
				if (typeof gm === "boolean") return gm;
			}
		} catch {}
		return false;
	}
	function getStoredVolume() {
		try {
			if (typeof GM_getValue === "function") {
				const gm = GM_getValue("reddit_reels_volume", null);
				if (typeof gm === "number" && gm >= 0 && gm <= 1) return gm;
			}
		} catch {}
		return 1;
	}
	function initRedGifsBridge() {
		if (!isRedGifsFrame()) return () => {};
		let currentMuted = getStoredMute();
		let currentVolume = getStoredVolume();
		const applyToVideo = (video) => {
			try {
				video.muted = currentMuted;
				video.volume = currentVolume;
				if (!currentMuted && video.paused) video.play().catch(() => {
					try {
						video.muted = true;
						video.play().catch(() => {});
					} catch {}
				});
				else if (currentMuted && video.paused) video.play().catch(() => {});
			} catch {}
		};
		const syncActiveVideo = () => {
			const video = document.querySelector("video");
			if (video) applyToVideo(video);
		};
		const handleMessage = (event) => {
			const origin = event.origin || "";
			if (origin && !/https:\/\/(?:[a-zA-Z0-9-]+\.)?reddit\.com$/i.test(origin) && origin !== window.location.origin) return;
			const data = event.data;
			if (!data || data.source !== "reddit-reels") return;
			const video = document.querySelector("video");
			if (data.type === "SET_AUDIO" || data.type === "SET_MUTE") {
				if (typeof data.muted === "boolean") currentMuted = data.muted;
				if (typeof data.volume === "number") currentVolume = Math.min(1, Math.max(0, data.volume));
				if (video) applyToVideo(video);
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
		if (document.body || document.documentElement) observer.observe(document.body || document.documentElement, {
			childList: true,
			subtree: true
		});
		syncActiveVideo();
		const handleUserGesture = () => {
			syncActiveVideo();
		};
		window.addEventListener("click", handleUserGesture, true);
		window.addEventListener("pointerdown", handleUserGesture, true);
		try {
			if (window.parent && window.parent !== window) window.parent.postMessage({
				source: "redgifs-bridge",
				type: "READY"
			}, "*");
		} catch {}
		return () => {
			window.removeEventListener("message", handleMessage);
			window.removeEventListener("click", handleUserGesture, true);
			window.removeEventListener("pointerdown", handleUserGesture, true);
			observer.disconnect();
		};
	}
	function resolveExternalVideo(post) {
		const href = post.contentHref || post.mediaUrl || "";
		if (!href) return null;
		if (/redgifs\.com/i.test(href)) {
			const match = href.match(/redgifs\.com\/(?:watch|ifr|v)\/([a-zA-Z0-9_-]+)/i);
			if (match) return {
				type: "iframe",
				src: normalizeIframeSrc(`https://www.redgifs.com/ifr/${match[1]}?autoplay=1&muted=1`, audioManager.isMuted),
				hasAudio: true
			};
		} else if (/streamable\.com/i.test(href)) {
			const match = href.match(/streamable\.com\/([a-zA-Z0-9_-]+)/i);
			if (match) return {
				type: "iframe",
				src: `https://streamable.com/e/${match[1]}?autoplay=1${audioManager.isMuted ? "&muted=1" : ""}`,
				hasAudio: true
			};
		} else if (/gfycat\.com/i.test(href)) {
			const match = href.match(/gfycat\.com\/(?:ifr\/)?([a-zA-Z0-9_-]+)/i);
			if (match) return {
				type: "iframe",
				src: `https://gfycat.com/ifr/${match[1]}?autoplay=1`,
				hasAudio: true
			};
		} else if (/youtube\.com|youtu\.be/i.test(href)) {
			const ytMatch = href.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
			if (ytMatch) return {
				type: "iframe",
				src: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&enablejsapi=1`,
				hasAudio: true
			};
		} else if (/\.(mp4|webm)(\?|$)/i.test(href)) return {
			type: "video",
			src: href,
			poster: post.mediaUrl !== href ? post.mediaUrl || "" : "",
			hasAudio: true
		};
		return null;
	}
	function resolveMedia(post) {
		const el = post.element;
		if (!el) {
			const external = resolveExternalVideo(post);
			if (external) return external;
			return {
				type: "image",
				src: post.mediaUrl || post.contentHref || "",
				hasAudio: false
			};
		}
		const video = el.querySelector("video");
		const player = el.querySelector("shreddit-player-2");
		if (video || player) return {
			type: "video",
			src: video?.currentSrc || video?.src || player?.getAttribute("stream-url") || player?.getAttribute("src") || post.mediaUrl || post.contentHref || "",
			poster: video?.poster || player?.getAttribute("poster") || player?.getAttribute("preview") || void 0,
			hasAudio: player?.getAttribute("has-audio") !== "false",
			element: video || player || void 0
		};
		const iframe = el.querySelector("iframe");
		if (iframe && iframe.src) {
			let src = normalizeIframeSrc(iframe.src, audioManager.isMuted);
			if (/redgifs\.com|streamable\.com|gfycat\.com/i.test(src) && !/[?&]autoplay=/.test(src)) src += (src.includes("?") ? "&" : "?") + "autoplay=1";
			return {
				type: "iframe",
				src,
				hasAudio: true,
				element: iframe
			};
		}
		const external = resolveExternalVideo(post);
		if (external) return external;
		const imgSrc = el.querySelector("img[src*=\"i.redd.it\"], img[src*=\"preview.redd.it\"], [slot=\"post-media-container\"] img, img")?.src || post.mediaUrl || post.contentHref || "";
		return {
			type: "image",
			src: imgSrc,
			poster: imgSrc,
			hasAudio: false
		};
	}
	var backupStore = new WeakMap();
	function backupElementState(el, attributesToTrack = []) {
		let record = backupStore.get(el);
		if (!record) {
			const originalAttrs = {};
			for (const attr of attributesToTrack) originalAttrs[attr] = el.getAttribute(attr);
			record = {
				inlineStyle: el.getAttribute("style"),
				attributes: originalAttrs,
				abortController: new AbortController()
			};
			backupStore.set(el, record);
		}
		return record.abortController.signal;
	}
	function restoreElementState(el) {
		const record = backupStore.get(el);
		if (record) {
			if (record.abortController) try {
				record.abortController.abort();
			} catch {}
			if (record.inlineStyle !== null) el.setAttribute("style", record.inlineStyle);
			else el.removeAttribute("style");
			for (const [attr, val] of Object.entries(record.attributes)) if (val !== null) el.setAttribute(attr, val);
			else el.removeAttribute(attr);
			backupStore.delete(el);
		}
	}
	function clearAllRrState(postEl) {
		const elements = [postEl, ...Array.from(postEl.querySelectorAll("*"))];
		for (const el of elements) {
			if (el.dataset) {
				const keys = Object.keys(el.dataset);
				for (const k of keys) if (k.startsWith("rr") || k === "reelPostId") delete el.dataset[k];
			}
			restoreElementState(el);
		}
	}
	var CAPTION_BUTTON_SELECTORS = [
		"button[aria-label*=\"caption\" i]",
		"button[aria-label*=\"subtitle\" i]",
		"button[aria-label*=\"closed caption\" i]",
		"button[data-testid*=\"caption\" i]",
		"button[data-testid*=\"subtitle\" i]",
		"[data-testid*=\"caption\" i] button",
		"[data-testid*=\"subtitle\" i] button"
	];
	function isCaptionsButtonActive(btn) {
		const aria = btn.getAttribute("aria-pressed") || btn.getAttribute("aria-checked") || btn.getAttribute("data-selected");
		if (aria === "true") return true;
		if (aria === "false") return false;
		if (btn.classList.contains("active") || btn.classList.contains("selected") || btn.classList.contains("enabled")) return true;
		const label = (btn.getAttribute("aria-label") || btn.getAttribute("title") || "").toLowerCase();
		if (label.includes("turn off") || label.includes("hide caption") || label.includes("captions on")) return true;
		if (label.includes("turn on") || label.includes("show caption") || label.includes("captions off")) return false;
		return null;
	}
	function findCaptionButton(root) {
		for (const selector of CAPTION_BUTTON_SELECTORS) try {
			const found = root.querySelector?.(selector);
			if (found) return found;
		} catch {}
		return null;
	}
	function syncPlayerCaptionsControl(player, enabled) {
		try {
			try {
				if (enabled) {
					player.setAttribute("captions", "true");
					player.captions = true;
					player.captionsEnabled = true;
					player.subtitlesEnabled = true;
				} else {
					player.removeAttribute("captions");
					player.captions = false;
					player.captionsEnabled = false;
					player.subtitlesEnabled = false;
				}
			} catch {}
			try {
				localStorage.setItem("@reddit/shreddit-player-media-captions", enabled ? "true" : "false");
			} catch {}
			const scopes = [player];
			if (player.shadowRoot) scopes.push(player.shadowRoot);
			for (const child of Array.from(player.children)) if (child.shadowRoot) scopes.push(child.shadowRoot);
			for (const scope of scopes) {
				const btn = findCaptionButton(scope);
				if (!btn) continue;
				if (isCaptionsButtonActive(btn) === enabled) return;
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
			if (v.textTracks && v.textTracks.length > 0) for (let i = 0; i < v.textTracks.length; i++) try {
				v.textTracks[i].mode = enabled ? "showing" : "disabled";
			} catch {}
			const tracked = v;
			if (v.textTracks && !tracked._rrTrackWired) {
				tracked._rrTrackWired = true;
				try {
					v.textTracks.addEventListener("addtrack", () => {
						const cur = container.dataset.rrCaptions === "on";
						if (v.textTracks) for (let i = 0; i < v.textTracks.length; i++) try {
							v.textTracks[i].mode = cur ? "showing" : "disabled";
						} catch {}
					});
				} catch {}
			}
		});
		players.forEach((p) => {
			p.classList.toggle("rr-hide-captions", !enabled);
			syncPlayerCaptionsControl(p, enabled);
		});
		if (enabled) container.classList.remove("rr-hide-captions");
		else container.classList.add("rr-hide-captions");
	}
	function promoteGalleryMedia(container) {
		const list = container.querySelector("ul[slot=\"items\"], [slot=\"items\"], .carousel-items, ul");
		const slides = list ? Array.from(list.children).filter((el) => typeof HTMLElement !== "undefined" ? el instanceof HTMLElement : Boolean(el && el.nodeType === 1)) : [];
		let targetRoots = [container];
		if (slides.length > 0) {
			const scrollLeft = list?.scrollLeft || 0;
			let activeIdx = 0;
			let minDiff = Infinity;
			for (let i = 0; i < slides.length; i++) {
				const diff = Math.abs(slides[i].offsetLeft - scrollLeft);
				if (diff < minDiff) {
					minDiff = diff;
					activeIdx = i;
				}
			}
			targetRoots = slides.slice(Math.max(0, activeIdx - 1), Math.min(slides.length, activeIdx + 2));
		}
		for (const root of targetRoots) {
			root.querySelectorAll("picture source, source").forEach((source) => {
				try {
					const ds = source.dataset;
					const lazySrcset = ds?.srcset || ds?.lazySrcset || source.getAttribute("data-srcset") || source.getAttribute("data-lazy-srcset");
					if (lazySrcset && (!source.srcset || source.srcset.startsWith("data:image/gif"))) source.srcset = lazySrcset;
				} catch {}
			});
			root.querySelectorAll("img").forEach((img) => {
				try {
					if (img.classList.contains("post-background-image-filter") || img.classList.contains("shreddit-subreddit-icon__icon")) return;
					img.setAttribute("loading", "eager");
					img.setAttribute("fetchpriority", "high");
					img.removeAttribute("decoding");
					const ds = img.dataset;
					const lazySrc = ds?.src || ds?.lazySrc || img.getAttribute("data-src") || img.getAttribute("data-lazy-src");
					const isPlaceholder = !img.src || img.src === "about:blank" || img.src.startsWith("data:image/gif") || img.src.startsWith("data:image/svg");
					if (lazySrc && isPlaceholder) img.src = lazySrc;
					const lazySrcset = ds?.srcset || ds?.lazySrcset || img.getAttribute("data-srcset") || img.getAttribute("data-lazy-srcset");
					if (lazySrcset && (!img.srcset || img.srcset.startsWith("data:image/gif"))) img.srcset = lazySrcset;
					img.style.removeProperty("display");
				} catch {}
			});
		}
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
        :host(:not(.rr-hide-captions)) .captions-display,
        :host(:not(.rr-hide-captions)) [data-testid="captions"],
        :host(:not(.rr-hide-captions)) shreddit-player-captions,
        :host(:not(.rr-hide-captions)) [part="captions"] {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 10 !important;
          pointer-events: none !important;
        }
      `;
				player.shadowRoot.appendChild(shadowStyle);
			}
		}
	}
	function unconstrainPostMedia(postEl) {
		if (postEl.dataset.rrUnconstrained === "1") return;
		postEl.dataset.rrUnconstrained = "1";
		if (postEl.querySelector("gallery-carousel, faceplate-carousel, [data-testid=\"media-gallery\"]")) postEl.classList.add("rr-has-gallery");
		if (postEl.querySelector("video, iframe, shreddit-player-2")) postEl.classList.add("rr-has-video");
		if (postEl.querySelector("img:not(.shreddit-subreddit-icon__icon)")) postEl.classList.add("rr-has-image");
		postEl.querySelectorAll("shreddit-aspect-ratio, [slot=\"post-media-container\"], [data-aspect-ratio-container], .media-container, gallery-carousel, faceplate-carousel, shreddit-async-loader, .media-lightbox-img, shreddit-media-lightbox-listener").forEach((el) => {
			backupElementState(el, ["aspect-ratio", "max-height"]);
			el.style.setProperty("--max-height", "100dvh", "important");
			el.style.setProperty("--max-width", "100vw", "important");
			el.style.setProperty("max-height", "100dvh", "important");
			el.style.setProperty("max-width", "100vw", "important");
			el.style.setProperty("height", "100dvh", "important");
			el.style.setProperty("width", "100vw", "important");
			el.style.setProperty("min-height", "100dvh", "important");
			el.style.setProperty("--gallery-initial-height", "100dvh", "important");
			el.style.setProperty("aspect-ratio", "unset", "important");
			if (el.hasAttribute("aspect-ratio") && !el.dataset.rrOrigAspectRatio) el.dataset.rrOrigAspectRatio = el.getAttribute("aspect-ratio") || "";
			if (el.hasAttribute("max-height") && !el.dataset.rrOrigMaxHeight) el.dataset.rrOrigMaxHeight = el.getAttribute("max-height") || "";
			el.removeAttribute("aspect-ratio");
			el.removeAttribute("max-height");
		});
		postEl.querySelectorAll("shreddit-player-2").forEach((player) => {
			backupElementState(player, ["data-is-vertical"]);
			unconstrainPlayerShadow(player);
		});
		postEl.querySelectorAll("gallery-carousel, faceplate-carousel, [data-testid=\"media-gallery\"]").forEach((carousel) => {
			wireGalleryCarousel(carousel);
		});
		const { videos } = deepFindMediaElements(postEl);
		videos.forEach((v) => {
			backupElementState(v, ["class"]);
			const handleSizing = () => {
				const w = v.videoWidth;
				const h = v.videoHeight;
				if (w > 0 && h > 0) {
					if (h / w >= 1.5) {
						v.classList.add("rr-vertical-video");
						v.style.setProperty("object-fit", "cover", "important");
						(v.closest("li") || v.closest("shreddit-player-2"))?.classList.add("rr-vertical-video");
						if (videos.length === 1) {
							postEl.classList.add("rr-has-vertical-video");
							postEl.setAttribute("data-vertical-video", "true");
						}
						const player = v.closest("shreddit-player-2") || postEl.querySelector("shreddit-player-2");
						if (player) {
							player.classList.add("rr-vertical-video");
							player.setAttribute("data-is-vertical", "true");
						}
					} else {
						v.classList.remove("rr-vertical-video");
						v.style.setProperty("object-fit", "contain", "important");
						(v.closest("li") || v.closest("shreddit-player-2"))?.classList.remove("rr-vertical-video");
						if (videos.length === 1) {
							postEl.classList.remove("rr-has-vertical-video");
							postEl.removeAttribute("data-vertical-video");
						}
					}
				}
			};
			handleSizing();
			const vWithAc = v;
			if (!vWithAc._rrSizingController) {
				const vAc = new AbortController();
				vWithAc._rrSizingController = vAc;
				vWithAc.dataset.rrWired = "1";
				v.addEventListener("loadedmetadata", handleSizing, { signal: vAc.signal });
				v.addEventListener("resize", handleSizing, { signal: vAc.signal });
				v.addEventListener("loadedmetadata", () => {
					const pref = postEl.dataset?.rrCaptions;
					if (pref !== "on" && pref !== "off") return;
					const wantOn = pref === "on";
					try {
						const tracks = v.textTracks;
						for (let i = 0; i < (tracks?.length || 0); i++) try {
							tracks[i].mode = wantOn ? "showing" : "disabled";
						} catch {}
					} catch {}
				}, { signal: vAc.signal });
			}
		});
	}
	function wireGalleryCarousel(carousel) {
		promoteGalleryMedia(carousel);
		const container = carousel;
		if (container._rrAbortController) return;
		const ac = new AbortController();
		container._rrAbortController = ac;
		const signal = ac.signal;
		const getScrollContainer = () => {
			return carousel.querySelector("ul[slot=\"items\"], .carousel-items, ul") || carousel.shadowRoot?.querySelector("ul, .carousel-items") || carousel;
		};
		const updateButtons = () => {
			const sc = getScrollContainer();
			if (!sc) return;
			const prevBtn = carousel.querySelector("[slot=\"previous-button\"], .prev-btn");
			const nextBtn = carousel.querySelector("[slot=\"next-button\"], .next-btn");
			const maxScroll = sc.scrollWidth - sc.clientWidth;
			if (prevBtn) {
				const atStart = sc.scrollLeft <= 5;
				prevBtn.style.setProperty("display", atStart ? "none" : "flex", "important");
			}
			if (nextBtn) {
				const atEnd = sc.scrollLeft >= maxScroll - 5;
				nextBtn.style.setProperty("display", atEnd ? "none" : "flex", "important");
			}
			promoteGalleryMedia(carousel);
		};
		const sc = getScrollContainer();
		if (sc) sc.addEventListener("scroll", updateButtons, {
			passive: true,
			signal
		});
		carousel.querySelectorAll("[slot=\"previous-button\"], .prev-btn").forEach((btn) => {
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				e.preventDefault();
				const scEl = getScrollContainer();
				if (!scEl) return;
				const step = scEl.clientWidth || window.innerWidth;
				scEl.scrollBy({
					left: -step,
					behavior: "smooth"
				});
				setTimeout(updateButtons, 100);
				setTimeout(updateButtons, 350);
			}, { signal });
		});
		carousel.querySelectorAll("[slot=\"next-button\"], .next-btn").forEach((btn) => {
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				e.preventDefault();
				const scEl = getScrollContainer();
				if (!scEl) return;
				const step = scEl.clientWidth || window.innerWidth;
				scEl.scrollBy({
					left: step,
					behavior: "smooth"
				});
				setTimeout(updateButtons, 100);
				setTimeout(updateButtons, 350);
			}, { signal });
		});
		setTimeout(updateButtons, 50);
	}
	function restorePostMedia(postEl) {
		postEl.querySelectorAll("shreddit-aspect-ratio, [slot=\"post-media-container\"], [data-aspect-ratio-container], .media-container, gallery-carousel, faceplate-carousel, shreddit-async-loader, .media-lightbox-img, shreddit-media-lightbox-listener").forEach((el) => {
			el.style.removeProperty("--max-height");
			el.style.removeProperty("--max-width");
			el.style.removeProperty("max-height");
			el.style.removeProperty("max-width");
			el.style.removeProperty("height");
			el.style.removeProperty("width");
			el.style.removeProperty("min-height");
			el.style.removeProperty("--gallery-initial-height");
			el.style.removeProperty("aspect-ratio");
			if (el.dataset.rrOrigAspectRatio !== void 0) {
				el.setAttribute("aspect-ratio", el.dataset.rrOrigAspectRatio);
				delete el.dataset.rrOrigAspectRatio;
			}
			if (el.dataset.rrOrigMaxHeight !== void 0) {
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
			if (player.shadowRoot) player.shadowRoot.querySelector("#rr-unconstrain-style")?.remove();
		});
		postEl.querySelectorAll("gallery-carousel, faceplate-carousel, [data-testid=\"media-gallery\"]").forEach((carousel) => {
			const c = carousel;
			if (c._rrAbortController) {
				try {
					c._rrAbortController.abort();
				} catch {}
				delete c._rrAbortController;
			}
			delete carousel.dataset.rrGalleryWired;
		});
		const { videos } = deepFindMediaElements(postEl);
		videos.forEach((v) => {
			const vid = v;
			if (vid._rrSizingController) {
				try {
					vid._rrSizingController.abort();
				} catch {}
				delete vid._rrSizingController;
			}
			delete vid.dataset?.rrWired;
			delete vid._rrTrackWired;
			v.classList.remove("rr-vertical-video");
			v.style.removeProperty("object-fit");
		});
		clearAllRrState(postEl);
		postEl.classList.remove("rr-has-vertical-video", "rr-hide-captions", "rr-has-gallery", "rr-has-video", "rr-has-image", "rr-fit-contain", "rr-fit-cover");
		postEl.removeAttribute("data-vertical-video");
		delete postEl.dataset.rrCaptions;
		delete postEl.dataset.rrUnconstrained;
	}
	_css(":root {\n  --rr-z-header: 2147483641;\n  --rr-z-reels: 2147483640;\n  --rr-z-overlay: 2147483645;\n  --rr-font-stack: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;\n  --rr-primary: #ff4500;\n  --rr-surface-glass: rgba(18, 22, 30, 0.72);\n  --rr-border-glass: rgba(255, 255, 255, 0.12);\n  --rr-highlight-glass: rgba(255, 255, 255, 0.22);\n}\n\n/* =========================================================\n   Feedback Pulses (Play/Pause, Fit/Fill)\n   ========================================================= */\n\n.rr-play-pulse {\n  position: fixed !important;\n  top: 50% !important;\n  left: 50% !important;\n  transform: translate(-50%, -50%) !important;\n  width: 76px !important;\n  height: 76px !important;\n  border-radius: 9999px !important;\n  background: rgba(18, 22, 30, 0.8) !important;\n  border: 1px solid rgba(255, 255, 255, 0.15) !important;\n  display: flex !important;\n  align-items: center !important;\n  justify-content: center !important;\n  color: #ffffff !important;\n  pointer-events: none !important;\n  z-index: 2147483646 !important;\n  animation: rr-pulse-fade 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;\n}\n\n.rr-play-pulse svg {\n  width: 36px !important;\n  height: 36px !important;\n  fill: currentColor !important;\n}\n\n.rr-scale-pulse {\n  position: fixed !important;\n  top: 50% !important;\n  left: 50% !important;\n  transform: translate(-50%, -50%) !important;\n  padding: 10px 20px !important;\n  border-radius: 9999px !important;\n  background: #181a1f !important;\n  border: 1px solid #30323a !important;\n  color: #ffffff !important;\n  font-family: var(--rr-font-stack) !important;\n  font-size: 13px !important;\n  font-weight: 700 !important;\n  letter-spacing: 0.3px !important;\n  pointer-events: none !important;\n  z-index: 2147483646 !important;\n  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6) !important;\n  animation: rr-pulse-fade 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;\n}\n\n@keyframes rr-pulse-fade {\n  0% {\n    opacity: 0;\n    transform: translate(-50%, -50%) scale(0.65);\n  }\n  35% {\n    opacity: 1;\n    transform: translate(-50%, -50%) scale(1.08);\n  }\n  100% {\n    opacity: 0;\n    transform: translate(-50%, -50%) scale(1.15);\n  }\n}\n\n/* =========================================================\n   Fullscreen Reels Feed & Snap-Scroll Rules\n   ========================================================= */\n\n/* Root: the WINDOW is the scroller. Reddit's infinite loader, Back/forward\n   scroll restoration and lazy media all keep working because nothing nests. */\nhtml.rr-active {\n  scroll-snap-type: y mandatory !important;\n  overscroll-behavior-y: contain !important;\n  scrollbar-width: none !important;\n  background: #000000 !important;\n}\n\nhtml.rr-active::-webkit-scrollbar {\n  display: none !important;\n}\n\nhtml.rr-active body {\n  margin: 0 !important;\n  padding: 0 !important;\n  background: #000000 !important;\n  color: #ffffff !important;\n  -webkit-user-select: none;\n  user-select: none;\n}\n\n/* Reddit's header stays (search, account, menu) as a translucent bar over the reel */\nhtml.rr-active reddit-header-large,\nhtml.rr-active reddit-header-small {\n  position: fixed !important;\n  top: 0 !important;\n  left: 0 !important;\n  right: 0 !important;\n  z-index: var(--rr-z-header) !important;\n  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0)) !important;\n}\n\nhtml.rr-active reddit-header-large header,\nhtml.rr-active reddit-header-small header,\nhtml.rr-active reddit-header-large > *,\nhtml.rr-active reddit-header-small > * {\n  background: transparent !important;\n  border: none !important;\n  box-shadow: none !important;\n}\n\n/* Suppress the rest of Reddit's framing in reel layout */\nhtml.rr-active aside,\nhtml.rr-active footer,\nhtml.rr-active .bottom-nav,\nhtml.rr-active #left-sidebar-container,\nhtml.rr-active #right-sidebar-container,\nhtml.rr-active shreddit-async-loader[bundlename=\"bottom_bar\"],\nhtml.rr-active shreddit-comment-jump-button,\nhtml.rr-active reddit-comment-jump-button,\nhtml.rr-active .comment-jump-button,\nhtml.rr-active shreddit-async-loader[bundlename*=\"comment_jump\"],\nhtml.rr-active shreddit-async-loader[bundlename*=\"floating\"],\nhtml.rr-active shreddit-floating-action-bar,\nhtml.rr-active floating-action-bar,\nhtml.rr-active [data-testid*=\"floating\" i],\nhtml.rr-active [data-testid*=\"comment-jump\" i],\nhtml.rr-active shreddit-back-to-top-button,\nhtml.rr-active back-to-top-button,\nhtml.rr-active faceplate-tracker[source=\"floating_action_bar\"],\nhtml.rr-active [slot=\"floating-action-bar\"],\nhtml.rr-active shreddit-ad-post,\nhtml.rr-active shreddit-feed > hr,\nhtml.rr-active shreddit-feed hr,\nhtml.rr-active masthead-ad,\nhtml.rr-active .masthead {\n  display: none !important;\n  visibility: hidden !important;\n}\n\n/* Feed wrappers: full width, no gutters, no own scrolling */\nhtml.rr-active #subgrid-container,\nhtml.rr-active main,\nhtml.rr-active .main-container,\nhtml.rr-active #main-content,\nhtml.rr-active #posts-container,\nhtml.rr-active shreddit-feed,\nhtml.rr-active [data-testid=\"posts-list\"] {\n  width: 100vw !important;\n  max-width: 100vw !important;\n  margin: 0 !important;\n  padding: 0 !important;\n  overflow: visible !important;\n  background: #000000 !important;\n  display: block !important;\n}\n\n/* Single Reel Slide (shreddit-post, article, div containers) */\nhtml.rr-active shreddit-post,\nhtml.rr-active #posts-container > article,\nhtml.rr-active [data-testid=\"posts-list\"] > div[data-testid=\"post-container\"] {\n  height: 100vh !important;\n  height: 100dvh !important;\n  width: 100vw !important;\n  min-height: 100vh !important;\n  min-height: 100dvh !important;\n  max-height: 100vh !important;\n  max-height: 100dvh !important;\n  min-width: 100vw !important;\n  max-width: 100vw !important;\n  scroll-snap-align: start !important;\n  scroll-snap-stop: always !important;\n  position: relative !important;\n  overflow: hidden !important;\n  margin: 0 !important;\n  padding: 0 !important;\n  border: none !important;\n  border-radius: 0 !important;\n  background: #000000 !important;\n  box-sizing: border-box !important;\n}\n\n/* Ensure post media wrapper fills viewport */\nhtml.rr-active shreddit-post [slot=\"post-media-container\"],\nhtml.rr-active shreddit-post .media-container,\nhtml.rr-active shreddit-post shreddit-aspect-ratio,\nhtml.rr-active shreddit-post shreddit-player-2 {\n  position: absolute !important;\n  inset: 0 !important;\n  width: 100vw !important;\n  height: 100vh !important;\n  height: 100dvh !important;\n  max-width: 100vw !important;\n  max-height: 100vh !important;\n  max-height: 100dvh !important;\n  min-height: 100vh !important;\n  min-height: 100dvh !important;\n  --max-height: 100dvh !important;\n  --max-width: 100vw !important;\n  aspect-ratio: unset !important;\n  margin: 0 !important;\n  padding: 0 !important;\n  border-radius: 0 !important;\n  background: transparent !important;\n  display: flex !important;\n  align-items: center !important;\n  justify-content: center !important;\n  z-index: 5 !important;\n}\n\n/* Standalone Video, Iframe, and Single Image Sizing (Excluding Carousels) */\nhtml.rr-active shreddit-post video,\nhtml.rr-active shreddit-post iframe,\nhtml.rr-active shreddit-post .rr-embedded-iframe,\nhtml.rr-active shreddit-post:not(.rr-is-link):not(.rr-has-gallery):not(:has(gallery-carousel, faceplate-carousel)) img:not(.rr-link-card-thumb):not(.shreddit-subreddit-icon__icon):not(.post-background-image-filter) {\n  position: absolute !important;\n  inset: 0 !important;\n  width: 100% !important;\n  height: 100% !important;\n  max-width: 100vw !important;\n  max-height: 100vh !important;\n  max-height: 100dvh !important;\n  object-fit: contain !important;\n  background: transparent !important;\n  border: none !important;\n  z-index: 10 !important;\n}\n\n/* Unconstrain nested media containers and aspect-ratio wrappers inside shreddit-post (Excluding Carousels) */\nhtml.rr-active shreddit-post:not(.rr-has-gallery):not(:has(gallery-carousel, faceplate-carousel)) [data-aspect-ratio-container],\nhtml.rr-active shreddit-post:not(.rr-has-gallery):not(:has(gallery-carousel, faceplate-carousel)) [data-aspect-ratio-container] > div,\nhtml.rr-active shreddit-post:not(.rr-has-gallery):not(:has(gallery-carousel, faceplate-carousel)) shreddit-media-lightbox-listener,\nhtml.rr-active shreddit-post:not(.rr-has-gallery):not(:has(gallery-carousel, faceplate-carousel)) .media-lightbox-img {\n  width: 100% !important;\n  height: 100% !important;\n  max-width: 100vw !important;\n  max-height: 100vh !important;\n  max-height: 100dvh !important;\n  aspect-ratio: unset !important;\n  position: absolute !important;\n  inset: 0 !important;\n  margin: 0 !important;\n  padding: 0 !important;\n  border: none !important;\n  background: transparent !important;\n}\n\n/* Suppress crosspost leakages inside post-media-container */\nhtml.rr-active shreddit-post [slot=\"post-media-container\"] .crosspost-credit-bar,\nhtml.rr-active shreddit-post [slot=\"post-media-container\"] .crosspost-title,\nhtml.rr-active shreddit-post [slot=\"post-media-container\"] .post-background-image-filter,\nhtml.rr-active shreddit-post [slot=\"post-media-container\"] .text-secondary-plain-weak,\nhtml.rr-active shreddit-post [slot=\"post-media-container\"] div:has(> .text-secondary-plain-weak),\nhtml.rr-active shreddit-post [slot=\"post-media-container\"] > div > .crosspost-credit-bar,\nhtml.rr-active shreddit-post [slot=\"post-media-container\"] > div:not(:has(img, video, gallery-carousel, faceplate-carousel, shreddit-aspect-ratio, [data-aspect-ratio-container])),\nhtml.rr-active shreddit-post [slot=\"post-media-container\"] > .pointer-events-none.border-sm {\n  display: none !important;\n  visibility: hidden !important;\n}\n\n/* Vertical video full-bleed scaling: fills 100% width and height without letterbox bars */\nhtml.rr-active shreddit-post.rr-has-vertical-video video,\nhtml.rr-active shreddit-post video.rr-vertical-video,\nhtml.rr-active shreddit-post[data-vertical-video=\"true\"] video {\n  object-fit: cover !important;\n}\n\n/* User toggle overrides (Video and Single Image) - Supports all post containers */\nhtml.rr-active .rr-fit-contain video,\nhtml.rr-active .rr-fit-contain iframe,\nhtml.rr-active .rr-fit-contain img,\nhtml.rr-active shreddit-post.rr-fit-contain video,\nhtml.rr-active shreddit-post.rr-fit-contain iframe,\nhtml.rr-active shreddit-post.rr-fit-contain img {\n  object-fit: contain !important;\n}\n\nhtml.rr-active .rr-fit-cover video,\nhtml.rr-active .rr-fit-cover iframe,\nhtml.rr-active .rr-fit-cover img,\nhtml.rr-active shreddit-post.rr-fit-cover video,\nhtml.rr-active shreddit-post.rr-fit-cover iframe,\nhtml.rr-active shreddit-post.rr-fit-cover img {\n  object-fit: cover !important;\n}\n\n/* Subtitles / Closed Captions Suppression when disabled */\nhtml.rr-active.rr-hide-captions ::cue,\nhtml.rr-active shreddit-post.rr-hide-captions ::cue,\nhtml.rr-active.rr-hide-captions .captions-display,\nhtml.rr-active.rr-hide-captions [data-testid=\"captions\"],\nhtml.rr-active.rr-hide-captions shreddit-player-captions,\nhtml.rr-active.rr-hide-captions .caption-wrapper,\nhtml.rr-active.rr-hide-captions .caption-container,\nhtml.rr-active.rr-hide-captions [part=\"captions\"],\nhtml.rr-active shreddit-post.rr-hide-captions .captions-display,\nhtml.rr-active shreddit-post.rr-hide-captions [data-testid=\"captions\"],\nhtml.rr-active shreddit-post.rr-hide-captions shreddit-player-captions,\nhtml.rr-active shreddit-post.rr-hide-captions .caption-wrapper,\nhtml.rr-active shreddit-post.rr-hide-captions .caption-container,\nhtml.rr-active shreddit-post.rr-hide-captions [part=\"captions\"] {\n  display: none !important;\n  visibility: hidden !important;\n  opacity: 0 !important;\n}\n\n/* Suppress native Reddit UI in slides (vote slots use off-screen hiding so proxy clicks work) */\nhtml.rr-active shreddit-post [slot=\"credit-bar\"],\nhtml.rr-active shreddit-post [slot=\"post-credit-bar\"],\nhtml.rr-active shreddit-post [slot=\"title-and-metadata\"],\nhtml.rr-active shreddit-post [slot=\"title\"],\nhtml.rr-active shreddit-post [slot=\"action-row\"],\nhtml.rr-active shreddit-post [slot=\"text-body\"],\nhtml.rr-active shreddit-post shreddit-post-action-row,\nhtml.rr-active shreddit-post feed-post-action-row,\nhtml.rr-active shreddit-post shreddit-post-credit-bar,\nhtml.rr-active shreddit-post shreddit-action-bar,\nhtml.rr-active shreddit-post rpl-action-bar,\nhtml.rr-active shreddit-post shreddit-interaction-container,\nhtml.rr-active shreddit-post faceplate-tracker,\nhtml.rr-active .rr-native-suppressed {\n  display: none !important;\n  visibility: hidden !important;\n}\n\n/* Vote targets stay in DOM and clickable via proxy (off-screen, not display:none) */\nhtml.rr-active shreddit-post [slot=\"vote\"],\nhtml.rr-active shreddit-post [slot=\"vote-button\"],\nhtml.rr-active shreddit-post shreddit-post-vote-control,\nhtml.rr-active shreddit-post [data-testid=\"post-vote-control\"],\nhtml.rr-active .rr-native-offscreen {\n  position: absolute !important;\n  width: 1px !important;\n  height: 1px !important;\n  opacity: 0 !important;\n  pointer-events: none !important;\n  overflow: hidden !important;\n}\n\n/* Bare media taps must not navigate: only explicit overlay/card buttons open URLs */\nhtml.rr-active shreddit-post a:not(.rr-sub-badge):not(.rr-author):not(.rr-link-card-btn):not(.rr-text-card-body a),\nhtml.rr-active shreddit-post a[data-click-id=\"body\"],\nhtml.rr-active shreddit-post a[slot=\"full-post-link\"],\nhtml.rr-active shreddit-post a[href*=\"/comments/\"],\nhtml.rr-active shreddit-post [slot=\"post-media-container\"] a,\nhtml.rr-active shreddit-post shreddit-media-lightbox-listener a {\n  pointer-events: none !important;\n}\n\nhtml.rr-active .rr-post-overlay a,\nhtml.rr-active .rr-link-card-container a,\nhtml.rr-active .rr-text-card-container a {\n  pointer-events: auto !important;\n}\n\n/* Videos-only filter: scoped under html.rr-active so exit automatically restores visibility */\nhtml.rr-active shreddit-post.rr-filtered-out,\nhtml.rr-active article.rr-filtered-out,\nhtml.rr-active div.rr-filtered-out {\n  display: none !important;\n}\n\n/* Hide any injected iframes or videos when Reel Mode is inactive */\n.rr-embedded-iframe,\n.rr-embedded-video {\n  display: none !important;\n}\n\nhtml.rr-active .rr-embedded-video {\n  display: block !important;\n  width: 100% !important;\n  height: 100% !important;\n  max-width: 100vw !important;\n  max-height: 100vh !important;\n  max-height: 100dvh !important;\n  object-fit: contain !important;\n  background: #000000 !important;\n}\n\nhtml.rr-active .rr-embedded-iframe {\n  display: block !important;\n}\n\n/* Empty feed state */\nhtml.rr-active .rr-empty-feed {\n  display: flex !important;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  height: 100vh !important;\n  height: 100dvh !important;\n  width: 100vw !important;\n  color: #a0a0a0;\n  font-size: 16px;\n  font-weight: 500;\n  text-align: center;\n  padding: 24px;\n  box-sizing: border-box;\n}\n/* =========================================================\n   Multiple-Image Gallery & Carousel Fullscreen Layout\n   ========================================================= */\n\nhtml.rr-active shreddit-post gallery-carousel,\nhtml.rr-active shreddit-post faceplate-carousel,\nhtml.rr-active shreddit-post.rr-has-gallery shreddit-async-loader,\nhtml.rr-active shreddit-post shreddit-async-loader:has(gallery-carousel, faceplate-carousel),\nhtml.rr-active shreddit-post [data-testid=\"media-gallery\"] {\n  position: absolute !important;\n  inset: 0 !important;\n  width: 100% !important;\n  height: 100% !important;\n  max-width: 100% !important;\n  max-height: 100% !important;\n  --gallery-initial-height: 100% !important;\n  display: block !important;\n  overflow: hidden !important;\n  z-index: 6 !important;\n  background: #000000 !important;\n  touch-action: pan-x pan-y !important;\n}\n\nhtml.rr-active shreddit-post gallery-carousel ul[slot=\"items\"],\nhtml.rr-active shreddit-post faceplate-carousel ul[slot=\"items\"],\nhtml.rr-active shreddit-post gallery-carousel .carousel-items,\nhtml.rr-active shreddit-post faceplate-carousel .carousel-items {\n  display: flex !important;\n  flex-direction: row !important;\n  flex-wrap: nowrap !important;\n  height: 100% !important;\n  width: 100% !important;\n  margin: 0 !important;\n  padding: 0 !important;\n  align-items: center !important;\n  list-style: none !important;\n  overflow-x: auto !important;\n  overflow-y: hidden !important;\n  scroll-snap-type: x mandatory !important;\n  scroll-behavior: smooth !important;\n  scrollbar-width: none !important;\n  touch-action: pan-x pan-y !important;\n}\n\nhtml.rr-active shreddit-post gallery-carousel ul::-webkit-scrollbar,\nhtml.rr-active shreddit-post faceplate-carousel ul::-webkit-scrollbar {\n  display: none !important;\n}\n\nhtml.rr-active shreddit-post gallery-carousel ul[slot=\"items\"] > li,\nhtml.rr-active shreddit-post faceplate-carousel ul[slot=\"items\"] > li,\nhtml.rr-active shreddit-post gallery-carousel .carousel-item,\nhtml.rr-active shreddit-post faceplate-carousel .carousel-item {\n  flex: 0 0 100% !important;\n  flex-shrink: 0 !important;\n  width: 100% !important;\n  min-width: 100% !important;\n  max-width: 100% !important;\n  height: 100% !important;\n  max-height: 100% !important;\n  display: flex !important;\n  align-items: center !important;\n  justify-content: center !important;\n  position: relative !important;\n  scroll-snap-align: center !important;\n  scroll-snap-stop: always !important;\n  overflow: hidden !important;\n  margin: 0 !important;\n  padding: 0 !important;\n  box-sizing: border-box !important;\n  touch-action: pan-x pan-y !important;\n}\n\nhtml.rr-active shreddit-post gallery-carousel figure,\nhtml.rr-active shreddit-post faceplate-carousel figure,\nhtml.rr-active shreddit-post gallery-carousel [data-aspect-ratio-container],\nhtml.rr-active shreddit-post faceplate-carousel [data-aspect-ratio-container] {\n  width: 100% !important;\n  height: 100% !important;\n  max-width: 100% !important;\n  max-height: 100% !important;\n  margin: 0 !important;\n  padding: 0 !important;\n  display: flex !important;\n  align-items: center !important;\n  justify-content: center !important;\n  position: relative !important;\n}\n\nhtml.rr-active shreddit-post gallery-carousel img:not(.post-background-image-filter):not(.shreddit-subreddit-icon__icon),\nhtml.rr-active shreddit-post faceplate-carousel img:not(.post-background-image-filter):not(.shreddit-subreddit-icon__icon),\nhtml.rr-active shreddit-post gallery-carousel .media-lightbox-img,\nhtml.rr-active shreddit-post faceplate-carousel .media-lightbox-img {\n  position: relative !important;\n  inset: auto !important;\n  max-width: 100% !important;\n  max-height: 100% !important;\n  width: auto !important;\n  height: auto !important;\n  object-fit: contain !important;\n  display: block !important;\n  margin: auto !important;\n  visibility: visible !important;\n  opacity: 1 !important;\n}\n\n/* Blurred backdrop copies must never cover the real slide (black-screen cause) */\nhtml.rr-active shreddit-post gallery-carousel img.post-background-image-filter,\nhtml.rr-active shreddit-post faceplate-carousel img.post-background-image-filter,\nhtml.rr-active shreddit-post gallery-carousel [class*=\"background-image-filter\"],\nhtml.rr-active shreddit-post faceplate-carousel [class*=\"background-image-filter\"] {\n  display: none !important;\n  visibility: hidden !important;\n}\n\n/* Gallery image alt-text / caption badges (\"[Image 1]\") are always suppressed\n   in Reel Mode. They are image metadata, NOT video subtitles, so the CC toggle\n   must never unhide them. Scoped to carousels (and away from video slides) so\n   real video caption layers elsewhere are unaffected. */\nhtml.rr-active shreddit-post gallery-carousel figcaption,\nhtml.rr-active shreddit-post faceplate-carousel figcaption,\nhtml.rr-active shreddit-post gallery-carousel [slot=\"caption\"],\nhtml.rr-active shreddit-post faceplate-carousel [slot=\"caption\"],\nhtml.rr-active shreddit-post gallery-carousel .gallery-caption,\nhtml.rr-active shreddit-post faceplate-carousel .gallery-caption,\nhtml.rr-active shreddit-post gallery-carousel .image-caption,\nhtml.rr-active shreddit-post faceplate-carousel .image-caption,\nhtml.rr-active shreddit-post gallery-carousel [data-testid*=\"alt-text\" i],\nhtml.rr-active shreddit-post faceplate-carousel [data-testid*=\"alt-text\" i],\nhtml.rr-active shreddit-post gallery-carousel li:not(:has(video)) [data-testid*=\"caption\" i],\nhtml.rr-active shreddit-post faceplate-carousel li:not(:has(video)) [data-testid*=\"caption\" i] {\n  display: none !important;\n  visibility: hidden !important;\n}\n\n/* Horizontal slide buttons for gallery */\nhtml.rr-active shreddit-post gallery-carousel button[slot=\"previous-button\"],\nhtml.rr-active shreddit-post gallery-carousel button[slot=\"next-button\"],\nhtml.rr-active shreddit-post faceplate-carousel button[slot=\"previous-button\"],\nhtml.rr-active shreddit-post faceplate-carousel button[slot=\"next-button\"],\nhtml.rr-active shreddit-post button.prev-btn,\nhtml.rr-active shreddit-post button.next-btn {\n  position: absolute !important;\n  top: 50% !important;\n  transform: translateY(-50%) !important;\n  z-index: 25 !important;\n  background: rgba(18, 22, 30, 0.65) !important;\n  border: 1px solid rgba(255, 255, 255, 0.15) !important;\n  color: #ffffff !important;\n  width: 44px !important;\n  height: 44px !important;\n  border-radius: 9999px !important;\n  display: flex !important;\n  align-items: center !important;\n  justify-content: center !important;\n  cursor: pointer !important;\n  opacity: 0.8 !important;\n  transition: opacity 0.15s ease, background 0.15s ease !important;\n}\n\nhtml.rr-active shreddit-post gallery-carousel button[slot=\"previous-button\"]:hover,\nhtml.rr-active shreddit-post gallery-carousel button[slot=\"next-button\"]:hover,\nhtml.rr-active shreddit-post faceplate-carousel button[slot=\"previous-button\"]:hover,\nhtml.rr-active shreddit-post faceplate-carousel button[slot=\"next-button\"]:hover,\nhtml.rr-active shreddit-post button.prev-btn:hover,\nhtml.rr-active shreddit-post button.next-btn:hover {\n  opacity: 1 !important;\n  background: rgba(18, 22, 30, 0.9) !important;\n}\n\n/* Hide disabled navigation buttons at carousel boundaries */\nhtml.rr-active shreddit-post gallery-carousel button[disabled],\nhtml.rr-active shreddit-post faceplate-carousel button[disabled],\nhtml.rr-active shreddit-post gallery-carousel button[aria-disabled=\"true\"],\nhtml.rr-active shreddit-post faceplate-carousel button[aria-disabled=\"true\"],\nhtml.rr-active shreddit-post button.prev-btn[disabled],\nhtml.rr-active shreddit-post button.next-btn[disabled] {\n  display: none !important;\n  opacity: 0 !important;\n  pointer-events: none !important;\n}\n\nhtml.rr-active shreddit-post button[slot=\"previous-button\"],\nhtml.rr-active shreddit-post button.prev-btn {\n  left: 16px !important;\n}\n\nhtml.rr-active shreddit-post button[slot=\"next-button\"],\nhtml.rr-active shreddit-post button.next-btn {\n  right: 16px !important;\n}\n\n/* Pagination dots indicators */\nhtml.rr-active shreddit-post gallery-carousel [slot=\"indicators\"],\nhtml.rr-active shreddit-post faceplate-carousel [slot=\"indicators\"],\nhtml.rr-active shreddit-post gallery-carousel [slot=\"dots\"],\nhtml.rr-active shreddit-post faceplate-carousel [slot=\"dots\"],\nhtml.rr-active shreddit-post gallery-carousel [part=\"indicators\"],\nhtml.rr-active shreddit-post faceplate-carousel [part=\"indicators\"],\nhtml.rr-active shreddit-post gallery-carousel .carousel-indicators,\nhtml.rr-active shreddit-post faceplate-carousel .carousel-indicators {\n  position: absolute !important;\n  bottom: calc(85px + env(safe-area-inset-bottom, 0px)) !important;\n  left: 50% !important;\n  transform: translateX(-50%) !important;\n  z-index: 22 !important;\n  display: flex !important;\n  justify-content: center !important;\n  align-items: center !important;\n  pointer-events: auto !important;\n}\n/* =========================================================\n   Post Overlay (Metadata & Action Rail)\n   ========================================================= */\n\n/* Ensure overlay is completely hidden by default when Reel Mode is inactive */\n.rr-post-overlay {\n  display: none !important;\n  visibility: hidden !important;\n}\n\nhtml.rr-active .rr-post-overlay {\n  position: absolute !important;\n  inset: 0 !important;\n  z-index: 20 !important;\n  pointer-events: none !important;\n  display: flex !important;\n  visibility: visible !important;\n  flex-direction: column !important;\n  justify-content: space-between !important;\n  padding: 16px !important;\n  box-sizing: border-box !important;\n  background: linear-gradient(\n    to bottom,\n    rgba(0, 0, 0, 0.3) 0%,\n    transparent 15%,\n    transparent 70%,\n    rgba(0, 0, 0, 0.55) 100%\n  ) !important;\n}\n\n/* Bottom Left: Post Metadata */\n.rr-post-info {\n  position: absolute !important;\n  bottom: calc(24px + env(safe-area-inset-bottom, 0px)) !important;\n  left: 16px !important;\n  right: 76px !important;\n  display: flex !important;\n  flex-direction: column !important;\n  gap: 6px !important;\n  pointer-events: auto !important;\n  z-index: 25 !important;\n}\n\n.rr-post-meta {\n  display: flex !important;\n  flex-direction: row !important;\n  align-items: center !important;\n  gap: 6px !important;\n  min-width: 0 !important;\n  max-width: 100% !important;\n  flex-wrap: nowrap !important;\n}\n\n.rr-sub-badge {\n  display: inline-flex !important;\n  align-items: center !important;\n  flex-shrink: 0 !important;\n  background: #202126 !important;\n  border: 1px solid #30323a !important;\n  border-radius: 9999px !important;\n  padding: 3px 9px !important;\n  color: #ff6b35 !important;\n  font-family: var(--rr-font-stack) !important;\n  font-size: 11px !important;\n  font-weight: 700 !important;\n  letter-spacing: 0.2px !important;\n  cursor: pointer !important;\n  user-select: none !important;\n  transition: background 0.15s ease, border-color 0.15s ease !important;\n}\n\n.rr-sub-badge:hover {\n  background: #2c2e35 !important;\n  border-color: #444752 !important;\n}\n\n.rr-dot {\n  flex-shrink: 0 !important;\n  color: rgba(255, 255, 255, 0.5) !important;\n  font-weight: 700 !important;\n  font-size: 11px !important;\n  user-select: none !important;\n}\n\n/* Author Username: clickable link, single-line with ellipsis */\n.rr-author {\n  display: inline-block !important;\n  flex-shrink: 1 !important;\n  min-width: 0 !important;\n  white-space: nowrap !important;\n  overflow: hidden !important;\n  text-overflow: ellipsis !important;\n  color: rgba(255, 255, 255, 0.78) !important;\n  font-family: var(--rr-font-stack) !important;\n  font-size: 12px !important;\n  font-weight: 500 !important;\n  pointer-events: auto !important;\n  cursor: pointer !important;\n  user-select: text !important;\n  text-decoration: none !important;\n  transition: color 0.15s ease, text-decoration 0.15s ease !important;\n}\n\n.rr-author:hover {\n  color: #ffffff !important;\n  text-decoration: underline !important;\n}\n\n/* Post Title */\n.rr-post-title {\n  color: #ffffff !important;\n  font-family: var(--rr-font-stack) !important;\n  font-size: 15px !important;\n  font-weight: 600 !important;\n  line-height: 1.4 !important;\n  letter-spacing: -0.015em !important;\n  display: -webkit-box !important;\n  -webkit-line-clamp: 2 !important;\n  -webkit-box-orient: vertical !important;\n  overflow: hidden !important;\n  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7) !important;\n}\n\n/* Bottom Right: Vertical Action Rail */\n.rr-action-rail {\n  position: absolute !important;\n  bottom: calc(24px + env(safe-area-inset-bottom, 0px)) !important;\n  right: 14px !important;\n  display: flex !important;\n  flex-direction: column !important;\n  align-items: center !important;\n  gap: 14px !important;\n  pointer-events: auto !important;\n  z-index: 25 !important;\n}\n\n.rr-action-item {\n  display: flex !important;\n  flex-direction: column !important;\n  align-items: center !important;\n  gap: 3px !important;\n}\n\n.rr-action-btn {\n  width: 44px !important;\n  height: 44px !important;\n  border-radius: 9999px !important;\n  background: #1c1d22 !important;\n  border: 1px solid #30323a !important;\n  color: #ffffff !important;\n  display: flex !important;\n  align-items: center !important;\n  justify-content: center !important;\n  cursor: pointer !important;\n  padding: 0 !important;\n  outline: none !important;\n  transition: background 0.15s ease, transform 0.12s ease !important;\n  -webkit-tap-highlight-color: transparent !important;\n}\n\n.rr-action-btn:hover {\n  background: #282a32 !important;\n}\n\n.rr-action-btn:active {\n  transform: scale(0.92) !important;\n}\n\n.rr-action-label {\n  font-family: var(--rr-font-stack) !important;\n  font-size: 11px !important;\n  font-weight: 700 !important;\n  color: #ffffff !important;\n  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8) !important;\n  user-select: none !important;\n}\n\n/* Integrated Vote Group Cluster */\n.rr-vote-group {\n  display: flex !important;\n  flex-direction: column !important;\n  align-items: center !important;\n  background: #181a1f !important;\n  border: 1px solid #282a32 !important;\n  border-radius: 9999px !important;\n  padding: 4px !important;\n  gap: 2px !important;\n}\n\n.rr-vote-group .rr-action-btn {\n  background: transparent !important;\n  border: none !important;\n  box-shadow: none !important;\n  width: 44px !important;\n  height: 44px !important;\n  min-width: 44px !important;\n  min-height: 44px !important;\n  color: #9a9ca6 !important;\n}\n\n.rr-vote-group .rr-action-btn:hover {\n  color: #ffffff !important;\n  background: rgba(255, 255, 255, 0.08) !important;\n}\n\n.rr-vote-group .rr-score-label {\n  font-family: var(--rr-font-stack) !important;\n  font-size: 12px !important;\n  font-weight: 700 !important;\n  color: #ffffff !important;\n  padding: 1px 0 !important;\n  line-height: 1 !important;\n}\n\n.rr-upvote-btn.is-active-up {\n  color: #ff4500 !important;\n}\n\n.rr-downvote-btn.is-active-down {\n  color: #7193ff !important;\n}\n\n/* CC on (enabled): plain white icon on the standard dark pill.\n   CC off (disabled): dimmed grey icon. No accent color. */\n.rr-action-btn.rr-cc-btn.is-active-cc {\n  background: #1c1d22 !important;\n  border-color: #565a66 !important;\n  color: #ffffff !important;\n}\n\n.rr-action-btn.rr-cc-btn:not(.is-active-cc) {\n  color: #888d99 !important;\n}\n\n/* Video posts: lift info + rail above Reddit's native player control bar */\nhtml.rr-active shreddit-post.rr-has-video .rr-post-info,\nhtml.rr-active shreddit-post.rr-has-video .rr-action-rail {\n  bottom: calc(72px + env(safe-area-inset-bottom, 0px)) !important;\n}\n\n/* Sound toggle: muted is dimmed grey, unmuted plain white */\n.rr-action-btn.rr-sound-btn.is-muted {\n  color: #888d99 !important;\n}\n/* By default, card containers are hidden when Reel Mode is inactive */\n.rr-text-card-container,\n.rr-link-card-container {\n  display: none !important;\n}\n\n/* When Reel Mode is active, display as full-bleed centered overlay */\nhtml.rr-active .rr-text-card-container {\n  display: flex !important;\n  position: absolute !important;\n  inset: 0 !important;\n  width: 100% !important;\n  height: 100% !important;\n  align-items: center !important;\n  justify-content: center !important;\n  z-index: 15 !important;\n  overflow: hidden !important;\n  pointer-events: auto !important;\n  box-sizing: border-box !important;\n  padding: 16px !important;\n}\n\n@media (min-width: 769px) {\n  html.rr-active .rr-text-card-container {\n    padding: 32px !important;\n  }\n}\n\nhtml.rr-active .rr-text-card {\n  position: relative !important;\n  z-index: 2 !important;\n  width: 100% !important;\n  max-width: 480px !important;\n  max-height: calc(100dvh - 120px) !important;\n  background: #141518 !important;\n  border: 1px solid #28292e !important;\n  border-radius: 16px !important;\n  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6) !important;\n  overflow: hidden !important;\n  display: flex !important;\n  flex-direction: column !important;\n  cursor: default !important;\n  transition: border-color 0.15s ease !important;\n  padding: 20px !important;\n  gap: 12px !important;\n  margin: 0 auto !important;\n  box-sizing: border-box !important;\n  user-select: text !important;\n  -webkit-tap-highlight-color: transparent !important;\n}\n\n.rr-text-card:hover {\n  border-color: #383a42 !important;\n}\n\n.rr-text-card-header {\n  display: flex !important;\n  align-items: center !important;\n  justify-content: space-between !important;\n  gap: 8px !important;\n}\n\n.rr-text-pill {\n  display: inline-flex !important;\n  align-items: center !important;\n  gap: 6px !important;\n  background: #202126 !important;\n  border: 1px solid #30323a !important;\n  border-radius: 9999px !important;\n  padding: 3px 9px !important;\n  font-size: 11px !important;\n  font-weight: 700 !important;\n  color: #9a9ca6 !important;\n  letter-spacing: 0.3px !important;\n  text-transform: uppercase !important;\n}\n\n.rr-text-open-btn {\n  display: inline-flex !important;\n  align-items: center !important;\n  gap: 5px !important;\n  background: #202126 !important;\n  border: 1px solid #30323a !important;\n  border-radius: 9999px !important;\n  padding: 3px 10px !important;\n  font-family: var(--rr-font-stack) !important;\n  font-size: 11px !important;\n  font-weight: 600 !important;\n  color: #c5c7d0 !important;\n  text-decoration: none !important;\n  cursor: pointer !important;\n  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease !important;\n}\n\n.rr-text-open-btn:hover {\n  background: #2c2e35 !important;\n  color: #ffffff !important;\n  border-color: #444752 !important;\n}\n\n.rr-text-card-title {\n  margin: 0 !important;\n  font-family: var(--rr-font-stack) !important;\n  font-size: 17px !important;\n  font-weight: 700 !important;\n  color: #ffffff !important;\n  line-height: 1.35 !important;\n  letter-spacing: -0.015em !important;\n}\n\n.rr-text-card-body {\n  font-family: var(--rr-font-stack) !important;\n  font-size: 14px !important;\n  line-height: 1.65 !important;\n  color: #c5c7d0 !important;\n  overflow-y: auto !important;\n  max-height: calc(100dvh - 220px) !important;\n  padding-right: 6px !important;\n  scrollbar-width: thin !important;\n  scrollbar-color: #383a42 transparent !important;\n  display: flex !important;\n  flex-direction: column !important;\n  gap: 10px !important;\n  overscroll-behavior: contain !important;\n  -webkit-overflow-scrolling: touch !important;\n  touch-action: pan-y !important;\n}\n\n.rr-text-card-body p {\n  margin: 0 !important;\n}\n\n/* =========================================================\n   External Web Link Card\n   ========================================================= */\n\nhtml.rr-active .rr-link-card-container {\n  position: absolute !important;\n  inset: 0 !important;\n  width: 100% !important;\n  height: 100% !important;\n  display: flex !important;\n  align-items: center !important;\n  justify-content: center !important;\n  z-index: 15 !important;\n  overflow: hidden !important;\n  pointer-events: auto !important;\n  box-sizing: border-box !important;\n  padding: 16px !important;\n}\n\n@media (min-width: 769px) {\n  html.rr-active .rr-link-card-container {\n    padding: 32px !important;\n  }\n}\n\nhtml.rr-active .rr-link-card {\n  position: relative !important;\n  z-index: 2 !important;\n  width: 100% !important;\n  max-width: 440px !important;\n  background: #141518 !important;\n  border: 1px solid #28292e !important;\n  border-radius: 16px !important;\n  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6) !important;\n  overflow: hidden !important;\n  display: flex !important;\n  flex-direction: column !important;\n  cursor: pointer !important;\n  transition: transform 0.15s ease, border-color 0.15s ease !important;\n  padding: 16px !important;\n  gap: 12px !important;\n  margin: 0 auto !important;\n  box-sizing: border-box !important;\n  user-select: none !important;\n  -webkit-tap-highlight-color: transparent !important;\n}\n\n.rr-link-card:hover {\n  transform: translateY(-2px) !important;\n  border-color: #383a42 !important;\n}\n\n.rr-link-card:active {\n  transform: scale(0.98) !important;\n}\n\n.rr-link-card-thumb-wrap {\n  width: 100% !important;\n  height: 190px !important;\n  border-radius: 10px !important;\n  overflow: hidden !important;\n  position: relative !important;\n  background: #1c1d22 !important;\n}\n\n.rr-link-card-thumb {\n  width: 100% !important;\n  height: 100% !important;\n  object-fit: cover !important;\n  display: block !important;\n}\n\n.rr-link-card-body {\n  display: flex !important;\n  flex-direction: column !important;\n  gap: 8px !important;\n}\n\n.rr-link-card-domain {\n  display: inline-flex !important;\n  align-items: center !important;\n  gap: 6px !important;\n  background: #202126 !important;\n  border: 1px solid #30323a !important;\n  border-radius: 9999px !important;\n  padding: 3px 9px !important;\n  font-size: 11px !important;\n  font-weight: 700 !important;\n  color: #ff6b35 !important;\n  letter-spacing: 0.3px !important;\n  text-transform: lowercase !important;\n}\n\n.rr-link-card-title {\n  margin: 0 !important;\n  font-family: var(--rr-font-stack) !important;\n  font-size: 15px !important;\n  font-weight: 700 !important;\n  color: #ffffff !important;\n  line-height: 1.35 !important;\n  letter-spacing: -0.015em !important;\n  display: -webkit-box !important;\n  -webkit-line-clamp: 3 !important;\n  -webkit-box-orient: vertical !important;\n  overflow: hidden !important;\n}\n\n.rr-link-card-cta {\n  display: inline-flex !important;\n  align-items: center !important;\n  justify-content: center !important;\n  gap: 8px !important;\n  width: 100% !important;\n  padding: 10px 16px !important;\n  margin-top: 4px !important;\n  border-radius: 10px !important;\n  background: #ff4500 !important;\n  color: #ffffff !important;\n  font-family: var(--rr-font-stack) !important;\n  font-size: 13px !important;\n  font-weight: 700 !important;\n  border: none !important;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;\n  cursor: pointer !important;\n  transition: opacity 0.15s ease !important;\n}\n\n.rr-link-card-cta:hover {\n  opacity: 0.9 !important;\n}\n\n.rr-link-card-cta:active {\n  transform: scale(0.97) !important;\n}\n\n/* =========================================================\n   Reel / list toggle and videos-only filter inside Reddit's header\n   ========================================================= */\n\n.rr-header-cluster {\n  display: inline-flex !important;\n  align-items: center !important;\n  gap: 6px !important;\n  margin: 0 6px !important;\n  flex-shrink: 0 !important;\n}\n\n.rr-header-cluster.is-floating {\n  position: fixed !important;\n  top: calc(10px + env(safe-area-inset-top, 0px)) !important;\n  right: calc(12px + env(safe-area-inset-right, 0px)) !important;\n  z-index: var(--rr-z-overlay) !important;\n  margin: 0 !important;\n}\n\n.rr-header-btn {\n  width: 40px !important;\n  height: 40px !important;\n  border-radius: 9999px !important;\n  background: #1c1d22 !important;\n  border: 1px solid #30323a !important;\n  color: #ffffff !important;\n  display: inline-flex !important;\n  align-items: center !important;\n  justify-content: center !important;\n  padding: 0 !important;\n  cursor: pointer !important;\n  outline: none !important;\n  -webkit-tap-highlight-color: transparent !important;\n  transition: background 0.15s ease, transform 0.12s ease !important;\n}\n\n.rr-header-btn:hover {\n  background: #282a32 !important;\n}\n\n.rr-header-btn:active {\n  transform: scale(0.92) !important;\n}\n\n.rr-header-btn:focus-visible {\n  box-shadow: 0 0 0 2px #ff4500 !important;\n}\n\n/* Filter only makes sense while the reel layout is on */\n.rr-header-filter {\n  display: none !important;\n}\n\nhtml.rr-active .rr-header-filter {\n  display: inline-flex !important;\n}\n\n.rr-header-filter.is-active {\n  background: #2c1a16 !important;\n  border-color: #ff4500 !important;\n  color: #ff6b35 !important;\n}\n");
	function showPlayPulse(isPlaying) {
		const existing = document.querySelector(".rr-play-pulse");
		if (existing) existing.remove();
		const pulse = document.createElement("div");
		pulse.className = "rr-play-pulse";
		pulse.innerHTML = isPlaying ? `<svg width="44" height="44" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>` : `<svg width="44" height="44" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
		document.body.appendChild(pulse);
		setTimeout(() => pulse.remove(), 550);
	}
	function showScalePulse(mode) {
		const existing = document.querySelector(".rr-scale-pulse");
		if (existing) existing.remove();
		const pulse = document.createElement("div");
		pulse.className = "rr-scale-pulse";
		pulse.textContent = mode;
		document.body.appendChild(pulse);
		setTimeout(() => pulse.remove(), 650);
	}
	function showVotePulse(upvoted) {
		const existing = document.querySelector(".rr-play-pulse");
		if (existing) existing.remove();
		if (upvoted === null) {
			const pulse = document.createElement("div");
			pulse.className = "rr-play-pulse";
			pulse.innerHTML = `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7.5-4.9-10-9.5C.4 8.6 2.4 5 5.8 5c2 0 3.4 1.1 4.2 2.3h4C14.8 6.1 16.2 5 18.2 5c3.4 0 5.4 3.6 3.8 6.5C19.5 16.1 12 21 12 21z" transform="scale(0.9) translate(1.3,1.3)"></path></svg>`;
			document.body.appendChild(pulse);
			setTimeout(() => pulse.remove(), 550);
			return;
		}
		const pulse = document.createElement("div");
		pulse.className = "rr-play-pulse";
		pulse.innerHTML = upvoted ? `<svg width="44" height="44" viewBox="0 0 24 24" fill="#ff4500"><path d="M12 21s-7.5-4.9-10-9.5C.4 8.6 2.4 5 5.8 5c2 0 3.4 1.1 4.2 2.3h4C14.8 6.1 16.2 5 18.2 5c3.4 0 5.4 3.6 3.8 6.5C19.5 16.1 12 21 12 21z" transform="scale(0.9) translate(1.3,1.3)"></path></svg>` : `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#7193ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
		document.body.appendChild(pulse);
		setTimeout(() => pulse.remove(), 550);
	}
	function showVolumePulse(level, muted) {
		const existing = document.querySelector(".rr-scale-pulse");
		if (existing) existing.remove();
		const pct = Math.round(level * 100);
		const pulse = document.createElement("div");
		pulse.className = "rr-scale-pulse";
		pulse.textContent = muted || pct === 0 ? "Muted" : `Volume ${pct}%`;
		document.body.appendChild(pulse);
		setTimeout(() => pulse.remove(), 650);
	}
	var POST_SELECTORS$1 = "shreddit-post, article, [data-testid=\"post-container\"], .Post";
	var VOLUME_STEP = .1;
	var TAP_WINDOW_MS = 320;
	var SWIPE_CANCEL_PX = 10;
	var InputController = class {
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
					} else this.downActive = false;
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
			if (!this.options.isReelModeActive()) return;
			showPlayPulse(audioManager.togglePlayback(post));
		}
		toggleFitFill(post) {
			if (post.classList.contains("rr-fit-contain")) {
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
			if (!this.options.isReelModeActive()) return;
			if (!e.isTrusted) return;
			const target = e.target;
			if (target.closest(".rr-action-rail, .rr-post-info, .rr-header-cluster, .rr-link-card-container, .rr-sub-badge, .rr-author, .rr-link-card-btn, button[slot=\"previous-button\"], button[slot=\"next-button\"], .prev-btn, .next-btn")) return;
			if (this.isNativeControl(e)) return;
			if (target.closest(".rr-text-card-body a")) return;
			const post = target.closest(POST_SELECTORS$1);
			if (!post) return;
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
			if (now - this.lastTapTimestamp < TAP_WINDOW_MS && samePost) this.tapCount += 1;
			else this.tapCount = 1;
			this.lastTapTimestamp = now;
			this.lastTapPost = post;
			if (this.tapCount === 2) {
				if (this.singleTapTimer) {
					clearTimeout(this.singleTapTimer);
					this.singleTapTimer = null;
				}
				this.resetTapState();
				if (this.options.onDoubleTap) this.options.onDoubleTap(post);
				else this.toggleFitFill(post);
				return;
			}
			if (this.singleTapTimer) clearTimeout(this.singleTapTimer);
			this.singleTapTimer = setTimeout(() => {
				this.singleTapTimer = null;
				this.resetTapState();
				this.fireSingleTap(post);
			}, TAP_WINDOW_MS);
		}
		isNativeControl(e) {
			try {
				const path = e.composedPath();
				for (const node of path) {
					const tag = node.tagName?.toLowerCase?.();
					if (!tag) continue;
					if (tag === "shreddit-post" || tag === "article") break;
					if (tag === "button" || tag === "input" || tag === "select" || tag.includes("controls")) return true;
					const role = node.getAttribute?.("role");
					if (role === "slider" || role === "button" || role === "menuitem") return true;
				}
			} catch {}
			return false;
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
			if (!this.options.isReelModeActive()) return;
			const target = e.target;
			if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
			if (e.key === "Escape") this.options.onExit();
			else if (e.key === "m" || e.key === "M") this.options.onToggleMute();
			else if (e.key === "f" || e.key === "F") {
				const post = this.options.getActivePost();
				if (post) this.toggleFitFill(post);
			} else if (e.key === "+" || e.key === "=" || e.shiftKey && e.key === "ArrowUp") {
				e.preventDefault();
				this.changeVolume(VOLUME_STEP);
			} else if (e.key === "-" || e.key === "_" || e.shiftKey && e.key === "ArrowDown") {
				e.preventDefault();
				this.changeVolume(-.1);
			} else if (e.key === "c" || e.key === "C") this.options.onToggleSubtitles?.();
			else if (e.key === "j" || e.key === "J" || !e.shiftKey && e.key === "ArrowDown") {
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
			const level = audioManager.adjustVolume(delta, post || void 0);
			audioManager.reassertActiveIframeUnmute();
			showVolumePulse(level, audioManager.isMuted);
			this.options.onVolumeChange?.(level, audioManager.isMuted);
		}
	};
	function formatCount(num) {
		if (!num || isNaN(num)) return "0";
		if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, "") + "m";
		if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
		return num.toString();
	}
	function escapeHtml(str) {
		if (!str) return "";
		return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
	}
	function extractDomain(url) {
		if (!url) return "";
		try {
			return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
		} catch {
			return url.replace(/^https?:\/\//, "").split("/")[0];
		}
	}
	function isSafeUrl(url) {
		if (!url || typeof url !== "string") return false;
		const trimmed = url.trim();
		if (!trimmed) return false;
		try {
			const base = typeof location !== "undefined" ? location.origin : "https://www.reddit.com";
			const parsed = new URL(trimmed, base);
			return parsed.protocol === "http:" || parsed.protocol === "https:";
		} catch {
			return false;
		}
	}
	function sanitizeUrl(url, fallback = "") {
		return isSafeUrl(url) ? url.trim() : fallback;
	}
	function openUrl(url) {
		if (!url || !isSafeUrl(url)) return;
		const safe = sanitizeUrl(url);
		if (!window.open(safe, "_blank", "noopener,noreferrer")) window.location.href = safe;
	}
	function renderTextCard(postEl, post) {
		if (postEl.querySelector(".rr-text-card-container")) return;
		const targetUrl = sanitizeUrl(post.permalink ? post.permalink.startsWith("http") ? post.permalink : `https://www.reddit.com${post.permalink}` : post.contentHref || "");
		const container = document.createElement("div");
		container.className = "rr-text-card-container";
		let rawBody = (post.textBody || "").trim();
		if (post.title) {
			const trimmedTitle = post.title.trim();
			if (rawBody.startsWith(trimmedTitle)) rawBody = rawBody.slice(trimmedTitle.length).trim();
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
      <h2 class="rr-text-card-title">
        ${targetUrl ? `<a href="${escapeHtml(targetUrl)}" target="_blank" rel="noopener noreferrer" class="rr-text-title-link">${escapeHtml(post.title)}</a>` : escapeHtml(post.title)}
      </h2>
      ${formattedBodyHtml ? `<div class="rr-text-card-body">${formattedBodyHtml}</div>` : ""}
    </div>
  `;
		const openBtn = container.querySelector(".rr-text-open-btn");
		if (openBtn) openBtn.addEventListener("click", (e) => {
			e.stopPropagation();
		});
		const cardBody = container.querySelector(".rr-text-card-body");
		if (cardBody) {
			cardBody.addEventListener("wheel", (e) => {
				e.stopPropagation();
			}, { passive: true });
			cardBody.addEventListener("touchmove", (e) => {
				e.stopPropagation();
			}, { passive: true });
		}
		postEl.appendChild(container);
	}
	function findThumbnailUrl(postEl, post) {
		if (post.mediaUrl && !post.mediaUrl.endsWith(".mp4") && !post.mediaUrl.endsWith(".m3u8")) return post.mediaUrl;
		const img = postEl.querySelector("img#post-image, [data-post-media-primary], shreddit-aspect-ratio img, [slot=\"post-media-container\"] img:not(.shreddit-subreddit-icon__icon), img.preview-img, img.preview");
		if (img?.src && !img.src.startsWith("data:image/svg")) return img.src;
	}
	function renderLinkCard(postEl, post) {
		if (postEl.querySelector(".rr-link-card-container")) return;
		const domain = extractDomain(post.contentHref);
		const thumbUrl = findThumbnailUrl(postEl, post);
		const safeTarget = sanitizeUrl(post.contentHref || (post.permalink.startsWith("http") ? post.permalink : `https://www.reddit.com${post.permalink}`));
		const container = document.createElement("div");
		container.className = "rr-link-card-container";
		container.innerHTML = `
    <div class="rr-link-card" role="region" aria-label="Article: ${escapeHtml(post.title)}">
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
        <h3 class="rr-link-card-title">
          <a href="${escapeHtml(safeTarget)}" target="_blank" rel="noopener noreferrer" class="rr-link-card-title-link">${escapeHtml(post.title)}</a>
        </h3>
        <a href="${escapeHtml(safeTarget)}" target="_blank" rel="noopener noreferrer" class="rr-link-card-cta" title="Open article in new tab">
          <span>Read Article</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </a>
      </div>
    </div>
  `;
		const linkCard = container.querySelector(".rr-link-card");
		const ctaBtn = container.querySelector(".rr-link-card-cta");
		const openLink = (e) => {
			e.stopPropagation();
			if (safeTarget) openUrl(safeTarget);
		};
		linkCard?.addEventListener("click", openLink);
		linkCard?.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") openLink(e);
		});
		ctaBtn?.addEventListener("click", openLink);
		postEl.appendChild(container);
	}
	function getSoundIconSvg(isMuted) {
		return isMuted ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>` : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
	}
	function openPostNatively(postEl, permalink) {
		const native = postEl.querySelector("a[slot=\"full-post-link\"], a[data-click-id=\"comments\"], a[href*=\"/comments/\"]");
		if (native && native.href) {
			native.click();
			return;
		}
		const url = sanitizeUrl(permalink);
		if (url) window.location.assign(url);
	}
	function syncOverlaySoundButtons(isMuted) {
		document.querySelectorAll(".rr-sound-btn").forEach((btn) => {
			btn.classList.toggle("is-muted", isMuted);
			btn.setAttribute("aria-label", isMuted ? "Unmute" : "Mute");
			btn.setAttribute("aria-pressed", String(!isMuted));
			btn.title = isMuted ? "Unmute (M)" : "Mute (M)";
			btn.innerHTML = getSoundIconSvg(isMuted);
		});
	}
	function getUpvoteIconSvg(isUpvoted) {
		return `<svg width="26" height="26" viewBox="0 0 24 24" fill="${isUpvoted ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
	}
	function getDownvoteIconSvg(isDownvoted) {
		return `<svg width="26" height="26" viewBox="0 0 24 24" fill="${isDownvoted ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
	}
	function getCcIconSvg(enabled = false) {
		return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${enabled ? "2.4" : "2.2"}" stroke-linecap="round" stroke-linejoin="round" data-enabled="${enabled}">
    <rect x="2" y="4" width="20" height="16" rx="3" ry="3"></rect>
    <path d="M7 15h0a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h1"></path>
    <path d="M15 15h0a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h1"></path>
  </svg>`;
	}
	function getFitFillIconSvg() {
		return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="15 3 21 3 21 9"></polyline>
    <polyline points="9 21 3 21 3 15"></polyline>
    <line x1="21" y1="3" x2="14" y2="10"></line>
    <line x1="3" y1="21" x2="10" y2="14"></line>
  </svg>`;
	}
	function getCommentIconSvg() {
		return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
  </svg>`;
	}
	function renderReelOverlay(postEl, post, options) {
		if (postEl.querySelector(".rr-post-overlay")) return null;
		const overlay = document.createElement("div");
		overlay.className = "rr-post-overlay";
		const isUpvoted = !!post.isUpvoted;
		const isDownvoted = !!post.isDownvoted;
		const isSubtitles = options.isSubtitlesEnabled ? options.isSubtitlesEnabled() : false;
		const initialVoteVal = isUpvoted ? 1 : isDownvoted ? -1 : 0;
		const baseScore = post.score;
		const isHiddenScore = !!post.isScoreHidden;
		const formatScoreDisplay = (currentScore) => {
			if (isHiddenScore) return "Vote";
			return formatCount(currentScore);
		};
		const cleanSub = post.subreddit ? post.subreddit.replace(/^\/?/, "") : "";
		overlay.innerHTML = `
    <!-- Bottom-Left Post Information -->
    <div class="rr-post-info">
      <div class="rr-post-meta">
        ${post.subreddit ? `<a class="rr-sub-badge" role="link" tabindex="0" href="/${escapeHtml(cleanSub)}/">${escapeHtml(post.subreddit)}</a>` : ""}
        ${post.subreddit && post.author ? `<span class="rr-dot">•</span>` : ""}
        ${post.author ? `<a class="rr-author" role="link" tabindex="0" href="/user/${escapeHtml(post.author.replace(/^u\//, ""))}/">u/${escapeHtml(post.author.replace(/^u\//, ""))}</a>` : ""}
      </div>
      <div class="rr-post-title" title="${escapeHtml(post.title)}">${escapeHtml(post.title)}</div>
    </div>

    <!-- Bottom-Right Vertical Action Rail. Seek/play/fullscreen stay on Reddit's native player bar. -->
    <div class="rr-action-rail">
      ${options.hasVideo && options.onToggleMute ? `
          <div class="rr-action-item">
            <button
              type="button"
              class="rr-action-btn rr-sound-btn ${audioManager.isMuted ? "is-muted" : ""}"
              aria-label="${audioManager.isMuted ? "Unmute" : "Mute"}"
              aria-pressed="${!audioManager.isMuted}"
              title="${audioManager.isMuted ? "Unmute (M)" : "Mute (M)"}"
            >
              ${getSoundIconSvg(audioManager.isMuted)}
            </button>
          </div>
          ` : ""}

      <!-- 1. Subtitles Toggle (ONLY rendered if post has video) -->
      ${options.hasVideo && options.onToggleSubtitles ? `
          <div class="rr-action-item">
            <button
              type="button"
              class="rr-action-btn rr-cc-btn ${isSubtitles ? "is-active-cc" : ""}"
              aria-label="${isSubtitles ? "Disable Subtitles" : "Enable Subtitles"}"
              aria-pressed="${isSubtitles}"
              title="${isSubtitles ? "Disable Subtitles" : "Enable Subtitles"}"
            >
              ${getCcIconSvg(isSubtitles)}
            </button>
          </div>
          ` : ""}

      <!-- 2. Fit/Fill Mode Toggle -->
      <div class="rr-action-item">
        <button
          type="button"
          class="rr-action-btn rr-fit-btn"
          aria-label="Toggle Fit or Fill scaling"
          title="Toggle Fit / Fill (Original vs Full Bleed)"
        >
          ${getFitFillIconSvg()}
        </button>
      </div>

      <!-- 3. Vote Cluster (Upvote, Score, Downvote) -->
      <div class="rr-action-item rr-vote-group">
        <button
          type="button"
          class="rr-action-btn rr-upvote-btn ${isUpvoted ? "is-active-up" : ""}"
          aria-label="Upvote"
          aria-pressed="${isUpvoted}"
          title="Upvote"
        >
          ${getUpvoteIconSvg(isUpvoted)}
        </button>
        <span class="rr-action-label rr-score-label" aria-live="polite">${formatScoreDisplay(post.score)}</span>
        <button
          type="button"
          class="rr-action-btn rr-downvote-btn ${isDownvoted ? "is-active-down" : ""}"
          aria-label="Downvote"
          aria-pressed="${isDownvoted}"
          title="Downvote"
        >
          ${getDownvoteIconSvg(isDownvoted)}
        </button>
      </div>

      <!-- 4. Reddit Comments (opens the native new-Reddit post page) -->
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
		const fitBtn = overlay.querySelector(".rr-fit-btn");
		const commentBtn = overlay.querySelector(".rr-comment-btn");
		const ccBtn = overlay.querySelector(".rr-cc-btn");
		const scoreLabel = overlay.querySelector(".rr-score-label");
		const subBadge = overlay.querySelector(".rr-sub-badge");
		const authorBadge = overlay.querySelector(".rr-author");
		if (fitBtn && options.onToggleFitFill) fitBtn.onclick = (e) => {
			e.stopPropagation();
			options.onToggleFitFill();
		};
		if (upvoteBtn) upvoteBtn.onclick = (e) => {
			e.stopPropagation();
			syncVoteUI(!proxyUpvote(post, () => syncVoteUI()));
		};
		if (downvoteBtn) downvoteBtn.onclick = (e) => {
			e.stopPropagation();
			syncVoteUI(!proxyDownvote(post, () => syncVoteUI()));
		};
		function syncVoteUI(revert = false) {
			const isUp = revert ? initialVoteVal === 1 : !!post.isUpvoted;
			const isDown = revert ? initialVoteVal === -1 : !!post.isDownvoted;
			if (upvoteBtn) {
				upvoteBtn.classList.toggle("is-active-up", isUp);
				upvoteBtn.setAttribute("aria-pressed", String(isUp));
				upvoteBtn.innerHTML = getUpvoteIconSvg(isUp);
			}
			if (downvoteBtn) {
				downvoteBtn.classList.toggle("is-active-down", isDown);
				downvoteBtn.setAttribute("aria-pressed", String(isDown));
				downvoteBtn.innerHTML = getDownvoteIconSvg(isDown);
			}
			if (scoreLabel) {
				const newScore = baseScore + ((isUp ? 1 : isDown ? -1 : 0) - initialVoteVal);
				scoreLabel.textContent = formatScoreDisplay(newScore);
			}
		}
		if (commentBtn) commentBtn.onclick = (e) => {
			e.stopPropagation();
			e.preventDefault();
			openPostNatively(postEl, post.permalink);
		};
		const soundBtn = overlay.querySelector(".rr-sound-btn");
		if (soundBtn && options.onToggleMute) soundBtn.onclick = (e) => {
			e.stopPropagation();
			options.onToggleMute();
		};
		if (ccBtn && options.onToggleSubtitles) ccBtn.onclick = (e) => {
			e.stopPropagation();
			options.onToggleSubtitles();
		};
		if (subBadge) subBadge.onclick = (e) => {
			e.stopPropagation();
		};
		if (authorBadge) authorBadge.onclick = (e) => {
			e.stopPropagation();
		};
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
	var POST_SELECTORS = "shreddit-post, article, [data-testid=\"post-container\"], .Post";
	var VIDEO_IFRAME_HOSTS_REGEX = /(?:redgifs\.com|streamable\.com|gfycat\.com|youtube\.com|youtu\.be|v\.redd\.it)/i;
	var VIDEOS_ONLY_KEY = "@reddit-reels/videos-only";
	var SUBTITLES_KEY = "@reddit-reels/subtitles";
	function readPref(key) {
		try {
			if (typeof GM_getValue === "function") {
				const gmVal = GM_getValue(key, null);
				if (gmVal !== null) return gmVal === "1";
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
			if (typeof GM_setValue === "function") GM_setValue(key, value ? "1" : "0");
		} catch {}
		try {
			localStorage.setItem(key, value ? "1" : "0");
		} catch {}
	}
	function hasVideoIframe(postEl) {
		const iframes = postEl.querySelectorAll("iframe");
		for (const ifr of iframes) {
			const src = `${ifr.src || ""} ${ifr.dataset.rrSrc || ""}`;
			if (VIDEO_IFRAME_HOSTS_REGEX.test(src)) return true;
		}
		return false;
	}
	function hasVideoContent(postEl, postType) {
		const resolvedType = postType ?? postEl.dataset?.rrPostType;
		if (resolvedType === "video") return true;
		if (resolvedType === void 0) {
			if (postEl.getAttribute("post-type") === "video") return true;
			const domain = postEl.getAttribute("domain") || "";
			const contentHref = postEl.getAttribute("content-href") || "";
			if (/(redgifs\.com|streamable\.com|gfycat\.com)/i.test(domain + " " + contentHref)) return true;
			if (hasVideoIframe(postEl)) return true;
			try {
				if (parsePostElement(postEl).postType === "video") return true;
			} catch {}
		}
		return !!audioManager.findVideo(postEl) || hasVideoIframe(postEl);
	}
	function getPostElements() {
		const shredditPosts = Array.from(document.querySelectorAll("shreddit-post"));
		if (shredditPosts.length > 0) return shredditPosts;
		const rawPosts = Array.from(document.querySelectorAll("article, [data-testid=\"post-container\"], .Post"));
		return rawPosts.filter((el) => {
			return !rawPosts.some((other) => other !== el && other.contains(el));
		});
	}
	function getClosestPostToViewport() {
		const posts = getPostElements().filter((p) => !p.classList.contains("rr-filtered-out"));
		if (posts.length === 0) return null;
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
	var FeedManager = class {
		options;
		feedObserver = null;
		mutationObserver = null;
		mutationDebounce = null;
		videosOnlyMode = false;
		subtitlesEnabled = false;
		enhancedPosts = new WeakSet();
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
			getPostElements().forEach((p) => applySubtitlesState(p, this.subtitlesEnabled));
			syncOverlaySubtitlesButtons(this.subtitlesEnabled);
			return this.subtitlesEnabled;
		}
		enhancePost(postEl) {
			if (postEl.querySelector(".rr-post-overlay")) return;
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
					const container = postEl.querySelector("[slot=\"post-media-container\"]") || postEl.querySelector(".media-container") || postEl;
					if (media.type === "iframe" && media.src) {
						const iframe = document.createElement("iframe");
						iframe.src = "about:blank";
						iframe.dataset.rrSrc = normalizeIframeSrc(media.src, audioManager.isMuted);
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
					} else if (media.type === "video" && media.src) {
						const vid = document.createElement("video");
						vid.src = media.src;
						vid.className = "rr-embedded-video";
						vid.playsInline = true;
						vid.setAttribute("playsinline", "");
						vid.setAttribute("loop", "");
						vid.muted = audioManager.isMuted;
						vid.autoplay = true;
						container.appendChild(vid);
						audioManager.invalidateVideoCache(postEl);
					}
				}
				unconstrainPostMedia(postEl);
				applySubtitlesState(postEl, this.subtitlesEnabled);
			}
			if (this.videosOnlyMode && !hasVideo) postEl.classList.add("rr-filtered-out");
			else postEl.classList.remove("rr-filtered-out");
			postEl.style.removeProperty("display");
			const NATIVE_SUPPRESSION_SELECTORS = "[slot=\"credit-bar\"], [slot=\"post-credit-bar\"], [slot=\"title-and-metadata\"], [slot=\"title\"], [slot=\"action-row\"], [slot=\"text-body\"], shreddit-post-action-row, feed-post-action-row, shreddit-action-bar, rpl-action-bar, shreddit-post-credit-bar, faceplate-tracker, shreddit-interaction-container";
			const VOTE_OFFSCREEN_SELECTORS = "[slot=\"vote\"], [slot=\"vote-button\"], shreddit-post-vote-control, [data-testid=\"post-vote-control\"]";
			Array.from(postEl.children).forEach((child) => {
				const el = child;
				if (el.classList?.contains("rr-post-overlay") || el.classList?.contains("rr-link-card-container") || el.classList?.contains("rr-text-card-container")) return;
				if (el.matches?.(NATIVE_SUPPRESSION_SELECTORS)) {
					el.classList.add("rr-native-suppressed");
					return;
				}
				if (el.matches?.(VOTE_OFFSCREEN_SELECTORS)) {
					el.classList.add("rr-native-offscreen");
					return;
				}
				if (!isLinkPost && !isTextPost && (el.matches?.("[slot=\"post-media-container\"], shreddit-player-2, .media-container, gallery-carousel, faceplate-carousel, shreddit-aspect-ratio, shreddit-async-loader, shreddit-player-captions, [slot=\"captions\"]") || el.querySelector("video, img:not(.shreddit-subreddit-icon__icon), iframe, gallery-carousel, faceplate-carousel, shreddit-player-2, shreddit-player-captions") !== null)) return;
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
				onToggleMute: this.options.onToggleMute,
				onToggleSubtitles: () => this.toggleSubtitles(),
				onToggleFitFill: () => {
					if (postEl.classList.contains("rr-fit-contain")) {
						postEl.classList.remove("rr-fit-contain");
						postEl.classList.add("rr-fit-cover");
					} else {
						postEl.classList.remove("rr-fit-cover");
						postEl.classList.add("rr-fit-contain");
					}
				}
			});
			this.enhancedPosts.add(postEl);
		}
		restorePost(postEl) {
			postEl.querySelectorAll(".rr-post-overlay, .rr-text-card-container, .rr-link-card-container").forEach((el) => el.remove());
			postEl.querySelectorAll("iframe.rr-embedded-iframe").forEach((ifr) => {
				ifr.remove();
			});
			postEl.querySelectorAll("video.rr-embedded-video").forEach((vid) => {
				vid.remove();
			});
			postEl.querySelectorAll("iframe").forEach((ifr) => {
				if (ifr.dataset.rrSrc) {
					ifr.src = ifr.dataset.rrSrc;
					delete ifr.dataset.rrSrc;
				}
			});
			if (postEl.shadowRoot) {
				postEl.shadowRoot.querySelector("#rr-shadow-cleanup-style")?.remove();
				postEl.shadowRoot.querySelectorAll("rpl-action-bar, [data-testid=\"action-row\"], .shreddit-post-container, slot[name=\"action-row\"], slot[name=\"share-button\"], slot[name=\"credit-bar\"]").forEach((el) => {
					el.style.removeProperty("display");
				});
			}
			postEl.querySelectorAll(".rr-native-suppressed, .rr-native-offscreen").forEach((el) => {
				el.classList.remove("rr-native-suppressed", "rr-native-offscreen");
				el.style.removeProperty("display");
			});
			for (let i = 0; i < postEl.children.length; i++) {
				const el = postEl.children[i];
				if (el.classList?.contains("rr-native-suppressed") || el.classList?.contains("rr-native-offscreen")) el.classList.remove("rr-native-suppressed", "rr-native-offscreen");
				el.style?.removeProperty("display");
			}
			restorePostMedia(postEl);
			postEl.classList.remove("rr-filtered-out", "rr-is-link", "rr-is-text");
			this.enhancedPosts.delete(postEl);
			postEl.style.removeProperty("display");
		}
		teardownAllPosts() {
			getPostElements().filter((p) => this.enhancedPosts.has(p)).forEach((p) => this.restorePost(p));
			document.querySelector(".rr-empty-feed")?.remove();
			if (typeof document !== "undefined") document.querySelectorAll("iframe[data-rr-src]").forEach((ifr) => {
				ifr.src = ifr.dataset.rrSrc;
				delete ifr.dataset.rrSrc;
			});
		}
		enhanceAllPosts() {
			getPostElements().forEach((p) => this.enhancePost(p));
		}
		applyVideosOnlyFilter() {
			const posts = getPostElements();
			let visibleCount = 0;
			for (const postEl of posts) {
				const hasVideo = hasVideoContent(postEl, postEl.dataset?.rrPostType);
				if (this.videosOnlyMode && !hasVideo) postEl.classList.add("rr-filtered-out");
				else {
					postEl.classList.remove("rr-filtered-out");
					visibleCount++;
				}
				postEl.style.removeProperty("display");
			}
			const existingEmpty = document.querySelector(".rr-empty-feed");
			if (this.videosOnlyMode && posts.length > 0 && visibleCount === 0) {
				if (!existingEmpty) {
					const emptyEl = document.createElement("div");
					emptyEl.className = "rr-empty-feed";
					emptyEl.innerHTML = `
          <div class="rr-empty-title">No videos found</div>
          <div class="rr-empty-subtitle">Tap here to view all posts</div>
        `;
					emptyEl.onclick = () => this.toggleVideosOnly();
					(document.querySelector(".rr-feed-container") || document.body).appendChild(emptyEl);
				}
			} else existingEmpty?.remove();
		}
		startObservers() {
			this.stopObservers();
			document.documentElement.classList.toggle("rr-hide-captions", !this.subtitlesEnabled);
			this.feedObserver = new IntersectionObserver((entries) => {
				if (!this.options.isReelModeActive()) return;
				for (const entry of entries) {
					const post = entry.target;
					if (entry.isIntersecting && entry.intersectionRatio >= .5) {
						unconstrainPostMedia(post);
						applySubtitlesState(post, this.subtitlesEnabled);
						audioManager.requestPlayback(post);
						this.options.onActivePost?.(post);
					} else if (!entry.isIntersecting || entry.intersectionRatio < .2) {
						applyAudioState(post, true);
						const video = audioManager.findVideo(post);
						if (video) try {
							if (!video.paused) video.pause();
							video.muted = true;
						} catch {}
					}
				}
			}, { threshold: [
				.2,
				.5,
				.8
			] });
			getPostElements().forEach((p) => this.feedObserver?.observe(p));
			this.mutationObserver = new MutationObserver((mutations) => {
				if (!this.options.isReelModeActive()) return;
				const addedElements = [];
				for (const mutation of mutations) {
					if (mutation.type !== "childList") continue;
					for (let i = 0; i < mutation.addedNodes.length; i++) {
						const node = mutation.addedNodes[i];
						if (node.nodeType === Node.ELEMENT_NODE) {
							const el = node;
							if (el.matches?.("shreddit-post, article, [data-testid=\"post-container\"], .Post")) addedElements.push(el);
							else if (el.querySelectorAll) el.querySelectorAll(POST_SELECTORS).forEach((p) => addedElements.push(p));
						}
					}
					for (let i = 0; i < mutation.removedNodes.length; i++) {
						const node = mutation.removedNodes[i];
						if (node.nodeType === Node.ELEMENT_NODE) {
							const el = node;
							if (el.matches?.("shreddit-post, article, [data-testid=\"post-container\"], .Post")) this.feedObserver?.unobserve(el);
						}
					}
				}
				if (addedElements.length === 0) return;
				if (this.mutationDebounce) clearTimeout(this.mutationDebounce);
				this.mutationDebounce = setTimeout(() => {
					this.mutationDebounce = null;
					if (!this.options.isReelModeActive()) return;
					for (const p of addedElements) if (!this.enhancedPosts.has(p)) {
						this.enhancePost(p);
						this.feedObserver?.observe(p);
					}
					this.applyVideosOnlyFilter();
					this.options.onPostsAdded?.();
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
			if (!active || posts.length === 0) return;
			const currentIndex = posts.indexOf(active);
			if (currentIndex >= 0 && currentIndex < posts.length - 1) posts[currentIndex + 1].scrollIntoView({
				behavior: "smooth",
				block: "start"
			});
		}
		scrollToPrev() {
			const posts = getPostElements().filter((p) => !p.classList.contains("rr-filtered-out"));
			const active = getClosestPostToViewport();
			if (!active || posts.length === 0) return;
			const currentIndex = posts.indexOf(active);
			if (currentIndex > 0) posts[currentIndex - 1].scrollIntoView({
				behavior: "smooth",
				block: "start"
			});
		}
	};
	var NON_FEED_SEGMENTS = /^\/(?:settings|message|messages|chat|notifications|mod|premium|submit|search|media|login|register|account|coins|prefs|wiki|gallery)(?:\/|$)/i;
	function isReelRoute(pathname) {
		const path = pathname.replace(/\/+$/, "") || "/";
		if (/\/comments\//i.test(path) || /\/s\/[A-Za-z0-9]+$/.test(path)) return false;
		if (NON_FEED_SEGMENTS.test(path)) return false;
		if (path === "/" || /^\/(?:best|hot|new|top|rising|controversial)$/i.test(path)) return true;
		if (/^\/r\/[A-Za-z0-9_]+(?:\/(?:best|hot|new|top|rising|controversial))?$/i.test(path)) return true;
		if (/^\/(?:user|u)\/[A-Za-z0-9_-]+(?:\/submitted)?$/i.test(path)) return true;
		if (/^\/mock-reddit\.html$/i.test(path)) return true;
		return false;
	}
	function watchRoute(onChange) {
		let lastHref = location.href;
		let timer = null;
		const check = () => {
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => {
				timer = null;
				if (location.href === lastHref) return;
				lastHref = location.href;
				onChange();
			}, 50);
		};
		const origPush = history.pushState;
		const origReplace = history.replaceState;
		history.pushState = function(...args) {
			const ret = origPush.apply(this, args);
			check();
			return ret;
		};
		history.replaceState = function(...args) {
			const ret = origReplace.apply(this, args);
			check();
			return ret;
		};
		const nav = window.navigation;
		nav?.addEventListener?.("navigatesuccess", check);
		window.addEventListener("popstate", check);
		const onPageShow = (e) => {
			if (e.persisted) {
				lastHref = "";
				check();
			}
		};
		window.addEventListener("pageshow", onPageShow);
		return () => {
			history.pushState = origPush;
			history.replaceState = origReplace;
			nav?.removeEventListener?.("navigatesuccess", check);
			window.removeEventListener("popstate", check);
			window.removeEventListener("pageshow", onPageShow);
			if (timer) clearTimeout(timer);
		};
	}
	var CLUSTER_ID = "rr-header-cluster";
	var HEADER_ANCHORS = [
		"#expand-user-drawer-button",
		"#login-button",
		"reddit-header-large header nav > :last-child",
		"reddit-header-small header nav > :last-child"
	];
	var FILTER_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.5"></rect><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"></path></svg>`;
	var REEL_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="3"></rect><polygon points="10 9 15 12 10 15 10 9"></polygon></svg>`;
	var LIST_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><circle cx="4" cy="6" r="1"></circle><circle cx="4" cy="12" r="1"></circle><circle cx="4" cy="18" r="1"></circle></svg>`;
	function findHeaderAnchor() {
		for (const sel of HEADER_ANCHORS) try {
			const el = document.querySelector(sel);
			if (el?.parentElement) return el;
		} catch {}
		return null;
	}
	function buildCluster(handlers) {
		const cluster = document.createElement("div");
		cluster.id = CLUSTER_ID;
		cluster.className = "rr-header-cluster";
		const filterBtn = document.createElement("button");
		filterBtn.type = "button";
		filterBtn.className = "rr-header-btn rr-header-filter";
		filterBtn.innerHTML = FILTER_ICON;
		filterBtn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			handlers.onToggleFilter();
		});
		const reelBtn = document.createElement("button");
		reelBtn.type = "button";
		reelBtn.className = "rr-header-btn rr-header-reel";
		reelBtn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			handlers.onToggleReel();
		});
		cluster.append(filterBtn, reelBtn);
		return cluster;
	}
	function mountHeaderToggle(handlers) {
		let cluster = document.getElementById(CLUSTER_ID);
		if (!cluster) cluster = buildCluster(handlers);
		const anchor = findHeaderAnchor();
		if (anchor && anchor.parentElement) {
			if (cluster.nextElementSibling !== anchor) anchor.parentElement.insertBefore(cluster, anchor);
			cluster.classList.remove("is-floating");
		} else if (!cluster.isConnected || !cluster.classList.contains("is-floating")) {
			cluster.classList.add("is-floating");
			document.body.appendChild(cluster);
		}
		return cluster;
	}
	function syncHeaderToggle(reelOn, videosOnly) {
		const cluster = document.getElementById(CLUSTER_ID);
		if (!cluster) return;
		const reelBtn = cluster.querySelector(".rr-header-reel");
		if (reelBtn) {
			reelBtn.innerHTML = reelOn ? LIST_ICON : REEL_ICON;
			const label = reelOn ? "Switch to list view" : "Switch to reel view";
			reelBtn.setAttribute("aria-label", label);
			reelBtn.title = label;
			reelBtn.setAttribute("aria-pressed", String(reelOn));
		}
		const filterBtn = cluster.querySelector(".rr-header-filter");
		if (filterBtn) {
			filterBtn.classList.toggle("is-active", videosOnly);
			filterBtn.setAttribute("aria-pressed", String(videosOnly));
			const label = videosOnly ? "Showing videos only (show all posts)" : "Showing all posts (videos only)";
			filterBtn.setAttribute("aria-label", label);
			filterBtn.title = label;
		}
	}
	function unmountHeaderToggle() {
		document.getElementById(CLUSTER_ID)?.remove();
	}
	var ENABLED_KEY = "@reddit-reels/enabled";
	var LAST_POST_KEY = "@reddit-reels/last-post";
	var isReelModeActive = false;
	var pendingRestoreUntil = 0;
	var stopRedgifsReady = null;
	function readEnabled() {
		try {
			if (typeof GM_getValue === "function") {
				const v = GM_getValue(ENABLED_KEY, null);
				if (v !== null) return v !== "0";
			}
		} catch {}
		try {
			const v = localStorage.getItem(ENABLED_KEY);
			if (v !== null) return v !== "0";
		} catch {}
		return true;
	}
	function writeEnabled(on) {
		try {
			if (typeof GM_setValue === "function") GM_setValue(ENABLED_KEY, on ? "1" : "0");
		} catch {}
		try {
			localStorage.setItem(ENABLED_KEY, on ? "1" : "0");
		} catch {}
	}
	var reelEnabled = readEnabled();
	function postKey(el) {
		return el.id || el.getAttribute("permalink") || "";
	}
	function rememberActivePost(el) {
		try {
			const key = postKey(el);
			if (key) sessionStorage.setItem(LAST_POST_KEY, `${location.pathname}|${key}`);
		} catch {}
	}
	function rememberedKey() {
		try {
			const raw = sessionStorage.getItem(LAST_POST_KEY);
			if (!raw) return null;
			const sep = raw.indexOf("|");
			if (raw.slice(0, sep) !== location.pathname) return null;
			return raw.slice(sep + 1) || null;
		} catch {
			return null;
		}
	}
	function findRememberedPost() {
		try {
			const key = rememberedKey();
			if (!key) return null;
			for (const el of Array.from(document.querySelectorAll("shreddit-post"))) if (postKey(el) === key) return el;
		} catch {}
		return null;
	}
	function syncSoundUi() {
		syncOverlaySoundButtons(audioManager.isMuted);
	}
	function handleToggleMute() {
		unlockAudio();
		audioManager.toggleMute(getClosestPostToViewport() || void 0);
		audioManager.reassertActiveIframeUnmute();
	}
	var feedManager = new FeedManager({
		isReelModeActive: () => isReelModeActive,
		onActivePost: rememberActivePost,
		onPostsAdded: () => {
			mountToggle();
			if (pendingRestoreUntil && Date.now() < pendingRestoreUntil) {
				const el = findRememberedPost();
				if (el && !el.classList.contains("rr-filtered-out")) {
					pendingRestoreUntil = 0;
					el.scrollIntoView({
						behavior: "instant",
						block: "start"
					});
					audioManager.requestPlayback(el);
				}
			}
		},
		onToggleMute: handleToggleMute
	});
	var inputController = new InputController({
		isReelModeActive: () => isReelModeActive,
		getActivePost: () => getClosestPostToViewport(),
		getActiveReelPost: () => {
			const el = getClosestPostToViewport();
			if (!el) return null;
			try {
				return parsePostElement(el);
			} catch {
				return null;
			}
		},
		onDoubleTap: (tappedPost) => {
			try {
				const reel = parsePostElement(tappedPost);
				if (reel) {
					const willBeUp = !reel.isUpvoted;
					proxyUpvote(reel);
					showVotePulse(willBeUp ? true : null);
				}
			} catch {}
		},
		onExit: () => setReelEnabled(false),
		onToggleMute: handleToggleMute,
		onVolumeChange: () => syncSoundUi(),
		onToggleSubtitles: () => feedManager.toggleSubtitles(),
		onNextPost: () => feedManager.scrollToNext(),
		onPrevPost: () => feedManager.scrollToPrev()
	});
	function mountToggle() {
		if (!isReelRoute(location.pathname)) {
			unmountHeaderToggle();
			return;
		}
		mountHeaderToggle({
			onToggleReel: () => setReelEnabled(!reelEnabled),
			onToggleFilter: () => {
				if (!isReelModeActive) return;
				const anchor = getClosestPostToViewport();
				feedManager.toggleVideosOnly();
				syncHeaderToggle(reelEnabled, feedManager.isVideosOnly);
				(anchor && !anchor.classList.contains("rr-filtered-out") ? anchor : getClosestPostToViewport())?.scrollIntoView({
					behavior: "instant",
					block: "start"
				});
			}
		});
		syncHeaderToggle(reelEnabled, feedManager.isVideosOnly);
	}
	function activate() {
		if (isReelModeActive) return;
		const remembered = findRememberedPost();
		pendingRestoreUntil = !remembered && rememberedKey() ? Date.now() + 3e3 : 0;
		const anchor = remembered || getClosestPostToViewport();
		isReelModeActive = true;
		document.documentElement.classList.add("rr-active");
		feedManager.enhanceAllPosts();
		feedManager.applyVideosOnlyFilter();
		feedManager.startObservers();
		inputController.attach();
		if (!stopRedgifsReady) stopRedgifsReady = listenForRedGifsReady(() => ({
			muted: audioManager.isMuted,
			volume: audioManager.volume,
			activeContainer: getClosestPostToViewport()
		}));
		const target = anchor && !anchor.classList.contains("rr-filtered-out") ? anchor : getClosestPostToViewport();
		if (target) {
			target.scrollIntoView({
				behavior: "instant",
				block: "start"
			});
			setTimeout(() => {
				if (isReelModeActive && target.isConnected) target.scrollIntoView({
					behavior: "instant",
					block: "start"
				});
			}, 350);
			audioManager.requestPlayback(target);
		}
	}
	function deactivate() {
		if (!isReelModeActive) return;
		const anchor = getClosestPostToViewport();
		isReelModeActive = false;
		pendingRestoreUntil = 0;
		audioManager.stopAll();
		feedManager.stopObservers();
		inputController.detach();
		feedManager.teardownAllPosts();
		document.documentElement.classList.remove("rr-active", "rr-hide-captions");
		if (stopRedgifsReady) {
			stopRedgifsReady();
			stopRedgifsReady = null;
		}
		if (anchor?.isConnected) anchor.scrollIntoView({
			behavior: "instant",
			block: "center"
		});
	}
	function syncState() {
		if (reelEnabled && isReelRoute(location.pathname)) activate();
		else deactivate();
		mountToggle();
	}
	function setReelEnabled(on) {
		reelEnabled = on;
		writeEnabled(on);
		if (on) unlockAudio();
		syncState();
	}
	function init() {
		if (typeof window === "undefined") return;
		if (/redgifs\.com/i.test(window.location.hostname)) return;
		if (window.top !== window.self) return;
		audioManager.onChange(syncSoundUi);
		watchRoute(() => {
			syncState();
		});
		syncState();
	}
	if (typeof document !== "undefined") {
		if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
		else init();
	}
	if (typeof window !== "undefined" && isRedGifsFrame()) initRedGifsBridge();
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

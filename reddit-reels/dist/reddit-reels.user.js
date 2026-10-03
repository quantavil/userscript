// ==UserScript==
// @name         Reddit Reels
// @namespace    https://github.com/quantavil/userscript/tree/main/reddit-reels
// @version      3.0.0
// @author       quantavil
// @description  Mobile-first full-screen reels for Reddit feeds: swipe, one stream with sound, Reddit video and RedGifs, native voting.
// @license      MIT
// @homepage     https://github.com/quantavil/userscript/tree/main/reddit-reels
// @supportURL   https://github.com/quantavil/userscript/issues
// @match        https://www.reddit.com/*
// @match        https://reddit.com/*
// @require      https://cdn.jsdelivr.net/npm/hls.js@1.7.3/dist/hls.light.min.js
// @connect      api.redgifs.com
// @connect      media.redgifs.com
// @connect      redgifs.com
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// @noframes
// ==/UserScript==

(function(hls_js) {
	"use strict";
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: ((k) => from[k]).bind(null, key),
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));
	hls_js = __toESM(hls_js);
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
	var REDGIFS_RE = /redgifs\.com\/(?:watch|ifr|i)\/([a-z0-9]+)/i;
	var YOUTUBE_RE = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i;
	var STREAMABLE_RE = /streamable\.com\/(?:e\/)?([a-z0-9]+)/i;
	function redgifsIdFrom(url) {
		const m = url.match(REDGIFS_RE);
		return m ? m[1].toLowerCase() : null;
	}
	function embedUrlFrom(url) {
		const yt = url.match(YOUTUBE_RE);
		if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&playsinline=1&rel=0`;
		const st = url.match(STREAMABLE_RE);
		if (st && /streamable\.com/i.test(url)) return `https://streamable.com/e/${st[1]}?autoplay=1`;
		return null;
	}
	function num(v) {
		const n = parseInt(v || "", 10);
		return Number.isFinite(n) ? n : 0;
	}
	function readVideo(el) {
		const player = el.querySelector("shreddit-player, shreddit-player-2");
		if (!player) return void 0;
		const mp4 = [];
		const packed = player.getAttribute("packaged-media-json");
		if (packed) try {
			const perms = JSON.parse(packed)?.playbackMp4s?.permutations || [];
			for (const p of perms) {
				const url = p?.source?.url;
				if (typeof url === "string") mp4.push({
					url,
					h: p.source.dimensions?.height || 0,
					w: p.source.dimensions?.width || 0
				});
			}
		} catch {}
		mp4.sort((a, b) => b.h - a.h);
		const hls = player.getAttribute("src") || "";
		if (!mp4.length && !hls) return void 0;
		return {
			mp4: mp4.map((m) => m.url),
			hls,
			poster: player.getAttribute("poster") || "",
			captions: player.getAttribute("caption-url") || "",
			width: mp4[0]?.w || 0,
			height: mp4[0]?.h || 0
		};
	}
	function imgSrc(img) {
		if (!img) return "";
		return img.getAttribute("src") || img.getAttribute("data-lazy-src") || "";
	}
	function readGallery(el) {
		const carousel = el.querySelector("gallery-carousel");
		if (!carousel) return [];
		const out = [];
		carousel.querySelectorAll("li").forEach((li) => {
			const src = imgSrc(li.querySelector("img"));
			if (src && !out.includes(src)) out.push(src);
		});
		return out;
	}
	function readImage(el, contentHref) {
		const full = imgSrc(el.querySelector("img.media-lightbox-img"));
		if (full) return full;
		const preview = imgSrc(el.querySelector("img.preview-img, img.i18n-post-media-img"));
		if (preview) return preview;
		return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(contentHref) ? contentHref : "";
	}
	function extractPost(el) {
		const id = el.id || el.getAttribute("id") || "";
		if (!id) return null;
		const type = (el.getAttribute("post-type") || "").toLowerCase();
		const contentHref = el.getAttribute("content-href") || "";
		const domain = el.getAttribute("domain") || "";
		const iframeSrc = el.querySelector("iframe")?.getAttribute("src") || "";
		const post = {
			id,
			kind: "link",
			title: el.getAttribute("post-title") || "",
			subreddit: el.getAttribute("subreddit-prefixed-name") || "",
			author: el.getAttribute("author") || "",
			score: num(el.getAttribute("score")),
			comments: num(el.getAttribute("comment-count")),
			permalink: el.getAttribute("permalink") || "",
			nsfw: el.hasAttribute("nsfw"),
			el
		};
		let kind = null;
		const redgifsId = redgifsIdFrom(contentHref) || redgifsIdFrom(iframeSrc);
		const video = readVideo(el);
		const embedUrl = embedUrlFrom(contentHref);
		if (redgifsId) {
			kind = "redgifs";
			post.redgifsId = redgifsId;
		} else if (video) {
			kind = "video";
			post.video = video;
		} else if (embedUrl) {
			kind = "embed";
			post.embedUrl = embedUrl;
		} else if (type === "gallery") {
			const images = readGallery(el);
			if (images.length) {
				kind = "gallery";
				post.images = images;
			}
		}
		if (!kind && (type === "image" || /i\.redd\.it/i.test(domain))) {
			const src = readImage(el, contentHref);
			if (src) {
				kind = "image";
				post.images = [src];
			}
		}
		if (!kind && (type === "text" || type === "self")) {
			kind = "text";
			post.text = (el.querySelector("[slot=\"text-body\"]")?.textContent || "").trim().slice(0, 4e3);
		}
		if (!kind) {
			kind = "link";
			post.linkUrl = contentHref;
			post.thumbnail = imgSrc(el.querySelector("[slot=\"thumbnail\"] img"));
		}
		post.kind = kind;
		return post;
	}
	var LOAD_AFTER = "faceplate-partial[slot=\"load-after\"]";
	function findLoadAfter(root) {
		const slotted = root.querySelector(LOAD_AFTER);
		if (slotted) return slotted;
		for (const p of Array.from(root.querySelectorAll("faceplate-partial"))) {
			const src = p.getAttribute("src") || "";
			if (/[?&]after=/.test(src) && /more-posts|\/feeds\//.test(src)) return p;
		}
		return null;
	}
	var FeedSource = class {
		posts = [];
		ids = new Set();
		loading = null;
		exhausted = false;
		observer = null;
		scanTimer = null;
		listeners = new Set();
		onAdded(cb) {
			this.listeners.add(cb);
			return () => this.listeners.delete(cb);
		}
		scan() {
			const added = [];
			document.querySelectorAll("shreddit-post").forEach((el) => {
				if (el.closest("shreddit-ad-post") || el.hasAttribute("promoted")) return;
				if (this.ids.has(el.id)) {
					const known = this.posts.find((p) => p.id === el.id);
					if (known && known.el !== el && el.isConnected) known.el = el;
					return;
				}
				const post = extractPost(el);
				if (!post) return;
				this.ids.add(post.id);
				this.posts.push(post);
				added.push(post);
			});
			if (added.length) for (const cb of this.listeners) cb(added);
			return added;
		}
		get hasMore() {
			return !this.exhausted && !!findLoadAfter(document);
		}
		loadMore() {
			if (this.loading) return this.loading;
			this.loading = this.fetchNext().finally(() => {
				this.loading = null;
			});
			return this.loading;
		}
		async fetchNext() {
			const partial = findLoadAfter(document);
			const src = partial?.getAttribute("src");
			if (!partial || !src || this.exhausted) return 0;
			let html = "";
			try {
				const res = await fetch(new URL(src, location.origin).toString(), { credentials: "include" });
				if (!res.ok) return 0;
				html = await res.text();
			} catch {
				return 0;
			}
			if (!partial.isConnected) return this.scan().length;
			const doc = new DOMParser().parseFromString(html, "text/html");
			const blocks = [];
			doc.querySelectorAll("shreddit-post").forEach((p) => {
				if (p.closest("shreddit-ad-post")) return;
				const block = p.closest("article") || p;
				if (!blocks.includes(block)) blocks.push(block);
			});
			const next = findLoadAfter(doc);
			const parent = partial.parentElement;
			if (parent) {
				for (const block of blocks) parent.insertBefore(document.importNode(block, true), partial);
				if (next) parent.insertBefore(document.importNode(next, true), partial);
			}
			partial.remove();
			if (!next) this.exhausted = true;
			return this.scan().length;
		}
		observe() {
			if (this.observer) return;
			this.observer = new MutationObserver(() => {
				if (this.scanTimer) return;
				this.scanTimer = setTimeout(() => {
					this.scanTimer = null;
					this.scan();
				}, 200);
			});
			this.observer.observe(document.body, {
				childList: true,
				subtree: true
			});
		}
		disconnect() {
			this.observer?.disconnect();
			this.observer = null;
			if (this.scanTimer) clearTimeout(this.scanTimer);
			this.scanTimer = null;
		}
		reset() {
			this.disconnect();
			this.posts.length = 0;
			this.ids.clear();
			this.exhausted = false;
		}
	};
	function hasGm() {
		return typeof GM_xmlhttpRequest === "function";
	}
	function request(url, opts) {
		if (hasGm()) return new Promise((resolve, reject) => {
			GM_xmlhttpRequest({
				method: "GET",
				url,
				headers: opts.headers,
				responseType: opts.as,
				anonymous: true,
				timeout: 6e4,
				onload: (r) => resolve({
					status: r.status,
					json: async () => typeof r.response === "object" && r.response ? r.response : JSON.parse(r.responseText || "null"),
					blob: async () => r.response
				}),
				onerror: () => reject(new Error("network")),
				ontimeout: () => reject(new Error("timeout"))
			});
		});
		return fetch(url, {
			headers: opts.headers,
			credentials: "omit",
			referrerPolicy: "no-referrer",
			mode: "cors"
		}).then((r) => ({
			status: r.status,
			json: () => r.json(),
			blob: () => r.blob()
		}));
	}
	var API = "https://api.redgifs.com/v2";
	var TOKEN_KEY = "@reddit-reels/redgifs-token";
	var BLOB_CACHE_SIZE = 4;
	var token = null;
	var tokenRequest = null;
	var infoCache = new Map();
	var blobCache = new Map();
	function readStoredToken() {
		if (token) return;
		try {
			const raw = sessionStorage.getItem(TOKEN_KEY);
			if (raw) {
				const t = JSON.parse(raw);
				if (t && typeof t.value === "string" && t.exp > Date.now()) token = t;
			}
		} catch {}
	}
	function tokenExpiry(jwt) {
		try {
			const payload = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
			if (typeof payload.exp === "number") return payload.exp * 1e3 - 6e4;
		} catch {}
		return Date.now() + 36e5;
	}
	async function getToken(force = false) {
		if (!force) {
			readStoredToken();
			if (token && token.exp > Date.now()) return token.value;
		}
		if (tokenRequest) return tokenRequest;
		tokenRequest = (async () => {
			const res = await request(`${API}/auth/temporary`, { as: "json" });
			if (res.status !== 200) throw new Error(`redgifs token ${res.status}`);
			const value = (await res.json())?.token;
			if (typeof value !== "string") throw new Error("redgifs token missing");
			token = {
				value,
				exp: tokenExpiry(value)
			};
			try {
				sessionStorage.setItem(TOKEN_KEY, JSON.stringify(token));
			} catch {}
			return value;
		})().finally(() => {
			tokenRequest = null;
		});
		return tokenRequest;
	}
	async function requestGif(id, attempt = 0) {
		const auth = await getToken(attempt > 0);
		const res = await request(`${API}/gifs/${encodeURIComponent(id)}`, {
			as: "json",
			headers: { Authorization: `Bearer ${auth}` }
		});
		if ((res.status === 401 || res.status === 403) && attempt < 2) return requestGif(id, attempt + 1);
		if (res.status !== 200) throw new Error(`redgifs gif ${res.status}`);
		const gif = (await res.json())?.gif;
		if (!gif?.urls) throw new Error("redgifs gif missing");
		return {
			hd: gif.urls.hd || gif.urls.sd || "",
			sd: gif.urls.sd || gif.urls.hd || "",
			poster: gif.urls.poster || gif.urls.thumbnail || "",
			hasAudio: !!gif.hasAudio,
			width: gif.width || 0,
			height: gif.height || 0
		};
	}
	function getRedgifs(id) {
		let p = infoCache.get(id);
		if (!p) {
			p = requestGif(id);
			p.catch(() => infoCache.delete(id));
			infoCache.set(id, p);
		}
		return p;
	}
	function redgifsBlobUrl(url) {
		const cached = blobCache.get(url);
		if (cached) {
			blobCache.delete(url);
			blobCache.set(url, cached);
			return cached;
		}
		const p = (async () => {
			const res = await request(url, { as: "blob" });
			if (res.status !== 200) throw new Error(`redgifs media ${res.status}`);
			const blob = await res.blob();
			const typed = blob.type ? blob : new Blob([blob], { type: "video/mp4" });
			return URL.createObjectURL(typed);
		})();
		p.catch(() => blobCache.delete(url));
		blobCache.set(url, p);
		while (blobCache.size > BLOB_CACHE_SIZE) {
			const [oldUrl, old] = blobCache.entries().next().value;
			blobCache.delete(oldUrl);
			old.then((b) => URL.revokeObjectURL(b)).catch(() => {});
		}
		return p;
	}
	function pickRedgifsUrl(info, mobile) {
		return mobile ? info.sd || info.hd : info.hd || info.sd;
	}
	var MUTED_KEY = "@reddit-reels/muted";
	function isMobile() {
		try {
			return matchMedia("(pointer: coarse)").matches || window.innerWidth < 760;
		} catch {
			return false;
		}
	}
	function pickMp4(source, mobile) {
		if (!source.mp4.length) return "";
		if (!mobile) return source.mp4[0];
		const limit = 1280;
		return source.mp4.find((u) => {
			const m = u.match(/res_(\d+)p/);
			return m ? parseInt(m[1], 10) <= limit : false;
		}) || source.mp4[0];
	}
	function readMuted() {
		try {
			if (typeof GM_getValue === "function") {
				const v = GM_getValue(MUTED_KEY, null);
				if (v !== null) return v === "1";
			}
		} catch {}
		try {
			return localStorage.getItem(MUTED_KEY) === "1";
		} catch {
			return false;
		}
	}
	function writeMuted(muted) {
		try {
			if (typeof GM_setValue === "function") GM_setValue(MUTED_KEY, muted ? "1" : "0");
		} catch {}
		try {
			localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
		} catch {}
	}
	var Player = class {
		video;
		preloader;
		hls = null;
		generation = 0;
		captionsUrl = "";
		captionsBlob = "";
		_muted = readMuted();
		_captions = false;
		listeners = new Set();
		current = null;
		constructor() {
			this.video = document.createElement("video");
			this.video.className = "rr-video";
			this.video.playsInline = true;
			this.video.setAttribute("playsinline", "");
			this.video.setAttribute("webkit-playsinline", "");
			this.video.loop = true;
			this.video.preload = "auto";
			this.video.disableRemotePlayback = true;
			this.video.addEventListener("waiting", () => this.emit("loading"));
			this.video.addEventListener("playing", () => this.emit("ready"));
			this.video.addEventListener("volumechange", () => {
				if (this.video.muted !== this._muted && !this.autoplayMuted) {
					this._muted = this.video.muted;
					writeMuted(this._muted);
					this.emit("muted");
				}
			});
			this.preloader = document.createElement("video");
			this.preloader.muted = true;
			this.preloader.preload = "auto";
			this.preloader.playsInline = true;
		}
		autoplayMuted = false;
		get muted() {
			return this._muted;
		}
		get captions() {
			return this._captions;
		}
		on(cb) {
			this.listeners.add(cb);
			return () => this.listeners.delete(cb);
		}
		emit(e) {
			this.listeners.forEach((cb) => {
				try {
					cb(e);
				} catch {}
			});
		}
		resetSource() {
			if (this.hls) {
				this.hls.destroy();
				this.hls = null;
			}
			for (const t of this.video.querySelectorAll("track")) t.remove();
			if (this.captionsBlob) {
				URL.revokeObjectURL(this.captionsBlob);
				this.captionsBlob = "";
			}
			this.captionsUrl = "";
			this.video.removeAttribute("src");
			this.video.removeAttribute("poster");
			try {
				this.video.load();
			} catch {}
		}
		async load(post) {
			const gen = ++this.generation;
			this.current = post;
			this.autoplayMuted = false;
			this.resetSource();
			this.emit("loading");
			try {
				if (post.kind === "video" && post.video) {
					const v = post.video;
					if (v.poster) this.video.poster = v.poster;
					const mp4 = pickMp4(v, isMobile());
					if (mp4) this.video.src = mp4;
					else if (this.video.canPlayType("application/vnd.apple.mpegurl")) this.video.src = v.hls;
					else if (hls_js.default.isSupported()) {
						this.hls = new hls_js.default({
							capLevelToPlayerSize: true,
							maxBufferLength: 15,
							startLevel: -1
						});
						this.hls.loadSource(v.hls);
						this.hls.attachMedia(this.video);
					} else throw new Error("no playable source");
					if (v.captions) this.captionsUrl = v.captions;
					this.play();
					if (this._captions) this.applyCaptions(gen);
				} else if (post.kind === "redgifs" && post.redgifsId) {
					const info = await getRedgifs(post.redgifsId);
					if (gen !== this.generation) return;
					if (info.poster) this.video.poster = info.poster;
					const blob = await redgifsBlobUrl(pickRedgifsUrl(info, isMobile()));
					if (gen !== this.generation) return;
					this.video.src = blob;
					this.play();
				}
			} catch {
				if (gen === this.generation) this.emit("error");
			}
		}
		preload(post) {
			if (!post) return;
			if (post.kind === "video" && post.video) {
				const mp4 = pickMp4(post.video, isMobile());
				if (mp4 && this.preloader.src !== mp4) {
					this.preloader.src = mp4;
					try {
						this.preloader.load();
					} catch {}
				}
			} else if (post.kind === "redgifs" && post.redgifsId) getRedgifs(post.redgifsId).then((info) => redgifsBlobUrl(pickRedgifsUrl(info, isMobile()))).catch(() => {});
		}
		play() {
			const v = this.video;
			v.muted = this._muted;
			v.play()?.catch?.((err) => {
				if (err?.name === "NotAllowedError" && !v.muted) {
					this.autoplayMuted = true;
					v.muted = true;
					this.emit("autoplay-muted");
					v.play().catch(() => {});
				}
			});
		}
		pause() {
			this.video.pause();
		}
		toggle() {
			if (this.autoplayMuted && !this._muted) {
				this.autoplayMuted = false;
				this.video.muted = false;
				if (this.video.paused) this.play();
				this.emit("muted");
				return true;
			}
			if (this.video.paused) {
				this.play();
				return true;
			}
			this.video.pause();
			return false;
		}
		setMuted(muted) {
			this._muted = muted;
			this.autoplayMuted = false;
			writeMuted(muted);
			this.video.muted = muted;
			if (!muted && this.video.paused && this.video.src) this.play();
			this.emit("muted");
		}
		toggleCaptions() {
			this._captions = !this._captions;
			if (this._captions) this.applyCaptions(this.generation);
			else for (const t of this.video.querySelectorAll("track")) t.remove();
			return this._captions;
		}
		async applyCaptions(gen) {
			if (!this.captionsUrl || this.video.querySelector("track")) return;
			try {
				if (!this.captionsBlob) {
					const res = await fetch(this.captionsUrl, { credentials: "omit" });
					if (!res.ok) return;
					const blob = new Blob([await res.text()], { type: "text/vtt" });
					if (gen !== this.generation) return;
					this.captionsBlob = URL.createObjectURL(blob);
				}
				const track = document.createElement("track");
				track.kind = "subtitles";
				track.srclang = "en";
				track.default = true;
				track.src = this.captionsBlob;
				this.video.appendChild(track);
				track.track.mode = "showing";
			} catch {}
		}
		stop() {
			this.generation++;
			this.current = null;
			this.video.pause();
			this.resetSource();
			this.video.remove();
		}
	};
	function voteButton(el, dir) {
		const label = dir === "up" ? "upvote" : "downvote";
		const roots = [];
		if (el.shadowRoot) roots.push(el.shadowRoot);
		roots.push(el);
		for (const root of roots) {
			const btn = root.querySelector(`button[${label}]`) || Array.from(root.querySelectorAll("button")).find((b) => (b.getAttribute("aria-label") || "").trim().toLowerCase() === label);
			if (btn) return btn;
		}
		return null;
	}
	function readVote(post) {
		const el = post.el;
		if (!el) return 0;
		const isOn = (b) => !!b && (b.getAttribute("aria-pressed") === "true" || b.hasAttribute("data-active"));
		if (isOn(voteButton(el, "up"))) return 1;
		if (isOn(voteButton(el, "down"))) return -1;
		const attr = el.getAttribute("vote-type") || el.getAttribute("user-vote") || "";
		if (/up/i.test(attr)) return 1;
		if (/down/i.test(attr)) return -1;
		return 0;
	}
	function vote(post, dir) {
		const el = post.el;
		if (!el?.isConnected) return false;
		const btn = voteButton(el, dir);
		if (!btn) return false;
		btn.click();
		return true;
	}
	function formatCount(num) {
		if (!num || Number.isNaN(num)) return "0";
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
	function formatTime(sec) {
		if (!Number.isFinite(sec) || sec < 0) return "0:00";
		return `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, "0")}`;
	}
	var svg = (body, fill = "none") => `<svg viewBox="0 0 24 24" width="26" height="26" fill="${fill}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
	var ICONS = {
		close: svg("<line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"/><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"/>"),
		up: (on) => svg("<path d=\"M12 4l7 8h-4v8H9v-8H5z\"/>", on ? "currentColor" : "none"),
		down: (on) => svg("<path d=\"M12 20l-7-8h4V4h6v8h4z\"/>", on ? "currentColor" : "none"),
		comments: svg("<path d=\"M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z\"/>"),
		soundOn: svg("<polygon points=\"11 5 6 9 2 9 2 15 6 15 11 19 11 5\"/><path d=\"M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07\"/>"),
		soundOff: svg("<polygon points=\"11 5 6 9 2 9 2 15 6 15 11 19 11 5\"/><line x1=\"23\" y1=\"9\" x2=\"17\" y2=\"15\"/><line x1=\"17\" y1=\"9\" x2=\"23\" y2=\"15\"/>"),
		fit: svg("<polyline points=\"15 3 21 3 21 9\"/><polyline points=\"9 21 3 21 3 15\"/><line x1=\"21\" y1=\"3\" x2=\"14\" y2=\"10\"/><line x1=\"3\" y1=\"21\" x2=\"10\" y2=\"14\"/>"),
		cc: svg("<rect x=\"2\" y=\"5\" width=\"20\" height=\"14\" rx=\"3\"/><path d=\"M10 10.5a2 2 0 1 0 0 3M17 10.5a2 2 0 1 0 0 3\"/>"),
		external: svg("<path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6\"/><polyline points=\"15 3 21 3 21 9\"/><line x1=\"10\" y1=\"14\" x2=\"21\" y2=\"3\"/>"),
		play: svg("<polygon points=\"7 4 20 12 7 20 7 4\"/>", "currentColor"),
		pause: svg("<rect x=\"6\" y=\"4\" width=\"4\" height=\"16\"/><rect x=\"14\" y=\"4\" width=\"4\" height=\"16\"/>", "currentColor"),
		heart: svg("<path d=\"M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z\"/>", "currentColor"),
		reel: svg("<rect x=\"5\" y=\"2\" width=\"14\" height=\"20\" rx=\"3\"/><polygon points=\"10 9 15 12 10 15 10 9\" fill=\"currentColor\"/>")
	};
	var reel_default = "/* Reel overlay. Lives in a shadow root: Reddit's CSS can't reach in, ours can't leak out. */\n:host {\n  all: initial;\n}\n\n* {\n  box-sizing: border-box;\n}\n\n.reel {\n  position: fixed;\n  inset: 0;\n  z-index: 2147483646;\n  background: #000;\n  color: #fff;\n  font:\n    15px / 1.35 -apple-system,\n    BlinkMacSystemFont,\n    \"Segoe UI\",\n    Roboto,\n    Helvetica,\n    Arial,\n    sans-serif;\n  -webkit-font-smoothing: antialiased;\n  -webkit-tap-highlight-color: transparent;\n  user-select: none;\n  -webkit-user-select: none;\n}\n\nbutton {\n  font: inherit;\n  color: inherit;\n  background: none;\n  border: 0;\n  padding: 0;\n  margin: 0;\n  cursor: pointer;\n  -webkit-tap-highlight-color: transparent;\n}\n\nbutton:focus-visible,\na:focus-visible {\n  outline: 2px solid #ff4500;\n  outline-offset: 2px;\n}\n\n/* ---------- Vertical track ---------- */\n.track {\n  position: absolute;\n  inset: 0;\n  overflow-y: auto;\n  overflow-x: hidden;\n  scroll-snap-type: y mandatory;\n  overscroll-behavior: contain;\n  scrollbar-width: none;\n}\n\n.track::-webkit-scrollbar {\n  display: none;\n}\n\n.slide {\n  position: relative;\n  height: 100%;\n  width: 100%;\n  overflow: hidden;\n  scroll-snap-align: start;\n  scroll-snap-stop: always;\n  contain: strict;\n  background: #000;\n}\n\n.slide.end {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: #9aa0a6;\n  font-size: 14px;\n}\n\n/* ---------- Media ---------- */\n.backdrop {\n  position: absolute;\n  inset: -40px;\n  width: calc(100% + 80px);\n  height: calc(100% + 80px);\n  object-fit: cover;\n  filter: blur(28px) brightness(0.45);\n  transform: translateZ(0);\n  pointer-events: none;\n}\n\n.media {\n  position: absolute;\n  inset: 0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n\n.media > video,\n.media > img.main {\n  width: 100%;\n  height: 100%;\n  object-fit: contain;\n  background: transparent;\n  display: block;\n}\n\n.reel.fill .media > video,\n.reel.fill .media > img.main,\n.slide.portrait .media > video {\n  object-fit: cover;\n}\n\n.reel.fit .slide.portrait .media > video {\n  object-fit: contain;\n}\n\n.media > iframe {\n  width: 100%;\n  height: min(100%, 56.25vw);\n  border: 0;\n  background: #000;\n}\n\n.slide.vertical-embed .media > iframe {\n  height: 100%;\n}\n\n.shade {\n  position: absolute;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  height: 45%;\n  background: linear-gradient(to top, rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0));\n  pointer-events: none;\n}\n\n.shade.top {\n  top: 0;\n  bottom: auto;\n  height: 120px;\n  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0));\n}\n\n/* Gallery: native-feeling horizontal swipe */\n.gallery {\n  position: absolute;\n  inset: 0;\n  display: flex;\n  overflow-x: auto;\n  overflow-y: hidden;\n  scroll-snap-type: x mandatory;\n  overscroll-behavior-x: contain;\n  scrollbar-width: none;\n}\n\n.gallery::-webkit-scrollbar {\n  display: none;\n}\n\n.gallery > div {\n  flex: 0 0 100%;\n  height: 100%;\n  scroll-snap-align: center;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n\n.gallery img {\n  width: 100%;\n  height: 100%;\n  object-fit: contain;\n}\n\n.count {\n  position: absolute;\n  top: calc(64px + env(safe-area-inset-top, 0px));\n  right: 14px;\n  padding: 4px 10px;\n  border-radius: 999px;\n  background: rgba(0, 0, 0, 0.55);\n  font-size: 12px;\n  font-weight: 700;\n  pointer-events: none;\n}\n\n/* Text / link cards */\n.card {\n  position: absolute;\n  inset: calc(70px + env(safe-area-inset-top, 0px)) 76px calc(150px + env(safe-area-inset-bottom, 0px)) 16px;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n}\n\n.card-inner {\n  max-height: 100%;\n  overflow-y: auto;\n  overscroll-behavior: contain;\n  padding: 20px;\n  border-radius: 16px;\n  background: #16171b;\n  border: 1px solid #2a2c33;\n  user-select: text;\n  -webkit-user-select: text;\n}\n\n.card h2 {\n  margin: 0 0 12px;\n  font-size: 20px;\n  line-height: 1.3;\n}\n\n.card p {\n  margin: 0;\n  color: #d7dadc;\n  white-space: pre-wrap;\n  word-break: break-word;\n}\n\n.card img {\n  width: 100%;\n  max-height: 40vh;\n  object-fit: cover;\n  border-radius: 10px;\n  margin-bottom: 12px;\n}\n\n.card .domain {\n  color: #9aa0a6;\n  font-size: 13px;\n  margin-bottom: 14px;\n}\n\n.card a.cta {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  padding: 10px 16px;\n  border-radius: 999px;\n  background: #ff4500;\n  color: #fff;\n  font-weight: 700;\n  text-decoration: none;\n}\n\n.card a.cta svg {\n  width: 18px;\n  height: 18px;\n}\n\n/* ---------- Chrome ---------- */\n.top {\n  position: absolute;\n  top: 0;\n  left: 0;\n  right: 0;\n  padding: calc(10px + env(safe-area-inset-top, 0px)) 12px 0;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  z-index: 5;\n  pointer-events: none;\n}\n\n.top button {\n  pointer-events: auto;\n}\n\n.icon-btn {\n  width: 44px;\n  height: 44px;\n  border-radius: 999px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  background: rgba(0, 0, 0, 0.35);\n  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6));\n}\n\n.icon-btn svg {\n  width: 24px;\n  height: 24px;\n}\n\n.feed-name {\n  font-weight: 700;\n  font-size: 15px;\n  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);\n  max-width: 50vw;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.info {\n  position: absolute;\n  left: 14px;\n  right: 78px;\n  bottom: calc(22px + env(safe-area-inset-bottom, 0px));\n  z-index: 3;\n  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);\n}\n\n.meta {\n  display: flex;\n  gap: 6px;\n  align-items: center;\n  font-size: 13px;\n  margin-bottom: 6px;\n  flex-wrap: wrap;\n}\n\n.meta a {\n  color: #fff;\n  text-decoration: none;\n  font-weight: 700;\n}\n\n.meta .author {\n  color: #d7dadc;\n  font-weight: 500;\n}\n\n.nsfw {\n  padding: 1px 6px;\n  border-radius: 4px;\n  background: #d93a00;\n  font-size: 11px;\n  font-weight: 800;\n}\n\n.title {\n  margin: 0;\n  font-size: 15px;\n  font-weight: 600;\n  display: -webkit-box;\n  -webkit-line-clamp: 3;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n  word-break: break-word;\n}\n\n.title.open {\n  -webkit-line-clamp: unset;\n  max-height: 40vh;\n  overflow-y: auto;\n}\n\n.rail {\n  position: absolute;\n  right: 8px;\n  bottom: calc(22px + env(safe-area-inset-bottom, 0px));\n  z-index: 4;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 14px;\n}\n\n.rail .item {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 2px;\n  font-size: 12px;\n  font-weight: 700;\n  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);\n}\n\n.rail button {\n  width: 48px;\n  height: 48px;\n  border-radius: 999px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.7));\n}\n\n.rail button:active {\n  transform: scale(0.9);\n}\n\n.rail .up.on {\n  color: #ff4500;\n}\n\n.rail .down.on {\n  color: #7193ff;\n}\n\n.rail .cc.on {\n  color: #ff4500;\n}\n\n.slide.has-video .info,\n.slide.has-video .rail {\n  bottom: calc(34px + env(safe-area-inset-bottom, 0px));\n}\n\n/* Seek bar: thin, with a tall invisible touch target */\n.seek {\n  position: absolute;\n  left: 0;\n  right: 0;\n  bottom: env(safe-area-inset-bottom, 0px);\n  height: 24px;\n  z-index: 6;\n  display: flex;\n  align-items: flex-end;\n  touch-action: none;\n  cursor: pointer;\n}\n\n.seek .rail-line {\n  position: relative;\n  width: 100%;\n  height: 3px;\n  background: rgba(255, 255, 255, 0.25);\n  transition: height 0.12s ease;\n}\n\n.seek.dragging .rail-line,\n.seek:hover .rail-line {\n  height: 6px;\n}\n\n.seek .fill {\n  position: absolute;\n  inset: 0 auto 0 0;\n  width: 0;\n  background: #fff;\n}\n\n.seek .buffer {\n  position: absolute;\n  inset: 0 auto 0 0;\n  width: 0;\n  background: rgba(255, 255, 255, 0.35);\n}\n\n.time {\n  position: absolute;\n  bottom: calc(30px + env(safe-area-inset-bottom, 0px));\n  left: 50%;\n  transform: translateX(-50%);\n  padding: 4px 10px;\n  border-radius: 999px;\n  background: rgba(0, 0, 0, 0.6);\n  font-size: 13px;\n  font-weight: 700;\n  font-variant-numeric: tabular-nums;\n  display: none;\n  z-index: 7;\n}\n\n.seek.dragging + .time {\n  display: block;\n}\n\n/* ---------- Feedback ---------- */\n.spinner {\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  width: 44px;\n  height: 44px;\n  margin: -22px 0 0 -22px;\n  border-radius: 50%;\n  border: 3px solid rgba(255, 255, 255, 0.25);\n  border-top-color: #fff;\n  animation: spin 0.8s linear infinite;\n  display: none;\n  pointer-events: none;\n  z-index: 2;\n}\n\n.slide.loading .spinner {\n  display: block;\n}\n\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n\n.pulse {\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  width: 84px;\n  height: 84px;\n  margin: -42px 0 0 -42px;\n  border-radius: 50%;\n  background: rgba(0, 0, 0, 0.45);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  pointer-events: none;\n  z-index: 8;\n  animation: pulse 0.6s ease-out forwards;\n}\n\n.pulse.heart {\n  background: none;\n  color: #ff4500;\n}\n\n.pulse svg {\n  width: 40px;\n  height: 40px;\n}\n\n.pulse.heart svg {\n  width: 90px;\n  height: 90px;\n  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5));\n}\n\n@keyframes pulse {\n  0% {\n    opacity: 0;\n    transform: scale(0.6);\n  }\n  30% {\n    opacity: 1;\n    transform: scale(1.05);\n  }\n  100% {\n    opacity: 0;\n    transform: scale(1.2);\n  }\n}\n\n.unmute-hint {\n  position: absolute;\n  top: calc(64px + env(safe-area-inset-top, 0px));\n  left: 50%;\n  transform: translateX(-50%);\n  padding: 8px 14px;\n  border-radius: 999px;\n  background: rgba(0, 0, 0, 0.7);\n  font-size: 13px;\n  font-weight: 700;\n  display: none;\n  align-items: center;\n  gap: 6px;\n  z-index: 6;\n}\n\n.unmute-hint svg {\n  width: 18px;\n  height: 18px;\n}\n\n.reel.autoplay-muted .slide.active .unmute-hint {\n  display: inline-flex;\n}\n\n.toast {\n  position: absolute;\n  left: 50%;\n  bottom: calc(110px + env(safe-area-inset-bottom, 0px));\n  transform: translateX(-50%);\n  padding: 10px 16px;\n  border-radius: 12px;\n  background: rgba(30, 31, 36, 0.95);\n  font-size: 14px;\n  z-index: 9;\n  max-width: 86vw;\n  text-align: center;\n  pointer-events: none;\n  opacity: 0;\n  transition: opacity 0.2s ease;\n}\n\n.toast.show {\n  opacity: 1;\n}\n\n.error {\n  position: absolute;\n  inset: auto 0 50% 0;\n  text-align: center;\n  color: #d7dadc;\n  font-size: 14px;\n  z-index: 2;\n}\n\n.error a {\n  color: #ff4500;\n}\n\n/* ---------- Wider screens: keep the reel a phone-shaped column ---------- */\n@media (min-width: 900px) and (pointer: fine) {\n  .slide-inner {\n    position: absolute;\n    top: 0;\n    bottom: 0;\n    left: 50%;\n    width: min(100vw, calc(100dvh * 9 / 16));\n    transform: translateX(-50%);\n  }\n\n  .rail {\n    right: -68px;\n  }\n\n  .info {\n    right: 14px;\n  }\n\n  .card {\n    right: 16px;\n  }\n}\n\n@media (max-width: 899px), (pointer: coarse) {\n  .slide-inner {\n    position: absolute;\n    inset: 0;\n  }\n}\n\n/* Text / link cards already show the title */\n.slide.kind-text .info .title,\n.slide.kind-link .info .title {\n  display: none;\n}\n";
	var REDDIT = "https://www.reddit.com";
	function postUrl(post) {
		if (post.permalink.startsWith("http")) return post.permalink;
		return `${typeof location !== "undefined" ? location.origin : REDDIT}${post.permalink}`;
	}
	function isVideoKind(post) {
		return post.kind === "video" || post.kind === "redgifs";
	}
	function posterOf(post) {
		if (post.kind === "video") return post.video?.poster || "";
		if (post.kind === "gallery" || post.kind === "image") return post.images?.[0] || "";
		return "";
	}
	function buildSlide(post, index) {
		const root = document.createElement("section");
		root.className = `slide kind-${post.kind}${isVideoKind(post) ? " has-video" : ""}`;
		root.dataset.index = String(index);
		root.dataset.id = post.id;
		if (post.video && post.video.height / Math.max(1, post.video.width) >= 1.5) root.classList.add("portrait");
		const sub = escapeHtml(post.subreddit);
		const subHref = post.subreddit ? `${REDDIT}/${encodeURI(post.subreddit)}/` : "";
		const author = escapeHtml(post.author);
		root.innerHTML = `
    <div class="slide-inner">
      <div class="media"></div>
      <div class="spinner"></div>
      <div class="shade top"></div>
      <div class="shade"></div>
      <div class="unmute-hint">${ICONS.soundOff}<span>Tap for sound</span></div>
      <div class="info">
        <div class="meta">
          ${sub ? `<a class="sub" href="${escapeHtml(subHref)}">${sub}</a>` : ""}
          ${author ? `<span class="author">u/${author}</span>` : ""}
          ${post.nsfw ? "<span class=\"nsfw\">NSFW</span>" : ""}
        </div>
        <p class="title">${escapeHtml(post.title)}</p>
      </div>
      <div class="rail">
        <div class="item">
          <button type="button" class="up" data-action="up" aria-label="Upvote" aria-pressed="false">${ICONS.up(false)}</button>
          <span class="score">${formatCount(post.score)}</span>
          <button type="button" class="down" data-action="down" aria-label="Downvote" aria-pressed="false">${ICONS.down(false)}</button>
        </div>
        <div class="item">
          <button type="button" data-action="comments" aria-label="Open comments">${ICONS.comments}</button>
          <span>${formatCount(post.comments)}</span>
        </div>
        ${post.kind === "video" && post.video?.captions ? `<div class="item"><button type="button" class="cc" data-action="captions" aria-label="Captions" aria-pressed="false">${ICONS.cc}</button></div>` : ""}
        ${isVideoKind(post) || post.kind === "image" || post.kind === "gallery" ? `<div class="item"><button type="button" data-action="fit" aria-label="Fit or fill screen">${ICONS.fit}</button></div>` : ""}
      </div>
    </div>
  `;
		return {
			root,
			inner: root.querySelector(".slide-inner"),
			media: root.querySelector(".media"),
			backdrop: null,
			mounted: false
		};
	}
	function img(src, cls = "main") {
		const el = document.createElement("img");
		el.className = cls;
		el.decoding = "async";
		el.referrerPolicy = "no-referrer";
		el.alt = "";
		el.draggable = false;
		el.src = src;
		return el;
	}
	function mountSlide(refs, post, active) {
		if (refs.mounted) {
			if (post.kind === "embed") syncEmbed(refs, post, active);
			return;
		}
		refs.mounted = true;
		const poster = posterOf(post);
		if (poster && post.kind !== "gallery") {
			refs.backdrop = img(poster, "backdrop");
			refs.root.insertBefore(refs.backdrop, refs.inner);
		}
		if (post.kind === "image" && post.images?.[0]) refs.media.appendChild(img(post.images[0]));
		else if (post.kind === "gallery" && post.images?.length) {
			const strip = document.createElement("div");
			strip.className = "gallery";
			for (const src of post.images) {
				const cell = document.createElement("div");
				const im = img(src, "");
				im.loading = "lazy";
				cell.appendChild(im);
				strip.appendChild(cell);
			}
			const count = document.createElement("div");
			count.className = "count";
			count.textContent = `1/${post.images.length}`;
			strip.addEventListener("scroll", () => {
				const i = Math.round(strip.scrollLeft / Math.max(1, strip.clientWidth));
				count.textContent = `${i + 1}/${post.images.length}`;
			}, { passive: true });
			refs.media.append(strip, count);
		} else if (post.kind === "video" && post.video?.poster) refs.media.appendChild(img(post.video.poster, "main poster"));
		else if (post.kind === "text" || post.kind === "link") refs.media.appendChild(buildCard(post));
		else if (post.kind === "embed") syncEmbed(refs, post, active);
	}
	function syncEmbed(refs, post, active) {
		const existing = refs.media.querySelector("iframe");
		if (active && !existing && post.embedUrl && isSafeUrl(post.embedUrl)) {
			const frame = document.createElement("iframe");
			frame.src = post.embedUrl;
			frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
			frame.setAttribute("allowfullscreen", "");
			frame.referrerPolicy = "strict-origin-when-cross-origin";
			refs.media.appendChild(frame);
			if (/shorts\/|streamable/i.test(post.linkUrl || post.embedUrl)) refs.root.classList.add("vertical-embed");
		} else if (!active && existing) existing.remove();
	}
	function buildCard(post) {
		const card = document.createElement("div");
		card.className = "card";
		const inner = document.createElement("div");
		inner.className = "card-inner";
		if (post.kind === "link") {
			const href = post.linkUrl && isSafeUrl(post.linkUrl) ? post.linkUrl : "";
			inner.innerHTML = `
      ${post.thumbnail ? "<img class=\"thumb\" alt=\"\">" : ""}
      <div class="domain">${escapeHtml(extractDomain(href))}</div>
      <h2>${escapeHtml(post.title)}</h2>
      ${href ? `<a class="cta" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">Open link ${ICONS.external}</a>` : ""}
    `;
			const thumb = inner.querySelector("img.thumb");
			if (thumb && post.thumbnail) {
				thumb.referrerPolicy = "no-referrer";
				thumb.src = post.thumbnail;
			}
		} else inner.innerHTML = `<h2>${escapeHtml(post.title)}</h2>${post.text ? `<p>${escapeHtml(post.text)}</p>` : ""}`;
		card.appendChild(inner);
		return card;
	}
	function unmountSlide(refs) {
		if (!refs.mounted) return;
		refs.mounted = false;
		refs.backdrop?.remove();
		refs.backdrop = null;
		Array.from(refs.media.children).forEach((c) => {
			if (!(c instanceof HTMLVideoElement)) c.remove();
		});
		refs.root.classList.remove("vertical-embed", "loading");
	}
	function setVoteUi(refs, state, score) {
		const up = refs.root.querySelector("button.up");
		const down = refs.root.querySelector("button.down");
		if (up) {
			up.classList.toggle("on", state === 1);
			up.setAttribute("aria-pressed", String(state === 1));
			up.innerHTML = ICONS.up(state === 1);
		}
		if (down) {
			down.classList.toggle("on", state === -1);
			down.setAttribute("aria-pressed", String(state === -1));
			down.innerHTML = ICONS.down(state === -1);
		}
		const label = refs.root.querySelector(".score");
		if (label) label.textContent = formatCount(score);
	}
	var MOUNT_RADIUS = 1;
	var LOAD_AHEAD = 5;
	var TAP_MS = 260;
	var Reel = class {
		opts;
		host;
		shadow;
		el;
		track;
		toastEl;
		soundBtn;
		slides = [];
		active = -1;
		observer = null;
		player = new Player();
		cleanup = [];
		tapTimer = null;
		lastTap = 0;
		seekEl = null;
		timeEl = null;
		votes = new Map();
		endEl = null;
		constructor(opts) {
			this.opts = opts;
			this.host = document.createElement("div");
			this.host.id = "rr-reel-host";
			this.shadow = this.host.attachShadow({ mode: "open" });
		}
		get activePost() {
			return this.opts.source.posts[this.active] || null;
		}
		open(startIndex) {
			const style = document.createElement("style");
			style.textContent = reel_default;
			this.el = document.createElement("div");
			this.el.className = "reel";
			this.el.setAttribute("role", "dialog");
			this.el.setAttribute("aria-label", "Reddit reels");
			this.el.innerHTML = `
      <div class="track" tabindex="-1"></div>
      <div class="top">
        <button type="button" class="icon-btn" data-action="close" aria-label="Close reels">${ICONS.close}</button>
        <span class="feed-name"></span>
        <button type="button" class="icon-btn" data-action="sound" aria-label="Mute"></button>
      </div>
      <div class="toast" role="status" aria-live="polite"></div>
    `;
			this.shadow.append(style, this.el);
			this.track = this.el.querySelector(".track");
			this.toastEl = this.el.querySelector(".toast");
			this.soundBtn = this.el.querySelector("[data-action=\"sound\"]");
			this.el.querySelector(".feed-name").textContent = this.opts.feedName;
			document.documentElement.appendChild(this.host);
			this.observer = new IntersectionObserver((entries) => this.onIntersect(entries), {
				root: this.track,
				threshold: [.6]
			});
			this.appendSlides(this.opts.source.posts);
			this.cleanup.push(this.opts.source.onAdded((added) => this.appendSlides(added)));
			this.wireEvents();
			this.syncSound();
			const start = Math.max(0, Math.min(startIndex, this.slides.length - 1));
			this.track.scrollTop = start * this.track.clientHeight;
			this.activate(start);
			this.track.focus({ preventScroll: true });
		}
		close() {
			this.player.stop();
			this.observer?.disconnect();
			for (const fn of this.cleanup) fn();
			this.cleanup = [];
			this.host.remove();
		}
		appendSlides(posts) {
			for (const post of posts) {
				if (this.slides.some((s) => s.root.dataset.id === post.id)) continue;
				const refs = buildSlide(post, this.slides.length);
				this.slides.push(refs);
				this.track.insertBefore(refs.root, this.endEl);
				this.observer?.observe(refs.root);
				this.votes.set(post.id, readVote(post));
				setVoteUi(refs, this.votes.get(post.id) || 0, post.score);
			}
			this.syncEnd();
			if (this.active >= 0) this.mountAround(this.active);
		}
		syncEnd() {
			if (!this.endEl) {
				this.endEl = document.createElement("section");
				this.endEl.className = "slide end";
				this.track.appendChild(this.endEl);
				this.observer?.observe(this.endEl);
			}
			this.endEl.textContent = this.opts.source.hasMore ? "Loading more…" : "You're all caught up";
		}
		onIntersect(entries) {
			for (const e of entries) {
				if (!e.isIntersecting) continue;
				if (e.target === this.endEl) {
					this.loadMore();
					continue;
				}
				const i = Number(e.target.dataset.index);
				if (Number.isFinite(i) && i !== this.active) this.activate(i);
			}
		}
		mountAround(center) {
			this.slides.forEach((refs, i) => {
				const post = this.opts.source.posts[i];
				if (!post) return;
				if (Math.abs(i - center) <= MOUNT_RADIUS) mountSlide(refs, post, i === center);
				else unmountSlide(refs);
			});
		}
		activate(i) {
			const posts = this.opts.source.posts;
			const post = posts[i];
			if (!post) return;
			this.slides[this.active]?.root.classList.remove("active", "loading");
			this.active = i;
			if (this.target === i) this.target = -1;
			const refs = this.slides[i];
			refs.root.classList.add("active");
			this.mountAround(i);
			this.removeSeek();
			this.track.querySelectorAll("iframe.rg-fallback").forEach((f) => {
				if (!refs.root.contains(f)) f.remove();
			});
			if (isVideoKind(post)) {
				refs.media.querySelector("img.poster")?.remove();
				refs.media.prepend(this.player.video);
				refs.root.classList.add("loading");
				this.addSeek(refs);
				this.player.load(post);
				this.player.preload(posts[i + 1]);
			} else {
				this.player.stop();
				if (posts[i + 1]) this.player.preload(posts[i + 1]);
			}
			if (i >= posts.length - LOAD_AHEAD) this.loadMore();
		}
		loadMore() {
			if (!this.opts.source.hasMore) {
				this.syncEnd();
				return;
			}
			this.opts.source.loadMore().then(() => this.syncEnd());
		}
		target = -1;
		go(delta) {
			const from = this.target >= 0 ? this.target : this.active;
			const next = Math.max(0, Math.min(this.slides.length - 1, from + delta));
			this.target = next;
			this.slides[next]?.root.scrollIntoView({
				behavior: "smooth",
				block: "start"
			});
		}
		wireEvents() {
			const onClick = (e) => this.onClick(e);
			this.el.addEventListener("click", onClick);
			const onKey = (e) => this.onKey(e);
			window.addEventListener("keydown", onKey, true);
			this.cleanup.push(() => window.removeEventListener("keydown", onKey, true));
			const offPlayer = this.player.on((ev) => {
				const refs = this.slides[this.active];
				if (ev === "ready") refs?.root.classList.remove("loading");
				if (ev === "loading" && this.player.video.readyState < 3) refs?.root.classList.add("loading");
				if (ev === "error") {
					refs?.root.classList.remove("loading");
					const post = this.activePost;
					if (refs && post?.kind === "redgifs" && post.redgifsId) this.redgifsFallback(refs, post.redgifsId);
					else this.showError(refs);
				}
				if (ev === "muted" || ev === "autoplay-muted") this.syncSound();
			});
			this.cleanup.push(offPlayer);
			const v = this.player.video;
			const onTime = () => this.updateSeek();
			v.addEventListener("timeupdate", onTime);
			v.addEventListener("progress", onTime);
			v.addEventListener("loadedmetadata", () => {
				const refs = this.slides[this.active];
				if (refs && v.videoWidth && v.videoHeight) refs.root.classList.toggle("portrait", v.videoHeight / v.videoWidth >= 1.5);
			});
		}
		onClick(e) {
			const target = e.composedPath()[0];
			const btn = target.closest?.("[data-action]");
			if (btn) {
				e.preventDefault();
				this.runAction(btn.dataset.action || "", btn);
				return;
			}
			if (target.closest?.("a, .card-inner, .seek, .gallery .count")) return;
			if (target.closest?.(".title")) {
				target.closest(".title")?.classList.toggle("open");
				return;
			}
			if (!target.closest?.(".slide")) return;
			const now = Date.now();
			if (now - this.lastTap < TAP_MS) {
				this.lastTap = 0;
				if (this.tapTimer) clearTimeout(this.tapTimer);
				this.tapTimer = null;
				this.doubleTap();
				return;
			}
			this.lastTap = now;
			this.tapTimer = setTimeout(() => {
				this.tapTimer = null;
				this.singleTap();
			}, TAP_MS);
		}
		singleTap() {
			const post = this.activePost;
			if (!post || !isVideoKind(post)) return;
			const playing = this.player.toggle();
			this.pulse(playing ? ICONS.play : ICONS.pause);
		}
		doubleTap() {
			const post = this.activePost;
			if (!post) return;
			if (this.votes.get(post.id) !== 1) this.doVote(post, "up");
			this.pulse(ICONS.heart, "heart");
		}
		runAction(action, btn) {
			const post = this.activePost;
			switch (action) {
				case "close":
					this.opts.onClose(post);
					break;
				case "sound":
					this.player.setMuted(this.player.autoplayMuted ? false : !this.player.muted);
					this.syncSound();
					break;
				case "up":
				case "down":
					if (post) this.doVote(post, action);
					break;
				case "comments":
					if (post) this.opts.onOpenComments(post);
					break;
				case "captions": {
					const on = this.player.toggleCaptions();
					btn.classList.toggle("on", on);
					btn.setAttribute("aria-pressed", String(on));
					break;
				}
				case "fit":
					this.el.classList.toggle("fill");
					this.toast(this.el.classList.contains("fill") ? "Fill screen" : "Fit to screen");
			}
		}
		onKey(e) {
			const t = e.composedPath()[0];
			if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
			const k = e.key;
			let handled = true;
			if (k === "ArrowDown" || k === "j" || k === "J" || k === "PageDown") this.go(1);
			else if (k === "ArrowUp" || k === "k" || k === "K" || k === "PageUp") this.go(-1);
			else if (k === " " || k === "Spacebar") this.singleTap();
			else if (k === "m" || k === "M") this.runAction("sound", this.soundBtn);
			else if (k === "f" || k === "F") this.runAction("fit", this.soundBtn);
			else if (k === "c" || k === "C") {
				const cc = this.slides[this.active]?.root.querySelector("[data-action=\"captions\"]");
				if (cc) this.runAction("captions", cc);
			} else if (k === "Escape") this.opts.onClose(this.activePost);
			else if (k === "ArrowRight" || k === "ArrowLeft") {
				const strip = this.slides[this.active]?.media.querySelector(".gallery");
				if (strip) strip.scrollBy({
					left: (k === "ArrowRight" ? 1 : -1) * strip.clientWidth,
					behavior: "smooth"
				});
				else if (isVideoKind(this.activePost)) this.player.video.currentTime += k === "ArrowRight" ? 5 : -5;
			} else handled = false;
			if (handled) {
				e.preventDefault();
				e.stopPropagation();
			}
		}
		doVote(post, dir) {
			if (!post.el?.isConnected) {
				this.toast("Open the post on Reddit to vote");
				return;
			}
			if (document.querySelector("#login-button, a[href*=\"/login\"]") && !document.querySelector("#expand-user-drawer-button")) {
				this.toast("Log in to Reddit to vote");
				return;
			}
			const before = this.votes.get(post.id) || 0;
			if (!vote(post, dir)) {
				this.toast("Voting is not available for this post");
				return;
			}
			const wanted = dir === "up" ? 1 : -1;
			const after = before === wanted ? 0 : wanted;
			this.votes.set(post.id, after);
			const refs = this.slides[this.opts.source.posts.indexOf(post)];
			if (refs) setVoteUi(refs, after, post.score + after - before);
			setTimeout(() => {
				const real = readVote(post);
				if (real !== after && post.el?.isConnected && refs) {
					this.votes.set(post.id, real);
					setVoteUi(refs, real, post.score + real - before);
				}
			}, 900);
		}
		addSeek(refs) {
			const seek = document.createElement("div");
			seek.className = "seek";
			seek.setAttribute("role", "slider");
			seek.setAttribute("aria-label", "Seek");
			seek.innerHTML = "<div class=\"rail-line\"><div class=\"buffer\"></div><div class=\"fill\"></div></div>";
			const time = document.createElement("div");
			time.className = "time";
			refs.inner.append(seek, time);
			this.seekEl = seek;
			this.timeEl = time;
			const v = this.player.video;
			const seekTo = (clientX) => {
				const rect = seek.getBoundingClientRect();
				const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)));
				if (Number.isFinite(v.duration)) {
					v.currentTime = ratio * v.duration;
					time.textContent = `${formatTime(v.currentTime)} / ${formatTime(v.duration)}`;
				}
				this.updateSeek();
			};
			seek.addEventListener("pointerdown", (e) => {
				e.stopPropagation();
				seek.setPointerCapture(e.pointerId);
				seek.classList.add("dragging");
				seekTo(e.clientX);
			});
			seek.addEventListener("pointermove", (e) => {
				if (seek.classList.contains("dragging")) seekTo(e.clientX);
			});
			const end = (e) => {
				seek.classList.remove("dragging");
				try {
					seek.releasePointerCapture(e.pointerId);
				} catch {}
			};
			seek.addEventListener("pointerup", end);
			seek.addEventListener("pointercancel", end);
			seek.addEventListener("click", (e) => e.stopPropagation());
		}
		removeSeek() {
			this.seekEl?.remove();
			this.timeEl?.remove();
			this.seekEl = null;
			this.timeEl = null;
		}
		updateSeek() {
			const seek = this.seekEl;
			const v = this.player.video;
			if (!seek || !Number.isFinite(v.duration) || v.duration <= 0) return;
			seek.querySelector(".fill").style.width = `${v.currentTime / v.duration * 100}%`;
			try {
				if (v.buffered.length) {
					const end = v.buffered.end(v.buffered.length - 1);
					seek.querySelector(".buffer").style.width = `${end / v.duration * 100}%`;
				}
			} catch {}
		}
		syncSound() {
			const muted = this.player.muted || this.player.autoplayMuted;
			this.soundBtn.innerHTML = muted ? ICONS.soundOff : ICONS.soundOn;
			this.soundBtn.setAttribute("aria-label", muted ? "Unmute" : "Mute");
			this.el.classList.toggle("autoplay-muted", this.player.autoplayMuted && !this.player.muted);
		}
		pulse(icon, cls = "") {
			const refs = this.slides[this.active];
			if (!refs) return;
			const p = document.createElement("div");
			p.className = `pulse ${cls}`;
			p.innerHTML = icon;
			refs.inner.appendChild(p);
			setTimeout(() => p.remove(), 650);
		}
		toastTimer = null;
		toast(message) {
			this.toastEl.textContent = message;
			this.toastEl.classList.add("show");
			if (this.toastTimer) clearTimeout(this.toastTimer);
			this.toastTimer = setTimeout(() => this.toastEl.classList.remove("show"), 1800);
		}
		redgifsFallback(refs, id) {
			this.player.stop();
			this.removeSeek();
			if (refs.media.querySelector("iframe.rg-fallback")) return;
			const frame = document.createElement("iframe");
			frame.className = "rg-fallback";
			frame.src = `https://www.redgifs.com/ifr/${encodeURIComponent(id)}`;
			frame.allow = "autoplay; fullscreen";
			refs.root.classList.add("vertical-embed");
			refs.media.appendChild(frame);
		}
		showError(refs) {
			const post = this.activePost;
			if (!refs || !post || refs.inner.querySelector(".error")) return;
			const box = document.createElement("div");
			box.className = "error";
			box.innerHTML = `Couldn't play this one. <a href="${postUrl(post)}" target="_blank" rel="noopener">Open on Reddit</a>`;
			refs.inner.appendChild(box);
			if (isMobile()) this.toast("Swipe for the next one");
		}
	};
	var CSS = `
:host { all: initial; }
button {
  position: fixed;
  right: calc(16px + env(safe-area-inset-right, 0px));
  bottom: calc(88px + env(safe-area-inset-bottom, 0px));
  z-index: 2147483000;
  width: 56px;
  height: 56px;
  border-radius: 999px;
  border: 0;
  background: #ff4500;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.15s ease;
}
button:active { transform: scale(0.92); }
button:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
button svg { width: 28px; height: 28px; }
@media (pointer: fine) and (min-width: 900px) {
  button { bottom: 28px; right: 28px; }
}
`;
	function createFab(onClick) {
		const host = document.createElement("div");
		host.id = "rr-fab-host";
		const shadow = host.attachShadow({ mode: "open" });
		const style = document.createElement("style");
		style.textContent = CSS;
		const btn = document.createElement("button");
		btn.type = "button";
		btn.setAttribute("aria-label", "Open reels");
		btn.title = "Reels";
		btn.innerHTML = ICONS.reel;
		btn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			onClick();
		});
		shadow.append(style, btn);
		return host;
	}
	var RESUME_KEY = "@reddit-reels/resume";
	var RESUME_MS = 18e5;
	var PAGE_CSS = `
html.rr-open { overflow: hidden !important; }
html.rr-open body { display: none !important; }
`;
	var source = new FeedSource();
	var reel = null;
	var fab = null;
	var sourcePath = location.pathname;
	var savedRestoration = "auto";
	function feedName(path) {
		const p = path.replace(/\/+$/, "");
		const sub = p.match(/^\/r\/([^/]+)/);
		if (sub) return `r/${sub[1]}`;
		const user = p.match(/^\/(?:user|u)\/([^/]+)/);
		if (user) return `u/${user[1]}`;
		return "Home";
	}
	function nearestPostIndex(posts) {
		const mid = window.innerHeight / 2;
		let best = 0;
		let bestDist = Infinity;
		posts.forEach((p, i) => {
			if (!p.el?.isConnected) return;
			const r = p.el.getBoundingClientRect();
			if (r.height === 0) return;
			const d = Math.abs(r.top + r.height / 2 - mid);
			if (d < bestDist) {
				bestDist = d;
				best = i;
			}
		});
		return best;
	}
	function pausePageMedia() {
		const walk = (root) => {
			root.querySelectorAll("video").forEach((v) => {
				try {
					v.pause();
				} catch {}
			});
			root.querySelectorAll("*").forEach((el) => {
				if (el.shadowRoot) walk(el.shadowRoot);
			});
		};
		walk(document);
	}
	function readResume() {
		try {
			const raw = sessionStorage.getItem(RESUME_KEY);
			if (!raw) return null;
			const r = JSON.parse(raw);
			if (Date.now() - r.ts > RESUME_MS || typeof r.id !== "string") return null;
			return r;
		} catch {
			return null;
		}
	}
	function resumeIfReturning() {
		const r = readResume();
		if (!r) return;
		const here = location.pathname;
		if (here === r.path && isReelRoute(here)) {
			let tries = 0;
			const attempt = () => {
				if (location.pathname !== r.path || reel) return;
				openReel(r.id);
				if (!reel && ++tries < 15) setTimeout(attempt, 300);
			};
			attempt();
		} else if (here !== r.via) clearResume();
	}
	var leavingForComments = false;
	function clearResume() {
		try {
			sessionStorage.removeItem(RESUME_KEY);
		} catch {}
	}
	function openReel(startId) {
		if (reel) return;
		if (location.pathname !== sourcePath) {
			source.reset();
			source = new FeedSource();
			sourcePath = location.pathname;
		}
		source.scan();
		source.observe();
		if (!source.posts.length) return;
		let start = startId ? source.posts.findIndex((p) => p.id === startId) : -1;
		if (start < 0) start = nearestPostIndex(source.posts);
		clearResume();
		pausePageMedia();
		savedRestoration = history.scrollRestoration;
		history.scrollRestoration = "manual";
		document.documentElement.classList.add("rr-open");
		if (!history.state?.rrReel) history.pushState({
			...history.state || {},
			rrReel: true
		}, "");
		reel = new Reel({
			source,
			feedName: feedName(location.pathname),
			onClose: () => closeReel(false),
			onOpenComments: openComments
		});
		reel.open(start);
	}
	function closeReel(fromHistory) {
		if (!reel) return;
		const last = reel.activePost;
		reel.close();
		reel = null;
		source.disconnect();
		document.documentElement.classList.remove("rr-open");
		if (!leavingForComments) clearResume();
		leavingForComments = false;
		if (!fromHistory && history.state?.rrReel) history.back();
		const land = () => {
			if (last?.el?.isConnected) last.el.scrollIntoView({ block: "center" });
		};
		land();
		requestAnimationFrame(land);
		setTimeout(() => {
			land();
			history.scrollRestoration = savedRestoration;
		}, 120);
	}
	function openComments(post) {
		const url = postUrl(post);
		if (!isMobile()) {
			window.open(url, "_blank", "noopener");
			return;
		}
		const resume = {
			path: location.pathname,
			via: new URL(url).pathname,
			id: post.id,
			ts: Date.now()
		};
		try {
			sessionStorage.setItem(RESUME_KEY, JSON.stringify(resume));
		} catch {}
		leavingForComments = true;
		location.assign(url);
	}
	function syncFab() {
		const show = isReelRoute(location.pathname);
		if (show && !fab) {
			fab = createFab(() => openReel());
			document.documentElement.appendChild(fab);
		} else if (!show && fab) {
			fab.remove();
			fab = null;
		}
	}
	function init() {
		if (window.top !== window.self) return;
		const style = document.createElement("style");
		style.textContent = PAGE_CSS;
		(document.head || document.documentElement).appendChild(style);
		syncFab();
		watchRoute(() => {
			if (reel) closeReel(true);
			syncFab();
			resumeIfReturning();
		});
		window.addEventListener("popstate", () => {
			if (reel && !history.state?.rrReel) closeReel(true);
		});
		resumeIfReturning();
	}
	if (typeof window !== "undefined" && typeof document !== "undefined") {
		if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
		else init();
	}
})(Hls);

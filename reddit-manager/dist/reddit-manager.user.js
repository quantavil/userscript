// ==UserScript==
// @name         Reddit Manager
// @namespace    https://github.com/quantavil/userscript/reddit-manager
// @version      3.3.1
// @author       quantavil (https://github.com/quantavil)
// @description  Export subscriptions and manage Reddit account cleanup from a responsive panel.
// @license      GPL-3.0-or-later
// @homepage     https://github.com/quantavil/userscript
// @homepageURL  https://github.com/quantavil/userscript
// @match        https://www.reddit.com/*
// @match        https://old.reddit.com/*
// @match        https://sh.reddit.com/*
// @run-at       document-idle
// ==/UserScript==

(function() {
	"use strict";
	var panel_default = ":host{all:initial;right:max(1.25rem, env(safe-area-inset-right));bottom:calc(1.25rem + env(safe-area-inset-bottom,0px));z-index:2147483647;--lightningcss-light:initial;--lightningcss-dark: ;color-scheme:light dark;--paper:#fff;--surface:#f2f4f5;--ink:#0f1a1c;--muted:#526268;--line:#d6dadd;--accent:#b93200;--brand:#ff4500;--danger:brown;--danger-bg:#fff0ee;color:var(--ink);font:400 14px/1.5 Segoe UI,system-ui,sans-serif;position:fixed}@media (prefers-color-scheme:dark){:host{--lightningcss-light: ;--lightningcss-dark:initial}}*,:before,:after{box-sizing:border-box}[hidden]{display:none}button,input{font:inherit;color:inherit}button{cursor:pointer;touch-action:manipulation}button:disabled{cursor:default;opacity:.45}button,summary{-webkit-tap-highlight-color:transparent}button:focus-visible,summary:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:3px}button{transition:background .16s,color .16s,transform .16s}button:active:not(:disabled){transform:translateY(1px)}h1,h2,p{margin:0}.wrap{flex-direction:column;align-items:flex-end;gap:.75rem;display:flex}.panel{width:min(26rem,100vw - 2.5rem);max-height:calc(100dvh - 6.75rem - env(safe-area-inset-bottom,0px));overscroll-behavior:contain;background:var(--paper);border:1px solid var(--line);visibility:hidden;border-radius:1.125rem;display:none;overflow-y:auto;box-shadow:0 16px 64px #0f1a1c26}.panel.is-open{visibility:visible;display:block}.head{justify-content:space-between;align-items:flex-start;padding:1.4rem 1.4rem .8rem;display:flex}.eyebrow{color:var(--accent);letter-spacing:.08em;font-size:.75rem;font-weight:650}h1{letter-spacing:-.035em;margin-top:.25rem;font-size:1.5rem;font-weight:650;line-height:1.25}.close{width:44px;height:44px;color:var(--muted);background:0 0;border:0;border-radius:.5rem;place-items:center;margin:-.5rem -.65rem 0 0;display:grid}.close:hover{background:var(--surface);color:var(--ink)}.readout{padding:.5rem 1.4rem 1.2rem}.stats-grid{grid-template-columns:1.25fr 1fr 1fr;gap:.8rem;display:grid}.stat-cell+.stat-cell{border-left:1px solid var(--line);padding-left:1rem}.figure{letter-spacing:-.04em;font-variant-numeric:tabular-nums;font-size:1.65rem;font-weight:600;line-height:1.25}.unit{color:var(--muted);margin-top:.2rem;font-size:.75rem}.progress-label{font-variant-numeric:tabular-nums;margin-top:1rem;font-size:.8rem}.progress-label:empty{display:none}.rule{background:var(--line);border-radius:2px;height:4px;margin-top:.6rem;overflow:hidden}.rule>i{background:var(--accent);width:0;height:100%;transition:width .2s;display:block}.rule:not([aria-valuenow]){display:none}.actions{padding:0 1.4rem 1.2rem}.section-label{color:var(--muted);margin:.2rem 0 .65rem;font-size:.8rem;font-weight:600}.tools{grid-template-columns:1fr 1fr;gap:.6rem;display:grid}.act{text-align:left;background:0 0;border:0;border-radius:.5rem;align-items:center;gap:.8rem;width:100%;min-height:48px;padding:.8rem 0;display:flex}.act .ico{color:var(--accent);flex:none;display:flex}.act .name{font-size:.9rem;font-weight:600;display:block}.act .hint{color:var(--muted);margin-top:.15rem;font-size:.76rem;line-height:1.4;display:block}.act:hover:not(:disabled){background:var(--surface)}.tools .act{background:var(--surface);flex-direction:column;align-items:flex-start;gap:.5rem;padding:.9rem}.tools .act:hover:not(:disabled){background:var(--line)}.act[data-key=refresh]{background:0 0;flex-direction:row;grid-column:1/-1;align-items:center;min-height:44px;padding:.5rem}.act[data-key=refresh] .name{font-size:.8rem}.act[data-key=refresh] .hint{display:none}.cleanup{border-top:1px solid var(--line);margin-top:.65rem;padding-top:.4rem}.cleanup summary{cursor:pointer;min-height:48px;padding:.8rem .25rem;font-size:.85rem;font-weight:600}.cleanup-note{color:var(--muted);margin:0 .25rem .4rem;font-size:.76rem}.cleanup .act{padding:.75rem .5rem}.act.is-danger .ico{color:var(--danger)}.act.is-danger:hover:not(:disabled){background:var(--danger-bg)}.controls-running{border-top:1px solid var(--line);gap:.6rem;padding:.8rem 1.4rem;display:none}.panel.is-running .controls-running{display:flex}.btn-ctrl,.btn{border:1px solid var(--line);background:var(--surface);border-radius:.6rem;min-height:44px;padding:.65rem 1rem;font-size:.85rem;font-weight:600}.btn-ctrl{flex:1}.btn-ctrl:hover:not(:disabled),.btn--cancel:hover{background:var(--line)}.cancel-btn{color:var(--danger)}.status{border-top:1px solid var(--line);color:var(--muted);overflow-wrap:anywhere;padding:.9rem 1.4rem;font-size:.8rem}.status:empty{display:none}.status.is-bad{color:var(--danger)}.status.is-ok{color:var(--accent)}.fab{border:1px solid var(--line);background:var(--paper);width:52px;height:52px;color:var(--brand);border-radius:1rem;place-items:center;display:grid;position:relative;box-shadow:0 4px 20px #0f1a1c20}.fab:hover{background:var(--surface)}.fab-icon{display:flex}.fab-progress{justify-content:center;align-items:center;display:none;position:absolute;inset:0}.fab.is-busy .fab-progress{display:flex}.fab.is-busy .fab-icon{display:none}.progress-ring{width:100%;height:100%;position:absolute;inset:0}.ring-fill{transition:stroke-dashoffset .2s}.fab-badge{font-variant-numeric:tabular-nums;font-size:.7rem;font-weight:650}.sheet{padding:1.5rem}.sheet__card{flex-direction:column;gap:1rem;display:flex}.sheet__badge{color:var(--accent)}.sheet.is-danger .sheet__badge{color:var(--danger)}.sheet__badge svg{width:24px;height:24px}.sheet__title{letter-spacing:-.025em;font-size:1.4rem;font-weight:650;line-height:1.25}.sheet__body{color:var(--muted);text-wrap:pretty;font-size:.9rem}.sheet__input{border:1px solid var(--line);background:var(--surface);border-radius:.5rem;width:100%;min-height:48px;padding:.75rem;font-size:16px}.sheet__row{flex-wrap:wrap;gap:.6rem;margin-top:.5rem;display:flex}.btn{flex:1}.btn--go{background:var(--accent);color:#fff;border-color:#0000}.btn--go:hover:not(:disabled){filter:brightness(1.12)}.sheet.is-danger .btn--go{background:var(--danger)}@media (prefers-color-scheme:dark){:host{--paper:#181c1f;--surface:#252a2e;--ink:#eef1f3;--muted:#acb5b9;--line:#3d4549;--accent:#ff8a65;--danger:#ffb4a9;--danger-bg:#342322}.btn--go{color:#181c1f}}@media (max-width:600px){:host{right:max(.75rem, env(safe-area-inset-right));bottom:calc(.75rem + env(safe-area-inset-bottom,0px))}.panel{width:min(26rem,100vw - 1.5rem);max-height:calc(100dvh - 5.75rem - env(safe-area-inset-bottom,0px))}.head{padding:1.2rem 1.1rem .75rem}.readout{padding:.5rem 1.1rem 1rem}.actions{padding:0 1.1rem 1rem}.sheet{padding:1.2rem}}@media (prefers-reduced-motion:reduce){button,.rule>i,.ring-fill{transition:none}}";
	var ORIGIN = location.origin;
	var MAX_SUB_PAGES = 50;
	var MAX_USER_ITEM_PAGES = 10;
	var RETRYABLE = new Set([
		429,
		500,
		502,
		503,
		504
	]);
	var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
	async function fetchWithRetry(url, options = {}, maxRetries = 5, onRetry) {
		let delay = 2e3;
		let resp = null;
		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			resp = null;
			try {
				resp = await fetch(url, options);
				if (!RETRYABLE.has(resp.status)) return resp;
			} catch (err) {
				if (attempt === maxRetries) throw err;
			}
			if (attempt === maxRetries && resp) break;
			let wait = delay;
			if (resp) {
				const header = resp.headers.get("Retry-After") || resp.headers.get("x-ratelimit-reset");
				if (header) {
					const value = header.trim();
					if (/^\d+(?:\.\d+)?$/.test(value)) wait = Math.max(wait, Number(value) * 1e3, 2e3);
					else {
						const parsedDate = Date.parse(value);
						if (Number.isFinite(parsedDate)) wait = Math.max(wait, parsedDate - Date.now(), 2e3);
					}
				}
			}
			wait += Math.random() * 400;
			const status = resp?.status ?? 0;
			console.warn(`[Reddit Manager] Request on ${new URL(url, ORIGIN).pathname} failed/retryable (status ${status}). Retrying in ${(wait / 1e3).toFixed(1)}s (attempt ${attempt + 1}/${maxRetries})…`);
			onRetry?.(attempt + 1, maxRetries, wait, status);
			const step = 1e3;
			let remaining = wait;
			while (remaining > 0) {
				const sleepMs = Math.min(remaining, step);
				await sleep(sleepMs);
				remaining -= sleepMs;
				onRetry?.(attempt + 1, maxRetries, Math.max(0, remaining), status);
			}
			delay *= 2;
		}
		if (!resp) throw new Error("Network request failed after retries");
		return resp;
	}
	async function checkMutationResponse(response, action, requireErrors = false) {
		const body = await response.json().catch(() => null);
		const invalid = () => new Error(`Reddit returned an invalid ${action} response`);
		if (!body || typeof body !== "object" || Array.isArray(body)) throw invalid();
		if (body.error || body.status === "error" || body.success === false) throw new Error(`Reddit rejected ${action}: ${body.error ?? body.message ?? body.status}`);
		const errors = body.json?.errors;
		if (errors === void 0 && !requireErrors && Object.keys(body).length === 0) return;
		if (!Array.isArray(errors)) throw invalid();
		if (errors.length) throw new Error(`Reddit rejected ${action}: ${errors.map((error) => Array.isArray(error) ? String(error[1] ?? error[0]) : String(error)).join("; ")}`);
	}
	function normalizeName(input) {
		if (!input) return "";
		const value = input.trim();
		if (!value) return "";
		let name;
		if (/^https?:\/\//i.test(value)) try {
			const url = new URL(value);
			const host = url.hostname.toLowerCase();
			if (host !== "reddit.com" && !host.endsWith(".reddit.com")) return "";
			name = /^\/r\/([^/]+)(?:\/.*)?$/i.exec(url.pathname)?.[1];
		} catch {
			return "";
		}
		else {
			name = /^\/?r\/([^/]+)(?:\/.*)?$/i.exec(value)?.[1];
			if (!name && /^[A-Za-z0-9_-]+$/.test(value)) name = value;
		}
		if (!name || name.length > 21 || !/^[A-Za-z0-9_-]+$/.test(name)) return "";
		return name;
	}
	var cached = null;
	var inflight = null;
	var subsGeneration = 0;
	function invalidateSubs() {
		cached = null;
		inflight = null;
		subsGeneration++;
	}
	function loadSubs(force = false, onRetry) {
		if (force) invalidateSubs();
		if (cached) return Promise.resolve(cached);
		if (inflight) return inflight;
		const generation = subsGeneration;
		inflight = (async () => {
			const subs = [];
			let after = null;
			const seenNames = new Set();
			const seenCursors = new Set();
			for (let page = 0; page < MAX_SUB_PAGES; page++) {
				if (after) seenCursors.add(after);
				const url = new URL(`${ORIGIN}/subreddits/mine/subscriber.json`);
				url.searchParams.set("limit", "100");
				url.searchParams.set("raw_json", "1");
				url.searchParams.set("_", String(Date.now()));
				if (after) url.searchParams.set("after", after);
				const resp = await fetchWithRetry(url.toString(), {
					credentials: "include",
					headers: { Accept: "application/json" }
				}, 4, onRetry);
				if (resp.status === 401 || resp.status === 403) throw new Error("not logged in to Reddit");
				if (!resp.ok) throw new Error(`subreddits/mine returned ${resp.status}`);
				const json = await resp.json();
				if (!Array.isArray(json?.data?.children)) throw new Error("Reddit returned an invalid subscription listing");
				for (const child of json.data.children) {
					const d = child?.data;
					if (!d?.display_name) continue;
					const key = String(d.display_name).toLowerCase();
					if (seenNames.has(key)) continue;
					seenNames.add(key);
					subs.push({
						name: d.display_name,
						id: d.name,
						title: d.title,
						subscribers: d.subscribers,
						over18: d.over18
					});
				}
				const nextAfter = json?.data?.after ?? null;
				if (!nextAfter) break;
				if (seenCursors.has(nextAfter)) throw new Error("Reddit repeated a subscription pagination cursor; results may be incomplete");
				after = nextAfter;
				if (page === 49 && after) throw new Error(`Subscription listing exceeded ${MAX_SUB_PAGES} pages; results may be incomplete`);
			}
			if (generation === subsGeneration) cached = subs;
			return subs;
		})().finally(() => {
			if (generation === subsGeneration) inflight = null;
		});
		return inflight;
	}
	var meCached = null;
	var meInflight = null;
	var meGeneration = 0;
	async function meInfo(onRetry, force = false) {
		if (force) {
			meCached = null;
			meInflight = null;
			meGeneration++;
		}
		if (meCached) return meCached;
		if (meInflight) return meInflight;
		const generation = meGeneration;
		meInflight = (async () => {
			const resp = await fetchWithRetry(`${ORIGIN}/api/me.json`, {
				credentials: "include",
				headers: { Accept: "application/json" }
			}, 3, onRetry);
			if (resp.status === 401 || resp.status === 403) throw new Error("not logged in to Reddit");
			if (!resp.ok) throw new Error(`/api/me.json returned ${resp.status}`);
			const json = await resp.json();
			const data = {
				modhash: json?.data?.modhash ?? "",
				name: json?.data?.name ?? ""
			};
			if (!data.name) throw new Error("Reddit did not return a username");
			if (generation === meGeneration) meCached = data;
			return data;
		})().finally(() => {
			if (generation === meGeneration) meInflight = null;
		});
		return meInflight;
	}
	async function getModhash(onRetry) {
		return (await meInfo(onRetry)).modhash;
	}
	async function setSubscribed(name, subscribe, onRetry) {
		invalidateSubs();
		let currentModhash = await getModhash(onRetry);
		const params = new URLSearchParams({
			action: subscribe ? "sub" : "unsub",
			sr_name: name,
			api_type: "json"
		});
		for (let attempt = 0; attempt < 2; attempt++) {
			const headers = { "Content-Type": "application/x-www-form-urlencoded" };
			if (currentModhash) {
				headers["X-Modhash"] = currentModhash;
				params.set("uh", currentModhash);
			} else params.delete("uh");
			const resp = await fetchWithRetry(`${ORIGIN}/api/subscribe`, {
				method: "POST",
				credentials: "include",
				headers,
				body: params
			}, 5, onRetry);
			if (resp.status === 403) {
				if (attempt === 0) {
					currentModhash = (await meInfo(onRetry, true)).modhash;
					continue;
				}
				throw new Error(currentModhash ? "HTTP 403 — modhash rejected; log out and back in on Reddit" : "HTTP 403 — no modhash available from /api/me.json (are you logged in to Reddit?)");
			}
			if (!resp.ok) {
				const body = (await resp.text().catch(() => "")).trim();
				const detail = body.startsWith("<") ? body.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "HTML error page" : body.slice(0, 200);
				throw new Error(`HTTP ${resp.status}${detail ? ` — ${detail}` : ""}`);
			}
			await checkMutationResponse(resp, "subscription");
			invalidateSubs();
			return;
		}
	}
	async function loadUserItems(kind, onRetry) {
		const info = await meInfo(onRetry);
		if (!info.name) throw new Error("not logged in to Reddit");
		const items = [];
		let after = null;
		const endpoint = kind === "posts" ? "submitted" : "comments";
		const encodedName = encodeURIComponent(info.name);
		const seenFullnames = new Set();
		const seenCursors = new Set();
		for (let page = 0; page < MAX_USER_ITEM_PAGES; page++) {
			if (after && seenCursors.has(after)) throw new Error(`Reddit repeated a ${endpoint} pagination cursor; results may be incomplete`);
			if (after) seenCursors.add(after);
			const url = new URL(`${ORIGIN}/user/${encodedName}/${endpoint}.json`);
			url.searchParams.set("limit", "100");
			url.searchParams.set("raw_json", "1");
			url.searchParams.set("_", String(Date.now()));
			if (after) url.searchParams.set("after", after);
			const resp = await fetchWithRetry(url.toString(), {
				credentials: "include",
				headers: { Accept: "application/json" }
			}, 4, onRetry);
			if (resp.status === 401 || resp.status === 403) throw new Error("not logged in to Reddit");
			if (!resp.ok) throw new Error(`user/${endpoint} returned ${resp.status}`);
			const json = await resp.json();
			if (!Array.isArray(json?.data?.children)) throw new Error("Reddit returned an invalid history listing");
			const children = json.data.children;
			if (children.length === 0) break;
			for (const child of children) {
				const d = child?.data;
				if (!d?.name) continue;
				const fullname = String(d.name);
				if (seenFullnames.has(fullname)) continue;
				seenFullnames.add(fullname);
				items.push({
					fullname,
					title: d.title,
					body: d.body,
					selftext: d.selftext,
					subreddit: d.subreddit
				});
			}
			const nextAfter = json?.data?.after ?? null;
			if (!nextAfter) break;
			if (seenCursors.has(nextAfter)) throw new Error(`Reddit repeated a ${endpoint} pagination cursor; results may be incomplete`);
			after = nextAfter;
		}
		return items;
	}
	async function deleteUserItem(fullname, editFirst = true, onRetry) {
		for (let attempt = 0; attempt < 2; attempt++) {
			const info = await meInfo(onRetry);
			const headers = { "Content-Type": "application/x-www-form-urlencoded" };
			if (info.modhash) headers["X-Modhash"] = info.modhash;
			if (editFirst) {
				const editParams = new URLSearchParams({
					thing_id: fullname,
					text: ".",
					api_type: "json"
				});
				if (info.modhash) editParams.set("uh", info.modhash);
				const editResp = await fetchWithRetry(`${ORIGIN}/api/editusertext`, {
					method: "POST",
					credentials: "include",
					headers,
					body: editParams
				}, 2, onRetry);
				if (editResp.status === 401 || editResp.status === 403) {
					if (attempt === 0) {
						await meInfo(onRetry, true);
						continue;
					}
				}
				if (!editResp.ok) throw new Error(`HTTP ${editResp.status} overwriting ${fullname}`);
				await checkMutationResponse(editResp, `overwrite for ${fullname}`, true);
			}
			const delParams = new URLSearchParams({
				id: fullname,
				api_type: "json"
			});
			if (info.modhash) delParams.set("uh", info.modhash);
			const resp = await fetchWithRetry(`${ORIGIN}/api/del`, {
				method: "POST",
				credentials: "include",
				headers,
				body: delParams
			}, 3, onRetry);
			if (resp.status === 401 || resp.status === 403) {
				if (attempt === 0) {
					await meInfo(onRetry, true);
					continue;
				}
			}
			if (!resp.ok) throw new Error(`HTTP ${resp.status} deleting ${fullname}`);
			await checkMutationResponse(resp, `deletion of ${fullname}`);
			return;
		}
	}
	var SUB_PAUSE_MS = 650;
	var DELETE_PAUSE_MS = 1300;
	var GIVE_UP_AFTER = 3;
	function retryReporter(r) {
		return (attempt, maxRetries, waitMs, status) => r?.status(`${status ? `Reddit returned ${status}` : "Network request failed"}. Retrying in ${(waitMs / 1e3).toFixed(1)}s (${attempt}/${maxRetries})…`, "bad");
	}
	async function runBatch(items, task, onProgress, r) {
		const failed = [];
		let lastError = "";
		let consecutiveFailures = 0;
		const onRetry = retryReporter(r);
		for (let i = 0; i < items.length; i++) {
			while (r?.isPaused?.() && !r?.stopped?.()) await sleep(200);
			if (r?.stopped?.()) return {
				failed,
				error: lastError,
				stoppedAt: i,
				stopReason: "cancelled"
			};
			const item = items[i];
			try {
				await task.run(item, onRetry);
				consecutiveFailures = 0;
				r?.status("");
			} catch (error) {
				lastError = error instanceof Error ? error.message : String(error);
				failed.push(task.id(item));
				consecutiveFailures++;
				console.warn(`[Reddit Manager] ${task.id(item)} failed: ${lastError}`);
			}
			onProgress(i + 1, items.length, failed.length);
			if (consecutiveFailures >= GIVE_UP_AFTER) return {
				failed,
				error: lastError,
				stoppedAt: i + 1,
				stopReason: "consecutiveFailures"
			};
			if (i + 1 < items.length && !r?.stopped?.()) await sleep(task.delay(item));
		}
		return {
			failed,
			error: lastError,
			stoppedAt: items.length
		};
	}
	function applyAll(identifiers, subscribe, onProgress, r) {
		return runBatch(identifiers, {
			id: (name) => name,
			run: (name, onRetry) => setSubscribed(name, subscribe, onRetry),
			delay: () => SUB_PAUSE_MS
		}, onProgress, r);
	}
	var HEADERS = new Set([
		"subreddit",
		"subreddits",
		"display_name",
		"display_names",
		"url"
	]);
	function parseImport(text) {
		const trimmed = text.trim();
		let raw;
		if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
			const json = JSON.parse(trimmed);
			const list = Array.isArray(json) ? json : json && typeof json === "object" ? [
				json.subreddits,
				json.subs,
				json.data
			].find(Array.isArray) : null;
			if (!Array.isArray(list)) throw new Error("no subreddit list in that JSON");
			raw = list;
		} else {
			raw = trimmed.split(/[\s,;]+/);
			if (HEADERS.has(String(raw[0]).toLowerCase())) raw.shift();
		}
		const seen = new Map();
		for (const [index, item] of raw.entries()) {
			let value = item;
			if (item && typeof item === "object" && !Array.isArray(item)) {
				const entry = item;
				value = typeof entry.display_name === "string" ? entry.display_name : entry.name;
			}
			if (typeof value !== "string") throw new Error(`invalid subreddit entry ${index + 1}`);
			const name = normalizeName(value);
			if (!name) throw new Error(`invalid subreddit entry ${index + 1}`);
			if (!seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
		}
		return [...seen.values()];
	}
	function downloadSubs(subs, tag = "") {
		const text = `${JSON.stringify({
			exportedAt: new Date().toISOString(),
			count: subs.length,
			subreddits: [...subs].sort((a, b) => a.name.localeCompare(b.name))
		}, null, 2)}\n`;
		const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
		const a = document.createElement("a");
		a.href = url;
		a.download = `reddit-subreddits${tag}-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 1e3);
	}
	async function refresh(r, force = false, full = false) {
		r.status(force ? "Reading from Reddit…" : "");
		const onRetry = retryReporter(r);
		try {
			const subsPromise = loadSubs(force, onRetry);
			const postsPromise = full ? loadUserItems("posts", onRetry) : Promise.resolve(null);
			const commentsPromise = full ? loadUserItems("comments", onRetry) : Promise.resolve(null);
			const results = await Promise.allSettled([
				subsPromise,
				postsPromise,
				commentsPromise
			]);
			const subs = results[0].status === "fulfilled" ? results[0].value : null;
			const posts = results[1].status === "fulfilled" ? results[1].value : null;
			const comments = results[2].status === "fulfilled" ? results[2].value : null;
			if (full) r.count(subs?.length ?? null, {
				posts: posts?.length ?? null,
				comments: comments?.length ?? null
			});
			else if (subs) r.count(subs.length);
			if (results[0].status === "rejected") {
				const err = results[0].reason?.message ?? "Failed to read subscriptions";
				r.status(err, "bad");
				throw new Error(err);
			}
			if (force) {
				const countsMsg = `${subs ? `${subs.length} subreddits` : "subscriptions unavailable"}${full ? `, ${posts ? `${posts.length} posts` : "posts unavailable"}` : ""}${full ? `, ${comments ? `${comments.length} comments` : "comments unavailable"}` : ""}`;
				r.status(`Read ${countsMsg}.`, "ok");
			}
			return subs?.length ?? 0;
		} catch (e) {
			r.status(e.message, "bad");
			throw e;
		}
	}
	async function exportSubs(r) {
		r.status("Reading your subscriptions…");
		const subs = await loadSubs();
		r.count(subs.length);
		if (subs.length === 0) {
			r.status("Nothing to export — you aren't subscribed to anything.", "bad");
			return;
		}
		downloadSubs(subs);
		r.status(`Exported ${subs.length} subreddits.`, "ok");
	}
	async function importSubs(r) {
		const text = await r.pickFile();
		if (text == null) return;
		let parsed;
		try {
			parsed = parseImport(text);
		} catch (e) {
			r.status(`Couldn't read that file: ${e.message}`, "bad");
			return;
		}
		if (parsed.length === 0) {
			r.status("No subreddit names in that file.", "bad");
			return;
		}
		r.status("Reading your subscriptions…");
		const subs = await loadSubs();
		r.count(subs.length);
		const have = new Set(subs.map((s) => s.name.toLowerCase()));
		const names = parsed.filter((n) => !have.has(n.toLowerCase()));
		const skipped = parsed.length - names.length;
		if (names.length === 0) {
			r.status(`Already in all ${parsed.length} of those subreddits.`, "ok");
			return;
		}
		if (!await r.confirm({
			title: `Join ${names.length} subreddits`,
			body: `${names.slice(0, 6).join(", ")}${names.length > 6 ? `, and ${names.length - 6} more` : ""}.${skipped ? ` ${skipped} you're already in are left alone.` : ""}`,
			action: `Join ${names.length}`
		})) return;
		await apply(r, names, true, subs.length);
	}
	async function leaveAll(r) {
		r.status("Reading your subscriptions…");
		const subs = await loadSubs(true);
		r.count(subs.length);
		if (subs.length === 0) {
			r.status("You aren't subscribed to anything.", "bad");
			return;
		}
		if (!await r.confirm({
			title: `Leave all ${subs.length} subreddits`,
			body: "A backup file downloads first, so Import can put them back. One request per subreddit — whatever gets through stays done even if you close the tab.",
			action: "Leave all",
			danger: true,
			typed: String(subs.length)
		})) return;
		downloadSubs(subs, "-backup");
		r.status("Backup downloaded.", "ok");
		await apply(r, subs.map((s) => s.name), false, subs.length);
	}
	async function apply(r, names, subscribe, startCount) {
		const [verb, past] = subscribe ? ["Joining", "Joined"] : ["Leaving", "Left"];
		const headline = (succeeded) => subscribe ? startCount + succeeded : startCount - succeeded;
		r.progress(verb, 0, names.length, startCount, "subs");
		const { failed, error: lastError, stoppedAt, stopReason } = await applyAll(names, subscribe, (done, total, bad) => r.progress(verb, done, total, headline(done - bad), "subs"), r);
		const succeeded = stoppedAt - failed.length;
		const untouched = names.length - stoppedAt;
		const halted = untouched ? `${stopReason === "consecutiveFailures" ? ` Stopped after ${GIVE_UP_AFTER} consecutive failures —` : " Stopped —"} ${untouched} left untouched.` : "";
		r.status("Confirming with Reddit…");
		await sleep(1e3);
		await refresh(r, true).catch(() => void 0);
		if (failed.length === 0) {
			r.status(`${past} ${succeeded} subreddits.${halted}`, halted ? "bad" : "ok");
			return;
		}
		r.status(`${past} ${succeeded}. Skipped ${failed.length} (${lastError}): ${failed.slice(0, 6).join(", ")}${failed.length > 6 ? "…" : ""}${halted}`, "bad");
		console.warn("[Reddit Manager] failed:", failed, lastError);
	}
	function shouldOverwrite(item) {
		const text = item.selftext ?? item.body;
		return !(item.fullname.startsWith("t3_") && typeof text === "string" && text.trim() === "");
	}
	function applyItemDeletions(items, onProgress, r) {
		return runBatch(items, {
			id: (item) => item.fullname,
			run: (item, onRetry) => deleteUserItem(item.fullname, shouldOverwrite(item), onRetry),
			delay: (item) => shouldOverwrite(item) ? DELETE_PAUSE_MS : SUB_PAUSE_MS
		}, onProgress, r);
	}
	async function deleteAllUserItems(r, kind, label) {
		r.status(`Reading your visible ${label} from Reddit…`);
		let items;
		try {
			items = await loadUserItems(kind);
		} catch (e) {
			r.status(e.message, "bad");
			return;
		}
		if (items.length === 0) {
			r.status(`No visible ${label} found to delete.`, "ok");
			return;
		}
		if (!await r.confirm({
			title: `Delete ${items.length} visible ${label}`,
			body: `Deletes up to Reddit's 1,000 visible history limit. Editable text will be overwritten with '.' first; link posts without selftext are deleted directly.`,
			action: `Delete ${label}`,
			danger: true,
			typed: String(items.length)
		})) return;
		const verb = `Deleting ${label}`;
		r.progress(verb, 0, items.length, items.length, kind);
		const { failed, error: lastError, stoppedAt, stopReason } = await applyItemDeletions(items, (done, total, bad) => r.progress(verb, done, total, items.length - (done - bad), kind), r);
		const succeeded = stoppedAt - failed.length;
		const untouched = items.length - stoppedAt;
		const halted = untouched ? `${stopReason === "consecutiveFailures" ? ` Stopped after ${GIVE_UP_AFTER} consecutive failures —` : " Stopped —"} ${untouched} left untouched.` : "";
		r.status("Confirming with Reddit…");
		await sleep(500);
		await refresh(r, true, true).catch(() => void 0);
		r.status(`Deleted ${succeeded} ${label}.${failed.length ? ` (${failed.length} failed: ${lastError})` : ""}${halted}`, failed.length || halted ? "bad" : "ok");
	}
	async function deleteAllPosts(r) {
		return deleteAllUserItems(r, "posts", "posts");
	}
	async function deleteAllComments(r) {
		return deleteAllUserItems(r, "comments", "comments");
	}
	async function deleteAccount(r) {
		if (!await r.confirm({
			title: "Open Account Deletion Page",
			body: "Reddit requires password verification to delete an account. You will be redirected to Reddit's official account deletion page.",
			action: "Open deletion page",
			danger: true
		})) return;
		r.status("Redirecting to account deletion page…", "ok");
		window.location.href = "https://old.reddit.com/prefs/delete/";
	}
	var svg = (d) => `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
	var ACTIONS = [
		{
			key: "export",
			name: "Export",
			hint: "Download your subscriptions as JSON",
			icon: svg("<path d=\"M8 2v8M4.5 7L8 10.5 11.5 7M2.5 13.5h11\"/>"),
			run: exportSubs
		},
		{
			key: "import",
			name: "Import",
			hint: "Join every subreddit in a file",
			icon: svg("<path d=\"M8 10.5v-8M4.5 6L8 2.5 11.5 6M2.5 13.5h11\"/>"),
			run: importSubs
		},
		{
			key: "refresh",
			name: "Refresh counts",
			hint: "Read subscriptions and visible history counts",
			icon: svg("<path d=\"M13.2 8a5.2 5.2 0 1 1-1.7-3.85M13.5 1.8v3.4h-3.4\"/>"),
			run: (r) => refresh(r, true, true).then(() => void 0)
		},
		{
			key: "leave",
			name: "Leave all",
			hint: "Unsubscribe from every subreddit",
			icon: svg("<path d=\"M3.5 3.5l9 9M12.5 3.5l-9 9\"/>"),
			run: leaveAll,
			danger: true
		},
		{
			key: "deletePosts",
			name: "Delete visible posts",
			hint: "Overwrite & delete up to 1,000 visible posts",
			icon: svg("<path d=\"M3 4h10M5 4v9a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4M6 2h4\"/>"),
			run: deleteAllPosts,
			danger: true
		},
		{
			key: "deleteComments",
			name: "Delete visible comments",
			hint: "Overwrite & delete up to 1,000 visible comments",
			icon: svg("<path d=\"M3 3h10v7H6l-3 3V3z\"/>"),
			run: deleteAllComments,
			danger: true
		},
		{
			key: "deleteAccount",
			name: "Open account deletion page",
			hint: "Navigate to official account deletion",
			icon: svg("<path d=\"M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 1.5c-3 0-5.5 2-5.5 4.5v.5h11v-.5c0-2.5-2.5-4.5-5.5-4.5z\"/>"),
			run: deleteAccount,
			danger: true
		}
	];
	function actionButton(action) {
		return `<button class="act${"danger" in action ? " is-danger" : ""}" data-key="${action.key}">
		<span class="ico" aria-hidden="true">${action.icon}</span>
		<span><span class="name">${action.name}</span><span class="hint">${action.hint}</span></span>
	</button>`;
	}
	var RING = 2 * Math.PI * 20;
	var Panel = class {
		root;
		panel;
		fab;
		ringFill;
		badge;
		figSubs;
		figPosts;
		figComments;
		progressLabel;
		bar;
		statusEl;
		pauseBtn;
		cancelBtn;
		buttons = [];
		busy = false;
		open = false;
		paused = false;
		stopping = false;
		refreshGen = 0;
		content;
		activeResolve = null;
		constructor() {
			const host = document.createElement("div");
			this.root = host.attachShadow({ mode: "open" });
			this.root.innerHTML = `
      <style>${panel_default}</style>
      <div class="wrap">
        <div class="panel" role="dialog" aria-label="Reddit Manager" aria-hidden="true">
          <div class="content">
          <header class="head">
            <div><p class="eyebrow">REDDIT</p><h1>Account manager</h1></div>
            <button class="close" aria-label="Close">${svg("<path d=\"M4 4l8 8M12 4l-8 8\"/>")}</button>
          </header>
          <div class="readout">
            <div class="stats-grid">
              <div class="stat-cell">
                <div class="figure fig-subs">—</div>
                <div class="unit">Subreddits</div>
              </div>
              <div class="stat-cell">
                <div class="figure fig-posts">—</div>
                <div class="unit">Posts</div>
              </div>
              <div class="stat-cell">
                <div class="figure fig-comments">—</div>
                <div class="unit">Comments</div>
              </div>
            </div>
            <div class="progress-label"></div>
            <div class="rule" role="progressbar" aria-label="Operation progress" aria-valuemin="0" aria-valuemax="100"><i></i></div>
          </div>
          <div class="actions">
            <h2 class="section-label">Your subscriptions</h2>
            <div class="tools">${ACTIONS.filter((a) => !("danger" in a)).map(actionButton).join("")}</div>
            <details class="cleanup">
              <summary>Account cleanup</summary>
              <p class="cleanup-note">Review each action before making changes.</p>
              ${ACTIONS.filter((a) => "danger" in a).map(actionButton).join("")}
            </details>
          </div>
          <div class="controls-running">
            <button class="btn-ctrl pause-btn">Pause</button>
            <button class="btn-ctrl cancel-btn">Cancel</button>
          </div>
          <div class="status" role="status" aria-live="polite" aria-atomic="true"></div>
          </div>
        </div>
        <button class="fab" aria-label="Reddit Manager" title="Reddit Manager" aria-expanded="false">
          <span class="fab-icon">${svg("<path d=\"M2.5 4.5h11M2.5 8h8M2.5 11.5h5\"/>")}</span>
          <div class="fab-progress" aria-hidden="true">
            <svg class="progress-ring" width="48" height="48" viewBox="0 0 48 48">
              <circle class="ring-bg" cx="24" cy="24" r="20" fill="none" stroke="var(--line)" stroke-width="3"/>
              <circle class="ring-fill" cx="24" cy="24" r="20" fill="none" stroke="var(--accent)" stroke-width="3" stroke-dasharray="${RING}" stroke-dashoffset="${RING}" stroke-linecap="round" transform="rotate(-90 24 24)"/>
            </svg>
            <span class="fab-badge">0%</span>
          </div>
        </button>
      </div>`;
			const $ = (sel) => this.root.querySelector(sel);
			this.panel = $(".panel");
			this.content = $(".content");
			this.panel.inert = true;
			this.fab = $(".fab");
			this.ringFill = $(".ring-fill");
			this.badge = $(".fab-badge");
			this.figSubs = $(".fig-subs");
			this.figPosts = $(".fig-posts");
			this.figComments = $(".fig-comments");
			this.progressLabel = $(".progress-label");
			this.bar = $(".rule > i");
			this.statusEl = $(".status");
			this.pauseBtn = $(".pause-btn");
			this.cancelBtn = $(".cancel-btn");
			this.buttons = [...this.root.querySelectorAll(".act")];
			this.fab.addEventListener("click", () => this.toggle());
			$(".close").addEventListener("click", () => this.toggle(false));
			this.pauseBtn.addEventListener("click", () => {
				this.paused = !this.paused;
				this.pauseBtn.textContent = this.paused ? "Resume" : "Pause";
				if (this.paused) this.status("Operation paused", "bad");
				else this.status("");
			});
			this.cancelBtn.addEventListener("click", () => {
				this.stopping = true;
				this.paused = false;
				this.cancelBtn.disabled = true;
				this.cancelBtn.textContent = "Cancelling…";
				this.status("Cancelling after current item…", "bad");
			});
			for (const btn of this.buttons) btn.addEventListener("click", () => this.run(btn.dataset.key));
			document.addEventListener("keydown", (e) => {
				if (!this.open) return;
				if (e.key === "Escape") {
					if (this.activeResolve) this.activeResolve(false);
					else this.toggle(false);
				}
				if (e.key === "Tab" && this.activeResolve) {
					const controls = [...this.root.querySelectorAll(".sheet input, .sheet button:not(:disabled)")];
					const first = controls[0];
					const last = controls.at(-1);
					if (e.shiftKey && this.root.activeElement === first) {
						e.preventDefault();
						last?.focus();
					} else if (!e.shiftKey && this.root.activeElement === last) {
						e.preventDefault();
						first?.focus();
					}
				}
			});
			document.addEventListener("click", (e) => {
				if (this.open && !e.composedPath().includes(host)) this.toggle(false);
			});
			document.body.append(host);
		}
		toggle(next = !this.open) {
			this.open = next;
			this.panel.classList.toggle("is-open", next);
			this.panel.setAttribute("aria-hidden", String(!next));
			this.panel.inert = !next;
			this.fab.setAttribute("aria-expanded", String(next));
			const gen = ++this.refreshGen;
			if (!next) {
				this.activeResolve?.(false);
				this.fab.focus();
			} else {
				this.root.querySelector(".close")?.focus();
				if (!this.busy) {
					const current = () => gen === this.refreshGen && this.open && !this.busy;
					refresh({
						count: (n, stats) => {
							if (current()) this.count(n, stats);
						},
						status: (text, tone) => {
							if (current()) this.status(text, tone);
						},
						progress: () => {},
						confirm: async () => false,
						pickFile: async () => null
					}).catch(() => {});
				}
			}
		}
		async run(key) {
			const action = ACTIONS.find((a) => a.key === key);
			if (!action || this.busy) return;
			if (!this.open) this.toggle(true);
			this.setBusy(true);
			try {
				await action.run(this);
			} catch (e) {
				this.status(e.message, "bad");
			} finally {
				this.setBusy(false);
			}
		}
		onBeforeUnload = (e) => {
			if (this.busy) {
				e.preventDefault();
				e.returnValue = "Still working. What's already done stays done — leaving only cancels the rest.";
				return e.returnValue;
			}
		};
		stopped() {
			return this.stopping;
		}
		isPaused() {
			return this.paused;
		}
		setBusy(busy) {
			this.busy = busy;
			if (!busy) this.fab.classList.remove("is-busy");
			this.refreshGen++;
			if (!busy) this.panel.classList.remove("is-running");
			for (const b of this.buttons) b.disabled = busy;
			if (busy) {
				this.stopping = false;
				this.paused = false;
				this.pauseBtn.disabled = false;
				this.pauseBtn.textContent = "Pause";
				this.cancelBtn.disabled = false;
				this.cancelBtn.textContent = "Cancel";
			} else {
				window.removeEventListener("beforeunload", this.onBeforeUnload);
				this.fab.title = "Reddit Manager";
				this.ringFill.style.strokeDashoffset = String(RING);
				this.badge.textContent = "0%";
				this.progressLabel.textContent = "";
			}
		}
		count(n, stats) {
			this.bar.style.width = "0%";
			this.bar.parentElement?.removeAttribute("aria-valuenow");
			this.progressLabel.textContent = "";
			this.figSubs.textContent = n === null ? "—" : String(n);
			if (stats) {
				if ("posts" in stats) this.figPosts.textContent = stats.posts == null ? "—" : String(stats.posts);
				if ("comments" in stats) this.figComments.textContent = stats.comments == null ? "—" : String(stats.comments);
			}
		}
		progress(verb, done, total, headline, metric = "subs") {
			this.progressLabel.textContent = `${verb} — ${done} of ${total}`;
			if (headline != null) {
				if (metric === "posts") this.figPosts.textContent = String(headline);
				else if (metric === "comments") this.figComments.textContent = String(headline);
				else this.figSubs.textContent = String(headline);
			}
			this.panel.classList.add("is-running");
			this.fab.classList.add("is-busy");
			window.addEventListener("beforeunload", this.onBeforeUnload);
			const pct = total > 0 ? Math.min(1, Math.max(0, done / total)) : 0;
			this.bar.parentElement?.setAttribute("aria-valuenow", String(Math.round(pct * 100)));
			this.bar.style.width = `${pct * 100}%`;
			this.ringFill.style.strokeDashoffset = String(RING * (1 - pct));
			this.badge.textContent = `${Math.round(pct * 100)}%`;
			this.fab.title = `${verb} — ${done} of ${total}`;
		}
		status(text, tone) {
			this.statusEl.textContent = text;
			this.statusEl.className = `status${tone ? ` is-${tone}` : ""}`;
		}
		confirm(spec) {
			if (!this.open) return Promise.resolve(false);
			this.activeResolve?.(false);
			return new Promise((resolve) => {
				const previousFocus = this.root.activeElement;
				this.content.hidden = true;
				const sheet = document.createElement("div");
				sheet.className = `sheet${spec.danger ? " is-danger" : ""}`;
				const card = document.createElement("div");
				card.className = "sheet__card";
				card.setAttribute("role", "group");
				card.setAttribute("aria-labelledby", "confirmation-title");
				card.setAttribute("aria-describedby", "confirmation-body");
				const badge = document.createElement("div");
				badge.className = "sheet__badge";
				badge.innerHTML = spec.danger ? svg("<path d=\"M8 2l6 11H2L8 2zM8 6v3M8 11h.01\"/>") : svg("<path d=\"M8 2.5v11M2.5 8h11\"/>");
				const titleEl = document.createElement("div");
				titleEl.className = "sheet__title";
				titleEl.id = "confirmation-title";
				titleEl.textContent = spec.title;
				const bodyEl = document.createElement("div");
				bodyEl.className = "sheet__body";
				bodyEl.id = "confirmation-body";
				bodyEl.textContent = spec.body;
				card.append(badge, titleEl, bodyEl);
				let input = null;
				if (spec.typed) {
					input = document.createElement("input");
					input.className = "sheet__input";
					input.placeholder = `Type ${spec.typed} to confirm`;
					input.setAttribute("aria-label", `Type ${spec.typed} to confirm`);
					card.append(input);
				}
				const row = document.createElement("div");
				row.className = "sheet__row";
				const cancelBtn = document.createElement("button");
				cancelBtn.className = "btn btn--cancel";
				cancelBtn.textContent = "Cancel";
				const goBtn = document.createElement("button");
				goBtn.className = "btn btn--go";
				goBtn.textContent = spec.action;
				if (spec.typed) goBtn.disabled = true;
				row.append(cancelBtn, goBtn);
				card.append(row);
				sheet.append(card);
				const finish = (ok) => {
					this.activeResolve = null;
					sheet.remove();
					this.content.hidden = false;
					previousFocus?.focus();
					resolve(ok);
				};
				this.activeResolve = finish;
				if (input) {
					input.addEventListener("input", () => {
						goBtn.disabled = input.value.trim() !== spec.typed;
					});
					input.addEventListener("keydown", (e) => {
						if (e.key === "Enter" && !goBtn.disabled) finish(true);
					});
				}
				goBtn.addEventListener("click", () => finish(true));
				cancelBtn.addEventListener("click", () => finish(false));
				this.panel.append(sheet);
				(input ?? cancelBtn).focus();
			});
		}
		pickFile() {
			return new Promise((resolve) => {
				const input = document.createElement("input");
				input.type = "file";
				input.accept = ".json,.txt,.csv,application/json,text/plain";
				const done = (file) => {
					input.remove();
					if (!file) resolve(null);
					else file.text().then(resolve, (error) => {
						this.status(`Couldn't read file: ${error.message}`, "bad");
						resolve(null);
					});
				};
				input.onchange = () => done(input.files?.[0] ?? null);
				input.oncancel = () => done(null);
				input.hidden = true;
				this.root.append(input);
				input.click();
			});
		}
	};
	new Panel();
})();

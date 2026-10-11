// ==UserScript==
// @name         Reddit Manager
// @namespace    https://github.com/quantavil/userscript/reddit-manager
// @version      3.2.0
// @author       quantavil (https://github.com/quantavil)
// @description  Export, import, and bulk-manage your Reddit subreddit subscriptions from a floating panel.
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
	var ORIGIN = location.origin;
	var MAX_PAGES = 60;
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
					const seconds = Number.parseFloat(header);
					if (Number.isFinite(seconds)) wait = Math.max(seconds * 1e3, 2e3);
					else {
						const parsedDate = Date.parse(header);
						if (Number.isFinite(parsedDate)) wait = Math.max(parsedDate - Date.now(), 2e3);
					}
				}
			}
			wait += Math.random() * 400 - 200;
			wait = Math.max(wait, 1e3);
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
	function normalizeName(input) {
		if (!input) return "";
		return input.trim().replace(/^https?:\/\/[^/]+/i, "").replace(/^\/?(?:r\/)?/i, "").replace(/\/.*$/, "").replace(/[^\w-]/g, "");
	}
	var cached = null;
	var inflight = null;
	function loadSubs(force = false, onRetry) {
		if (force) {
			cached = null;
			inflight = null;
		}
		if (cached) return Promise.resolve(cached);
		if (inflight) return inflight;
		inflight = (async () => {
			const subs = [];
			let after = null;
			for (let page = 0; page < MAX_PAGES; page++) {
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
				for (const child of json?.data?.children ?? []) {
					const d = child?.data;
					if (!d?.display_name) continue;
					subs.push({
						name: d.display_name,
						id: d.name,
						title: d.title,
						subscribers: d.subscribers,
						over18: d.over18
					});
				}
				after = json?.data?.after ?? null;
				if (!after) break;
				if (page === 59 && after) console.warn(`[Reddit Manager] Subscriptions capped at 6000 items limit.`);
			}
			cached = subs;
			return subs;
		})().finally(() => {
			inflight = null;
		});
		return inflight;
	}
	var meCached = null;
	var meInflight = null;
	async function meInfo(onRetry, force = false) {
		if (force) meCached = null;
		if (meCached) return meCached;
		if (meInflight) return meInflight;
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
			meCached = data;
			return data;
		})().finally(() => {
			meInflight = null;
		});
		return meInflight;
	}
	async function getModhash(onRetry) {
		return (await meInfo(onRetry)).modhash;
	}
	async function setSubscribed(name, subscribe, onRetry) {
		cached = null;
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
			const errors = (await resp.json().catch(() => null))?.json?.errors;
			if (Array.isArray(errors) && errors.length > 0) throw new Error(errors.map((e) => e[1] ?? e[0]).join("; "));
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
		for (let page = 0; page < MAX_PAGES; page++) {
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
			const children = json?.data?.children ?? [];
			if (children.length === 0) break;
			for (const child of children) {
				const d = child?.data;
				if (!d?.name) continue;
				items.push({
					fullname: d.name,
					title: d.title,
					body: d.body,
					subreddit: d.subreddit
				});
			}
			after = json?.data?.after ?? null;
			if (!after) break;
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
				if (!editResp.ok) console.warn(`[Reddit Manager] Overwrite failed with HTTP ${editResp.status} for ${fullname}; proceeding to deletion.`);
				else {
					const editErrors = (await editResp.json().catch(() => null))?.json?.errors;
					if (Array.isArray(editErrors) && editErrors.length > 0) console.warn(`[Reddit Manager] Overwrite failed for ${fullname}: ${editErrors.map((e) => e[1] ?? e[0]).join("; ")}; proceeding to deletion.`);
				}
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
			return;
		}
	}
	var SUB_PAUSE_MS = 650;
	var DELETE_PAUSE_MS = 1300;
	var GIVE_UP_AFTER = 3;
	async function applyAll(identifiers, subscribe, onProgress, r) {
		const failed = [];
		let lastError = "";
		const onRetry = (attempt, maxRetries, waitMs, status) => {
			const msg = `Reddit returned ${status}. Retrying in ${(waitMs / 1e3).toFixed(1)}s (${attempt}/${maxRetries})…`;
			r?.status(msg, "bad");
			console.warn(`[Reddit Manager] ${msg}`);
		};
		for (let i = 0; i < identifiers.length; i++) {
			while (r?.isPaused?.() && !r?.stopped?.()) await sleep(200);
			if (r?.stopped?.()) return {
				failed,
				error: lastError,
				stoppedAt: i
			};
			try {
				await setSubscribed(identifiers[i], subscribe, onRetry);
				r?.status("");
			} catch (err) {
				lastError = err.message;
				failed.push(identifiers[i]);
				console.warn(`[Reddit Manager] ${subscribe ? "join" : "leave"} ${identifiers[i]} failed: ${lastError}`);
				if (failed.length === i + 1 && failed.length >= GIVE_UP_AFTER) throw new Error(`${lastError} (first ${failed.length} all failed the same way — stopped, nothing was changed)`);
			}
			onProgress(i + 1, identifiers.length, failed.length);
			if (i + 1 < identifiers.length) await sleep(SUB_PAUSE_MS);
		}
		return {
			failed,
			error: lastError,
			stoppedAt: identifiers.length
		};
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
			const list = Array.isArray(json) ? json : json.subreddits ?? json.subs ?? json.data;
			if (!Array.isArray(list)) throw new Error("no subreddit list in that JSON");
			raw = list;
		} else {
			raw = trimmed.split(/[\s,;]+/);
			if (HEADERS.has(String(raw[0]).toLowerCase())) raw.shift();
		}
		const seen = new Map();
		for (const item of raw) {
			const name = normalizeName(typeof item === "string" ? item : item?.name ?? item?.display_name);
			if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
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
		const onRetry = (attempt, maxRetries, waitMs, status) => r.status(`Rate limited (${status}). Retrying in ${(waitMs / 1e3).toFixed(1)}s (${attempt}/${maxRetries})…`, "bad");
		try {
			const subsPromise = loadSubs(force, onRetry);
			const postsPromise = full ? loadUserItems("posts", onRetry) : Promise.reject("skipped");
			const commentsPromise = full ? loadUserItems("comments", onRetry) : Promise.reject("skipped");
			const results = await Promise.allSettled([
				subsPromise,
				postsPromise,
				commentsPromise
			]);
			const subs = results[0].status === "fulfilled" ? results[0].value : null;
			const posts = results[1].status === "fulfilled" ? results[1].value : null;
			const comments = results[2].status === "fulfilled" ? results[2].value : null;
			r.count(subs?.length ?? null, {
				posts: posts?.length ?? null,
				comments: comments?.length ?? null
			});
			if (results[0].status === "rejected") {
				const err = results[0].reason?.message ?? "Failed to read subscriptions";
				r.status(err, "bad");
				throw new Error(err);
			}
			if (force) {
				const countsMsg = `${subs ? `${subs.length} subreddits` : "subscriptions unavailable"}${posts ? `, ${posts.length} posts` : ""}${comments ? `, ${comments.length} comments` : ""}`;
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
		const { failed, error: lastError, stoppedAt } = await applyAll(names, subscribe, (done, total, bad) => r.progress(verb, done, total, headline(done - bad), "subs"), r);
		const succeeded = stoppedAt - failed.length;
		const untouched = names.length - stoppedAt;
		const halted = untouched ? ` Stopped — ${untouched} left untouched.` : "";
		r.status("Confirming with Reddit…");
		await sleep(1e3);
		await refresh(r, true).catch(() => r.count(null));
		if (failed.length === 0) {
			r.status(`${past} ${succeeded} subreddits.${halted}`, halted ? "bad" : "ok");
			return;
		}
		r.status(`${past} ${succeeded}. Skipped ${failed.length} (${lastError}): ${failed.slice(0, 6).join(", ")}${failed.length > 6 ? "…" : ""}${halted}`, "bad");
		console.warn("[Reddit Manager] failed:", failed, lastError);
	}
	async function applyItemDeletions(items, onProgress, r) {
		const failed = [];
		let lastError = "";
		let consecutiveFailures = 0;
		const onRetry = (attempt, maxRetries, waitMs, status) => {
			const msg = `Reddit returned ${status}. Retrying in ${(waitMs / 1e3).toFixed(1)}s (${attempt}/${maxRetries})…`;
			r?.status(msg, "bad");
		};
		for (let i = 0; i < items.length; i++) {
			while (r?.isPaused?.() && !r?.stopped?.()) await sleep(200);
			if (r?.stopped?.()) return {
				failed,
				error: lastError,
				stoppedAt: i
			};
			try {
				await deleteUserItem(items[i].fullname, true, onRetry);
				consecutiveFailures = 0;
				r?.status("");
			} catch (err) {
				lastError = err.message;
				failed.push(items[i].fullname);
				consecutiveFailures++;
				if (consecutiveFailures >= GIVE_UP_AFTER) return {
					failed,
					error: lastError,
					stoppedAt: i + 1
				};
			}
			onProgress(i + 1, items.length, failed.length);
			if (i + 1 < items.length) await sleep(DELETE_PAUSE_MS);
		}
		return {
			failed,
			error: lastError,
			stoppedAt: items.length
		};
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
			body: `Deletes up to Reddit's 1,000 visible history limit. Each item will be overwritten with '.' prior to deletion.`,
			action: `Delete ${label}`,
			danger: true,
			typed: String(items.length)
		})) return;
		const verb = `Deleting ${label}`;
		r.progress(verb, 0, items.length, items.length, kind);
		const { failed, error: lastError, stoppedAt } = await applyItemDeletions(items, (done, total, bad) => r.progress(verb, done, total, items.length - (done - bad), kind), r);
		const succeeded = stoppedAt - failed.length;
		const untouched = items.length - stoppedAt;
		const halted = untouched ? ` Stopped — ${untouched} left untouched.` : "";
		r.status("Confirming with Reddit…");
		await sleep(500);
		await refresh(r, true, true).catch(() => r.count(null));
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
			name: "Refresh",
			hint: "Re-read your list from Reddit",
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
	var CSS = `
:host {
  position: fixed;
  right: 24px;
  bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  z-index: 2147483647;
  --ink: #0f1217;
  --plate: #1a1e24;
  --chalk: #eceef2;
  --muted: #8b929e;
  --amber: #f59e0b;
  --line: rgba(236, 238, 242, 0.12);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: var(--chalk);
}
* { box-sizing: border-box; }
button { font: inherit; color: inherit; touch-action: manipulation; }
:focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }

.wrap { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }

.fab {
  position: relative;
  width: 48px; height: 48px;
  display: grid; place-items: center;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--ink);
  color: var(--amber);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
  cursor: pointer;
  transition: transform .18s cubic-bezier(.2,.85,.3,1), border-color .18s ease, box-shadow .18s ease;
}
.fab:hover { transform: translateY(-2px); border-color: rgba(245, 158, 11, .6); box-shadow: 0 12px 28px rgba(0, 0, 0, 0.65); }
.fab.is-busy { border-color: var(--amber); }

.fab-icon { display: flex; align-items: center; justify-content: center; }
.fab.is-busy .fab-icon { display: none; }

.fab-progress {
  position: absolute; inset: 0;
  display: none; align-items: center; justify-content: center;
}
.fab.is-busy .fab-progress { display: flex; }

.progress-ring { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.ring-fill { transition: stroke-dashoffset .25s ease; }

.fab-badge {
  font: 700 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--amber);
  z-index: 1;
}

.panel {
  position: relative;
  width: 292px;
  max-height: calc(100vh - 120px - env(safe-area-inset-bottom, 0px));
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--ink);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, .55);
  transform-origin: bottom right;
  opacity: 0;
  transform: translateY(10px) scale(.96);
  pointer-events: none;
  visibility: hidden;
  transition: opacity .16s ease, transform .22s cubic-bezier(.2,.9,.3,1), visibility .16s ease;
}
.panel.is-open { opacity: 1; transform: none; pointer-events: auto; visibility: visible; }

.head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px 0; }
.eyebrow { font-size: 10px; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; color: var(--muted); }
.close { border: 0; background: none; color: var(--muted); cursor: pointer; padding: 8px; margin: -8px -8px -8px 0; line-height: 0; border-radius: 4px; }
.close:hover { color: var(--chalk); }

.readout { padding: 12px 14px 14px; }
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; text-align: center; }
.stat-cell { display: flex; flex-direction: column; align-items: center; }
.figure {
  font: 700 20px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  font-variant-numeric: tabular-nums;
  letter-spacing: -.02em;
  color: var(--amber);
}
.unit { margin-top: 4px; font-size: 9px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.progress-label { margin-top: 6px; font-size: 11px; font-weight: 600; color: var(--muted); min-height: 14px; text-align: center; }
.progress-label:empty { display: none; }
.rule { margin-top: 8px; height: 2px; background: var(--line); }
.rule > i { display: block; height: 100%; width: 0; background: var(--amber); transition: width .25s ease; }

.actions { border-top: 1px solid var(--line); }
.act {
  display: flex; gap: 11px; align-items: flex-start;
  width: 100%; padding: 11px 14px;
  border: 0; border-bottom: 1px solid var(--line);
  background: transparent;
  text-align: left; cursor: pointer;
}
.act:last-child { border-bottom: 0; }
.act:hover:not(:disabled) { background: var(--plate); }
.act:disabled { opacity: .35; cursor: default; }
.act > .ico { color: var(--amber); line-height: 0; padding-top: 1px; }
.act .name { display: block; font-size: 13px; font-weight: 600; letter-spacing: -.01em; }
.act .hint { display: block; margin-top: 2px; font-size: 11px; line-height: 1.35; color: var(--muted); }
.act.is-danger {
  background-image: repeating-linear-gradient(45deg, rgba(255,184,77,.22) 0 2px, transparent 2px 6px);
  background-size: 4px 100%;
  background-repeat: no-repeat;
}

.status { padding: 9px 14px; border-top: 1px solid var(--line); font-size: 11px; line-height: 1.35; color: var(--muted); }
.status:empty { display: none; }
.status.is-ok { color: var(--chalk); }
.status.is-bad { color: var(--amber); }

.sheet {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  padding: 14px;
  background: rgba(15, 18, 23, 0.88);
  backdrop-filter: blur(6px);
  z-index: 20;
  animation: fadeIn .16s ease;
}
.sheet__card {
  position: relative;
  width: 100%;
  max-width: 264px;
  background: #1c2026;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 16px 14px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.65);
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: popIn .2s cubic-bezier(.2,.9,.3,1) both;
}
.sheet.is-danger .sheet__card {
  border-color: rgba(245, 158, 11, 0.35);
  background-image: repeating-linear-gradient(45deg, rgba(245, 158, 11, .06) 0 2px, transparent 2px 6px);
}
.sheet__badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 8px;
  background: rgba(245, 158, 11, 0.14); color: var(--amber);
  margin-bottom: 2px;
}
.sheet.is-danger .sheet__badge {
  background: rgba(245, 158, 11, 0.18); color: var(--amber);
}
.sheet__title { font-size: 14px; font-weight: 700; letter-spacing: -.01em; color: var(--chalk); }
.sheet__body { font-size: 11.5px; line-height: 1.45; color: var(--muted); }
.sheet__input {
  width: 100%; padding: 9px 10px;
  font: 600 13px ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--chalk); background: var(--plate);
  border: 1px solid var(--line); border-radius: 8px;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.sheet__input:focus { outline: none; border-color: var(--amber); box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2); }
.sheet__row { display: flex; gap: 8px; margin-top: 4px; }
.btn { flex: 1; padding: 9px; border: 1px solid var(--line); border-radius: 8px; background: transparent; font-size: 12px; font-weight: 600; cursor: pointer; transition: background .15s ease; }
.btn:hover { background: var(--plate); }
.btn--go { background: var(--amber); border-color: var(--amber); color: #17130a; }
.btn--go:hover:not(:disabled) { background: #ffc76e; }
.btn--go:disabled { background: transparent; border-color: var(--line); color: var(--muted); opacity: .5; cursor: default; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes popIn { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: scale(1); } }

.panel.is-open .act { animation: rise .26s cubic-bezier(.2,.9,.3,1) both; }
.panel.is-open .act:nth-child(1) { animation-delay: .04s; }
.panel.is-open .act:nth-child(2) { animation-delay: .07s; }
.panel.is-open .act:nth-child(3) { animation-delay: .10s; }
.panel.is-open .act:nth-child(4) { animation-delay: .13s; }
@keyframes rise { from { opacity: 0; transform: translateY(6px); } }

.controls-running {
  display: none;
  gap: 8px;
  padding: 8px 14px;
  border-top: 1px solid var(--line);
}
.panel.is-running .controls-running { display: flex; }
.btn-ctrl {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--plate);
  color: var(--chalk);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
}
.btn-ctrl:hover:not(:disabled) { background: rgba(236, 238, 242, 0.12); }
.btn-ctrl.cancel-btn { color: #f87171; border-color: rgba(248, 113, 113, 0.3); }
.btn-ctrl.cancel-btn:hover:not(:disabled) { background: rgba(248, 113, 113, 0.15); }
.btn-ctrl:disabled { opacity: .4; cursor: default; }

@media (prefers-reduced-motion: reduce) {
  .fab, .panel, .rule > i, .act { transition: none; animation: none; }
}

@media (max-width: 480px) {
  :host { right: 12px; bottom: calc(76px + env(safe-area-inset-bottom, 0px)); }
  .panel { width: min(320px, calc(100vw - 24px)); }
  .fab { width: 52px; height: 52px; }
  .act { padding: 13px 14px; }
  .btn { padding: 12px; }
  .sheet__input { padding: 10px; font-size: 16px; }
}
`;
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
		activeResolve = null;
		constructor() {
			const host = document.createElement("div");
			this.root = host.attachShadow({ mode: "open" });
			this.root.innerHTML = `
      <style>${CSS}</style>
      <div class="wrap">
        <div class="panel" role="dialog" aria-label="Reddit Manager" aria-hidden="true">
          <div class="head">
            <span class="eyebrow">Dashboard</span>
            <button class="close" aria-label="Close">${svg("<path d=\"M4 4l8 8M12 4l-8 8\"/>")}</button>
          </div>
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
            <div class="rule"><i></i></div>
          </div>
          <div class="actions">${ACTIONS.map((a) => `
            <button class="act${"danger" in a ? " is-danger" : ""}" data-key="${a.key}">
              <span class="ico">${a.icon}</span>
              <span><span class="name">${a.name}</span><span class="hint">${a.hint}</span></span>
            </button>`).join("")}</div>
          <div class="controls-running">
            <button class="btn-ctrl pause-btn">Pause</button>
            <button class="btn-ctrl cancel-btn">Cancel</button>
          </div>
          <div class="status"></div>
        </div>
        <button class="fab" aria-label="Subreddit Subscriptions" title="Subreddit Subscription Manager" aria-expanded="false">
          <span class="fab-icon">${svg("<path d=\"M2.5 4.5h11M2.5 8h8M2.5 11.5h5\"/>")}</span>
          <div class="fab-progress" aria-hidden="true">
            <svg class="progress-ring" width="48" height="48" viewBox="0 0 48 48">
              <circle class="ring-bg" cx="24" cy="24" r="20" fill="none" stroke="rgba(236, 238, 242, 0.14)" stroke-width="3"/>
              <circle class="ring-fill" cx="24" cy="24" r="20" fill="none" stroke="var(--amber)" stroke-width="3" stroke-dasharray="${RING}" stroke-dashoffset="${RING}" stroke-linecap="round" transform="rotate(-90 24 24)"/>
            </svg>
            <span class="fab-badge">0%</span>
          </div>
        </button>
      </div>`;
			const $ = (sel) => this.root.querySelector(sel);
			this.panel = $(".panel");
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
				if (e.key === "Escape") this.toggle(false);
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
			this.panel.style.visibility = next ? "visible" : "hidden";
			this.fab.setAttribute("aria-expanded", String(next));
			if (!next) {
				this.fab.focus();
				if (this.activeResolve) {
					const resolve = this.activeResolve;
					this.activeResolve = null;
					resolve(false);
				}
			}
			if (next && !this.busy) {
				const gen = ++this.refreshGen;
				refresh(this, false, false).then(() => {
					if (gen !== this.refreshGen) return;
				}).catch((e) => {
					if (gen === this.refreshGen) this.status(e.message, "bad");
				});
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
			this.fab.classList.toggle("is-busy", busy);
			this.panel.classList.toggle("is-running", busy);
			for (const b of this.buttons) b.disabled = busy;
			if (busy) {
				this.stopping = false;
				this.paused = false;
				this.pauseBtn.disabled = false;
				this.pauseBtn.textContent = "Pause";
				this.cancelBtn.disabled = false;
				this.cancelBtn.textContent = "Cancel";
				window.addEventListener("beforeunload", this.onBeforeUnload);
			} else {
				window.removeEventListener("beforeunload", this.onBeforeUnload);
				this.fab.title = "Subreddit Subscription Manager";
				this.ringFill.style.strokeDashoffset = String(RING);
				this.badge.textContent = "0%";
				this.progressLabel.textContent = "";
			}
		}
		count(n, stats) {
			this.bar.style.width = "0%";
			this.progressLabel.textContent = "";
			this.figSubs.textContent = n === null ? "—" : String(n);
			this.figPosts.textContent = stats?.posts == null ? "—" : String(stats.posts);
			this.figComments.textContent = stats?.comments == null ? "—" : String(stats.comments);
		}
		progress(verb, done, total, headline, metric = "subs") {
			this.progressLabel.textContent = `${verb} — ${done} of ${total}`;
			if (headline != null) {
				if (metric === "posts") this.figPosts.textContent = String(headline);
				else if (metric === "comments") this.figComments.textContent = String(headline);
				else this.figSubs.textContent = String(headline);
			}
			const pct = total > 0 ? done / total : 0;
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
			return new Promise((resolve) => {
				this.activeResolve = resolve;
				const sheet = document.createElement("div");
				sheet.className = `sheet${spec.danger ? " is-danger" : ""}`;
				const card = document.createElement("div");
				card.className = "sheet__card";
				const badge = document.createElement("div");
				badge.className = "sheet__badge";
				badge.innerHTML = spec.danger ? svg("<path d=\"M8 2l6 11H2L8 2zM8 6v3M8 11h.01\"/>") : svg("<path d=\"M8 2.5v11M2.5 8h11\"/>");
				const titleEl = document.createElement("div");
				titleEl.className = "sheet__title";
				titleEl.textContent = spec.title;
				const bodyEl = document.createElement("div");
				bodyEl.className = "sheet__body";
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
					resolve(ok);
				};
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
				(input ?? goBtn).focus();
			});
		}
		pickFile() {
			return new Promise((resolve) => {
				const input = document.createElement("input");
				input.type = "file";
				input.accept = ".json,.txt,.csv,application/json,text/plain";
				const done = (v) => {
					window.removeEventListener("focus", onFocus);
					resolve(v);
				};
				const onFocus = () => setTimeout(() => {
					if (!input.files?.length) done(null);
				}, 400);
				input.onchange = () => done(input.files?.[0]?.text() ?? null);
				input.oncancel = () => done(null);
				window.addEventListener("focus", onFocus);
				input.click();
			});
		}
	};
	new Panel();
})();

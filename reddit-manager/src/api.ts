// Everything that talks to Reddit. No UI, no storage.

export interface Sub {
	name: string; // display_name, original casing
	id?: string; // fullname, e.g. t5_2qh1i
	title?: string;
	subscribers?: number;
	over18?: boolean;
}

const ORIGIN = location.origin;
const MAX_SUB_PAGES = 50; // Reddit's own ceiling is 5000 subscriptions.
const MAX_USER_ITEM_PAGES = 10; // Reddit exposes at most 1000 items per listing.

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type RetryCallback = (
	attempt: number,
	maxRetries: number,
	waitMs: number,
	status: number,
) => void;

async function fetchWithRetry(
	url: string,
	options: RequestInit = {},
	maxRetries = 5,
	onRetry?: RetryCallback,
): Promise<Response> {
	let delay = 2000;
	let resp: Response | null = null;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		resp = null;
		try {
			resp = await fetch(url, options);
			if (!RETRYABLE.has(resp.status)) return resp;
		} catch (err) {
			// Network TypeError (e.g., connection drop) -> retry if attempts remain
			if (attempt === maxRetries) throw err;
		}

		if (attempt === maxRetries && resp) break;

		let wait = delay;
		if (resp) {
			const header =
				resp.headers.get("Retry-After") || resp.headers.get("x-ratelimit-reset");
			if (header) {
				const value = header.trim();
				if (/^\d+(?:\.\d+)?$/.test(value)) {
					wait = Math.max(wait, Number(value) * 1000, 2000);
				} else {
					const parsedDate = Date.parse(value);
					if (Number.isFinite(parsedDate)) {
						wait = Math.max(wait, parsedDate - Date.now(), 2000);
					}
				}
			}
		}

		// Positive jitter avoids synchronized retries without violating Retry-After.
		wait += Math.random() * 400;

		const status = resp?.status ?? 0;
		console.warn(
			`[Reddit Manager] Request on ${new URL(url, ORIGIN).pathname} failed/retryable (status ${status}). Retrying in ${(wait / 1000).toFixed(1)}s (attempt ${attempt + 1}/${maxRetries})…`,
		);

		onRetry?.(attempt + 1, maxRetries, wait, status);

		const step = 1000;
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

async function checkMutationResponse(
	response: Response,
	action: string,
	requireErrors = false,
): Promise<void> {
	const body = await response.json().catch(() => null);
	const invalid = () => new Error(`Reddit returned an invalid ${action} response`);
	if (!body || typeof body !== "object" || Array.isArray(body)) throw invalid();
	if (body.error || body.status === "error" || body.success === false) {
		throw new Error(`Reddit rejected ${action}: ${body.error ?? body.message ?? body.status}`);
	}
	const errors = body.json?.errors;
	if (errors === undefined && !requireErrors && Object.keys(body).length === 0) return;
	if (!Array.isArray(errors)) throw invalid();
	if (errors.length) {
		throw new Error(`Reddit rejected ${action}: ${errors.map((error: unknown) =>
			Array.isArray(error) ? String(error[1] ?? error[0]) : String(error),
		).join("; ")}`);
	}
}

/** Accepts a subreddit name or Reddit subreddit URL; empty string if invalid. */
export function normalizeName(input: string | null | undefined): string {
	if (!input) return "";
	const value = input.trim();
	if (!value) return "";
	let name: string | undefined;

	if (/^https?:\/\//i.test(value)) {
		try {
			const url = new URL(value);
			const host = url.hostname.toLowerCase();
			if (host !== "reddit.com" && !host.endsWith(".reddit.com")) return "";
			name = /^\/r\/([^/]+)(?:\/.*)?$/i.exec(url.pathname)?.[1];
		} catch {
			return "";
		}
	} else {
		name = /^\/?r\/([^/]+)(?:\/.*)?$/i.exec(value)?.[1];
		if (!name && /^[A-Za-z0-9_-]+$/.test(value)) name = value;
	}

	if (!name || name.length > 21 || !/^[A-Za-z0-9_-]+$/.test(name)) return "";
	return name;
}

let cached: Sub[] | null = null;
let inflight: Promise<Sub[]> | null = null;
let subsGeneration = 0;

function invalidateSubs(): void {
	cached = null;
	inflight = null;
	subsGeneration++;
}

export function loadSubs(
	force = false,
	onRetry?: RetryCallback,
): Promise<Sub[]> {
	if (force) invalidateSubs();
	if (cached) return Promise.resolve(cached);
	if (inflight) return inflight;
	const generation = subsGeneration;

	inflight = (async () => {
		const subs: Sub[] = [];
		let after: string | null = null;

		const seenNames = new Set<string>();
		const seenCursors = new Set<string>();

		for (let page = 0; page < MAX_SUB_PAGES; page++) {
			if (after) seenCursors.add(after);

			const url = new URL(`${ORIGIN}/subreddits/mine/subscriber.json`);
			url.searchParams.set("limit", "100");
			url.searchParams.set("raw_json", "1");
			url.searchParams.set("_", String(Date.now()));
			if (after) url.searchParams.set("after", after);

			const resp = await fetchWithRetry(
				url.toString(),
				{ credentials: "include", headers: { Accept: "application/json" } },
				4,
				onRetry,
			);
			if (resp.status === 401 || resp.status === 403)
				throw new Error("not logged in to Reddit");
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
					over18: d.over18,
				});
			}

			const nextAfter = json?.data?.after ?? null;
			if (!nextAfter) break;
			if (seenCursors.has(nextAfter)) {
				throw new Error("Reddit repeated a subscription pagination cursor; results may be incomplete");
			}
			after = nextAfter;
			if (page === MAX_SUB_PAGES - 1 && after) {
				throw new Error(`Subscription listing exceeded ${MAX_SUB_PAGES} pages; results may be incomplete`);
			}
		}

		if (generation === subsGeneration) cached = subs;
		return subs;
	})().finally(() => {
		if (generation === subsGeneration) inflight = null;
	});

	return inflight;
}

export interface MeInfo {
	modhash: string;
	name: string;
}

let meCached: MeInfo | null = null;
let meInflight: Promise<MeInfo> | null = null;
let meGeneration = 0;

export async function meInfo(
	onRetry?: RetryCallback,
	force = false,
): Promise<MeInfo> {
	if (force) {
		meCached = null;
		meInflight = null;
		meGeneration++;
	}
	if (meCached) return meCached;
	if (meInflight) return meInflight;
	const generation = meGeneration;

	meInflight = (async () => {
		const resp = await fetchWithRetry(
			`${ORIGIN}/api/me.json`,
			{ credentials: "include", headers: { Accept: "application/json" } },
			3,
			onRetry,
		);

		if (resp.status === 401 || resp.status === 403) {
			throw new Error("not logged in to Reddit");
		}
		if (!resp.ok) {
			throw new Error(`/api/me.json returned ${resp.status}`);
		}

		const json = await resp.json();
		const data: MeInfo = {
			modhash: json?.data?.modhash ?? "",
			name: json?.data?.name ?? "",
		};

		if (!data.name) throw new Error("Reddit did not return a username");

		if (generation === meGeneration) meCached = data;
		return data;
	})().finally(() => {
		if (generation === meGeneration) meInflight = null;
	});

	return meInflight;
}

async function getModhash(onRetry?: RetryCallback): Promise<string> {
	const info = await meInfo(onRetry);
	return info.modhash;
}

export async function setSubscribed(
	name: string,
	subscribe: boolean,
	onRetry?: RetryCallback,
): Promise<void> {
	invalidateSubs();

	let currentModhash = await getModhash(onRetry);

	const params = new URLSearchParams({
		action: subscribe ? "sub" : "unsub",
		sr_name: name,
		api_type: "json",
	});

	for (let attempt = 0; attempt < 2; attempt++) {
		const headers: Record<string, string> = {
			"Content-Type": "application/x-www-form-urlencoded",
		};
		if (currentModhash) {
			headers["X-Modhash"] = currentModhash;
			params.set("uh", currentModhash);
		} else {
			params.delete("uh");
		}

		const resp = await fetchWithRetry(
			`${ORIGIN}/api/subscribe`,
			{ method: "POST", credentials: "include", headers, body: params },
			5,
			onRetry,
		);

		if (resp.status === 403) {
			if (attempt === 0) {
				currentModhash = (await meInfo(onRetry, true)).modhash;
				continue;
			}
			throw new Error(
				currentModhash
					? "HTTP 403 — modhash rejected; log out and back in on Reddit"
					: "HTTP 403 — no modhash available from /api/me.json (are you logged in to Reddit?)",
			);
		}
		if (!resp.ok) {
			const body = (await resp.text().catch(() => "")).trim();
			const detail = body.startsWith("<")
				? (body.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "HTML error page")
				: body.slice(0, 200);
			throw new Error(`HTTP ${resp.status}${detail ? ` — ${detail}` : ""}`);
		}

		await checkMutationResponse(resp, "subscription");
		invalidateSubs();
		return;
	}
}

export interface UserItem {
	fullname: string; // e.g. t3_xxx or t1_xxx
	title?: string;
	body?: string;
	selftext?: string;
	subreddit?: string;
}

export async function loadUserItems(
	kind: "posts" | "comments",
	onRetry?: RetryCallback,
): Promise<UserItem[]> {
	const info = await meInfo(onRetry);
	if (!info.name) throw new Error("not logged in to Reddit");

	const items: UserItem[] = [];
	let after: string | null = null;
	const endpoint = kind === "posts" ? "submitted" : "comments";
	const encodedName = encodeURIComponent(info.name);

	const seenFullnames = new Set<string>();
	const seenCursors = new Set<string>();

	for (let page = 0; page < MAX_USER_ITEM_PAGES; page++) {
		if (after && seenCursors.has(after)) {
			throw new Error(`Reddit repeated a ${endpoint} pagination cursor; results may be incomplete`);
		}
		if (after) seenCursors.add(after);

		const url = new URL(`${ORIGIN}/user/${encodedName}/${endpoint}.json`);
		url.searchParams.set("limit", "100");
		url.searchParams.set("raw_json", "1");
		url.searchParams.set("_", String(Date.now()));
		if (after) url.searchParams.set("after", after);

		const resp = await fetchWithRetry(
			url.toString(),
			{ credentials: "include", headers: { Accept: "application/json" } },
			4,
			onRetry,
		);
		if (resp.status === 401 || resp.status === 403)
			throw new Error("not logged in to Reddit");
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
				subreddit: d.subreddit,
			});
		}

		const nextAfter = json?.data?.after ?? null;
		if (!nextAfter) break;
		if (seenCursors.has(nextAfter)) {
			throw new Error(`Reddit repeated a ${endpoint} pagination cursor; results may be incomplete`);
		}
		after = nextAfter;
	}

	return items;
}

export async function deleteUserItem(
	fullname: string,
	editFirst = true,
	onRetry?: RetryCallback,
): Promise<void> {
	for (let attempt = 0; attempt < 2; attempt++) {
		const info = await meInfo(onRetry);
		const headers: Record<string, string> = {
			"Content-Type": "application/x-www-form-urlencoded",
		};
		if (info.modhash) {
			headers["X-Modhash"] = info.modhash;
		}

		if (editFirst) {
			const editParams = new URLSearchParams({
				thing_id: fullname,
				text: ".",
				api_type: "json",
			});
			if (info.modhash) editParams.set("uh", info.modhash);

			const editResp = await fetchWithRetry(
				`${ORIGIN}/api/editusertext`,
				{ method: "POST", credentials: "include", headers, body: editParams },
				2,
				onRetry,
			);

			if (editResp.status === 401 || editResp.status === 403) {
				if (attempt === 0) {
					await meInfo(onRetry, true);
					continue;
				}
			}

			if (!editResp.ok) {
				throw new Error(`HTTP ${editResp.status} overwriting ${fullname}`);
			}

			await checkMutationResponse(editResp, `overwrite for ${fullname}`, true);
		}

		const delParams = new URLSearchParams({
			id: fullname,
			api_type: "json",
		});
		if (info.modhash) delParams.set("uh", info.modhash);

		const resp = await fetchWithRetry(
			`${ORIGIN}/api/del`,
			{ method: "POST", credentials: "include", headers, body: delParams },
			3,
			onRetry,
		);

		if (resp.status === 401 || resp.status === 403) {
			if (attempt === 0) {
				await meInfo(onRetry, true);
				continue;
			}
		}

		if (!resp.ok) {
			throw new Error(`HTTP ${resp.status} deleting ${fullname}`);
		}
		await checkMutationResponse(resp, `deletion of ${fullname}`);
		return;
	}
}

// Everything that talks to Reddit. No UI, no storage.

export interface Sub {
	name: string; // display_name, original casing
	id?: string; // fullname, e.g. t5_2qh1i
	title?: string;
	subscribers?: number;
	over18?: boolean;
}

const ORIGIN = location.origin;
const MAX_PAGES = 60; // 6000 subs; reddit's own ceiling is 5000

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
				const seconds = Number.parseFloat(header);
				if (Number.isFinite(seconds)) {
					wait = Math.max(seconds * 1000, 2000);
				} else {
					const parsedDate = Date.parse(header);
					if (Number.isFinite(parsedDate)) {
						wait = Math.max(parsedDate - Date.now(), 2000);
					}
				}
			}
		}

		// Add subtle jitter (±20%) to avoid synchronized retry bursts
		wait += Math.random() * 400 - 200;
		wait = Math.max(wait, 1000);

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

/** `https://reddit.com/r/Foo/`, `/r/Foo`, `r/Foo`, `Foo` -> `Foo`. Empty string if unusable. */
export function normalizeName(input: string | null | undefined): string {
	if (!input) return "";
	return input
		.trim()
		.replace(/^https?:\/\/[^/]+/i, "")
		.replace(/^\/?(?:r\/)?/i, "")
		.replace(/\/.*$/, "")
		.replace(/[^\w-]/g, "");
}

let cached: Sub[] | null = null;
let inflight: Promise<Sub[]> | null = null;

export function loadSubs(
	force = false,
	onRetry?: RetryCallback,
): Promise<Sub[]> {
	if (force) {
		cached = null;
		inflight = null;
	}
	if (cached) return Promise.resolve(cached);
	if (inflight) return inflight;

	inflight = (async () => {
		const subs: Sub[] = [];
		let after: string | null = null;

		for (let page = 0; page < MAX_PAGES; page++) {
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
			for (const child of json?.data?.children ?? []) {
				const d = child?.data;
				if (!d?.display_name) continue;
				subs.push({
					name: d.display_name,
					id: d.name,
					title: d.title,
					subscribers: d.subscribers,
					over18: d.over18,
				});
			}

			after = json?.data?.after ?? null;
			if (!after) break;
			if (page === MAX_PAGES - 1 && after) {
				console.warn(
					`[Reddit Manager] Subscriptions capped at ${MAX_PAGES * 100} items limit.`,
				);
			}
		}

		cached = subs;
		return subs;
	})().finally(() => {
		inflight = null;
	});

	return inflight;
}

export interface MeInfo {
	modhash: string;
	name: string;
}

let meCached: MeInfo | null = null;
let meInflight: Promise<MeInfo> | null = null;

export async function meInfo(
	onRetry?: RetryCallback,
	force = false,
): Promise<MeInfo> {
	if (force) meCached = null;
	if (meCached) return meCached;
	if (meInflight) return meInflight;

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

		meCached = data;
		return data;
	})().finally(() => {
		meInflight = null;
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
	cached = null;

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

		const errors = (await resp.json().catch(() => null))?.json?.errors;
		if (Array.isArray(errors) && errors.length > 0)
			throw new Error(errors.map((e: string[]) => e[1] ?? e[0]).join("; "));
		return;
	}
}

export interface UserItem {
	fullname: string; // e.g. t3_xxx or t1_xxx
	title?: string;
	body?: string;
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

	for (let page = 0; page < MAX_PAGES; page++) {
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
		const children = json?.data?.children ?? [];
		if (children.length === 0) break;

		for (const child of children) {
			const d = child?.data;
			if (!d?.name) continue;
			items.push({
				fullname: d.name,
				title: d.title,
				body: d.body,
				subreddit: d.subreddit,
			});
		}

		after = json?.data?.after ?? null;
		if (!after) break;
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
				console.warn(
					`[Reddit Manager] Overwrite failed with HTTP ${editResp.status} for ${fullname}; proceeding to deletion.`,
				);
			} else {
				const editJson = await editResp.json().catch(() => null);
				const editErrors = editJson?.json?.errors;
				if (Array.isArray(editErrors) && editErrors.length > 0) {
					console.warn(
						`[Reddit Manager] Overwrite failed for ${fullname}: ${editErrors.map((e: string[]) => e[1] ?? e[0]).join("; ")}; proceeding to deletion.`,
					);
				}
			}
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
		return;
	}
}

// Everything that talks to Reddit. No UI, no storage.

export interface Sub {
	name: string; // display_name, original casing
	id?: string; // fullname, e.g. t5_2qh1i
	title?: string;
	subscribers?: number;
	over18?: boolean;
}

// Whichever reddit you're on. www and old serve the same API and the same
// cookies; hardcoding www would make every call cross-origin from old.reddit.com
// and CORS would eat it.
const ORIGIN = location.origin;
const MAX_PAGES = 60; // 6000 subs; reddit's own ceiling is 5000

// All transient. 500 is reddit's "reddit broke!" page, which it hands out under
// load for a subreddit that is perfectly fine a second later.
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
	let resp!: Response;
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		resp = await fetch(url, options);
		if (!RETRYABLE.has(resp.status)) return resp;
		if (attempt === maxRetries) break;

		// Retry-After may be seconds or an HTTP-date; only trust the numeric form.
		const header =
			resp.headers.get("Retry-After") || resp.headers.get("x-ratelimit-reset");
		const seconds = Number.parseFloat(header ?? "");
		const wait = Math.max(
			Number.isFinite(seconds) ? seconds * 1000 : delay,
			2000,
		);

		console.warn(
			`[Reddit Subscription Manager] HTTP ${resp.status} on ${new URL(url, ORIGIN).pathname}. Retrying in ${(wait / 1000).toFixed(1)}s (attempt ${attempt + 1}/${maxRetries})…`,
		);
		onRetry?.(attempt + 1, maxRetries, wait, resp.status);
		await sleep(wait);
		delay *= 2;
	}
	return resp; // the caller decides what a persistent 429 means
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

// Memoised for the lifetime of the page. Any write invalidates it, so there is
// no TTL to get wrong — the list is either known-current or refetched.
let cached: Sub[] | null = null;
let inflight: Promise<Sub[]> | null = null;

export function loadSubs(
	force = false,
	onRetry?: RetryCallback,
): Promise<Sub[]> {
	if (force) cached = null;
	if (cached) return Promise.resolve(cached);
	if (inflight) return inflight;

	inflight = (async () => {
		const subs: Sub[] = [];
		let after: string | null = null;

		for (let page = 0; page < MAX_PAGES; page++) {
			const url = new URL(`${ORIGIN}/subreddits/mine/subscriber.json`);
			url.searchParams.set("limit", "100");
			url.searchParams.set("raw_json", "1");
			url.searchParams.set("_", String(Date.now())); // defeat CDN / bfcache staleness
			if (after) url.searchParams.set("after", after);

			const resp = await fetchWithRetry(
				url.toString(),
				{ credentials: "include", headers: { Accept: "application/json" } },
				4,
				onRetry,
			);
			if (resp.status === 401 || resp.status === 403)
				throw new Error("not logged in on reddit.com");
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
		}

		cached = subs;
		return subs;
	})().finally(() => {
		inflight = null;
	});

	return inflight;
}

let modhash: string | null = null;

async function getModhash(onRetry?: RetryCallback): Promise<string> {
	if (modhash !== null) return modhash;
	try {
		const resp = await fetchWithRetry(
			`${ORIGIN}/api/me.json`,
			{ credentials: "include", headers: { Accept: "application/json" } },
			3,
			onRetry,
		);
		modhash = (await resp.json())?.data?.modhash ?? "";
	} catch {
		modhash = "";
	}
	return modhash as string;
}

/**
 * Subscribe/unsubscribe from ONE subreddit, by display name (`pics`).
 *
 * Do NOT add `skip_initial_defaults` back. Reddit answers any request carrying
 * it with a flat HTTP 400 error page — no api error, no hint — and that one
 * parameter is what made "leave all" fail 144 out of 144. Verified against both
 * www.reddit.com and old.reddit.com: identical requests differing only by that
 * field return 200 without it and 400 with it.
 *
 * One subreddit per request: /api/subscribe resolves a single subreddit, so a
 * comma-joined batch returns 200 and applies to at most one of them.
 */
export async function setSubscribed(
	name: string,
	subscribe: boolean,
	onRetry?: RetryCallback,
): Promise<void> {
	cached = null; // the list is about to change; never serve it again

	let currentModhash = await getModhash(onRetry);

	const params = new URLSearchParams({
		action: subscribe ? "sub" : "unsub",
		sr_name: name,
		api_type: "json",
	});

	for (let attempt = 0; attempt < 2; attempt++) {
		// Reddit takes the modhash as the `uh` field or the header. Send both when
		// we have one, and neither when we don't — an empty `X-Modhash` is worse
		// than none, it looks like a failed CSRF check instead of an absent one.
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
			modhash = null;
			if (attempt === 0) {
				currentModhash = await getModhash(onRetry);
				continue;
			}
			throw new Error(
				currentModhash
					? "HTTP 403 — modhash rejected; log out and back in on www.reddit.com"
					: "HTTP 403 — no modhash available from /api/me.json (are you logged in on www.reddit.com, not just old.reddit.com?)",
			);
		}
		// Reddit puts the actual complaint in the body. Throwing the bare status
		// turns every diagnosable failure into an unreadable "HTTP 400" — but the
		// old stack answers with a whole HTML error page, so keep just its title.
		if (!resp.ok) {
			const body = (await resp.text().catch(() => "")).trim();
			const detail = body.startsWith("<")
				? (body.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "HTML error page")
				: body.slice(0, 200);
			throw new Error(`HTTP ${resp.status}${detail ? ` — ${detail}` : ""}`);
		}

		// Reddit answers 200 with an errors array for things like SUBREDDIT_NOEXIST.
		const errors = (await resp.json().catch(() => null))?.json?.errors;
		if (Array.isArray(errors) && errors.length > 0)
			throw new Error(errors.map((e: string[]) => e[1] ?? e[0]).join("; "));
		return;
	}
}

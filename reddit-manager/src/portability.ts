// The operations. They report through `Report` so the panel owns every
// pixel and this file owns none.

import {
	deleteUserItem,
	loadSubs,
	loadUserItems,
	normalizeName,
	type RetryCallback,
	type Sub,
	setSubscribed,
	sleep,
	type UserItem,
} from "./api";

const SUB_PAUSE_MS = 650; // Pace subscription requests.
const DELETE_PAUSE_MS = 1300; // Allow for both overwrite and delete requests.
const GIVE_UP_AFTER = 3; // Stop repeated failures before processing the remaining queue.

export interface ConfirmSpec {
	title: string;
	body: string;
	action: string;
	danger?: boolean;
	/** When set, the user must type this exact string before the action unlocks. */
	typed?: string;
}

export interface Stats {
	posts?: number | null;
	comments?: number | null;
}

export type ProgressMetric = "subs" | "posts" | "comments";

export interface BatchResult {
	failed: string[];
	error: string;
	stoppedAt: number;
	stopReason?: "cancelled" | "consecutiveFailures";
}

export interface Report {
	/** The headline figures: subreddits, posts, comments. */
	count(n: number | null, stats?: Stats): void;
	/** `headline` is the live count, `done`/`total` the work queue. */
	progress(
		verb: string,
		done: number,
		total: number,
		headline?: number,
		metric?: ProgressMetric,
	): void;
	status(text: string, tone?: "ok" | "bad"): void;
	confirm(spec: ConfirmSpec): Promise<boolean>;
	pickFile(): Promise<string | null>;
	/** True once the user has asked to stop. Checked between requests. */
	stopped?(): boolean;
	/** True while the user has paused execution. */
	isPaused?(): boolean;
}

type ProgressCallback = (done: number, total: number, failed: number) => void;

function retryReporter(r?: Report): RetryCallback {
	return (attempt, maxRetries, waitMs, status) => r?.status(
		`${status ? `Reddit returned ${status}` : "Network request failed"}. Retrying in ${(waitMs / 1000).toFixed(1)}s (${attempt}/${maxRetries})…`,
		"bad",
	);
}

async function runBatch<T>(
	items: T[],
	task: {
		id(item: T): string;
		run(item: T, onRetry: RetryCallback): Promise<void>;
		delay(item: T): number;
	},
	onProgress: ProgressCallback,
	r?: Report,
): Promise<BatchResult> {
	const failed: string[] = [];
	let lastError = "";
	let consecutiveFailures = 0;
	const onRetry = retryReporter(r);

	for (let i = 0; i < items.length; i++) {
		while (r?.isPaused?.() && !r?.stopped?.()) await sleep(200);
		if (r?.stopped?.()) return { failed, error: lastError, stoppedAt: i, stopReason: "cancelled" };
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
		if (consecutiveFailures >= GIVE_UP_AFTER) {
			return { failed, error: lastError, stoppedAt: i + 1, stopReason: "consecutiveFailures" };
		}
		if (i + 1 < items.length && !r?.stopped?.()) await sleep(task.delay(item));
	}
	return { failed, error: lastError, stoppedAt: items.length };
}

export function applyAll(
	identifiers: string[],
	subscribe: boolean,
	onProgress: ProgressCallback,
	r?: Report,
): Promise<BatchResult> {
	return runBatch(identifiers, {
		id: (name) => name,
		run: (name, onRetry) => setSubscribed(name, subscribe, onRetry),
		delay: () => SUB_PAUSE_MS,
	}, onProgress, r);
}

const HEADERS = new Set([
	"subreddit",
	"subreddits",
	"display_name",
	"display_names",
	"url",
]);

export function parseImport(text: string): string[] {
	const trimmed = text.trim();
	if (!trimmed) return [];
	let raw: unknown[];

	if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
		const json = JSON.parse(trimmed);
		const list = Array.isArray(json)
			? json
			: json && typeof json === "object"
				? [json.subreddits, json.subs, json.data].find(Array.isArray)
				: null;
		if (!Array.isArray(list)) throw new Error("no subreddit list in that JSON");
		raw = list;
	} else {
		raw = trimmed.split(/[\s,;]+/);
		if (HEADERS.has(String(raw[0]).toLowerCase())) raw.shift();
	}

	const seen = new Map<string, string>();
	for (const [index, item] of raw.entries()) {
		let value: unknown = item;
		if (item && typeof item === "object" && !Array.isArray(item)) {
			const entry = item as { display_name?: unknown; name?: unknown };
			value = typeof entry.display_name === "string" ? entry.display_name : entry.name;
		}
		if (typeof value !== "string") {
			throw new Error(`invalid subreddit entry ${index + 1}`);
		}

		const name = normalizeName(value);
		if (!name) throw new Error(`invalid subreddit entry ${index + 1}`);
		if (!seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
	}
	return [...seen.values()];
}

function downloadSubs(subs: Sub[], tag = ""): void {
	const text = `${JSON.stringify(
		{
			exportedAt: new Date().toISOString(),
			count: subs.length,
			subreddits: [...subs].sort((a, b) => a.name.localeCompare(b.name)),
		},
		null,
		2,
	)}\n`;

	const url = URL.createObjectURL(
		new Blob([text], { type: "application/json" }),
	);
	const a = document.createElement("a");
	a.href = url;
	a.download = `reddit-subreddits${tag}-${new Date().toISOString().slice(0, 10)}.json`;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Reads counts using Promise.allSettled so failed requests report unavailable
 * state rather than faking 0 counts.
 */
export async function refresh(
	r: Report,
	force = false,
	full = false,
): Promise<number> {
	r.status(force ? "Reading from Reddit…" : "");
	const onRetry = retryReporter(r);

	try {
		const subsPromise = loadSubs(force, onRetry);
		const postsPromise = full ? loadUserItems("posts", onRetry) : Promise.resolve(null);
		const commentsPromise = full ? loadUserItems("comments", onRetry) : Promise.resolve(null);

		const results = await Promise.allSettled([
			subsPromise,
			postsPromise,
			commentsPromise,
		]);

		const subs = results[0].status === "fulfilled" ? results[0].value : null;
		const posts = results[1].status === "fulfilled" ? results[1].value : null;
		const comments = results[2].status === "fulfilled" ? results[2].value : null;

		if (full) {
			r.count(subs?.length ?? null, {
				posts: posts?.length ?? null,
				comments: comments?.length ?? null,
			});
		} else if (subs) {
			r.count(subs.length);
		}

		if (results[0].status === "rejected") {
			const err = (results[0].reason as Error)?.message ?? "Failed to read subscriptions";
			r.status(err, "bad");
			throw new Error(err);
		}

		if (force) {
			const countsMsg = `${subs ? `${subs.length} subreddits` : "subscriptions unavailable"}${
				full ? `, ${posts ? `${posts.length} posts` : "posts unavailable"}` : ""
			}${full ? `, ${comments ? `${comments.length} comments` : "comments unavailable"}` : ""}`;
			r.status(`Read ${countsMsg}.`, "ok");
		}
		return subs?.length ?? 0;
	} catch (e) {
		r.status((e as Error).message, "bad");
		throw e;
	}
}

export async function exportSubs(r: Report): Promise<void> {
	r.status("Reading your subscriptions…");
	const subs = await loadSubs(true);
	r.count(subs.length);

	if (subs.length === 0) {
		r.status("Nothing to export — you aren't subscribed to anything.", "bad");
		return;
	}

	downloadSubs(subs);
	r.status(`Exported ${subs.length} subreddits.`, "ok");
}

export async function importSubs(r: Report): Promise<void> {
	const text = await r.pickFile();
	if (text == null) return;

	let parsed: string[];
	try {
		parsed = parseImport(text);
	} catch (e) {
		r.status(`Couldn't read that file: ${(e as Error).message}`, "bad");
		return;
	}
	if (parsed.length === 0) {
		r.status("No subreddit names in that file.", "bad");
		return;
	}

	r.status("Reading your subscriptions…");
	const subs = await loadSubs(true);
	r.count(subs.length);
	const have = new Set(subs.map((s) => s.name.toLowerCase()));
	const names = parsed.filter((n) => !have.has(n.toLowerCase()));
	const skipped = parsed.length - names.length;

	if (names.length === 0) {
		r.status(`Already in all ${parsed.length} of those subreddits.`, "ok");
		return;
	}

	const ok = await r.confirm({
		title: `Join ${names.length} subreddits`,
		body: `${names.slice(0, 6).join(", ")}${names.length > 6 ? `, and ${names.length - 6} more` : ""}.${skipped ? ` ${skipped} you're already in are left alone.` : ""}`,
		action: `Join ${names.length}`,
	});
	if (!ok) return;

	await apply(r, names, true, subs.length);
}

export async function leaveAll(r: Report): Promise<void> {
	r.status("Reading your subscriptions…");
	const subs = await loadSubs(true);
	r.count(subs.length);

	if (subs.length === 0) {
		r.status("You aren't subscribed to anything.", "bad");
		return;
	}

	const ok = await r.confirm({
		title: `Leave all ${subs.length} subreddits`,
		body: "A backup file downloads first, so Import can put them back. One request per subreddit — whatever gets through stays done even if you close the tab.",
		action: "Leave all",
		danger: true,
		typed: String(subs.length),
	});
	if (!ok) return;

	downloadSubs(subs, "-backup");
	r.status("Backup downloaded.", "ok");

	await apply(
		r,
		subs.map((s) => s.name),
		false,
		subs.length,
	);
}

async function apply(
	r: Report,
	names: string[],
	subscribe: boolean,
	startCount: number,
): Promise<void> {
	const [verb, past] = subscribe ? ["Joining", "Joined"] : ["Leaving", "Left"];
	const headline = (succeeded: number) =>
		subscribe ? startCount + succeeded : startCount - succeeded;

	r.progress(verb, 0, names.length, startCount, "subs");
	const { failed, error: lastError, stoppedAt, stopReason } = await applyAll(
		names,
		subscribe,
		(done, total, bad) =>
			r.progress(verb, done, total, headline(done - bad), "subs"),
		r,
	);
	const succeeded = stoppedAt - failed.length;
	const untouched = names.length - stoppedAt;
	const halted = untouched
		? `${stopReason === "consecutiveFailures" ? ` Stopped after ${GIVE_UP_AFTER} consecutive failures —` : " Stopped —"} ${untouched} left untouched.`
		: "";

	r.status("Confirming with Reddit…");
	await sleep(1000);
	await refresh(r, true).catch(() => undefined);

	if (failed.length === 0) {
		r.status(`${past} ${succeeded} subreddits.${halted}`, halted ? "bad" : "ok");
		return;
	}
	r.status(
		`${past} ${succeeded}. Skipped ${failed.length} (${lastError}): ${failed.slice(0, 6).join(", ")}${failed.length > 6 ? "…" : ""}${halted}`,
		"bad",
	);
	console.warn("[Reddit Manager] failed:", failed, lastError);
}

function shouldOverwrite(item: UserItem): boolean {
	const text = item.selftext ?? item.body;
	return !(item.fullname.startsWith("t3_") && typeof text === "string" && text.trim() === "");
}

export function applyItemDeletions(
	items: UserItem[],
	onProgress: ProgressCallback,
	r?: Report,
): Promise<BatchResult> {
	return runBatch(items, {
		id: (item) => item.fullname,
		run: (item, onRetry) => deleteUserItem(item.fullname, shouldOverwrite(item), onRetry),
		delay: (item) => shouldOverwrite(item) ? DELETE_PAUSE_MS : SUB_PAUSE_MS,
	}, onProgress, r);
}

/** Unified batch deletion helper for visible posts or comments. */
async function deleteAllUserItems(
	r: Report,
	kind: "posts" | "comments",
	label: string,
): Promise<void> {
	r.status(`Reading your visible ${label} from Reddit…`);
	let items: UserItem[];
	try {
		items = await loadUserItems(kind);
	} catch (e) {
		r.status((e as Error).message, "bad");
		return;
	}

	if (items.length === 0) {
		r.status(`No visible ${label} found to delete.`, "ok");
		return;
	}

	const ok = await r.confirm({
		title: `Delete ${items.length} visible ${label}`,
		body: `Deletes up to Reddit's 1,000 visible history limit. Editable text will be overwritten with '.' first; link posts without selftext are deleted directly.`,
		action: `Delete ${label}`,
		danger: true,
		typed: String(items.length),
	});
	if (!ok) return;

	const verb = `Deleting ${label}`;
	r.progress(verb, 0, items.length, items.length, kind);
	const { failed, error: lastError, stoppedAt, stopReason } = await applyItemDeletions(
		items,
		(done, total, bad) =>
			r.progress(
				verb,
				done,
				total,
				items.length - (done - bad),
				kind,
			),
		r,
	);
	const succeeded = stoppedAt - failed.length;
	const untouched = items.length - stoppedAt;
	const halted = untouched
		? `${stopReason === "consecutiveFailures" ? ` Stopped after ${GIVE_UP_AFTER} consecutive failures —` : " Stopped —"} ${untouched} left untouched.`
		: "";

	r.status("Confirming with Reddit…");
	await sleep(500);
	await refresh(r, true, true).catch(() => undefined);

	r.status(
		`Deleted ${succeeded} ${label}.${failed.length ? ` ${failed.length} could not be confirmed: ${failed.slice(0, 6).join(", ")}${failed.length > 6 ? "…" : ""} (${lastError}). These items may have been overwritten or deleted; check them on Reddit.` : ""}${halted}`,
		failed.length || halted ? "bad" : "ok",
	);
}

export async function deleteAllPosts(r: Report): Promise<void> {
	return deleteAllUserItems(r, "posts", "posts");
}

export async function deleteAllComments(r: Report): Promise<void> {
	return deleteAllUserItems(r, "comments", "comments");
}

export async function deleteAccount(r: Report): Promise<void> {
	const ok = await r.confirm({
		title: "Open Account Deletion Page",
		body: "Reddit requires password verification to delete an account. You will be redirected to Reddit's official account deletion page.",
		action: "Open deletion page",
		danger: true,
	});
	if (!ok) return;

	r.status("Redirecting to account deletion page…", "ok");
	window.location.href = "https://old.reddit.com/prefs/delete/";
}

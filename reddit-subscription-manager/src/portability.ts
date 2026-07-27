// The four operations. They report through `Report` so the panel owns every
// pixel and this file owns none.

import { type Sub, loadSubs, normalizeName, setSubscribed } from "./api";

const PAUSE_MS = 350; // ~170 writes/min, under reddit's ceiling; 429s back off on their own
const GIVE_UP_AFTER = 3; // consecutive failures from the very start = broken session, not bad subreddits

export interface ConfirmSpec {
	title: string;
	body: string;
	action: string;
	danger?: boolean;
	/** When set, the user must type this exact string before the action unlocks. */
	typed?: string;
}

export interface Report {
	/** The headline figure: how many subreddits you have. */
	count(n: number | null): void;
	/** `headline` is the live subscription count, `done`/`total` the work queue. */
	progress(verb: string, done: number, total: number, headline: number): void;
	status(text: string, tone?: "ok" | "bad"): void;
	confirm(spec: ConfirmSpec): Promise<boolean>;
	pickFile(): Promise<string | null>;
	/** True once the user has asked to stop. Checked between requests. */
	stopped?(): boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Joins or leaves every identifier, one request at a time, reporting after each.
 * Every request commits server-side the moment it returns, so closing the tab
 * mid-run keeps the work already done — it only cancels the remainder.
 *
 * `onProgress` gets attempted-so-far and how many of those failed, so the caller
 * can show a figure that matches reality instead of counting requests it sent.
 */
export async function applyAll(
	identifiers: string[],
	subscribe: boolean,
	onProgress: (done: number, total: number, failed: number) => void,
	r?: Report,
): Promise<{ failed: string[]; error: string; stoppedAt: number }> {
	const failed: string[] = [];
	let lastError = "";

	const onRetry = (
		attempt: number,
		maxRetries: number,
		waitMs: number,
		status: number,
	) => {
		const msg = `Reddit returned ${status}. Retrying in ${(waitMs / 1000).toFixed(1)}s (${attempt}/${maxRetries})…`;
		r?.status(msg, "bad");
		console.warn(`[Reddit Subscription Manager] ${msg}`);
	};

	for (let i = 0; i < identifiers.length; i++) {
		if (r?.stopped?.())
			return { failed, error: lastError, stoppedAt: i };

		try {
			await setSubscribed(identifiers[i], subscribe, onRetry);
			r?.status(""); // clear any rate-limit notice
		} catch (err) {
			lastError = (err as Error).message;
			failed.push(identifiers[i]);
			console.warn(
				`[Reddit Subscription Manager] ${subscribe ? "join" : "leave"} ${identifiers[i]} failed: ${lastError}`,
			);

			// Nothing has ever worked. That is the session or the endpoint, not the
			// subreddits — grinding out the remaining hundreds changes nothing and
			// buries the one error that matters.
			if (failed.length === i + 1 && failed.length >= GIVE_UP_AFTER)
				throw new Error(
					`${lastError} (first ${failed.length} all failed the same way — stopped, nothing was changed)`,
				);
		}
		onProgress(i + 1, identifiers.length, failed.length);
		if (i + 1 < identifiers.length) await sleep(PAUSE_MS);
	}
	return { failed, error: lastError, stoppedAt: identifiers.length };
}

// A pasted csv/tsv brings its header row along. Only ever stripped from the
// first token of a plain-text file, so r/names and r/subreddit still import.
const HEADERS = new Set([
	"subreddit",
	"subreddits",
	"display_name",
	"display_names",
	"url",
]);

/**
 * Accepts our own export, a bare JSON array, reddit's comma-separated
 * multireddit export, or a plain list of names/URLs one per line.
 * Returns deduped, normalized subreddit names.
 */
export function parseImport(text: string): string[] {
	const trimmed = text.trim();
	let raw: unknown[];

	if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
		const json = JSON.parse(trimmed);
		const list = Array.isArray(json)
			? json
			: (json.subreddits ?? json.subs ?? json.data);
		if (!Array.isArray(list)) throw new Error("no subreddit list in that JSON");
		raw = list;
	} else {
		raw = trimmed.split(/[\s,;]+/);
		if (HEADERS.has(String(raw[0]).toLowerCase())) raw.shift();
	}

	const seen = new Map<string, string>();
	for (const item of raw) {
		const name = normalizeName(
			typeof item === "string"
				? item
				: ((item as Sub)?.name ??
						(item as { display_name?: string })?.display_name),
		);
		if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
	}
	return [...seen.values()];
}

// ---------- operations ----------

/** Writes the list to a dated json file. Shared by Export and Leave all's backup. */
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

/** Reads the list and hands the count to the panel. Also the `Refresh` action. */
export async function refresh(r: Report, force = false): Promise<number> {
	r.status(force ? "Reading from Reddit…" : "");
	const onRetry = (
		attempt: number,
		maxRetries: number,
		waitMs: number,
		status: number,
	) =>
		r.status(
			`Rate limited (${status}). Retrying in ${(waitMs / 1000).toFixed(1)}s (${attempt}/${maxRetries})…`,
			"bad",
		);

	try {
		const subs = await loadSubs(force, onRetry);
		r.count(subs.length);
		if (force) r.status(`Read ${subs.length} subreddits.`, "ok");
		return subs.length;
	} catch (e) {
		r.status((e as Error).message, "bad");
		throw e;
	}
}

export async function exportSubs(r: Report): Promise<void> {
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

	// The confirmation has always promised this; now it's true. Re-joining a
	// subreddit you're already in is a wasted request, and at ~3/second that
	// waste is measured in minutes.
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

	// Destructive and slow to undo by hand, so it takes a typed confirmation
	// rather than a click that muscle memory can fire off.
	const ok = await r.confirm({
		title: `Leave all ${subs.length} subreddits`,
		body: "A backup file downloads first, so Import can put them back. One request per subreddit — whatever gets through stays done even if you close the tab.",
		action: "Leave all",
		danger: true,
		typed: String(subs.length),
	});
	if (!ok) return;

	// Unprompted, because "export first" as advice is a data-loss bug waiting for
	// the one person who doesn't take it.
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

	r.progress(verb, 0, names.length, startCount);
	const { failed, error: lastError, stoppedAt } = await applyAll(
		names,
		subscribe,
		(done, total, bad) => r.progress(verb, done, total, headline(done - bad)),
		r,
	);
	const succeeded = stoppedAt - failed.length;
	const halted = stoppedAt < names.length ? ` Stopped — ${names.length - stoppedAt} left untouched.` : "";

	// Reddit's own list endpoint trails the writes by a beat; a forced reread
	// straight away can come back with the pre-change count.
	r.status("Confirming with Reddit…");
	await sleep(1000);
	await refresh(r, true).catch(() => r.count(null));

	if (failed.length === 0) {
		r.status(`${past} ${succeeded} subreddits.${halted}`, halted ? "bad" : "ok");
		return;
	}
	r.status(
		`${past} ${succeeded}. Skipped ${failed.length} (${lastError}): ${failed.slice(0, 6).join(", ")}${failed.length > 6 ? "…" : ""}${halted}`,
		"bad",
	);
	console.warn("[Reddit Subscription Manager] failed:", failed, lastError);
}

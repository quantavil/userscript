import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeName } from "../src/api";
import { applyAll, parseImport } from "../src/portability";

vi.mock("../src/api", async (importOriginal) => ({
	...(await importOriginal<typeof import("../src/api")>()),
	setSubscribed: vi.fn(),
	loadSubs: vi.fn(async () => []),
}));

const { setSubscribed } = await import("../src/api");
const mockSub = vi.mocked(setSubscribed);

describe("normalizeName", () => {
	it("strips every shape a subreddit reference comes in", () => {
		expect(normalizeName("r/AskReddit")).toBe("AskReddit");
		expect(normalizeName("/r/AskReddit/")).toBe("AskReddit");
		expect(normalizeName("https://www.reddit.com/r/AskReddit/")).toBe(
			"AskReddit",
		);
		expect(normalizeName("https://reddit.com/r/pics/comments/abc/x/")).toBe(
			"pics",
		);
		expect(normalizeName("  learnpython  ")).toBe("learnpython");
		expect(normalizeName("")).toBe("");
		expect(normalizeName(null)).toBe("");
	});
});

describe("parseImport", () => {
	it("reads our own export format", () => {
		const text = JSON.stringify({
			count: 2,
			subreddits: [{ name: "pics" }, { name: "AskReddit" }],
		});
		expect(parseImport(text)).toEqual(["pics", "AskReddit"]);
	});

	it("reads a bare JSON array of strings or reddit api objects", () => {
		expect(parseImport('["r/pics", "askreddit"]')).toEqual([
			"pics",
			"askreddit",
		]);
		expect(parseImport('[{"display_name":"pics"}]')).toEqual(["pics"]);
	});

	it("reads plain text and reddit's comma-separated multireddit export", () => {
		expect(parseImport("pics, askreddit,funny")).toEqual([
			"pics",
			"askreddit",
			"funny",
		]);
		expect(parseImport("r/pics\nr/funny\n\n")).toEqual(["pics", "funny"]);
	});

	it("dedupes case-insensitively and drops junk", () => {
		expect(parseImport("pics\nPICS\n \n r/pics")).toEqual(["pics"]);
	});

	it("drops a leading csv header but keeps subreddits that look like one", () => {
		expect(parseImport("subreddit\npics\nfunny")).toEqual(["pics", "funny"]);
		// r/names is a real subreddit; only the first token is ever a header.
		expect(parseImport("pics\nnames\nsubreddit")).toEqual([
			"pics",
			"names",
			"subreddit",
		]);
		expect(parseImport('[{"name":"title"},{"name":"subs"}]')).toEqual([
			"title",
			"subs",
		]);
	});

	it("throws on JSON with no list in it", () => {
		expect(() => parseImport('{"hello":"world"}')).toThrow();
	});
});

describe("applyAll", () => {
	// Braces matter: a hook that returns the mock makes vitest call it as a teardown.
	beforeEach(() => {
		mockSub.mockReset();
	});

	const drain = async <T>(p: Promise<T>): Promise<T> => {
		await vi.runAllTimersAsync();
		return p;
	};

	it("sends exactly one request per subreddit", async () => {
		vi.useFakeTimers();
		mockSub.mockResolvedValue(undefined);

		expect((await drain(applyAll(["a", "b", "c"], true, () => {}))).failed).toEqual([]);
		expect(mockSub).toHaveBeenCalledTimes(3);
		expect(mockSub.mock.calls.map(([id]) => id)).toEqual(["a", "b", "c"]);
		expect(mockSub.mock.calls.every(([, sub]) => sub === true)).toBe(true);
		vi.useRealTimers();
	});

	it("keeps going past a bad subreddit and names only that one", async () => {
		vi.useFakeTimers();
		mockSub.mockImplementation(async (id: string) => {
			if (id === "sub7") throw new Error("SUBREDDIT_NOEXIST");
		});

		const names = Array.from({ length: 60 }, (_, i) => `sub${i}`);
		const { failed, error } = await drain(applyAll(names, false, () => {}));
		expect(failed).toEqual(["sub7"]);
		expect(error).toBe("SUBREDDIT_NOEXIST");
		expect(mockSub).toHaveBeenCalledTimes(60); // one failure costs one request
		expect(mockSub.mock.calls.every(([, sub]) => sub === false)).toBe(true);
		vi.useRealTimers();
	});

	// The reported bug: "Left 0. Skipped 144" after 50 seconds of doomed requests.
	// A broken session fails every subreddit identically — stop at 3 and say why.
	it("gives up early when nothing has ever succeeded, and names the error", async () => {
		vi.useFakeTimers();
		mockSub.mockRejectedValue(new Error("HTTP 403 — modhash rejected"));

		const seen: Array<[number, number, number]> = [];
		const names = Array.from({ length: 144 }, (_, i) => `sub${i}`);
		await expect(
			drain(
				applyAll(names, false, (d, t, f) => {
					seen.push([d, t, f]);
				}),
			),
		).rejects.toThrow(/modhash rejected.*first 3 all failed/s);

		expect(mockSub).toHaveBeenCalledTimes(3); // not 144
		// The two progress ticks before bailing never claimed real work.
		expect(seen.every(([d, , f]) => d - f === 0)).toBe(true);
		vi.useRealTimers();
	});

	it("stops between requests when asked, leaving the rest untouched", async () => {
		vi.useFakeTimers();
		mockSub.mockResolvedValue(undefined);

		let done = 0;
		const stop = { status: () => {}, stopped: () => done >= 3 } as never;
		const names = Array.from({ length: 50 }, (_, i) => `sub${i}`);
		const res = await drain(
			applyAll(names, false, (d) => {
				done = d;
			}, stop),
		);

		expect(mockSub).toHaveBeenCalledTimes(3); // not 50
		expect(res.stoppedAt).toBe(3);
		expect(res.failed).toEqual([]); // stopping is not failing
		vi.useRealTimers();
	});

	// One early failure among successes is a bad subreddit, not a bad session.
	it("does not give up when something has succeeded", async () => {
		vi.useFakeTimers();
		mockSub.mockImplementation(async (id: string) => {
			if (id !== "a") throw new Error("SUBREDDIT_NOEXIST");
		});

		const { failed } = await drain(applyAll(["a", "b", "c", "d"], false, () => {}));
		expect(failed).toEqual(["b", "c", "d"]);
		expect(mockSub).toHaveBeenCalledTimes(4);
		vi.useRealTimers();
	});
});

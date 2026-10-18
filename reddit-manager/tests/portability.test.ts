import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { normalizeName } from "../src/api";
import {
  applyAll,
  applyItemDeletions,
  deleteAccount,
  deleteAllComments,
  deleteAllPosts,
  parseImport,
	refresh,
} from "../src/portability";

vi.mock("../src/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/api")>()),
  setSubscribed: vi.fn(),
  loadSubs: vi.fn(async () => []),
  loadUserItems: vi.fn(async () => []),
  deleteUserItem: vi.fn(async () => {}),
}));

const { setSubscribed, loadSubs, loadUserItems, deleteUserItem } = await import("../src/api");
const mockSub = vi.mocked(setSubscribed);
const mockLoadSubs = vi.mocked(loadSubs);
const mockLoadItems = vi.mocked(loadUserItems);
const mockDeleteItem = vi.mocked(deleteUserItem);

describe("normalizeName", () => {
  it("strips every shape a subreddit reference comes in", () => {
    expect(normalizeName("r/AskReddit")).toBe("AskReddit");
    expect(normalizeName("/r/AskReddit/")).toBe("AskReddit");
    expect(normalizeName("https://www.reddit.com/r/AskReddit/")).toBe("AskReddit");
    expect(normalizeName("https://reddit.com/r/pics/comments/abc/x/")).toBe("pics");
    expect(normalizeName("  learnpython  ")).toBe("learnpython");
    expect(normalizeName("https://evil.example/r/pics")).toBe("");
    expect(normalizeName("pics!")).toBe("");
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
    expect(parseImport('["r/pics", "askreddit"]')).toEqual(["pics", "askreddit"]);
    expect(parseImport('[{"display_name":"pics"}]')).toEqual(["pics"]);
  });

  it("reads plain text and reddit's comma-separated multireddit export", () => {
    expect(parseImport("pics, askreddit,funny")).toEqual(["pics", "askreddit", "funny"]);
    expect(parseImport("r/pics\nr/funny\n\n")).toEqual(["pics", "funny"]);
  });

  it("dedupes case-insensitively and drops junk", () => {
    expect(parseImport("pics\nPICS\n \n r/pics")).toEqual(["pics"]);
  });

  it("drops a leading csv header but keeps subreddits that look like one", () => {
    expect(parseImport("subreddit\npics\nfunny")).toEqual(["pics", "funny"]);
    // r/names is a real subreddit; only the first token is ever a header.
    expect(parseImport("pics\nnames\nsubreddit")).toEqual(["pics", "names", "subreddit"]);
    expect(parseImport('[{"name":"title"},{"name":"subs"}]')).toEqual(["title", "subs"]);
  });

  it("throws on JSON with no list in it", () => {
    expect(() => parseImport('{"hello":"world"}')).toThrow();
  });

  it("rejects external Reddit-shaped URLs and names that normalization would sanitize", () => {
    expect(() => parseImport("https://evil.example/r/pics")).toThrow(/invalid/i);
    expect(() => parseImport("pics!\nfunny")).toThrow(/invalid/i);
  });

  it("rejects malformed JSON entries instead of silently dropping them", () => {
    expect(() => parseImport('[{"name":42}]')).toThrow(/entry 1/i);
  });
});

describe("applyAll", () => {
  // Braces matter: a hook that returns the mock makes vitest call it as a teardown.
  beforeEach(() => {
    mockSub.mockReset();
  });

  const drain = async <T>(p: Promise<T>): Promise<T> => {
    const caught = p.catch((e) => e);
    await vi.runAllTimersAsync();
    const result = await caught;
    if (result instanceof Error) throw result;
    return result;
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
  it("gives up after three consecutive failures and returns accurate progress", async () => {
    vi.useFakeTimers();
    mockSub.mockRejectedValue(new Error("HTTP 403 — modhash rejected"));

    const seen: Array<[number, number, number]> = [];
    const names = Array.from({ length: 144 }, (_, i) => `sub${i}`);
    const result = await drain(
      applyAll(names, false, (d, t, f) => {
        seen.push([d, t, f]);
      }),
    );

    expect(mockSub).toHaveBeenCalledTimes(3); // not 144
    expect(result).toEqual({
      failed: ["sub0", "sub1", "sub2"],
      error: "HTTP 403 — modhash rejected",
      stoppedAt: 3,
      stopReason: "consecutiveFailures",
    });
    expect(seen).toEqual([
      [1, 144, 1],
      [2, 144, 2],
      [3, 144, 3],
    ]);
    vi.useRealTimers();
  });

  it("stops between requests when asked, leaving the rest untouched", async () => {
    vi.useFakeTimers();
    mockSub.mockResolvedValue(undefined);

    let done = 0;
    const stop = { status: () => {}, stopped: () => done >= 3 } as never;
    const names = Array.from({ length: 50 }, (_, i) => `sub${i}`);
    const res = await drain(
      applyAll(
        names,
        false,
        (d) => {
          done = d;
        },
        stop,
      ),
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

    const result = await drain(applyAll(["a", "b", "c", "d", "e"], false, () => {}));
    expect(result.failed).toEqual(["b", "c", "d"]);
    expect(result.stoppedAt).toBe(4);
    expect(result.stopReason).toBe("consecutiveFailures");
    expect(mockSub).toHaveBeenCalledTimes(4);
    vi.useRealTimers();
  });

  it("resets the consecutive failure count after a success", async () => {
    vi.useFakeTimers();
    mockSub.mockImplementation(async (id: string) => {
      if (["a", "c", "d", "e"].includes(id)) throw new Error("temporary failure");
    });

    const result = await drain(
      applyAll(["a", "b", "c", "d", "e", "f"], false, () => {}),
    );

    expect(result.failed).toEqual(["a", "c", "d", "e"]);
    expect(result.stopReason).toBe("consecutiveFailures");
    expect(result.stoppedAt).toBe(5);
    expect(mockSub).toHaveBeenCalledTimes(5);
    vi.useRealTimers();
  });
});

describe("applyItemDeletions", () => {
  beforeEach(() => {
    mockDeleteItem.mockReset();
  });

  it("stops after three consecutive failures and includes the third in progress", async () => {
    vi.useFakeTimers();
    mockDeleteItem.mockRejectedValue(new Error("modhash rejected"));
    const seen: Array<[number, number, number]> = [];

    const promise = applyItemDeletions(
      [
        { fullname: "t1_a" },
        { fullname: "t1_b" },
        { fullname: "t1_c" },
        { fullname: "t1_d" },
      ],
      (done, total, failed) => seen.push([done, total, failed]),
    );
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(mockDeleteItem).toHaveBeenCalledTimes(3);
    expect(result).toEqual({
      failed: ["t1_a", "t1_b", "t1_c"],
      error: "modhash rejected",
      stoppedAt: 3,
      stopReason: "consecutiveFailures",
    });
    expect(seen).toEqual([
      [1, 4, 1],
      [2, 4, 2],
      [3, 4, 3],
    ]);
    vi.useRealTimers();
  });
});

describe("refresh", () => {
	beforeEach(() => {
		mockLoadSubs.mockReset().mockResolvedValue([]);
		mockLoadItems.mockReset().mockResolvedValue([]);
	});

	it("does not clear post and comment counts during a subscriptions-only refresh", async () => {
		const report = {
			status: vi.fn(),
			count: vi.fn(),
			progress: vi.fn(),
			confirm: vi.fn(async () => false),
			pickFile: vi.fn(),
		};

		await refresh(report);

		expect(report.count).toHaveBeenCalledWith(0);
		expect(report.count).not.toHaveBeenCalledWith(0, expect.anything());
	});

	it("marks subscriptions unavailable when a full refresh cannot read them", async () => {
		mockLoadSubs.mockRejectedValue(new Error("not logged in to Reddit"));
		const report = {
			status: vi.fn(),
			count: vi.fn(),
			progress: vi.fn(),
			confirm: vi.fn(async () => false),
			pickFile: vi.fn(),
		};

		await expect(refresh(report, true, true)).rejects.toThrow("not logged in");
		expect(report.count).toHaveBeenCalledWith(null, { posts: 0, comments: 0 });
	});

	it("reports a failed profile count as unavailable while retaining successful counts", async () => {
		mockLoadSubs.mockResolvedValue([{ name: "math" }]);
		mockLoadItems.mockImplementation(async (kind) => {
			if (kind === "posts") throw new Error("posts unavailable");
			return [{ fullname: "t1_comment1" }];
		});
		const report = {
			status: vi.fn(),
			count: vi.fn(),
			progress: vi.fn(),
			confirm: vi.fn(async () => false),
			pickFile: vi.fn(),
		};

		await refresh(report, true, true);

		expect(report.count).toHaveBeenCalledWith(1, { posts: null, comments: 1 });
		expect(report.status).toHaveBeenCalledWith(
			"Read 1 subreddits, posts unavailable, 1 comments.",
			"ok",
		);
	});
});

describe("deleteAllPosts and deleteAllComments", () => {
  beforeEach(() => {
    mockLoadItems.mockReset();
    mockDeleteItem.mockReset();
  });

  it("deletes all fetched posts when confirmed", async () => {
    mockLoadItems.mockResolvedValue([
      { fullname: "t3_post1", title: "Post 1" },
      { fullname: "t3_post2", title: "Post 2" },
    ]);
    mockDeleteItem.mockResolvedValue(undefined);

    const mockReport = {
      status: vi.fn(),
      progress: vi.fn(),
      confirm: vi.fn(async () => true),
      count: vi.fn(),
      pickFile: vi.fn(),
    };

    await deleteAllPosts(mockReport);

    expect(mockLoadItems).toHaveBeenCalledWith("posts");
    expect(mockDeleteItem).toHaveBeenCalledTimes(2);
    expect(mockDeleteItem).toHaveBeenCalledWith("t3_post1", true, expect.any(Function));
    expect(mockDeleteItem).toHaveBeenCalledWith("t3_post2", true, expect.any(Function));
  });

  it("skips overwriting a known link post before deletion", async () => {
    mockLoadItems.mockResolvedValue([
      { fullname: "t3_linkpost", title: "Link", selftext: "" },
    ]);
    mockDeleteItem.mockResolvedValue(undefined);

    const mockReport = {
      status: vi.fn(),
      progress: vi.fn(),
      confirm: vi.fn(async () => true),
      count: vi.fn(),
      pickFile: vi.fn(),
    };

    await deleteAllPosts(mockReport);

    expect(mockDeleteItem).toHaveBeenCalledWith(
      "t3_linkpost",
      false,
      expect.any(Function),
    );
  });

  it("deletes all fetched comments when confirmed", async () => {
    mockLoadItems.mockResolvedValue([{ fullname: "t1_comment1", body: "Comment 1" }]);
    mockDeleteItem.mockResolvedValue(undefined);

    const mockReport = {
      status: vi.fn(),
      progress: vi.fn(),
      confirm: vi.fn(async () => true),
      count: vi.fn(),
      pickFile: vi.fn(),
    };

    await deleteAllComments(mockReport);

    expect(mockLoadItems).toHaveBeenCalledWith("comments");
    expect(mockDeleteItem).toHaveBeenCalledTimes(1);
    expect(mockDeleteItem).toHaveBeenCalledWith("t1_comment1", true, expect.any(Function));
  });
});

describe("deleteAccount", () => {
  it("prompts for confirmation before setting location", async () => {
    const mockReport = {
      status: vi.fn(),
      progress: vi.fn(),
      confirm: vi.fn(async () => false),
      count: vi.fn(),
      pickFile: vi.fn(),
    };

    await deleteAccount(mockReport);
    expect(mockReport.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Open Account Deletion Page",
        danger: true,
      }),
    );
  });
});

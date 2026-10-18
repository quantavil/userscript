import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { deleteUserItem, loadSubs, loadUserItems, setSubscribed } from "../src/api";

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

/** The last /api/subscribe request body, decoded. */
const sent = (fetchMock: ReturnType<typeof vi.fn>) => {
  const call = fetchMock.mock.calls.find(([url]) => String(url).includes("/api/subscribe"));
  return Object.fromEntries(call?.[1]?.body as URLSearchParams);
};

describe("setSubscribed", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async (url: string) =>
      String(url).includes("/api/me.json")
        ? ok({ data: { modhash: "abc123", name: "testuser" } })
        : ok({ json: { errors: [] } }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  // Reddit answers ANY request carrying skip_initial_defaults with a bare HTTP
  // 400 html page. It shipped on every request and failed every leave-all.
  it("never sends skip_initial_defaults", async () => {
    await setSubscribed("math", false);
    expect(sent(fetchMock)).not.toHaveProperty("skip_initial_defaults");
  });

  it("sends one subreddit by name, with the modhash", async () => {
    await setSubscribed("math", false);
    expect(sent(fetchMock)).toEqual({
      action: "unsub",
      sr_name: "math",
      api_type: "json",
      uh: "abc123",
    });

    const [, init] = fetchMock.mock.calls.find(([u]) => String(u).includes("/api/subscribe"))!;
    expect(init.headers["X-Modhash"]).toBe("abc123");
  });

  it("surfaces reddit's html error page as its title, not 300 chars of markup", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes("/api/me.json")
        ? ok({ data: { modhash: "abc123", name: "testuser" } })
        : new Response(
            "<!doctype html><html><head><title>reddit.com: bad request (reddit.com)</title></head><body>…</body></html>",
            { status: 400 },
          ),
    );
    await expect(setSubscribed("math", false)).rejects.toThrow(
      "HTTP 400 — reddit.com: bad request (reddit.com)",
    );
  });

  it("reports a 200-with-errors body as a failure", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes("/api/me.json")
        ? ok({ data: { modhash: "abc123", name: "testuser" } })
        : ok({ json: { errors: [["SUBREDDIT_NOEXIST", "that doesn't exist"]] } }),
    );
    await expect(setSubscribed("nope", true)).rejects.toThrow("that doesn't exist");
  });
});

describe("deleteUserItem", () => {
  it("does not delete an editable item when overwrite fails", async () => {
    const calledUrls: string[] = [];

    const fetchMock = vi.fn(async (url: string) => {
      const u = String(url);
      calledUrls.push(u);
      if (u.includes("/api/me.json")) {
        return ok({ data: { modhash: "abc123", name: "testuser" } });
      }
      if (u.includes("/api/editusertext")) {
        return new Response("Bad request", { status: 400 });
      }
      return ok({ json: { errors: [] } });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteUserItem("t1_comment1", true)).rejects.toThrow(
      "HTTP 400 overwriting t1_comment1",
    );

    expect(calledUrls.some((u) => u.includes("/api/editusertext"))).toBe(true);
    expect(calledUrls.some((u) => u.includes("/api/del"))).toBe(false);
  });

  it("does not delete when Reddit returns overwrite errors in a 200 response", async () => {
    const calledUrls: string[] = [];
    const fetchMock = vi.fn(async (url: string) => {
      const u = String(url);
      calledUrls.push(u);
      if (u.includes("/api/me.json")) {
        return ok({ data: { modhash: "abc123", name: "testuser" } });
      }
      if (u.includes("/api/editusertext")) {
        return ok({ json: { errors: [["NO_TEXT", "could not overwrite"]] } });
      }
      return ok({ json: { errors: [] } });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteUserItem("t1_comment1", true)).rejects.toThrow(
      "could not overwrite",
    );
    expect(calledUrls.some((u) => u.includes("/api/del"))).toBe(false);
  });

  it("reports errors in Reddit's 200 delete response", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      String(url).includes("/api/me.json")
        ? ok({ data: { modhash: "abc123", name: "testuser" } })
        : ok({ json: { errors: [["NO_THING", "item was not deleted"]] } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteUserItem("t1_comment1", false)).rejects.toThrow(
      "item was not deleted",
    );
  });

  it("accepts Reddit's empty-object success response for deletion", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      String(url).includes("/api/me.json")
        ? ok({ data: { modhash: "abc123", name: "testuser" } })
        : ok({}),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteUserItem("t3_linkpost1", false)).resolves.toBeUndefined();
  });

  it("skips overwrite when called for a link post", async () => {
    const calledUrls: string[] = [];
    const fetchMock = vi.fn(async (url: string) => {
      const u = String(url);
      calledUrls.push(u);
      return u.includes("/api/me.json")
        ? ok({ data: { modhash: "abc123", name: "testuser" } })
        : ok({ json: { errors: [] } });
    });
    vi.stubGlobal("fetch", fetchMock);

    await deleteUserItem("t3_linkpost1", false);

    expect(calledUrls.some((u) => u.includes("/api/editusertext"))).toBe(false);
    expect(calledUrls.some((u) => u.includes("/api/del"))).toBe(true);
  });
});

describe("paginated listings", () => {
	it("deduplicates subscriptions across pages", async () => {
    let page = 0;
    const fetchMock = vi.fn(async () => {
      page++;
      return ok({
        data: {
          children:
            page === 1
              ? [
                  { data: { name: "t5_a", display_name: "pics" } },
                  { data: { name: "t5_a", display_name: "PICS" } },
                ]
              : [
                  { data: { name: "t5_a", display_name: "pics" } },
                  { data: { name: "t5_b", display_name: "funny" } },
                ],
					after: page === 1 ? "cursor-a" : null,
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(await loadSubs(true)).toEqual([
      expect.objectContaining({ name: "pics" }),
      expect.objectContaining({ name: "funny" }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

	it("fails when Reddit repeats a subscription cursor", async () => {
		const fetchMock = vi.fn(async () =>
			ok({ data: { children: [{ data: { name: "t5_a", display_name: "pics" } }], after: "same" } }),
		);
		vi.stubGlobal("fetch", fetchMock);

		await expect(loadSubs(true)).rejects.toThrow(/repeated.*cursor/i);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("deduplicates user items across pages", async () => {
    let page = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/api/me.json")) {
        return ok({ data: { modhash: "abc123", name: "testuser" } });
      }
      page++;
      const children =
        page === 1
          ? [{ data: { name: "t3_a", title: "first", selftext: "body" } }]
          : [
              { data: { name: "t3_a", title: "duplicate", selftext: "body" } },
              { data: { name: "t3_b", title: "second", selftext: "" } },
            ];
      return ok({
        data: {
          children,
          after: page === 1 ? "cursor-a" : null,
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(await loadUserItems("posts")).toEqual([
      expect.objectContaining({ fullname: "t3_a", selftext: "body" }),
      expect.objectContaining({ fullname: "t3_b", selftext: "" }),
    ]);
    expect(page).toBe(2);
  });

	it("fails when Reddit cycles user-item cursors", async () => {
		let page = 0;
		const fetchMock = vi.fn(async (url: string) => {
			if (String(url).includes("/api/me.json")) {
				return ok({ data: { modhash: "abc123", name: "testuser" } });
			}
			page++;
			return ok({
				data: {
					children: [{ data: { name: `t3_${page}`, selftext: "body" } }],
					after: page === 1 ? "cursor-a" : page === 2 ? "cursor-b" : "cursor-a",
				},
			});
		});
		vi.stubGlobal("fetch", fetchMock);

		await expect(loadUserItems("posts")).rejects.toThrow(/repeated.*cursor/i);
		expect(page).toBe(3);
	});
});

describe("retry response handling", () => {
	it("clears the prior response status after a network failure", async () => {
		vi.useFakeTimers();
		let attempts = 0;
		const fetchMock = vi.fn(async (url: string) => {
			if (String(url).includes("/api/me.json")) {
				return ok({ data: { modhash: "abc123", name: "testuser" } });
			}
			attempts++;
			if (attempts === 1) {
				return new Response("Too Many Requests", {
					status: 429,
					headers: { "Retry-After": "2" },
				});
			}
			if (attempts === 2) throw new TypeError("Network failed");
			return ok({ json: { errors: [] } });
		});
		vi.stubGlobal("fetch", fetchMock);
		const statuses: number[] = [];

		const promise = setSubscribed("testsub", true, (_attempt, _max, _wait, status) => {
			statuses.push(status);
		});
		await vi.runAllTimersAsync();
		await promise;

		expect(statuses).toContain(0);
		vi.useRealTimers();
	});

	it("never jitters a request below Retry-After", async () => {
		vi.useFakeTimers();
		const random = vi.spyOn(Math, "random").mockReturnValue(0);
		let attempts = 0;
		const fetchMock = vi.fn(async (url: string) => {
			if (String(url).includes("/api/me.json")) {
				return ok({ data: { modhash: "abc123", name: "testuser" } });
			}
			attempts++;
			if (attempts === 1) {
				return new Response("Too Many Requests", {
					status: 429,
					headers: { "Retry-After": "2" },
				});
			}
			return ok({ json: { errors: [] } });
		});
		vi.stubGlobal("fetch", fetchMock);
		const waits: number[] = [];

		const promise = setSubscribed("testsub", true, (_attempt, _max, waitMs) => {
			waits.push(waitMs);
		});
		await vi.runAllTimersAsync();
		await promise;

		expect(waits[0]).toBeGreaterThanOrEqual(2000);
		random.mockRestore();
		vi.useRealTimers();
	});

	it("parses a Retry-After date as a date, not its day number", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-10-21T00:00:00Z"));
		let attempts = 0;
		const fetchMock = vi.fn(async (url: string) => {
			if (String(url).includes("/api/me.json")) {
				return ok({ data: { modhash: "abc123", name: "testuser" } });
			}
			attempts++;
			if (attempts === 1) {
				return new Response("Too Many Requests", {
					status: 429,
					headers: { "Retry-After": "21 Oct 2026 00:00:05 GMT" },
				});
			}
			return ok({ json: { errors: [] } });
		});
		vi.stubGlobal("fetch", fetchMock);
		const waits: number[] = [];

		const promise = setSubscribed("testsub", true, (_attempt, _max, waitMs) => {
			waits.push(waitMs);
		});
		await vi.runAllTimersAsync();
		await promise;

		expect(waits[0]).toBeGreaterThanOrEqual(5000);
		expect(waits[0]).toBeLessThan(6000);
		vi.useRealTimers();
	});
});

describe("retry countdown", () => {
  it("triggers live countdown callback during 429 wait period", async () => {
    vi.useFakeTimers();
    let attempts = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/api/me.json")) {
        return ok({ data: { modhash: "abc123", name: "testuser" } });
      }
      attempts++;
      if (attempts === 1) {
        return new Response("Too Many Requests", {
          status: 429,
          headers: { "Retry-After": "2" },
        });
      }
      return ok({ json: { errors: [] } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const retryUpdates: number[] = [];
    const onRetry = vi.fn((_attempt, _max, waitMs) => {
      retryUpdates.push(Math.round(waitMs / 1000));
    });

    const promise = setSubscribed("testsub", true, onRetry);
    await vi.runAllTimersAsync();
    await promise;

    expect(onRetry).toHaveBeenCalled();
    expect(retryUpdates.length).toBeGreaterThan(1);
    expect(retryUpdates[0]).toBeGreaterThanOrEqual(2);
    vi.useRealTimers();
  });
});

it("keeps the latest forced subscription refresh cached when an older read finishes last", async () => {
  let finishOld!: (response: Response) => void;
  let calls = 0;
  vi.stubGlobal("fetch", vi.fn(() => {
    calls++;
    return calls === 1 ? new Promise<Response>((resolve) => { finishOld = resolve; }) : Promise.resolve(ok({ data: { children: [{ data: { display_name: "new" } }], after: null } }));
  }));
  const old = loadSubs(true);
  await loadSubs(true);
  finishOld(ok({ data: { children: [{ data: { display_name: "old" } }], after: null } }));
  await old;
  expect((await loadSubs()).map((sub) => sub.name)).toEqual(["new"]);
  expect(calls).toBe(2);
});

it("forces a new identity read and prevents older identity reads from replacing it", async () => {
  const { meInfo } = await import("../src/api");
  let finishOld!: (response: Response) => void;
  let calls = 0;
  vi.stubGlobal("fetch", vi.fn(() => {
    calls++;
    return calls === 1 ? new Promise<Response>((resolve) => { finishOld = resolve; }) : Promise.resolve(ok({ data: { name: "new", modhash: "new-hash" } }));
  }));
  const old = meInfo(undefined, true);
  const latest = meInfo(undefined, true);
  // Start both reads before resolving the old one; a forced read must bypass it.
  await Promise.resolve();
  expect(calls).toBe(2);
  finishOld(ok({ data: { name: "old", modhash: "old-hash" } }));
  await Promise.all([old, latest]);
  expect((await meInfo()).name).toBe("new");
});

it("rejects a non-JSON subscription response rather than counting it as success", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => String(url).includes("/api/me.json")
    ? ok({ data: { name: "testuser", modhash: "hash" } })
    : new Response("<html>Log in</html>", { status: 200 })));
  await expect(setSubscribed("pics", true)).rejects.toThrow(/invalid.*response/i);
});

it("rejects numeric API errors in successful HTTP deletion responses", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => String(url).includes("/api/me.json")
    ? ok({ data: { name: "testuser", modhash: "hash" } })
    : ok({ error: 403, message: "Forbidden" })));
  await expect(deleteUserItem("t3_test", false)).rejects.toThrow(/403/);
});


it("does not cache a malformed subscription listing as an empty account", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ok({ error: 403 })));
  await expect(loadSubs(true)).rejects.toThrow(/invalid subscription listing/);
});

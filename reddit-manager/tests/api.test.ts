import { beforeEach, describe, expect, it, vi } from "vitest";
import { setSubscribed } from "../src/api";

const ok = (body: unknown) =>
	new Response(JSON.stringify(body), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});

/** The last /api/subscribe request body, decoded. */
const sent = (fetchMock: ReturnType<typeof vi.fn>) => {
	const call = fetchMock.mock.calls.find(([url]) =>
		String(url).includes("/api/subscribe"),
	);
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

		const [, init] = fetchMock.mock.calls.find(([u]) =>
			String(u).includes("/api/subscribe"),
		)!;
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
		await expect(setSubscribed("nope", true)).rejects.toThrow(
			"that doesn't exist",
		);
	});
});

describe("deleteUserItem", () => {
	it("proceeds to call /api/del even if /api/editusertext fails", async () => {
		const { deleteUserItem } = await import("../src/api");
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

		await deleteUserItem("t3_linkpost1", true);

		expect(calledUrls.some((u) => u.includes("/api/editusertext"))).toBe(true);
		expect(calledUrls.some((u) => u.includes("/api/del"))).toBe(true);
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



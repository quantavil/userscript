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
				? ok({ data: { modhash: "abc123" } })
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
				? ok({ data: { modhash: "abc123" } })
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
				? ok({ data: { modhash: "abc123" } })
				: ok({ json: { errors: [["SUBREDDIT_NOEXIST", "that doesn't exist"]] } }),
		);
		await expect(setSubscribed("nope", true)).rejects.toThrow(
			"that doesn't exist",
		);
	});
});

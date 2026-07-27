import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACTIONS, Panel } from "../src/panel";

vi.mock("../src/portability", async (importOriginal) => ({
	...(await importOriginal<typeof import("../src/portability")>()),
	refresh: vi.fn(async () => 0),
}));

const q = <T extends Element>(p: Panel, sel: string) =>
	p.root.querySelector<T>(sel);

describe("Panel", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	it("renders one row per action, with the destructive one marked", () => {
		const panel = new Panel();
		const rows = [...panel.root.querySelectorAll(".act")];
		expect(rows).toHaveLength(ACTIONS.length);
		expect(rows.filter((r) => r.classList.contains("is-danger"))).toHaveLength(
			1,
		);
	});

	it("keeps a typed confirmation locked until the text matches exactly", async () => {
		const panel = new Panel();
		const answer = panel.confirm({
			title: "Leave all 342 subreddits",
			body: "…",
			action: "Leave all",
			danger: true,
			typed: "342",
		});

		const go = q<HTMLButtonElement>(panel, ".btn--go")!;
		const input = q<HTMLInputElement>(panel, ".sheet__input")!;
		expect(go.disabled).toBe(true);

		for (const bad of ["3", "34", "3420", "all"]) {
			input.value = bad;
			input.dispatchEvent(new Event("input"));
			expect(go.disabled).toBe(true);
		}

		input.value = " 342 "; // trimmed before comparing
		input.dispatchEvent(new Event("input"));
		expect(go.disabled).toBe(false);

		go.click();
		expect(await answer).toBe(true);
		expect(q(panel, ".sheet")).toBeNull();
	});

	it("resolves false and closes when cancelled", async () => {
		const panel = new Panel();
		const answer = panel.confirm({
			title: "Join 12 subreddits",
			body: "…",
			action: "Join 12",
		});

		// No typed guard, so the action is live immediately.
		expect(q<HTMLButtonElement>(panel, ".btn--go")!.disabled).toBe(false);
		q<HTMLButtonElement>(panel, ".btn--cancel")!.click();

		expect(await answer).toBe(false);
		expect(q(panel, ".sheet")).toBeNull();
	});
});

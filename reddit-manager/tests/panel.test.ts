import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { ACTIONS, Panel } from "../src/panel";

vi.mock("../src/portability", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/portability")>()),
  refresh: vi.fn(async () => 0),
}));

const q = <T extends Element>(p: Panel, sel: string) => p.root.querySelector<T>(sel);

describe("Panel", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders one row per action, with the destructive one marked", () => {
    const panel = new Panel();
    const rows = [...panel.root.querySelectorAll(".act")];
    expect(rows).toHaveLength(ACTIONS.length);
    expect(rows.filter((r) => r.classList.contains("is-danger"))).toHaveLength(4);
  });

  it("keeps a typed confirmation locked until the text matches exactly", async () => {
    const panel = new Panel();
    panel.toggle(true);
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
    panel.toggle(true);
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

  it("renders 3 dashboard cells for subreddits, posts, and comments", () => {
    const panel = new Panel();
    panel.count(15, { posts: 42, comments: 108 });
    expect(q(panel, ".fig-subs")!.textContent).toBe("15");
    expect(q(panel, ".fig-posts")!.textContent).toBe("42");
    expect(q(panel, ".fig-comments")!.textContent).toBe("108");
  });

  it("updates the correct metric figure during progress without affecting others", () => {
    const panel = new Panel();
    panel.count(470, { posts: 10, comments: 486 });

    panel.progress("Deleting comments", 24, 486, 462, "comments");
    expect(q(panel, ".fig-subs")!.textContent).toBe("470");
    expect(q(panel, ".fig-posts")!.textContent).toBe("10");
    expect(q(panel, ".fig-comments")!.textContent).toBe("462");

    panel.progress("Deleting posts", 2, 10, 8, "posts");
    expect(q(panel, ".fig-subs")!.textContent).toBe("470");
    expect(q(panel, ".fig-posts")!.textContent).toBe("8");
    expect(q(panel, ".fig-comments")!.textContent).toBe("462");
  });
});


describe("panel lifecycle", () => {
  it("removes a dismissed sheet and restores the content when the panel closes", async () => {
    const panel = new Panel();
    panel.toggle(true);
    panel.toggle(true);
    const answer = panel.confirm({ title: "Delete comments", body: "Review", action: "Delete", typed: "3" });
    panel.toggle(false);
    expect(await answer).toBe(false);
    expect(q(panel, ".sheet")).toBeNull();
    expect(q<HTMLElement>(panel, ".content")!.hidden).toBe(false);
    expect(q<HTMLElement>(panel, ".panel")!.inert).toBe(true);
  });

  it("cancels a confirmation with Escape while keeping the panel open", async () => {
    const panel = new Panel();
    panel.toggle(true);
    panel.toggle(true);
    const answer = panel.confirm({ title: "Join", body: "Review", action: "Join" });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(await answer).toBe(false);
    expect(q(panel, ".sheet")).toBeNull();
    expect(q(panel, ".panel")!.getAttribute("aria-hidden")).toBe("false");
  });

  it("keeps keyboard focus inside the confirmation", () => {
    const panel = new Panel();
    panel.toggle(true);
    void panel.confirm({ title: "Delete", body: "Review", action: "Delete", typed: "3" });
    const input = q<HTMLInputElement>(panel, ".sheet__input")!;
    const cancel = q<HTMLButtonElement>(panel, ".btn--cancel")!;
    input.focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, cancelable: true }));
    expect(panel.root.activeElement).toBe(cancel);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", cancelable: true }));
    expect(panel.root.activeElement).toBe(input);
    cancel.click();
  });

  it("preserves history counts on a subscription-only update", () => {
    const panel = new Panel();
    panel.count(12, { posts: 5, comments: 8 });
    panel.count(13);
    expect(q(panel, ".fig-posts")!.textContent).toBe("5");
    expect(q(panel, ".fig-comments")!.textContent).toBe("8");
  });

  it("ignores background refresh results after closing the panel", async () => {
    const { refresh } = await import("../src/portability");
    let report: import("../src/portability").Report | undefined;
    vi.mocked(refresh).mockImplementationOnce(async (r) => { report = r; return 0; });
    const panel = new Panel();
    panel.toggle(true);
    panel.count(12);
    panel.toggle(false);
    report!.count(999);
    report!.status("Stale error", "bad");
    expect(q(panel, ".fig-subs")!.textContent).toBe("12");
    expect(q(panel, ".status")!.textContent).not.toBe("Stale error");
  });
});


it("does not open a late confirmation after the user closes the panel", async () => {
  const panel = new Panel();
  panel.toggle(true);
  panel.toggle(false);
  expect(await panel.confirm({ title: "Delete", body: "Review", action: "Delete" })).toBe(false);
  expect(q(panel, ".sheet")).toBeNull();
});

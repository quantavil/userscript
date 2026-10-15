import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { WishlistApp } from "../src/components/WishlistApp";
import { DEFAULT_SETTINGS } from "../src/core/settings";
let values: Record<string, unknown>;
const product = {
  id: "amz_B012345678",
  title: "Test headphones",
  price: 200,
  url: "https://www.amazon.in/dp/B012345678",
  imageUrl: "",
  platform: "Amazon",
};
beforeEach(() => {
  values = { priceStdz_wishlist: [product], priceStdz_settings: DEFAULT_SETTINGS };
  vi.stubGlobal("GM_getValue", (k: string, f: unknown) => values[k] ?? f);
  vi.stubGlobal("GM_setValue", (k: string, v: unknown) => {
    values[k] = v;
  });
  vi.stubGlobal(
    "GM_addValueChangeListener",
    vi.fn(() => 1),
  );
  vi.stubGlobal("GM_removeValueChangeListener", vi.fn());
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const open = () => fireEvent.click(screen.getByRole("button", { name: "Open AI Wishlist" }));
test("opens, exposes first-click sort, restores focus on Escape and unmounts subscriptions", async () => {
  const view = render(<WishlistApp />);
  open();
  fireEvent.click(screen.getByRole("button", { name: "Sort wishlist" }));
  expect(screen.getByRole("button", { name: "Price: Low → High" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Price: Low → High" }));
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Open AI Wishlist" })),
  );
  view.unmount();
  expect(GM_removeValueChangeListener).toHaveBeenCalled();
});
test("has accessible history links, remove/undo and clipboard error feedback", async () => {
  render(<WishlistApp />);
  open();
  const link = screen.getByRole("link", { name: "Price history for Test headphones" });
  expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  expect(link.getAttribute("target")).toBe("_blank");
  fireEvent.click(screen.getByRole("button", { name: "Copy JSON" }));
  await screen.findByText(/Could not copy/);
  fireEvent.click(screen.getByRole("button", { name: "Remove Test headphones from wishlist" }));
  expect(screen.queryByRole("link", { name: "Test headphones" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(screen.getByRole("link", { name: "Test headphones" })).toBeTruthy();
});
test("renders settings labels and retains Gemini fresh default", () => {
  render(<WishlistApp />);
  open();
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  expect((screen.getByLabelText("Model name") as HTMLInputElement).value).toBe(
    "gemini-3.5-flash-lite",
  );
  expect(screen.getByLabelText("API base URL")).toBeTruthy();
});
test("requires confirmation to clear all items", () => {
  render(<WishlistApp />);
  open();
  fireEvent.click(screen.getByRole("button", { name: "Clear All" }));
  expect(screen.getByRole("link", { name: "Test headphones" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Confirm Clear?" }));
  expect(screen.queryByRole("link", { name: "Test headphones" })).toBeNull();
});

test("keeps saved rows and action pills visible with the real stylesheet", async () => {
  const css = readFileSync(resolve(import.meta.dirname, "../src/styles.css"), "utf8");
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  try {
    render(<WishlistApp />);
    open();
    expect(getComputedStyle(document.querySelector(".aiw-item-row")!).opacity).toBe("1");
    expect(getComputedStyle(document.querySelector(".aiw-floating-pills")!).display).toBe("flex");
  } finally {
    style.remove();
  }
});

test("traps reset confirmation focus within the confirmation and restores settings focus", async () => {
  render(<WishlistApp />);
  open();
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  fireEvent.click(screen.getByRole("button", { name: "Reset all data…" }));
  const confirm = screen.getByRole("button", { name: "Confirm reset" });
  await waitFor(() => expect(document.activeElement).toBe(confirm));
  const cancel = screen.getByRole("button", { name: "Cancel" });
  cancel.focus();
  fireEvent.keyDown(cancel, { key: "Tab" });
  expect(document.activeElement).toBe(confirm);
});

test("shows the saved-count badge using the real stylesheet", () => {
  const style = document.createElement("style");
  style.textContent = readFileSync(resolve(import.meta.dirname, "../src/styles.css"), "utf8");
  document.head.appendChild(style);
  try {
    render(<WishlistApp />);
    expect(getComputedStyle(document.querySelector(".aiw-fab-badge")!).display).toBe("inline-flex");
  } finally {
    style.remove();
  }
});
test("shows the clear-search action and clears a populated query", () => {
  const style = document.createElement("style");
  style.textContent = readFileSync(resolve(import.meta.dirname, "../src/styles.css"), "utf8");
  document.head.appendChild(style);
  try {
    render(<WishlistApp />);
    open();
    fireEvent.input(screen.getByLabelText("Search wishlist"), { target: { value: "Test" } });
    const clear = screen.getByRole("button", { name: "Clear search" });
    expect(getComputedStyle(clear).display).toBe("inline-flex");
    fireEvent.click(clear);
    expect((screen.getByLabelText("Search wishlist") as HTMLInputElement).value).toBe("");
  } finally {
    style.remove();
  }
});

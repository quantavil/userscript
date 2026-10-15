import { beforeEach, expect, test, vi } from "vite-plus/test";
import { getWishlist, saveWishlist, addItem } from "../src/core/wishlist";
import { getSettings, saveSettings, DEFAULT_SETTINGS, isGeminiUrl } from "../src/core/settings";
let values: Record<string, unknown>;
beforeEach(() => {
  values = {};
  vi.stubGlobal("GM_getValue", (key: string, fallback: unknown) => values[key] ?? fallback);
  vi.stubGlobal("GM_setValue", (key: string, value: unknown) => {
    values[key] = value;
  });
});
test("ignores malformed wishlist entries without rewriting storage", () => {
  const raw = [
    null,
    { id: "bad" },
    {
      id: "amz_X",
      title: "Okay",
      price: 2,
      url: "https://www.amazon.in/dp/B012345678",
      platform: "Amazon",
      imageUrl: "",
    },
  ];
  values.priceStdz_wishlist = raw;
  expect(getWishlist()).toHaveLength(1);
  expect(values.priceStdz_wishlist).toBe(raw);
  values.priceStdz_wishlist = { broken: true };
  expect(getWishlist()).toEqual([]);
});
test("validates settings fields independently and preserves saved model", () => {
  values.priceStdz_settings = {
    model: "saved-model",
    autocrawl: "yes",
    accentColor: "url(bad)",
    apiKey: 123,
  };
  expect(getSettings()).toEqual({ ...DEFAULT_SETTINGS, model: "saved-model" });
});
test("reports write failures instead of announcing successful save", () => {
  vi.stubGlobal("GM_setValue", () => {
    throw new Error("quota");
  });
  const updated = vi.fn();
  const failed = vi.fn();
  window.addEventListener("wishlist-updated", updated);
  window.addEventListener("storage-error", failed);
  expect(saveWishlist([])).toBe(false);
  expect(saveSettings(DEFAULT_SETTINGS)).toBe(false);
  expect(failed).toHaveBeenCalledTimes(2);
  expect(updated).not.toHaveBeenCalled();
  window.removeEventListener("wishlist-updated", updated);
  window.removeEventListener("storage-error", failed);
});
test("keeps legacy dates and id deduplication", () => {
  const item = {
    id: "amz_X",
    title: "Okay",
    price: 2,
    url: "https://www.amazon.in/dp/B012345678",
    platform: "Amazon",
    imageUrl: "",
    dateAdded: 42,
  };
  addItem(item);
  addItem(item);
  expect(getWishlist()).toEqual([item]);
});
test("uses exact Gemini hostname", () => {
  expect(isGeminiUrl("https://generativelanguage.googleapis.com/v1beta/")).toBe(true);
  expect(isGeminiUrl("https://googleapis.com.evil.test/v1")).toBe(false);
  expect(isGeminiUrl("not a url googleapis.com")).toBe(false);
});

test("bridges remote GM settings and wishlist events and removes listeners", async () => {
  const { subscribeStorage } = await import("../src/core/storage");
  const callbacks = new Map<string, Parameters<typeof GM_addValueChangeListener>[1]>();
  vi.stubGlobal(
    "GM_addValueChangeListener",
    (key: string, callback: Parameters<typeof GM_addValueChangeListener>[1]) => {
      callbacks.set(key, callback);
      return callbacks.size;
    },
  );
  const remove = vi.fn();
  vi.stubGlobal("GM_removeValueChangeListener", remove);
  const changed = vi.fn();
  const stop = subscribeStorage(changed);
  callbacks.get("priceStdz_wishlist")!("priceStdz_wishlist", [], [], false);
  expect(changed).not.toHaveBeenCalled();
  callbacks.get("priceStdz_wishlist")!("priceStdz_wishlist", [], [], true);
  callbacks.get("priceStdz_settings")!("priceStdz_settings", {}, {}, true);
  expect(changed).toHaveBeenCalledTimes(2);
  stop();
  expect(remove).toHaveBeenCalledTimes(2);
});

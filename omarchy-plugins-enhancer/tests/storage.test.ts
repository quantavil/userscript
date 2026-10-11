import { beforeEach, describe, expect, it } from "bun:test";
import { storage } from "../src/storage.ts";

describe("StorageManager", () => {
  beforeEach(() => {
    storage.clearSeenPlugins();
    storage.updateSettings({
      autoPagerEnabled: true,
      seenMode: "collapse",
      markSeenOnScroll: true,
    });
  });

  it("should initialize with default settings", () => {
    const settings = storage.getSettings();
    expect(settings.autoPagerEnabled).toBe(true);
    expect(settings.seenMode).toBe("collapse");
    expect(settings.markSeenOnScroll).toBe(true);
    expect(settings.seenPluginIds).toEqual([]);
  });

  it("should update seenMode ('dim', 'collapse', 'off')", () => {
    storage.updateSettings({ seenMode: "collapse" });
    expect(storage.getSettings().seenMode).toBe("collapse");

    storage.updateSettings({ seenMode: "off" });
    expect(storage.getSettings().seenMode).toBe("off");
  });

  it("should track seen plugins correctly", () => {
    expect(storage.isPluginSeen("test-plugin-1")).toBe(false);
    expect(storage.getSeenCount()).toBe(0);

    const marked1 = storage.markPluginSeen("test-plugin-1");
    expect(marked1).toBe(true);
    expect(storage.isPluginSeen("test-plugin-1")).toBe(true);
    expect(storage.getSeenCount()).toBe(1);

    const markedAgain = storage.markPluginSeen("test-plugin-1");
    expect(markedAgain).toBe(false);

    storage.markPluginSeen("test-plugin-2");
    expect(storage.getSeenCount()).toBe(2);

    const unmarked = storage.unmarkPluginSeen("test-plugin-1");
    expect(unmarked).toBe(true);
    expect(storage.isPluginSeen("test-plugin-1")).toBe(false);
    expect(storage.getSeenCount()).toBe(1);

    storage.clearSeenPlugins();
    expect(storage.getSeenCount()).toBe(0);
    expect(storage.isPluginSeen("test-plugin-2")).toBe(false);
  });
});

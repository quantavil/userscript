import { beforeEach, describe, expect, it } from "vite-plus/test";
import { emptyState } from "./query";
import { addPreset, getPresets, migrateLegacyStorage, removePreset } from "./storage";

const store = "ghf:presets";

beforeEach(() => {
  localStorage.clear();
});

describe("preset storage", () => {
  it("returns an empty list when the stored value is not an array", () => {
    localStorage.setItem(store, JSON.stringify({ nope: true }));
    expect(getPresets()).toEqual([]);
  });

  it("drops malformed entries but keeps valid presets", () => {
    localStorage.setItem(
      store,
      JSON.stringify([
        null,
        { id: "p1", name: "Valid", state: { ...emptyState(), and: "rust" } },
        { id: "", name: "No id" },
        { id: "p2" },
      ]),
    );
    const presets = getPresets();
    expect(presets).toHaveLength(1);
    expect(presets[0]!.name).toBe("Valid");
    expect(presets[0]!.state.and).toBe("rust");
  });

  it("adds and removes presets", () => {
    const afterAdd = addPreset("Rust", { ...emptyState(), lang: "rust" });
    expect(afterAdd).toHaveLength(1);
    expect(getPresets()[0]!.name).toBe("Rust");

    const afterRemove = removePreset(afterAdd[0]!.id);
    expect(afterRemove).toEqual([]);
    expect(getPresets()).toEqual([]);
  });

  it("ignores a corrupted legacy payload", () => {
    localStorage.setItem("gh-adv-presets", JSON.stringify({ not: "an array" }));
    migrateLegacyStorage();
    expect(getPresets()).toEqual([]);
    expect(localStorage.getItem("gh-adv-presets")).toBeNull();
  });
});

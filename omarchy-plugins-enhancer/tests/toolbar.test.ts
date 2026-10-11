import { beforeEach, describe, expect, it } from "bun:test";
import { Window } from "happy-dom";
import { storage } from "../src/storage.ts";
import { Toolbar } from "../src/ui/toolbar.ts";

describe("Toolbar", () => {
  let window: Window;
  let document: Document;

  beforeEach(() => {
    window = new Window();
    document = window.document as unknown as Document;
    global.window = window as unknown as Window & typeof globalThis;
    global.document = document;

    storage.clearSeenPlugins();
    storage.updateSettings({
      autoPagerEnabled: true,
      seenMode: "collapse",
    });
  });

  it("should render floating toolbar collapsed by default without emoji characters", () => {
    const toolbar = new Toolbar();
    const el = document.querySelector(".ope-toolbar")!;
    expect(el).not.toBeNull();
    expect(el.classList.contains("collapsed")).toBe(true);

    // Expand toolbar
    const toggleBtn = document.querySelector<HTMLButtonElement>("#ope-collapse-toggle")!;
    toggleBtn.click();
    expect(el.classList.contains("collapsed")).toBe(false);

    // Check no emoji in innerHTML or textContent
    const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u;
    expect(emojiRegex.test(el.textContent || "")).toBe(false);

    const autoPagerBtn = document.querySelector<HTMLButtonElement>("#ope-toggle-autopager")!;
    expect(autoPagerBtn.classList.contains("active")).toBe(true);

    // Collapse back
    toggleBtn.click();
    expect(el.classList.contains("collapsed")).toBe(true);

    toolbar.destroy();
  });

  it("should allow switching between dim, collapse, and off modes", () => {
    const toolbar = new Toolbar();

    const dimBtn = document.querySelector<HTMLButtonElement>('.ope-mode-btn[data-mode="dim"]')!;
    const collapseBtn = document.querySelector<HTMLButtonElement>('.ope-mode-btn[data-mode="collapse"]')!;
    const offBtn = document.querySelector<HTMLButtonElement>('.ope-mode-btn[data-mode="off"]')!;

    // Initial default is collapse
    expect(collapseBtn.classList.contains("active")).toBe(true);
    expect(dimBtn.classList.contains("active")).toBe(false);
    expect(document.documentElement.classList.contains("ope-mode-collapse")).toBe(true);

    dimBtn.click();
    expect(storage.getSettings().seenMode).toBe("dim");
    expect(dimBtn.classList.contains("active")).toBe(true);
    expect(document.documentElement.classList.contains("ope-mode-dim")).toBe(true);
    expect(document.documentElement.classList.contains("ope-mode-collapse")).toBe(false);

    offBtn.click();
    expect(storage.getSettings().seenMode).toBe("off");
    expect(offBtn.classList.contains("active")).toBe(true);
    expect(document.documentElement.classList.contains("ope-mode-collapse")).toBe(false);
    expect(document.documentElement.classList.contains("ope-mode-dim")).toBe(false);

    toolbar.destroy();
  });
});

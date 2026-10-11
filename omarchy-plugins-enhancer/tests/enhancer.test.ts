import { beforeEach, describe, expect, it } from "bun:test";
import { Window } from "happy-dom";
import { catalogService } from "../src/catalog.ts";
import { enhanceCard } from "../src/features/card-enhancer.ts";
import { storage } from "../src/storage.ts";

describe("Card Enhancer", () => {
  let window: Window;
  let document: Document;

  beforeEach(() => {
    window = new Window();
    document = window.document as unknown as Document;
    global.window = window as unknown as Window & typeof globalThis;
    global.document = document;

    storage.clearSeenPlugins();

    catalogService.setCatalogData([
      {
        id: "omni",
        name: "Omni Shell",
        description: "Fast app launcher",
        author: "bjarneo",
        repo: "https://github.com/bjarneo/omarchy-shell-plugins",
      },
    ]);
  });

  it("should inject GitHub icon-only button without text into .plugin-card-actions", () => {
    document.body.innerHTML = `
      <article class="plugin-card" data-card-plugin="omni">
        <a class="plugin-card-link" href="plugin.html?id=omni"></a>
        <div class="plugin-card-body">
          <div class="plugin-title-line">
            <h3>Omni Shell</h3>
          </div>
          <p class="plugin-description">Fast app launcher</p>
          <div class="plugin-card-bottom">
            <div class="plugin-card-actions">
              <button class="card-install" type="button">Copy install</button>
            </div>
          </div>
        </div>
      </article>
    `;

    const card = document.querySelector<HTMLElement>(".plugin-card")!;
    enhanceCard(card);

    const ghBtn = card.querySelector<HTMLAnchorElement>(".ope-github-btn");
    expect(ghBtn).not.toBeNull();
    expect(ghBtn?.href).toBe("https://github.com/bjarneo/omarchy-shell-plugins");
    expect(ghBtn?.target).toBe("_blank");
    // Ensure no text node, icon only
    expect(ghBtn?.textContent?.trim()).toBe("");
    expect(ghBtn?.querySelector("svg")).not.toBeNull();

    // Check seen badge injected in title line
    const seenBadge = card.querySelector<HTMLButtonElement>(".ope-seen-badge");
    expect(seenBadge).not.toBeNull();

    // Description is present on card
    const desc = card.querySelector<HTMLElement>(".plugin-description");
    expect(desc?.textContent).toBe("Fast app launcher");
  });

  it("should mark plugin as seen when clicking GitHub button", () => {
    document.body.innerHTML = `
      <article class="plugin-card" data-card-plugin="omni">
        <div class="plugin-card-bottom">
          <div class="plugin-card-actions"></div>
        </div>
      </article>
    `;

    const card = document.querySelector<HTMLElement>(".plugin-card")!;
    enhanceCard(card);

    expect(storage.isPluginSeen("omni")).toBe(false);
    expect(card.classList.contains("ope-seen")).toBe(false);
    expect(card.getAttribute("data-ope-seen")).toBe("false");

    const ghBtn = card.querySelector<HTMLAnchorElement>(".ope-github-btn")!;
    ghBtn.click();

    expect(storage.isPluginSeen("omni")).toBe(true);
    expect(card.classList.contains("ope-seen")).toBe(true);
    expect(card.getAttribute("data-ope-seen")).toBe("true");
  });

  it("should toggle seen state when clicking seen badge", () => {
    document.body.innerHTML = `
      <article class="plugin-card" data-card-plugin="omni">
        <div class="plugin-title-line"></div>
      </article>
    `;

    const card = document.querySelector<HTMLElement>(".plugin-card")!;
    enhanceCard(card);

    const badge = card.querySelector<HTMLButtonElement>(".ope-seen-badge")!;
    badge.click();

    expect(storage.isPluginSeen("omni")).toBe(true);
    expect(card.classList.contains("ope-seen")).toBe(true);
    expect(card.getAttribute("data-ope-seen")).toBe("true");

    badge.click();
    expect(storage.isPluginSeen("omni")).toBe(false);
    expect(card.classList.contains("ope-seen")).toBe(false);
    expect(card.getAttribute("data-ope-seen")).toBe("false");
  });

  it("should preserve .card-social and append .ope-seen-badge cleanly in title line", () => {
    document.body.innerHTML = `
      <article class="plugin-card" data-card-plugin="screen-time">
        <div class="plugin-card-body">
          <div class="plugin-card-content">
            <div class="plugin-title-line">
              <h3>Screen Time</h3>
              <div class="card-social">
                <span class="card-stars">12</span>
                <button class="plugin-heart" type="button">5</button>
              </div>
            </div>
            <p class="plugin-description">Know where your time goes.</p>
          </div>
        </div>
      </article>
    `;

    const card = document.querySelector<HTMLElement>(".plugin-card")!;
    enhanceCard(card);

    const titleLine = card.querySelector<HTMLElement>(".plugin-title-line")!;
    expect(titleLine.querySelector("h3")?.textContent).toBe("Screen Time");
    expect(titleLine.querySelector(".card-social")).not.toBeNull();
    expect(titleLine.querySelector(".card-stars")?.textContent).toBe("12");
    expect(titleLine.querySelector(".plugin-heart")?.textContent).toBe("5");

    const badge = titleLine.querySelector<HTMLButtonElement>(".ope-seen-badge");
    expect(badge).not.toBeNull();
    // Seen badge should be appended after social
    expect(titleLine.lastElementChild).toBe(badge);
  });
});

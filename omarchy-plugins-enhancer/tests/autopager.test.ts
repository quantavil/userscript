import { beforeEach, describe, expect, it } from "bun:test";
import { Window } from "happy-dom";
import { AutoPager } from "../src/features/auto-pager.ts";
import { storage } from "../src/storage.ts";

describe("AutoPager", () => {
  let window: Window;
  let document: Document;

  beforeEach(() => {
    window = new Window();
    document = window.document as unknown as Document;
    global.window = window as unknown as Window & typeof globalThis;
    global.document = document;

    storage.updateSettings({ autoPagerEnabled: true });
  });

  it("should create sentinel element before #catalog-pagination", () => {
    document.body.innerHTML = `
      <div id="plugin-grid"></div>
      <nav id="catalog-pagination">
        <button id="page-next" type="button"></button>
      </nav>
    `;

    const pager = new AutoPager();
    const sentinel = document.querySelector("#ope-sentinel");
    expect(sentinel).not.toBeNull();
    expect(sentinel?.nextElementSibling?.id).toBe("catalog-pagination");
    pager.destroy();
  });

  it("should prepend previous cards and suppress scroll on triggerNextPage", () => {
    document.body.innerHTML = `
      <div id="plugin-grid">
        <article class="plugin-card" id="card-1">Card 1</article>
        <article class="plugin-card" id="card-2">Card 2</article>
      </div>
      <nav id="catalog-pagination">
        <button id="page-next" type="button">Next</button>
      </nav>
    `;

    const grid = document.querySelector<HTMLElement>("#plugin-grid")!;
    const nextBtn = document.querySelector<HTMLButtonElement>("#page-next")!;

    let scrollIntoViewCalled = false;
    grid.scrollIntoView = () => {
      scrollIntoViewCalled = true;
    };

    // Simulate site render behavior when nextBtn is clicked:
    // It replaces grid.innerHTML with next page cards
    nextBtn.addEventListener("click", () => {
      grid.innerHTML = `
        <article class="plugin-card" id="card-3">Card 3</article>
        <article class="plugin-card" id="card-4">Card 4</article>
      `;
      // Site also tries to scroll grid into view
      grid.scrollIntoView();
    });

    const pager = new AutoPager();
    pager.triggerNextPage();

    // 1. Grid should now contain ALL 4 cards (card 1, 2 prepended before 3, 4)
    const cards = grid.querySelectorAll(".plugin-card");
    expect(cards.length).toBe(4);
    expect(cards[0].id).toBe("card-1");
    expect(cards[1].id).toBe("card-2");
    expect(cards[2].id).toBe("card-3");
    expect(cards[3].id).toBe("card-4");

    // 2. scrollIntoView was suppressed during the transition
    expect(scrollIntoViewCalled).toBe(false);

    // 3. scrollIntoView restored afterwards
    grid.scrollIntoView();
    expect(scrollIntoViewCalled).toBe(true);

    pager.destroy();
  });
});

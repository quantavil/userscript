import { storage } from "../storage.ts";
import { enhanceAllCards } from "./card-enhancer.ts";
import { seenObserver } from "./seen-observer.ts";

export class AutoPager {
  private sentinel: HTMLElement | null = null;
  private observer: IntersectionObserver | null = null;
  private isAutoPaging: boolean = false;
  private cooldownTimer: number = 0;

  constructor() {
    this.setupSentinel();
    this.initObserver();

    storage.onSettingsChange((settings) => {
      if (settings.autoPagerEnabled) {
        this.reobserve();
      } else {
        this.unobserve();
      }
    });
  }

  public setupSentinel(): void {
    if (typeof document === "undefined") return;

    const pagination = document.querySelector("#catalog-pagination");
    if (!pagination) return;

    let sentinel = document.querySelector<HTMLElement>("#ope-sentinel");
    if (!sentinel) {
      sentinel = document.createElement("div");
      sentinel.id = "ope-sentinel";
      pagination.before(sentinel);
    }
    this.sentinel = sentinel;
  }

  public initObserver(): void {
    if (typeof IntersectionObserver === "undefined") return;
    if (this.observer) this.observer.disconnect();

    this.observer = new IntersectionObserver(
      (entries) => {
        const settings = storage.getSettings();
        if (!settings.autoPagerEnabled) return;

        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.triggerNextPage();
          }
        }
      },
      {
        root: null,
        rootMargin: "450px", // Trigger before user hits the bottom
        threshold: 0,
      },
    );

    if (this.sentinel) {
      this.observer.observe(this.sentinel);
    }
  }

  public triggerNextPage(): void {
    if (this.isAutoPaging) return;

    const nextBtn = document.querySelector<HTMLButtonElement>("#page-next");
    const grid = document.querySelector<HTMLElement>("#plugin-grid");

    if (!nextBtn || nextBtn.disabled || !grid) {
      return;
    }

    this.isAutoPaging = true;

    try {
      // 1. Snapshot currently rendered plugin cards in grid
      const existingCards = Array.from(grid.querySelectorAll<HTMLElement>(":scope > .plugin-card"));

      // 2. Temporarily patch grid.scrollIntoView to avoid jumping to top
      const originalScrollIntoView = grid.scrollIntoView;
      grid.scrollIntoView = () => {
        // Suppressed by AutoPager to prevent scroll-to-top jump
      };

      // 3. Click the site's next page button
      nextBtn.click();

      // 4. Prepend previous cards back into grid (avoiding any accidental duplicates)
      const newCardIds = new Set(
        Array.from(grid.querySelectorAll<HTMLElement>(":scope > .plugin-card"))
          .map((c) => c.getAttribute("data-card-plugin"))
          .filter(Boolean),
      );

      const cardsToPrepend = existingCards.filter(
        (c) => !newCardIds.has(c.getAttribute("data-card-plugin")),
      );

      if (cardsToPrepend.length > 0) {
        grid.prepend(...cardsToPrepend);
      }

      // 5. Restore original scrollIntoView
      grid.scrollIntoView = originalScrollIntoView;

      // 6. Enhance any new cards that were appended
      enhanceAllCards();
      seenObserver.observeAll();
    } catch (err) {
      console.error("[Omarchy Enhancer] Error in AutoPager:", err);
    } finally {
      // Cooldown to prevent runaway rapid firing
      if (this.cooldownTimer) window.clearTimeout(this.cooldownTimer);
      this.cooldownTimer = window.setTimeout(() => {
        this.isAutoPaging = false;
      }, 350);
    }
  }

  public reobserve(): void {
    this.setupSentinel();
    if (this.observer && this.sentinel) {
      this.observer.unobserve(this.sentinel);
      this.observer.observe(this.sentinel);
    }
  }

  public unobserve(): void {
    if (this.observer && this.sentinel) {
      this.observer.unobserve(this.sentinel);
    }
  }

  public destroy(): void {
    this.unobserve();
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.sentinel) {
      this.sentinel.remove();
      this.sentinel = null;
    }
  }
}

export const autoPager = new AutoPager();

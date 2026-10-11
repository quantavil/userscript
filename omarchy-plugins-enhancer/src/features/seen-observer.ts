import { storage } from "../storage.ts";
import { updateCardSeenVisuals } from "./card-enhancer.ts";

class SeenObserver {
  private observer: IntersectionObserver | null = null;
  private scrollListener: (() => void) | null = null;
  private scrollRaf: number = 0;

  constructor() {
    this.initObserver();

    storage.onSettingsChange((settings) => {
      if (!settings.markSeenOnScroll) {
        this.disconnect();
      } else if (!this.observer) {
        this.initObserver();
        this.observeAll();
      }
    });
  }

  private initObserver(): void {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;

    // Track cards that entered the viewport, and only mark seen once scrolled past (above viewport)
    const enteredViewport = new WeakSet<Element>();

    this.observer = new IntersectionObserver(
      (entries) => {
        const settings = storage.getSettings();
        if (!settings.markSeenOnScroll) return;

        for (const entry of entries) {
          const card = entry.target as HTMLElement;
          const pluginId = card.getAttribute("data-card-plugin");
          if (!pluginId || storage.isPluginSeen(pluginId)) {
            if (this.observer) this.observer.unobserve(card);
            continue;
          }

          if (entry.isIntersecting) {
            // User is actively looking at the card in viewport: do not grey out
            enteredViewport.add(card);
          } else if (enteredViewport.has(card) && entry.boundingClientRect.top < 0) {
            // Exited through the top margin (scrolled past by 1-2 cards)
            storage.markPluginSeen(pluginId);
            updateCardSeenVisuals(card, true);
            enteredViewport.delete(card);
            if (this.observer) this.observer.unobserve(card);
          }
        }
      },
      {
        // Root margin extends 160px above viewport so card is only exited once scrolled past by 1-2 cards
        rootMargin: "160px 0px 0px 0px",
        threshold: 0,
      },
    );

    this.setupScrollCheck(enteredViewport);
  }

  private setupScrollCheck(enteredViewport: WeakSet<Element>): void {
    if (typeof window === "undefined") return;

    this.scrollListener = () => {
      if (this.scrollRaf) return;
      this.scrollRaf = window.requestAnimationFrame(() => {
        this.scrollRaf = 0;
        const settings = storage.getSettings();
        if (!settings.markSeenOnScroll) return;

        const cards = document.querySelectorAll<HTMLElement>(".plugin-card:not(.ope-seen)");
        for (const card of cards) {
          const pluginId = card.getAttribute("data-card-plugin");
          if (!pluginId || storage.isPluginSeen(pluginId)) continue;

          const rect = card.getBoundingClientRect();
          // Scrolled well past the viewport top by 1-2 cards
          if (enteredViewport.has(card) && rect.bottom < -120) {
            storage.markPluginSeen(pluginId);
            updateCardSeenVisuals(card, true);
            enteredViewport.delete(card);
            if (this.observer) this.observer.unobserve(card);
          }
        }
      });
    };

    window.addEventListener("scroll", this.scrollListener, { passive: true });
  }

  public observe(card: HTMLElement): void {
    if (!this.observer) return;
    const pluginId = card.getAttribute("data-card-plugin");
    if (!pluginId || storage.isPluginSeen(pluginId)) return;
    this.observer.observe(card);
  }

  public observeAll(): void {
    if (!this.observer) return;
    const cards = document.querySelectorAll<HTMLElement>(".plugin-card:not(.ope-seen)");
    for (const card of cards) {
      this.observe(card);
    }
  }

  public disconnect(): void {
    if (this.scrollListener) {
      window.removeEventListener("scroll", this.scrollListener);
      this.scrollListener = null;
    }
    if (this.scrollRaf) {
      window.cancelAnimationFrame(this.scrollRaf);
      this.scrollRaf = 0;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

export const seenObserver = new SeenObserver();

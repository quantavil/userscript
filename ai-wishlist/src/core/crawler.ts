import { requestText } from "./transport";
import { parseAmazonDetails, parseFlipkartDetails } from "./specifications";
import { getWishlist, updateItemDetails } from "./wishlist";
import type { WishlistItem } from "./types";
interface Job {
  item: WishlistItem;
  controller: AbortController;
  run: () => Promise<void>;
  done: Promise<void>;
  finish: () => void;
}
export class CrawlQueue {
  private jobs = new Map<string, Job>();
  private waiting: Job[] = [];
  private active = 0;
  private disposed = false;
  private invalidateMissing = (event: Event) => {
    if ((event as CustomEvent<{ remote?: boolean }>).detail?.remote) {
      this.invalidateAll();
      return;
    }
    const items = getWishlist();
    for (const job of this.jobs.values()) {
      if (!items.some((item) => item.id === job.item.id && item.url === job.item.url))
        job.controller.abort();
    }
  };
  private invalidateAll = () => {
    for (const job of this.jobs.values()) job.controller.abort();
  };
  constructor() {
    window.addEventListener("wishlist-updated", this.invalidateMissing);
    window.addEventListener("scraped-cache-cleared", this.invalidateAll);
  }
  enqueue(item: WishlistItem): Promise<void> {
    if (this.disposed) return Promise.resolve();
    const existing = this.jobs.get(item.id);
    if (existing) return existing.done;
    const controller = new AbortController();
    let finish!: () => void;
    const done = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const job: Job = {
      item,
      controller,
      done,
      finish,
      run: async () => {
        if (controller.signal.aborted) return;
        try {
          const html = await requestText({
            url: item.url,
            timeout: 20_000,
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;
          const doc = new DOMParser().parseFromString(html, "text/html");
          const details =
            item.platform === "Amazon" ? parseAmazonDetails(doc) : parseFlipkartDetails(doc);
          if (
            Object.values(JSON.parse(details)).some(
              (value) => typeof value === "string" && value.trim(),
            )
          )
            updateItemDetails(item.id, details);
        } catch {
          /* Failed/blocked crawls leave details absent, available for a later manual save. */
        }
      },
    };
    this.jobs.set(item.id, job);
    this.waiting.push(job);
    this.pump();
    return done;
  }
  private pump() {
    while (this.active < 2 && this.waiting.length) {
      const job = this.waiting.shift()!;
      this.active++;
      window.dispatchEvent(new CustomEvent("crawling-start"));
      void job.run().finally(() => {
        this.active--;
        this.jobs.delete(job.item.id);
        job.finish();
        window.dispatchEvent(new CustomEvent("crawling-end"));
        this.pump();
      });
    }
  }
  dispose() {
    this.disposed = true;
    this.invalidateAll();
    window.removeEventListener("wishlist-updated", this.invalidateMissing);
    window.removeEventListener("scraped-cache-cleared", this.invalidateAll);
  }
}
let queue: CrawlQueue | undefined;
export function crawlProduct(item: WishlistItem) {
  return (queue ??= new CrawlQueue()).enqueue(item);
}
export function disposeCrawler() {
  queue?.dispose();
  queue = undefined;
}

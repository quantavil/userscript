import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { requestText } from "../src/core/transport";
import { CrawlQueue } from "../src/core/crawler";
import { addItem, clearScrapedCache, getWishlist, removeItem } from "../src/core/wishlist";
let pending: Parameters<typeof GM_xmlhttpRequest>[0][];
let values: Record<string, unknown>;
beforeEach(() => {
  pending = [];
  values = {};
  vi.stubGlobal("GM_getValue", (k: string, f: unknown) => values[k] ?? f);
  vi.stubGlobal("GM_setValue", (k: string, v: unknown) => {
    values[k] = v;
  });
  vi.stubGlobal("GM_xmlhttpRequest", (opts: Parameters<typeof GM_xmlhttpRequest>[0]) => {
    pending.push(opts);
    return { abort: vi.fn() };
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const finish = (
  index: number,
  status = 200,
  text = '<div id="feature-bullets"><ul><li><span class="a-list-item">Useful spec</span></li></ul></div>',
) => pending[index]!.onload!({ status, responseText: text, response: null });
const item = (id: string) => ({
  id,
  title: id,
  price: 1,
  url: `https://www.amazon.in/dp/${id.padEnd(10, "0")}`,
  imageUrl: "",
  platform: "Amazon",
});
test("rejects HTTP failure and times out a stalled GM request", async () => {
  const request = requestText({ url: "https://example.com", timeout: 20 });
  finish(0, 403);
  await expect(request).rejects.toThrow("HTTP 403");
  vi.useFakeTimers();
  const timeout = requestText({ url: "https://example.com", timeout: 20 });
  const check = expect(timeout).rejects.toThrow("timed out");
  await vi.advanceTimersByTimeAsync(20);
  await check;
});
test("limits crawls to two and deduplicates ids", async () => {
  const queue = new CrawlQueue();
  const a = item("a"),
    b = item("b"),
    c = item("c");
  [a, b, c].forEach(addItem);
  const first = queue.enqueue(a);
  expect(queue.enqueue(a)).toBe(first);
  const second = queue.enqueue(b);
  const third = queue.enqueue(c);
  expect(pending).toHaveLength(2);
  finish(0);
  await first;
  expect(pending).toHaveLength(3);
  finish(1);
  finish(2);
  await Promise.all([second, third]);
  expect(getWishlist().every((i) => !!i.details)).toBe(true);
  queue.dispose();
});
test("does not restore removed items or repopulate cleared specifications", async () => {
  const queue = new CrawlQueue();
  const a = item("a"),
    b = item("b");
  [a, b].forEach(addItem);
  const first = queue.enqueue(a),
    second = queue.enqueue(b);
  removeItem(a.id);
  clearScrapedCache();
  finish(0);
  finish(1);
  await Promise.all([first, second]);
  expect(getWishlist()).toMatchObject([b]);
  expect(getWishlist()[0]!.details).toBeUndefined();
  queue.dispose();
});
test("does not persist empty specifications or error pages", async () => {
  const queue = new CrawlQueue();
  const a = item("a");
  addItem(a);
  const first = queue.enqueue(a);
  finish(0, 200, "<h1>Robot check</h1>");
  await first;
  expect(getWishlist()[0]!.details).toBeUndefined();
  const second = queue.enqueue(a);
  finish(1, 503);
  await second;
  expect(getWishlist()[0]!.details).toBeUndefined();
  queue.dispose();
});

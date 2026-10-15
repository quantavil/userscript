import { expect, test } from "vite-plus/test";
import { amazonId, getPriceHistoryUrl } from "../src/utils/urlCleaner";
import { currencyFor, groupPrices, sortItems } from "../src/core/pricing";
import type { WishlistItem } from "../src/core/types";
const item = (id: string, price: number, market = "in"): WishlistItem => ({
  id,
  price,
  title: id,
  platform: "Amazon",
  imageUrl: "",
  url: `https://www.amazon.${market}/dp/B012345678`,
});
test("retains legacy Indian ids and gives US ids a separate namespace", () => {
  expect(amazonId("B012345678", "www.amazon.in")).toBe("amz_B012345678");
  expect(amazonId("B012345678", "www.amazon.com")).toBe("amz_us_B012345678");
});
test.each([
  ["https://www.amazon.in/x/dp/B012345678/ref=abc?tag=x", "https://www.amazon.in/dp/B012345678"],
  ["https://www.amazon.com/gp/product/B012345678?ref=abc", "https://www.amazon.com/dp/B012345678"],
  [
    "https://www.flipkart.com/a/p/itm123?pid=MOB123&lid=ref",
    "https://www.flipkart.com/a/p/itm123?pid=MOB123",
  ],
])("encodes canonical history search %s", (url, canonical) =>
  expect(getPriceHistoryUrl(url)).toBe(
    `https://pricehistory.app/?search=${encodeURIComponent(canonical)}`,
  ),
);
test.each([
  "javascript:alert(1)",
  "http://www.amazon.in/dp/B012345678",
  "https://www.amazon.com.evil.test/dp/B012345678",
  "https://www.amazon.com/s?k=x",
  "https://user:password@www.amazon.com/dp/B012345678",
  "/dp/B012345678",
  "bad",
])("rejects invalid history URL %s", (url) => expect(getPriceHistoryUrl(url)).toBeNull());
test("groups price order, totals and averages without currency conversion", () => {
  const items = [item("us", 1, "com"), item("in-high", 100), item("in-low", 50)];
  expect(currencyFor(items[0]!.url)).toBe("USD");
  expect(sortItems(items, "priceLow").map((i) => i.id)).toEqual(["in-low", "in-high", "us"]);
  expect(groupPrices(items).map((g) => [g.currency, g.total, g.average, g.cheapest.id])).toEqual([
    ["INR", 150, 75, "in-low"],
    ["USD", 1, 1, "us"],
  ]);
});

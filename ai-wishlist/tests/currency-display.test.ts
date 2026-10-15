import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { AmazonAdapter } from "../src/adapters/Amazon";
import { getPdpProductInfo } from "../src/core/productPage";
import { initProductPageControls } from "../src/core/ui";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
let dispose: (() => void) | undefined;
beforeEach(() => {
  document.body.innerHTML = "";
  vi.stubGlobal("GM_getValue", (_key: string, f: unknown) => f);
});
afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});
const market = (host: string) =>
  vi.stubGlobal("location", {
    hostname: host,
    pathname: "/dp/B012345678",
    search: "",
    href: `https://${host}/dp/B012345678`,
  });
test.each([
  ["www.amazon.com", "₹1,999"],
  ["www.amazon.in", "$19.99"],
  ["www.amazon.com", "INR 1,999"],
  ["www.amazon.in", "USD 19.99"],
])("does not save %s listings displayed as %s", (host, price) => {
  market(host);
  document.body.innerHTML = `<div data-component-type="s-search-result" data-asin="B012345678"><h2><span>Product</span></h2><span class="a-price"><span class="a-offscreen">${price}</span></span></div>`;
  new AmazonAdapter().processCards();
  expect(document.querySelector(".aiw-heart-container")).toBeNull();
});
test.each([
  ["www.amazon.com", "$19.99", "amz_us_B012345678"],
  ["www.amazon.in", "₹1,999", "amz_B012345678"],
])("saves native currency listing on %s", (host, price, id) => {
  market(host);
  document.body.innerHTML = `<div data-component-type="s-search-result" data-asin="B012345678"><h2><span>Product</span></h2><span class="a-price"><span class="a-offscreen">${price}</span></span></div>`;
  new AmazonAdapter().processCards();
  expect(document.querySelector<HTMLElement>(".aiw-heart-container")?.dataset.wishlistId).toBe(id);
});
test.each([
  ["www.amazon.com", "₹1,999"],
  ["www.amazon.in", "$19.99"],
])("rejects PDP display currency mismatch on %s", (host, price) => {
  market(host);
  document.body.innerHTML = `<h1 id="productTitle">Product</h1><span class="priceToPay"><span class="a-offscreen">${price}</span></span>`;
  expect(getPdpProductInfo()).toBeNull();
});
test.each([
  ["www.amazon.com", "INR"],
  ["www.amazon.in", "USD"],
])("rejects JSON-LD currency mismatch on %s", (host, currency) => {
  market(host);
  document.body.innerHTML = `<script type="application/ld+json">{"@type":"Product","name":"Product","offers":{"price":1999,"priceCurrency":"${currency}"}}</script>`;
  expect(getPdpProductInfo()).toBeNull();
});
test("shows the floating PDP heart with the production stylesheet", () => {
  market("www.amazon.com");
  document.body.innerHTML =
    '<h1 id="productTitle">Product</h1><span class="priceToPay"><span class="a-offscreen">$19.99</span></span>';
  const style = document.createElement("style");
  style.textContent = readFileSync(resolve(import.meta.dirname, "../src/styles.css"), "utf8");
  document.head.appendChild(style);
  try {
    dispose = initProductPageControls();
    expect(getComputedStyle(document.querySelector(".aiw-pdp-controls button")!).display).toBe(
      "inline-flex",
    );
  } finally {
    style.remove();
  }
});

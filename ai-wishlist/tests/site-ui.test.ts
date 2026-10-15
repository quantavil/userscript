import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { getPdpProductInfo, getProductInfoFromSchema } from "../src/core/productPage";
import { initProductHearts, injectHeartUI } from "../src/core/ui";
import { subscribePage } from "../src/core/navigation";
let dispose: (() => void) | undefined;
beforeEach(() => {
  document.body.innerHTML = "";
  vi.stubGlobal("GM_getValue", (_key: string, f: unknown) => f);
  vi.stubGlobal("GM_setValue", vi.fn());
});
afterEach(() => {
  dispose?.();
  dispose = undefined;
  vi.unstubAllGlobals();
});
test("ignores malformed JSON-LD while reading later valid product schema", () => {
  document.body.innerHTML =
    '<script type="application/ld+json">{"@type":"Product", bad}</script><script type="application/ld+json">{"@graph":[{"@type":"Product","name":"Good","offers":{"price":5}}]}</script>';
  expect(getProductInfoFromSchema()).toMatchObject({ title: "Good", price: 5 });
});
test("PDP identity preserves Amazon US hostname and excludes nonproduct routes", () => {
  vi.stubGlobal("location", {
    hostname: "www.amazon.com",
    href: "https://www.amazon.com/dp/B012345678",
    pathname: "/dp/B012345678",
    search: "",
  });
  // getPdpProductInfo uses window.location, mirrored by Vitest jsdom globals.
  document.body.innerHTML =
    '<h1 id="productTitle">US product</h1><span class="priceToPay"><span class="a-offscreen">$19.99</span></span>';
  const product = getPdpProductInfo();
  expect(product?.id).toBe("amz_us_B012345678");
  expect(product?.url).toBe("https://www.amazon.com/dp/B012345678");
});
test("card hearts support keyboard activation and history anchors isolate host clicks without cancelling navigation", () => {
  dispose = initProductHearts();
  const container = document.createElement("div");
  document.body.appendChild(container);
  injectHeartUI(container, {
    id: "amz_B012345678",
    title: "Item",
    price: 1,
    url: "https://www.amazon.in/dp/B012345678",
    platform: "Amazon",
    imageUrl: "",
  });
  const heart = container.querySelector<HTMLElement>(".aiw-heart-container")!;
  expect(heart.getAttribute("aria-label")).toContain("Item");
  heart.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
  );
  expect(GM_setValue).toHaveBeenCalled();
  const host = vi.fn();
  document.addEventListener("click", host);
  const anchor = document.createElement("a");
  anchor.className = "aiw-history-link";
  anchor.dataset.aiwOwned = "";
  anchor.href = "https://pricehistory.app/";
  anchor.target = "_blank";
  container.appendChild(anchor);
  const event = new MouseEvent("click", { bubbles: true, cancelable: true });
  anchor.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
  expect(host).not.toHaveBeenCalled();
  document.removeEventListener("click", host);
});
test("page discovery ignores script-owned mutations and cleans up", async () => {
  const called = vi.fn();
  dispose = subscribePage(called);
  const initial = called.mock.calls.length;
  const root = document.createElement("div");
  root.dataset.aiwOwned = "";
  document.body.appendChild(root);
  root.appendChild(document.createElement("button"));
  await new Promise((resolve) => setTimeout(resolve, 140));
  expect(called).toHaveBeenCalledTimes(initial);
  const host = document.createElement("article");
  document.body.appendChild(host);
  await new Promise((resolve) => setTimeout(resolve, 140));
  expect(called).toHaveBeenCalledTimes(initial + 1);
  dispose();
  dispose = undefined;
  host.appendChild(document.createElement("span"));
  await new Promise((resolve) => setTimeout(resolve, 140));
  expect(called).toHaveBeenCalledTimes(initial + 1);
});

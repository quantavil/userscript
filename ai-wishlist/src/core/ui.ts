import type { WishlistItem } from "./types";
import { isInWishlist, addItem, removeItem } from "./wishlist";
import { HEART_PATH_D } from "./icons";
import { getSettings } from "./settings";
import { crawlProduct, disposeCrawler } from "./crawler";
import { getPdpProductInfo } from "./productPage";
import { subscribePage } from "./navigation";
import { getPriceHistoryUrl } from "../utils/urlCleaner";
export {
  parseAmazonDetails,
  parseFlipkartDetails,
  extractSpecsFromInitialState,
} from "./specifications";
const metadata = new WeakMap<HTMLElement, WishlistItem>();
function updateHeart(heart: HTMLElement, meta: WishlistItem) {
  const active = isInWishlist(meta.id);
  heart.classList.toggle("active", active);
  heart.setAttribute("aria-pressed", String(active));
  heart.setAttribute(
    "aria-label",
    `${active ? "Remove" : "Save"} ${meta.title} ${active ? "from" : "to"} wishlist`,
  );
}
function makeHeart(meta: WishlistItem): HTMLButtonElement {
  const heart = document.createElement("button");
  heart.type = "button";
  heart.className = "aiw-heart-container";
  heart.dataset.aiwOwned = "";
  heart.dataset.wishlistId = meta.id;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "18");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", HEART_PATH_D);
  svg.appendChild(path);
  heart.appendChild(svg);
  metadata.set(heart, meta);
  updateHeart(heart, meta);
  return heart;
}
export function injectHeartUI(container: HTMLElement, meta?: WishlistItem) {
  if (!meta?.id || container.closest("[data-aiw-owned]")) return;
  const existing = container.querySelector<HTMLElement>(".aiw-heart-container");
  if (existing?.dataset.wishlistId === meta.id) {
    metadata.set(existing, meta);
    updateHeart(existing, meta);
    return;
  }
  existing?.remove();
  if (getComputedStyle(container).position === "static")
    container.style.setProperty("position", "relative", "important");
  container.appendChild(makeHeart(meta));
}
export function initProductHearts(): () => void {
  const click = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest(".aiw-history-link[data-aiw-owned]")) {
      event.stopPropagation();
      return;
    }
    const heart = event.target.closest<HTMLElement>(".aiw-heart-container");
    const meta = heart && metadata.get(heart);
    if (!heart || !meta) return;
    event.stopPropagation();
    event.preventDefault();
    if (isInWishlist(meta.id)) {
      if (!removeItem(meta.id)) return;
    } else {
      if (!addItem(meta)) return;
      if (getSettings().autocrawl && !meta.details) void crawlProduct(meta);
    }
    updateHeart(heart, meta);
    heart.classList.remove("pop-anim");
    void heart.offsetWidth;
    heart.classList.add("pop-anim");
  };
  const keyboard = (event: KeyboardEvent) => {
    if (!(event.target instanceof Element) || !["Enter", " "].includes(event.key)) return;
    const heart = event.target.closest<HTMLButtonElement>(".aiw-heart-container");
    if (!heart || !metadata.has(heart)) return;
    event.preventDefault();
    event.stopPropagation();
    heart.click();
  };
  const refresh = () =>
    document.querySelectorAll<HTMLElement>(".aiw-heart-container").forEach((heart) => {
      const meta = metadata.get(heart);
      if (meta) updateHeart(heart, meta);
    });
  window.addEventListener("click", click, true);
  window.addEventListener("keydown", keyboard, true);
  window.addEventListener("wishlist-updated", refresh);
  return () => {
    window.removeEventListener("click", click, true);
    window.removeEventListener("keydown", keyboard, true);
    window.removeEventListener("wishlist-updated", refresh);
    disposeCrawler();
  };
}
/** Imperative controls remain independent of host-owned product DOM. */
export function initProductPageControls(): () => void {
  const controls = document.createElement("div");
  controls.className = "aiw-pdp-controls";
  controls.dataset.aiwOwned = "";
  document.body.appendChild(controls);
  let panelVisible = false;
  let signature = "";
  const update = () => {
    if (panelVisible) {
      controls.hidden = true;
      return;
    }
    const product = getPdpProductInfo();
    controls.hidden = !product;
    if (!product) return;
    const next = JSON.stringify(product);
    if (signature === next) return;
    signature = next;
    controls.replaceChildren();
    const heart = makeHeart(product);
    heart.classList.add("aiw-pdp-heart-floating");
    controls.appendChild(heart);
    const href = getPriceHistoryUrl(product.url);
    if (href) {
      const link = document.createElement("a");
      link.href = href;
      link.className = "aiw-history-link";
      link.dataset.aiwOwned = "";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", `Price history for ${product.title}`);
      link.title = "Price history on PriceHistory.app";
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("width", "18");
      svg.setAttribute("height", "18");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "2");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M3 3v18h18M6 16l5-6 4 3 6-8");
      svg.appendChild(path);
      link.appendChild(svg);
      controls.appendChild(link);
    }
  };
  const visibility = (event: Event) => {
    panelVisible = (event as CustomEvent<boolean>).detail;
    update();
  };
  window.addEventListener("aiw-panel-visibility", visibility);
  const unsubscribe = subscribePage(update);
  return () => {
    unsubscribe();
    window.removeEventListener("aiw-panel-visibility", visibility);
    controls.remove();
  };
}

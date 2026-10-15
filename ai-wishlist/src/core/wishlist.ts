import type { WishlistItem } from "./types";
import { WISHLIST_KEY, writeStored } from "./storage";
import { getPriceHistoryUrl } from "../utils/urlCleaner";
export function isWishlistItem(value: unknown): value is WishlistItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    !!item.id &&
    typeof item.title === "string" &&
    !!item.title.trim() &&
    typeof item.price === "number" &&
    Number.isFinite(item.price) &&
    item.price >= 0 &&
    typeof item.url === "string" &&
    getPriceHistoryUrl(item.url) !== null &&
    (item.platform === "Amazon" || item.platform === "Flipkart") &&
    typeof item.imageUrl === "string" &&
    (item.dateAdded === undefined ||
      (typeof item.dateAdded === "number" && Number.isFinite(item.dateAdded))) &&
    (item.details === undefined || typeof item.details === "string")
  );
}
export function getWishlist(): WishlistItem[] {
  try {
    const stored = GM_getValue(WISHLIST_KEY, []);
    if (!Array.isArray(stored)) return [];
    const seen = new Set<string>();
    return stored
      .filter(isWishlistItem)
      .filter((item) => !seen.has(item.id) && !!seen.add(item.id))
      .map((item) => ({ ...item }));
  } catch {
    return [];
  }
}
export function saveWishlist(items: WishlistItem[], _silent = false): boolean {
  return writeStored(WISHLIST_KEY, items, "wishlist-updated");
}
export function addItem(meta: WishlistItem): boolean {
  const items = getWishlist();
  if (items.some((item) => item.id === meta.id)) return true;
  return saveWishlist([...items, { ...meta, dateAdded: meta.dateAdded ?? Date.now() }]);
}
export function removeItem(id: string): boolean {
  return saveWishlist(getWishlist().filter((item) => item.id !== id));
}
export function clearWishlist(): boolean {
  return saveWishlist([]);
}
export function clearScrapedCache(): boolean {
  // Invalidate even a queued crawl that has not written specifications yet.
  window.dispatchEvent(new CustomEvent("scraped-cache-cleared"));
  return saveWishlist(getWishlist().map(({ details: _details, ...item }) => item));
}
export function isInWishlist(id: string): boolean {
  return getWishlist().some((item) => item.id === id);
}
export function updateItemDetails(id: string, details: string): boolean {
  const items = getWishlist();
  const item = items.find((item) => item.id === id);
  if (!item) return false;
  item.details = details;
  return saveWishlist(items);
}

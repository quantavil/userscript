import type { WishlistItem, ProductMeta } from './types';

const WISHLIST_KEY = 'priceStdz_wishlist';

export function getWishlist(): WishlistItem[] {
  return (GM_getValue(WISHLIST_KEY, []) as WishlistItem[]) || [];
}

export function saveWishlist(items: WishlistItem[]): void {
  GM_setValue(WISHLIST_KEY, items);
  window.dispatchEvent(new CustomEvent('wishlist-updated'));
}

export function addItem(meta: ProductMeta): void {
  const items = getWishlist();
  if (!items.some(i => i.id === meta.id)) {
    items.push(meta);
    saveWishlist(items);
  }
}

export function removeItem(id: string): void {
  const items = getWishlist().filter(i => i.id !== id);
  saveWishlist(items);
}

export function clearWishlist(): void {
  saveWishlist([]);
}

export function isInWishlist(id: string): boolean {
  return getWishlist().some(i => i.id === id);
}

import type { WishlistItem } from "./types";
export type Currency = "INR" | "USD";
export type SortKey = "dateAdded" | "priceLow" | "priceHigh" | "nameAz";
export function currencyFor(productUrl: string): Currency {
  try {
    return /^(www\.)?amazon\.com$/.test(new URL(productUrl).hostname) ? "USD" : "INR";
  } catch {
    return "INR";
  }
}
export function sortItems(items: WishlistItem[], sort: SortKey): WishlistItem[] {
  return [...items].sort((a, b) => {
    if (sort === "priceLow" || sort === "priceHigh")
      return (
        currencyFor(a.url).localeCompare(currencyFor(b.url)) ||
        (sort === "priceLow" ? a.price - b.price : b.price - a.price)
      );
    return sort === "nameAz"
      ? a.title.localeCompare(b.title)
      : (b.dateAdded ?? 0) - (a.dateAdded ?? 0);
  });
}
export function groupPrices(items: WishlistItem[]) {
  return (["INR", "USD"] as const).flatMap((currency) => {
    const group = items
      .filter((item) => currencyFor(item.url) === currency)
      .sort((a, b) => a.price - b.price);
    if (!group.length) return [];
    const total = group.reduce((sum, item) => sum + item.price, 0);
    return [
      {
        currency,
        items: group,
        total,
        average: total / group.length,
        cheapest: group[0]!,
        mostExpensive: group[group.length - 1]!,
      },
    ];
  });
}

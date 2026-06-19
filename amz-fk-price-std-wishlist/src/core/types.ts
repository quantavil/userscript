export interface ParsedData {
  totalValue: number;
  unit: string;
  itemCount: number;
}

export interface WeightExtract {
  val: number;
  unit: string;
}

export interface RateResult {
  text: string;
  isItemRate: boolean;
}

/** Unified type for wishlist items and product metadata.
 *  Previously split into identical WishlistItem and ProductMeta — merged for DRY. */
export interface WishlistItem {
  id: string;
  title: string;
  price: number;
  rateText: string;
  imageUrl: string;
  url: string;
  platform: string;
  rating: number | null;
  numRatings: number | null;
  /** Epoch ms when the item was added. Absent in legacy items saved before this field existed. */
  dateAdded?: number;
}

/** @deprecated Use WishlistItem directly. Kept as alias for adapter compatibility. */
export type ProductMeta = WishlistItem;

/** Unified type for wishlist items and product metadata.
 *  Previously split into identical WishlistItem and ProductMeta — merged for DRY. */
export interface WishlistItem {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  url: string;
  platform: string;
  /** Epoch ms when the item was added. Absent in legacy items saved before this field existed. */
  dateAdded?: number;
  /** Rich specification details fetched asynchronously from the product page for AI parsing. */
  details?: string;
}

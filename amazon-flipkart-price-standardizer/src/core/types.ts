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
}

export interface ProductMeta {
  id: string;
  title: string;
  price: number;
  rateText: string;
  imageUrl: string;
  url: string;
  platform: string;
  rating: number | null;
  numRatings: number | null;
}

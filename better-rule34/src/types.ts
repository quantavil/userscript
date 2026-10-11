/** The few facts the client-side filter needs from a card. `null` means "could not be read". */
export interface CardData {
  id: string;
  ratingPercent: number | null;
  viewsCount: number | null;
}

/** Client-side filters: only what the site itself does not offer. */
export interface FilterState {
  minRating: number;
  minViews: number;
}

import { readFavorites, type Favorite } from './model';
const KEY = 'better-icegate.favorites.v1';
export const loadFavorites = (): Favorite[] => readFavorites(localStorage.getItem(KEY));
export const saveFavorites = (items: Favorite[]): void => localStorage.setItem(KEY, JSON.stringify(items));
export const isFavoritesStorageEvent = (event: StorageEvent): boolean => event.key === KEY || event.key === null;

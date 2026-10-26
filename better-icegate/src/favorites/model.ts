export interface Favorite { id: string; label: string; url: string }

export const defaults: Favorite[] = [
  { id: 'esanchit', label: 'eSANCHIT', url: 'https://www.icegate.gov.in/esanchit/home' },
  { id: 'shipping-bill', label: 'Shipping Bill / SB', url: 'https://foservices.icegate.gov.in/#/e-copy?docType=SB' },
  { id: 'file-upload', label: 'Electronic Filing / File Upload', url: 'https://foservices.icegate.gov.in/#/role-dashboard/services/file-upload' },
];

function isFavorite(value: unknown): value is Favorite {
  if (!value || typeof value !== 'object') return false;
  const { id, label, url } = value as Record<string, unknown>;
  if (typeof id !== 'string' || !id || typeof label !== 'string' || !label.trim() || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && (parsed.hostname === 'foservices.icegate.gov.in' || parsed.hostname === 'www.icegate.gov.in');
  } catch { return false; }
}

export function readFavorites(raw: string | null): Favorite[] {
  if (raw === null) return [...defaults];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...defaults];
    return parsed.filter(isFavorite).filter((item, index, all) => all.findIndex(other => other.id === item.id || other.url === item.url) === index);
  } catch { return [...defaults]; }
}
export function addFavorite(items: Favorite[], item: Favorite): Favorite[] {
  return isFavorite(item) && !items.some(existing => existing.id === item.id || existing.url === item.url) ? [...items, item] : items;
}
export function removeFavorite(items: Favorite[], id: string): Favorite[] { return items.filter(item => item.id !== id); }

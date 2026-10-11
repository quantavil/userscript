import { isPaginationKey } from './routes';
import type { CardData, FilterState } from './types';

export const DEFAULT_FILTER: FilterState = {
  minRating: 0,
  minViews: 0,
};

/** Parses "116", "4.9K", "105K", "1.2M". Returns null when no number is found. */
export function parseViews(viewStr: string): number | null {
  if (!viewStr) return null;
  const match = /([\d.]+)\s*([KkMmBb])?/.exec(viewStr.replace(/,/g, '').trim());
  if (!match) return null;
  const num = parseFloat(match[1]);
  if (isNaN(num)) return null;
  const unit = match[2]?.toUpperCase();
  if (unit === 'K') return Math.round(num * 1_000);
  if (unit === 'M') return Math.round(num * 1_000_000);
  if (unit === 'B') return Math.round(num * 1_000_000_000);
  return Math.round(num);
}

/** Parses "100% (2)", "81% (666)", "89%" into a percent. Returns null when there is no percent. */
export function parseRatingPercent(ratingStr: string): number | null {
  const match = /(\d{1,3})\s*%/.exec(ratingStr ?? '');
  return match ? Math.min(100, parseInt(match[1], 10)) : null;
}

const AD_URL_PATTERNS = [
  '/v1/d.php',
  'sadbaguette',
  'ku34bh9la09',
  'traffic',
  'adserver',
  'juicy',
  'gentlefieldpattern',
  'trialhd',
  'exoclick',
];

/** True for sponsored cards: spot thumbs, iframes, "AD" headers, and ad-network links. */
export function isAdCard(el: HTMLElement): boolean {
  if (el.classList.contains('spot-thumb') || el.closest('.spots')) return true;
  if (el.querySelector('iframe')) return true;
  const header = el.querySelector('header');
  if (header && /^\s*(ad|ads|advert\w*|sponsor\w*)\s*$/i.test(header.textContent ?? '')) return true;
  const href = el.querySelector<HTMLAnchorElement>('a.th, a')?.getAttribute('href') || '';
  if (AD_URL_PATTERNS.some((pattern) => href.includes(pattern))) return true;
  if (/^https?:\/\//i.test(href)) {
    try {
      const u = new URL(href);
      if (!u.hostname.endsWith('rule34video.com') && !u.hostname.endsWith('rule34video.party')) {
        return true;
      }
    } catch {
      // ignore invalid URLs
    }
  }
  return false;
}

/** Extracts the numeric video id from a card href like "/video/12345/slug/". Returns '' when absent. */
export function videoIdFromHref(href: string): string {
  return /(?:video|videos)\/(\d+)/.exec(href || '')?.[1] ?? '';
}

/** The stable id of a card element, or '' when it has none. */
export function cardIdOf(el: HTMLElement): string {
  const href = el.querySelector<HTMLAnchorElement>('a.th, a[href*="/video/"]')?.getAttribute('href') || '';
  return el.dataset.videoCardId || videoIdFromHref(href);
}

/** Reads the id and the filterable numbers from a video card. Returns null for ads and unidentifiable cards. */
export function extractCardData(el: HTMLElement): CardData | null {
  if (isAdCard(el)) return null;
  const id = cardIdOf(el);
  if (!id) return null;
  const rating = el.querySelector('.video-card-meta__rating, .rating');
  const views = el.querySelector('.video-views-count, .views');
  return {
    id,
    ratingPercent: parseRatingPercent(rating?.textContent ?? ''),
    viewsCount: parseViews(views?.textContent?.trim() ?? ''),
  };
}

/**
 * True when the card passes the filters. A value that could not be read never hides a
 * card, so a markup change on the site cannot blank the whole list.
 */
export function matchesClientFilter(card: CardData, filter: FilterState): boolean {
  if (filter.minRating > 0 && card.ratingPercent !== null && card.ratingPercent < filter.minRating) return false;
  if (filter.minViews > 0 && card.viewsCount !== null && card.viewsCount < filter.minViews) return false;
  return true;
}

/**
 * Resolves a relative pagination link against the current page, carrying over filter
 * query params (`post_date_from`, `duration_from`, `q`, ...). Pagination/offset keys
 * (`from*`, `page`, `p`) are never carried: a stale offset would fetch the wrong page.
 */
export function resolveNextPageUrl(currentUrlStr: string, nextRawHref: string): string {
  try {
    const trimmedHref = nextRawHref.trim();
    if (!trimmedHref || trimmedHref.startsWith('#') || trimmedHref.startsWith('javascript:')) return '';

    const current = new URL(currentUrlStr);
    const next = new URL(trimmedHref, current.href);

    if (!next.search && current.search) {
      const carried = new URLSearchParams();
      current.searchParams.forEach((val, key) => {
        if (!isPaginationKey(key)) carried.append(key, val);
      });
      next.search = carried.toString();
    } else if (current.search && next.search) {
      current.searchParams.forEach((val, key) => {
        if (!isPaginationKey(key) && !next.searchParams.has(key)) next.searchParams.set(key, val);
      });
    }
    return next.toString();
  } catch {
    return nextRawHref;
  }
}

interface KvsParameters {
  fromParam: number | null;
  sortBy: string | null;
}

/** Parses a KVS `data-parameters` string like 'q:x;sort_by:post_date;from_videos+from_albums:2'. */
export function parseKvsParameters(dataParams: string): KvsParameters {
  const raw: Record<string, string> = {};
  for (const part of (dataParams || '').split(';')) {
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    const key = part.slice(0, colon).trim();
    if (key) raw[key] = part.slice(colon + 1).trim();
  }

  let fromParam: number | null = null;
  for (const key of Object.keys(raw)) {
    if (!/^from/i.test(key)) continue;
    const parsed = parseInt(raw[key], 10);
    if (!isNaN(parsed) && parsed > 0) {
      fromParam = parsed;
      break;
    }
  }
  return { fromParam, sortBy: raw['sort_by'] ? raw['sort_by'] : null };
}

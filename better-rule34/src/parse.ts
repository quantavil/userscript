import { isPaginationKey } from './routes';
import type { CardData, FilterState } from './types';

export const BASE_YEAR = 2018;

export const DEFAULT_FILTER: FilterState = {
  query: '',
  soundOnly: false,
  hdOnly: false,
  futaFilter: 'all',
  hideWatched: false,
  minRating: 0,
  minViews: 0,
  minYear: BASE_YEAR,
  durationMinSeconds: null,
};

/**
 * Parses duration strings like "3:20", "10:53", "1:15:30" into total seconds.
 */
export function parseDuration(timeStr: string): number {
  if (!timeStr) return 0;
  const cleaned = timeStr.trim().replace(/[^\d:]/g, '');
  if (!cleaned) return 0;
  const parts = cleaned.split(':').map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return 0;

  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

/**
 * Parses view strings like "116", "4.9K", "105K", "1.2M".
 */
export function parseViews(viewStr: string): number {
  if (!viewStr) return 0;
  const match = /([\d.]+)\s*([KkMmBb])?/.exec(viewStr.replace(/,/g, '').trim());
  if (!match) return 0;
  const num = parseFloat(match[1]);
  if (isNaN(num)) return 0;
  const unit = match[2]?.toUpperCase();
  if (unit === 'K') return Math.round(num * 1_000);
  if (unit === 'M') return Math.round(num * 1_000_000);
  if (unit === 'B') return Math.round(num * 1_000_000_000);
  return Math.round(num);
}

/**
 * Parses rating string like "100% (2)", "81% (666)", "89%".
 */
export function parseRating(ratingStr: string): { percent: number; count: number } {
  if (!ratingStr) return { percent: 0, count: 0 };
  const percentMatch = /(\d+)%/.exec(ratingStr);
  const countMatch = /\(([\d,]+)\)/.exec(ratingStr);
  const percent = percentMatch ? parseInt(percentMatch[1], 10) : 0;
  const count = countMatch ? parseInt(countMatch[1].replace(/,/g, ''), 10) : 0;
  return { percent, count };
}

/**
 * Parses submitted date or relative time string into an approximate 4-digit year.
 */
export function parseSubmittedYear(dateStr: string, currentYear = new Date().getFullYear()): number {
  if (!dateStr) return currentYear;
  const text = dateStr.toLowerCase().trim();

  // Explicit 4-digit year e.g. "2024-09-07", "Submitted: 2023", "May 2021"
  const explicitYearMatch = /\b(20[12]\d)\b/.exec(text);
  if (explicitYearMatch) {
    return parseInt(explicitYearMatch[1], 10);
  }

  // Relative "N year(s) ago"
  const yearsAgoMatch = /(\d+)\s+years?\s+ago/.exec(text);
  if (yearsAgoMatch) {
    const diff = parseInt(yearsAgoMatch[1], 10);
    return Math.max(BASE_YEAR, currentYear - diff);
  }

  // Relative months/days/hours/minutes ago all fall within currentYear or late last year
  const monthsAgoMatch = /(\d+)\s+months?\s+ago/.exec(text);
  if (monthsAgoMatch) {
    const months = parseInt(monthsAgoMatch[1], 10);
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d.getFullYear();
  }

  // "hours ago", "days ago", "weeks ago", "just now"
  return currentYear;
}

/**
 * Checks if a given item is an advertisement rather than a real video card.
 */
export function isAdCard(el: HTMLElement): boolean {
  if (el.classList.contains('spot-thumb') || el.closest('.spots')) return true;
  if (el.querySelector('iframe')) return true;
  const header = el.querySelector('header');
  if (header && /AD/i.test(header.textContent ?? '')) return true;
  const link = el.querySelector<HTMLAnchorElement>('a.th, a');
  if (link) {
    const href = link.getAttribute('href') || '';
    if (href.includes('/v1/d.php') || href.includes('sadbaguette') || href.includes('ku34bh9la09')) {
      return true;
    }
  }
  const hasVideoCardId = Boolean(el.dataset.videoCardId);
  const hasVideoHref = Boolean(el.querySelector('a[href*="/video/"]'));
  return !hasVideoCardId && !hasVideoHref;
}

/**
 * Extracts normalized CardData from a video DOM element.
 */
export function extractCardData(el: HTMLElement): CardData | null {
  if (isAdCard(el)) return null;

  const cardLink = el.querySelector<HTMLAnchorElement>('a.th, a[href*="/video/"]');
  const href = cardLink?.getAttribute('href') || '';
  const id = el.dataset.videoCardId || videoIdFromHref(href) || '';
  // Guard: never fabricate a homepage URL for unidentifiable cards.
  // Callers treat null as "skip, do not manage".
  if (!id || !href) return null;

  const titleEl = el.querySelector('.thumb_title');
  const title = titleEl?.textContent?.trim() || cardLink?.getAttribute('title')?.trim() || '';

  const imgEl = el.querySelector<HTMLImageElement>('img.thumb, img');
  const thumbUrl =
    imgEl?.getAttribute('data-webp') ||
    imgEl?.getAttribute('data-original') ||
    imgEl?.src ||
    '';

  const previewWrap = el.querySelector<HTMLElement>('.wrap_image');
  const previewUrl = previewWrap?.dataset.preview || previewWrap?.getAttribute('data-preview') || null;

  const timeEl = el.querySelector('.time');
  const durationFormatted = timeEl?.textContent?.trim() || '';
  const durationSeconds = parseDuration(durationFormatted);

  const ratingEl = el.querySelector('.video-card-meta__rating') || el.querySelector('.rating');
  const { percent: ratingPercent, count: votesCount } = parseRating(ratingEl?.textContent ?? '');

  const viewsEl = el.querySelector('.video-views-count') || el.querySelector('.views');
  const viewsFormatted = viewsEl?.textContent?.trim() || '';
  const viewsCount = parseViews(viewsFormatted);

  const commentsEl = el.querySelector('.video-comments-count');
  const commentsCount = parseInt(commentsEl?.textContent?.trim() || '0', 10) || 0;

  const hasSound = el.querySelector('.sound') !== null;
  const isHd = el.querySelector('.quality') !== null || el.querySelector('.custom-hd') !== null;
  const isFuta = el.querySelector('.futa') !== null;
  const isWatched =
    previewWrap?.classList.contains('watched') ||
    el.classList.contains('watched') ||
    Boolean(el.querySelector('.watched'));

  const dateEl = el.querySelector('.video-card-meta__date') || el.querySelector('.added');
  const submittedAgo = dateEl?.getAttribute('title') || dateEl?.textContent?.trim() || '';
  const submittedYear = parseSubmittedYear(submittedAgo);

  return {
    id,
    title,
    url: href.startsWith('http') ? href : new URL(href, 'https://rule34video.com').href,
    previewUrl,
    thumbUrl,
    durationSeconds,
    durationFormatted,
    ratingPercent,
    votesCount,
    viewsCount,
    viewsFormatted,
    commentsCount,
    hasSound,
    isHd,
    isFuta,
    isWatched,
    submittedAgo,
    submittedYear,
  };
}

/**
 * Extracts the numeric video id from a card href like "/video/12345/slug/".
 * Returns '' when no id is present.
 */
export function videoIdFromHref(href: string): string {
  if (!href) return '';
  const m = /video\/(\d+)/.exec(href);
  return m?.[1] || '';
}

/**
 * Maps an arbitrary saved views threshold to the nearest slider step index.
 * Unknown values snap to the closest step instead of resetting to 0,
 * so settings saved by older/newer step tables survive migrations.
 */
export function viewsToNearestStep(views: number, steps: readonly number[]): number {
  if (!steps.length) return 0;
  let best = 0;
  let bestDist = Math.abs(views - steps[0]);
  for (let i = 1; i < steps.length; i++) {
    const d = Math.abs(views - steps[i]);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/**
 * Checks if a card satisfies the client-side active filters.
 */
export function matchesClientFilter(card: CardData, filter: FilterState): boolean {
  // Title search
  if (filter.query.trim()) {
    const keywords = filter.query.toLowerCase().trim().split(/\s+/);
    const titleLower = card.title.toLowerCase();
    for (const kw of keywords) {
      if (!titleLower.includes(kw)) return false;
    }
  }

  // Sound only
  if (filter.soundOnly && !card.hasSound) return false;

  // HD only
  if (filter.hdOnly && !card.isHd) return false;

  // Futa filter
  if (filter.futaFilter === 'hide' && card.isFuta) return false;
  if (filter.futaFilter === 'only' && !card.isFuta) return false;

  // Hide watched
  if (filter.hideWatched && card.isWatched) return false;

  // Rating slider (0 to 100%)
  if (filter.minRating > 0 && card.ratingPercent < filter.minRating) return false;

  // Views slider (0 to 100K+)
  if (filter.minViews > 0 && card.viewsCount < filter.minViews) return false;

  // Year slider (2018 to 2026)
  if (filter.minYear > BASE_YEAR && card.submittedYear < filter.minYear) return false;

  // Duration bounds (minimum seconds)
  if (filter.durationMinSeconds !== null && card.durationSeconds < filter.durationMinSeconds) {
    return false;
  }

  return true;
}

/**
 * Preserves existing URL filter parameters when following relative pagination
 * links. Pagination/offset keys (`from*`, `page`, `p`) are never carried over —
 * the next URL already encodes its own position, so a stale offset would fetch
 * the wrong page. Filter keys (`post_date_from`, `duration_from`, `q`, ...) pass
 * through untouched.
 */
export function resolveNextPageUrl(currentUrlStr: string, nextRawHref: string): string {
  try {
    const trimmedHref = nextRawHref.trim();
    if (!trimmedHref || trimmedHref.startsWith('#') || trimmedHref.startsWith('javascript:')) {
      return '';
    }

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
        if (!isPaginationKey(key) && !next.searchParams.has(key)) {
          next.searchParams.set(key, val);
        }
      });
    }
    return next.toString();
  } catch {
    return nextRawHref;
  }
}

/**
 * Reads initial filter state from current page URL if present.
 * Compat path for the native server-side filter panel (post_date_from,
 * duration_from). The floating console itself is client-side only and never
 * writes these params; this only seeds sliders when arriving with a native
 * filtered URL (e.g. shared link).
 */
export function parseCurrentUrlFilters(urlStr: string): Partial<FilterState> {
  try {
    const url = new URL(urlStr);
    const params = url.searchParams;
    const result: Partial<FilterState> = {};

    const fromDate = params.get('post_date_from');
    if (fromDate) {
      const yrMatch = /^(\d{4})/.exec(fromDate);
      if (yrMatch) {
        result.minYear = Math.max(BASE_YEAR, parseInt(yrMatch[1], 10));
      }
    }

    const fromDur = params.get('duration_from');
    if (fromDur && !isNaN(parseInt(fromDur, 10))) {
      result.durationMinSeconds = parseInt(fromDur, 10);
    }

    return result;
  } catch {
    return {};
  }
}

export interface KvsParameters {
  fromParam: number | null;
  sortBy: string | null;
  query: string | null;
  tagIds: string | null;
  raw: Record<string, string>;
}

/**
 * Parses KVS CMS data-parameters attribute strings (e.g. 'q:overwatch;sort_by:post_date;from_videos+from_albums:2').
 */
export function parseKvsParameters(dataParams: string): KvsParameters {
  const raw: Record<string, string> = {};
  if (!dataParams) {
    return { fromParam: null, sortBy: null, query: null, tagIds: null, raw };
  }

  const parts = dataParams.split(';');
  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx !== -1) {
      const key = part.slice(0, colonIdx).trim();
      const val = part.slice(colonIdx + 1).trim();
      if (key) {
        raw[key] = val;
      }
    }
  }

  let fromParam: number | null = null;
  for (const k of Object.keys(raw)) {
    if (/(?:from_videos(?:\+| )from_albums|from_videos|from_albums|from)/i.test(k)) {
      const parsed = parseInt(raw[k], 10);
      if (!isNaN(parsed) && parsed > 0) {
        fromParam = parsed;
        break;
      }
    }
  }

  const sortBy = raw['sort_by'] !== undefined && raw['sort_by'] !== '' ? raw['sort_by'] : null;
  const query = raw['q'] !== undefined && raw['q'] !== '' ? raw['q'] : null;
  const tagIds = raw['tag_ids'] !== undefined && raw['tag_ids'] !== '' ? raw['tag_ids'] : null;

  return { fromParam, sortBy, query, tagIds, raw };
}


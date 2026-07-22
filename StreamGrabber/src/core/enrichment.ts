import PQueue from 'p-queue';
import type { MediaItem, Variant } from '../types';
import { CFG } from '../config';
import { getText } from './network';
import {
  parseManifest,
  calcDuration,
  computeExactBytes,
  isFmp4,
  hasEncryption,
} from './parser';
import {
  extractResFromUrl,
  sortVariantsByQuality,
  buildLabel,
  buildSublabel,
} from '../utils';

// ============================================
// Enrichment Queue
// ============================================

// Queue for enrichment tasks
const queue = new PQueue({ concurrency: 2 });

// Track URLs that are currently in the queue to avoid duplicates
const pendingUrls = new Set<string>();

// ============================================
// Single Item Enrichment
// ============================================

/**
 * Analyzes a media playlist (variants or direct streams)
 */
export async function analyzeMediaPlaylist(
  url: string,
  text?: string,
  variant?: Variant,
  signal?: AbortSignal
): Promise<Partial<MediaItem>> {
  const txt = text ?? (await getText(url, signal));
  const man = parseManifest(txt, url);

  if (man.isMaster && man.variants) {
    const sorted = sortVariantsByQuality(man.variants);
    const best = sorted[0];
    const count = man.variants.length;

    const qualityText = count === 1 ? 'quality' : 'qualities';
    const parts: string[] = [`${count} ${qualityText}`];

    if (best?.res) {
      parts.push(`up to ${best.res}`);
    } else if (best?.h) {
      parts.push(`up to ${best.h}p`);
    }

    return {
      label: parts.join(' • '),
      hlsType: 'master',
      variantCount: count,
      variants: man.variants,
      bestVariant: best,
      enriched: true,
    };
  }

  if (man.segments && man.segments.length > 0) {
    const segs = man.segments;
    const segCount = segs.length;
    const duration = calcDuration(segs);
    const isVod = man.endList ?? false;

    const exactBytes = computeExactBytes({
      segs,
      mediaSeq: man.mediaSeq ?? 0,
      endList: isVod,
    });

    const res = variant?.res ?? extractResFromUrl(url);
    const fmp4 = isFmp4(segs);
    const encrypted = hasEncryption(segs);

    const label = buildLabel({
      resolution: res,
      duration,
      size: exactBytes,
    });

    return {
      label,
      sublabel: buildSublabel(segCount, fmp4),
      hlsType: 'media',
      duration,
      segCount,
      resolution: res,
      isVod,
      isFmp4: fmp4,
      encrypted,
      isLive: !isVod,
      size: exactBytes ?? null,
      enriched: true,
    };
  }

  return {
    label: 'Empty or Invalid',
    hlsType: 'invalid',
    enriched: true,
  };
}

async function performEnrichment(item: MediaItem, signal?: AbortSignal): Promise<boolean> {
  try {
    const data = await analyzeMediaPlaylist(item.url, undefined, undefined, signal);
    Object.assign(item, data);
    return true;
  } catch (e) {
    console.error('[SG] Enrichment failed:', e);
    item.label = 'Parse Error';
    item.hlsType = 'error';
    item.enriched = true;
    return false;
  }
}

async function enrichItem(item: MediaItem): Promise<boolean> {
  if (!item || item.enriched || item.enriching) return false;

  item.enriching = true;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CFG.ENRICH_TIMEOUT);

  try {
    item._enrichPromise = performEnrichment(item, controller.signal);
    await item._enrichPromise;
    clearTimeout(timeoutId);
    return true;
  } catch (e) {
    clearTimeout(timeoutId);
    const error = e as Error;
    const isAbort = error.message === 'Aborted' || error.name === 'AbortError';
    console.error(`[SG] enrichItem error: ${error.message}`);

    item.label = isAbort ? 'Timeout' : 'Parse Error';
    item.hlsType = 'error';
    item.enriched = true;
    return false;
  } finally {
    item.enriching = false;
    item._enrichPromise = null;
  }
}

// ============================================
// Public API
// ============================================

/**
 * Queue a URL for enrichment
 */
export function queueEnrich(item: MediaItem, onComplete?: () => void): void {
  if (pendingUrls.has(item.url)) return;

  pendingUrls.add(item.url);

  queue.add(async () => {
    try {
      if (item && item.kind === 'hls' && !item.enriched) {
        await enrichItem(item);
        onComplete?.();
      }
    } finally {
      pendingUrls.delete(item.url);
    }
  });
}

/**
 * Immediately enrich an item (for download flow)
 */
export async function enrichNow(item: MediaItem): Promise<boolean> {
  // If explicitly requested, ensure it's not pending nicely 
  // Check if already in progress

  if (item._enrichPromise) {
    await item._enrichPromise;
    return item.enriched && item.hlsType !== 'error' && item.hlsType !== 'invalid';
  }
  return enrichItem(item);
}

/**
 * Check if item needs enrichment
 */
export function needsEnrichment(item: MediaItem): boolean {
  return item.kind === 'hls' && !item.enriched && !item.enriching;
}
import PQueue from 'p-queue';
import type { MediaItem } from '../types';
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

// Simple callback storage (no complex holder needed)
let _onEnrichComplete: () => void = () => { };
let _getItemFn: (url: string) => MediaItem | undefined = () => undefined;

export function setEnrichCallback(cb: () => void): void {
  _onEnrichComplete = cb;
}

export function setGetItemFn(fn: (url: string) => MediaItem | undefined): void {
  _getItemFn = fn;
}

// ============================================
// Single Item Enrichment
// ============================================

async function performEnrichment(item: MediaItem): Promise<boolean> {
  const txt = await getText(item.url);
  const man = parseManifest(txt, item.url);

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

    item.label = parts.join(' • ');
    item.hlsType = 'master';
    item.variantCount = count;
    item.variants = man.variants;
    item.bestVariant = best;
  } else if (man.segments && man.segments.length > 0) {
    const segs = man.segments;
    const segCount = segs.length;
    const duration = calcDuration(segs);
    const isVod = man.endList ?? false;

    const exactBytes = computeExactBytes({
      segs,
      mediaSeq: man.mediaSeq ?? 0,
      endList: isVod,
    });

    const res = extractResFromUrl(item.url);
    const fmp4 = isFmp4(segs);
    const encrypted = hasEncryption(segs);

    item.label = buildLabel({
      resolution: res,
      duration,
      size: exactBytes,
    });

    item.sublabel = buildSublabel(segCount, fmp4);
    item.hlsType = 'media';
    item.duration = duration;
    item.segCount = segCount;
    item.resolution = res;
    item.isVod = isVod;
    item.isFmp4 = fmp4;
    item.encrypted = encrypted;
    item.isLive = !isVod;

    if (exactBytes != null) {
      item.size = exactBytes;
    }
  } else {
    item.label = 'Empty or Invalid';
    item.hlsType = 'invalid';
  }

  item.enriched = true;
  return true;
}

async function enrichItem(item: MediaItem): Promise<boolean> {
  if (!item || item.enriched || item.enriching) return false;

  item.enriching = true;

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), CFG.ENRICH_TIMEOUT)
  );

  try {
    item._enrichPromise = Promise.race([
      performEnrichment(item),
      timeout,
    ]) as Promise<boolean>;

    await item._enrichPromise;
    return true;
  } catch (e) {
    const error = e as Error;
    console.error('[SG] enrichItem error:', error);

    item.label = error.message === 'Timeout' ? 'Timeout' : 'Parse Error';
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
export function queueEnrich(url: string): void {
  if (pendingUrls.has(url)) return;

  pendingUrls.add(url);

  queue.add(async () => {
    try {
      const item = _getItemFn(url);
      if (item && item.kind === 'hls' && !item.enriched) {
        await enrichItem(item);
        _onEnrichComplete();
      }
    } finally {
      pendingUrls.delete(url);
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
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
import { formatBytes, formatDuration, extractResFromUrl } from '../utils';

// ============================================
// Enrichment Queue
// ============================================

const enrichQueue = new Set<string>();
let enrichRunning = false;
let enrichTimeout: ReturnType<typeof setTimeout> | null = null;

type EnrichCallback = () => void;
type GetItemFn = (url: string) => MediaItem | undefined;

let onEnrichComplete: EnrichCallback = () => {};
let getItemFn: GetItemFn = () => undefined;

export function setEnrichCallback(cb: EnrichCallback): void {
  onEnrichComplete = cb;
}

export function setGetItemFn(fn: GetItemFn): void {
  getItemFn = fn;
}

// ============================================
// Single Item Enrichment
// ============================================

async function performEnrichment(item: MediaItem): Promise<void> {
  const txt = await getText(item.url);
  const man = parseManifest(txt, item.url);
  
  if (man.isMaster && man.variants) {
    // Master playlist
    const variants = man.variants;
    const sorted = [...variants].sort(
      (a, b) => (b.h || 0) - (a.h || 0) || (b.avg || b.peak || 0) - (a.avg || a.peak || 0)
    );
    const best = sorted[0];
    const count = variants.length;
    
    const parts: string[] = [];
    parts.push(`${count} ${count === 1 ? 'quality' : 'qualities'}`);
    if (best?.res) {
      parts.push(`up to ${best.res}`);
    } else if (best?.h) {
      parts.push(`up to ${best.h}p`);
    }
    
    item.label = parts.join(' • ');
    item.hlsType = 'master';
    item.variantCount = count;
    item.variants = variants;
    item.bestVariant = best;
  } else if (man.segments && man.segments.length > 0) {
    // Media playlist
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
    const format = fmp4 ? 'fMP4' : 'TS';
    const encrypted = hasEncryption(segs);
    
    const parts: string[] = [];
    if (res) parts.push(res);
    if (duration > 0) {
      const dur = formatDuration(duration);
      if (dur) parts.push(dur);
    }
    if (exactBytes != null) {
      parts.push(`~${formatBytes(exactBytes)}`);
      item.size = exactBytes;
    }
    
    item.label = parts.length > 0 ? parts.join(' • ') : 'Video Stream';
    item.sublabel = `${segCount} segments • ${format}`;
    item.hlsType = 'media';
    item.duration = duration;
    item.segCount = segCount;
    item.resolution = res;
    item.isVod = isVod;
    item.isFmp4 = fmp4;
    item.encrypted = encrypted;
    item.isLive = !isVod;
  } else {
    // Invalid/empty playlist
    item.label = 'Empty or Invalid';
    item.hlsType = 'invalid';
  }
  
  item.enriched = true;
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
// Queue Processing
// ============================================

async function processQueue(): Promise<void> {
  if (enrichRunning) return;
  enrichRunning = true;
  
  try {
    while (enrichQueue.size > 0) {
      const url = enrichQueue.values().next().value;
      if (url === undefined) break;
      
      enrichQueue.delete(url);
      
      const item = getItemFn(url);
      
      if (item && item.kind === 'hls' && !item.enriched) {
        await enrichItem(item);
        onEnrichComplete();
      }
    }
  } finally {
    enrichRunning = false;
  }
}

// ============================================
// Public API
// ============================================

/**
 * Queue a URL for enrichment
 */
export function queueEnrich(url: string): void {
  enrichQueue.add(url);
  
  if (enrichTimeout) clearTimeout(enrichTimeout);
  enrichTimeout = setTimeout(processQueue, CFG.ENRICH_DELAY);
}

/**
 * Immediately enrich an item (for download flow)
 */
export async function enrichNow(item: MediaItem): Promise<boolean> {
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
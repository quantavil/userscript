import { parse, types } from 'hls-parser';
import type { Variant, Segment, SegmentKey, SegmentMap, ParsedMedia } from '../types';
import { safeAbsUrl, parseRange } from '../utils';

// ============================================
// Manifest Parsing
// ============================================

export interface ParsedManifest {
  isMaster: boolean;
  // Master playlist data
  variants?: Variant[];
  // Media playlist data
  segments?: Segment[];
  mediaSeq?: number;
  endList?: boolean;
  targetDuration?: number;
}

/**
 * Parse HLS manifest text
 */
export function parseManifest(text: string, baseUrl: string): ParsedManifest {
  const manifest = parse(text);
  
  if (manifest.isMasterPlaylist) {
    return {
      isMaster: true,
      variants: buildVariants(manifest as types.MasterPlaylist, baseUrl),
    };
  }
  
  const media = manifest as types.MediaPlaylist;
  const parsed = buildMedia(media, baseUrl);
  
  return {
    isMaster: false,
    segments: parsed.segs,
    mediaSeq: parsed.mediaSeq,
    endList: parsed.endList,
    targetDuration: media.targetDuration,
  };
}

// ============================================
// Variant Building (Master Playlist)
// ============================================

function buildVariants(master: types.MasterPlaylist, baseUrl: string): Variant[] {
  const out: Variant[] = [];
  
  for (const v of master.variants) {
    if (!v.uri) continue;
    
    const res = v.resolution;
    const w = res?.width ?? null;
    const h = res?.height ?? null;
    
    out.push({
      url: safeAbsUrl(v.uri, baseUrl),
      res: w && h ? `${w}x${h}` : null,
      w,
      h,
      peak: v.bandwidth ?? null,
      avg: v.averageBandwidth ?? null,
      codecs: v.codecs ?? null,
    });
  }
  
  return out;
}

// ============================================
// Segment Building (Media Playlist)
// ============================================

interface ByterangeResult {
  header: string | null;
  next: number;
}

function rangeHeaderFromByterange(
  br: types.Byterange | undefined,
  fallbackStart: number
): ByterangeResult {
  if (!br || typeof br.length !== 'number') {
    return { header: null, next: fallbackStart };
  }
  
  const start = typeof br.offset === 'number' ? br.offset : fallbackStart;
  const end = start + br.length - 1;
  
  return {
    header: `bytes=${start}-${end}`,
    next: end + 1,
  };
}

function buildMedia(media: types.MediaPlaylist, baseUrl: string): ParsedMedia {
  const segs: Segment[] = [];
  let lastNext = 0;
  let prevMapSig: string | null = null;
  
  for (let i = 0; i < media.segments.length; i++) {
    const s = media.segments[i];
    
    // Handle byterange
    let rangeHeader: string | null = null;
    if (s.byterange) {
      const r = rangeHeaderFromByterange(s.byterange, lastNext);
      rangeHeader = r.header;
      lastNext = r.next;
    } else {
      lastNext = 0;
    }
    
    // Handle init segment (fMP4)
    let map: SegmentMap | null = null;
    let needMap = false;
    
    if (s.map?.uri) {
      const mapUri = safeAbsUrl(s.map.uri, baseUrl);
      let mRange: string | null = null;
      
      if (s.map.byterange) {
        const mr = rangeHeaderFromByterange(s.map.byterange, 0);
        mRange = mr.header;
      }
      
      map = { uri: mapUri, rangeHeader: mRange };
      
      // Only include map if it changed
      const sig = `${mapUri}|${mRange || ''}`;
      needMap = sig !== prevMapSig;
      if (needMap) prevMapSig = sig;
    }
    
    // Handle encryption key
    let key: SegmentKey | null = null;
    if (s.key?.method && s.key.method !== 'NONE') {
      key = {
        method: String(s.key.method).toUpperCase(),
        uri: s.key.uri ? safeAbsUrl(s.key.uri, baseUrl) : null,
        iv: s.key.iv?.toString() ?? null,
      };
    }
    
    segs.push({
      uri: safeAbsUrl(s.uri, baseUrl),
      dur: s.duration || 0,
      range: rangeHeader,
      key,
      map,
      needMap,
    });
  }
  
  return {
    segs,
    mediaSeq: media.mediaSequenceBase || 0,
    endList: media.endlist ?? false,
  };
}

// ============================================
// Size Estimation
// ============================================

export interface SizeEstimate {
  bytes: number | null;
  seconds: number;
  vod: boolean;
  via: 'byterange' | 'avg-bw' | 'unknown';
}

/**
 * Compute exact size from byterange segments
 */
export function computeExactBytes(parsed: ParsedMedia): number | null {
  let exact = true;
  let total = 0;
  const seenInit = new Set<string>();
  
  for (const s of parsed.segs) {
    if (s.range) {
      const r = parseRange(s.range);
      if (!r || r.end == null) {
        exact = false;
      } else {
        total += r.end - r.start + 1;
      }
    } else {
      exact = false;
    }
    
    // Count init segments
    if (s.needMap && s.map) {
      if (s.map.rangeHeader) {
        const key = `${s.map.uri}|${s.map.rangeHeader}`;
        if (!seenInit.has(key)) {
          seenInit.add(key);
          const mr = parseRange(s.map.rangeHeader);
          if (!mr || mr.end == null) {
            exact = false;
          } else {
            total += mr.end - mr.start + 1;
          }
        }
      } else {
        exact = false;
      }
    }
  }
  
  return exact ? total : null;
}

/**
 * Estimate HLS size from manifest
 */
export function estimateHlsSize(
  parsed: ParsedMedia,
  totalDuration: number,
  variant: Variant | null
): SizeEstimate {
  const vod = parsed.endList;
  
  // Try exact byterange calculation
  const exactBytes = computeExactBytes(parsed);
  if (exactBytes != null) {
    return { bytes: exactBytes, seconds: totalDuration, vod, via: 'byterange' };
  }
  
  // Fall back to bandwidth estimation
  const bw = variant?.avg ?? variant?.peak ?? null;
  if (vod && bw && totalDuration > 0) {
    return {
      bytes: Math.round((bw / 8) * totalDuration),
      seconds: totalDuration,
      vod,
      via: 'avg-bw',
    };
  }
  
  return { bytes: null, seconds: totalDuration, vod, via: 'unknown' };
}

/**
 * Calculate total duration from segments
 */
export function calcDuration(segments: Segment[]): number {
  return segments.reduce((sum, s) => sum + s.dur, 0);
}

/**
 * Check if segments use fMP4 format
 */
export function isFmp4(segments: Segment[]): boolean {
  if (segments.length === 0) return false;
  return segments.some(s => s.map) || /\.m4s(\?|$)/i.test(segments[0].uri);
}

/**
 * Check if any segment is encrypted
 */
export function hasEncryption(segments: Segment[]): boolean {
  return segments.some(s => s.key?.method === 'AES-128');
}
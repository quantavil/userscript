import { describe, it, expect } from 'vitest';
import {
  parseManifest,
  calcDuration,
  computeExactBytes,
  isFmp4,
  hasEncryption,
} from '../src/core/parser';

const MASTER_MANIFEST = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=1280x720
720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1920x1080
1080p.m3u8`;

const MEDIA_MANIFEST = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:10.0,
segment0.ts
#EXTINF:10.0,
segment1.ts
#EXTINF:8.5,
segment2.ts
#EXT-X-ENDLIST`;

const FMP4_MANIFEST = `#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-MAP:URI="init.mp4"
#EXTINF:6.0,
seg0.m4s
#EXTINF:6.0,
seg1.m4s
#EXT-X-ENDLIST`;

const BYTERANGE_MANIFEST = `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-MAP:URI="video.mp4",BYTERANGE="1000@0"
#EXTINF:10.0,
#EXT-X-BYTERANGE:50000@1000
video.mp4
#EXTINF:10.0,
#EXT-X-BYTERANGE:50000@51000
video.mp4
#EXT-X-ENDLIST`;

const ENCRYPTED_MANIFEST = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-KEY:METHOD=AES-128,URI="key.bin"
#EXTINF:10.0,
segment0.ts
#EXTINF:10.0,
segment1.ts
#EXT-X-ENDLIST`;

describe('parseManifest', () => {
  it('parses master playlist', () => {
    const result = parseManifest(MASTER_MANIFEST, 'https://cdn.com/');
    
    expect(result.isMaster).toBe(true);
    expect(result.variants).toHaveLength(3);
    
    expect(result.variants![0]).toMatchObject({
      url: 'https://cdn.com/360p.m3u8',
      res: '640x360',
      w: 640,
      h: 360,
      peak: 800000,
    });
    
    expect(result.variants![2]).toMatchObject({
      url: 'https://cdn.com/1080p.m3u8',
      res: '1920x1080',
      w: 1920,
      h: 1080,
      peak: 2800000,
    });
  });
  
  it('parses media playlist', () => {
    const result = parseManifest(MEDIA_MANIFEST, 'https://cdn.com/');
    
    expect(result.isMaster).toBe(false);
    expect(result.segments).toHaveLength(3);
    expect(result.endList).toBe(true);
    expect(result.mediaSeq).toBe(0);
    
    expect(result.segments![0]).toMatchObject({
      uri: 'https://cdn.com/segment0.ts',
      dur: 10,
    });
  });
  
  it('parses fMP4 playlist with init segment', () => {
    const result = parseManifest(FMP4_MANIFEST, 'https://cdn.com/');
    
    expect(result.isMaster).toBe(false);
    expect(result.segments).toHaveLength(2);
    
    // First segment should have map with needMap=true
    expect(result.segments![0].map).toMatchObject({
      uri: 'https://cdn.com/init.mp4',
    });
    expect(result.segments![0].needMap).toBe(true);
    
    // Second segment same init, needMap=false
    expect(result.segments![1].needMap).toBe(false);
  });
  
  it('parses encrypted playlist', () => {
    const result = parseManifest(ENCRYPTED_MANIFEST, 'https://cdn.com/');
    
    expect(result.segments![0].key).toMatchObject({
      method: 'AES-128',
      uri: 'https://cdn.com/key.bin',
    });
  });
});

describe('calcDuration', () => {
  it('sums segment durations', () => {
    const result = parseManifest(MEDIA_MANIFEST, 'https://cdn.com/');
    const duration = calcDuration(result.segments!);
    
    expect(duration).toBe(28.5);
  });
});

describe('computeExactBytes', () => {
  it('computes exact size for byterange playlist', () => {
    const result = parseManifest(BYTERANGE_MANIFEST, 'https://cdn.com/');
    const parsed = {
      segs: result.segments!,
      mediaSeq: result.mediaSeq!,
      endList: result.endList!,
    };
    
    const bytes = computeExactBytes(parsed);
    // Init: 1000 bytes + seg0: 50000 + seg1: 50000 = 101000
    expect(bytes).toBe(101000);
  });
  
  it('returns null for non-byterange playlist', () => {
    const result = parseManifest(MEDIA_MANIFEST, 'https://cdn.com/');
    const parsed = {
      segs: result.segments!,
      mediaSeq: result.mediaSeq!,
      endList: result.endList!,
    };
    
    const bytes = computeExactBytes(parsed);
    expect(bytes).toBe(null);
  });
});

describe('isFmp4', () => {
  it('detects fMP4 format', () => {
    const result = parseManifest(FMP4_MANIFEST, 'https://cdn.com/');
    expect(isFmp4(result.segments!)).toBe(true);
  });
  
  it('detects TS format', () => {
    const result = parseManifest(MEDIA_MANIFEST, 'https://cdn.com/');
    expect(isFmp4(result.segments!)).toBe(false);
  });
});

describe('hasEncryption', () => {
  it('detects encrypted content', () => {
    const result = parseManifest(ENCRYPTED_MANIFEST, 'https://cdn.com/');
    expect(hasEncryption(result.segments!)).toBe(true);
  });
  
  it('detects unencrypted content', () => {
    const result = parseManifest(MEDIA_MANIFEST, 'https://cdn.com/');
    expect(hasEncryption(result.segments!)).toBe(false);
  });
});
import { describe, it, expect } from 'vitest';
import {
  isHttp,
  isBlob,
  isM3U8Url,
  isVideoUrl,
  formatBytes,
  formatDuration,
  cleanFilename,
  parseRange,
  extractResFromUrl,
  guessHlsType,
  guessExt,
  lruGet,
  lruSet,
} from '../src/utils';

describe('URL Predicates', () => {
  it('isHttp', () => {
    expect(isHttp('https://example.com/video.mp4')).toBe(true);
    expect(isHttp('http://test.com')).toBe(true);
    expect(isHttp('blob:http://...')).toBe(false);
    expect(isHttp(null)).toBe(false);
    expect(isHttp(123)).toBe(false);
  });

  it('isBlob', () => {
    expect(isBlob('blob:http://example.com/abc')).toBe(true);
    expect(isBlob('https://example.com')).toBe(false);
  });

  it('isM3U8Url', () => {
    expect(isM3U8Url('https://cdn.com/master.m3u8')).toBe(true);
    expect(isM3U8Url('https://cdn.com/video.m3u8?token=123')).toBe(true);
    expect(isM3U8Url('https://cdn.com/video.mp4')).toBe(false);
  });

  it('isVideoUrl', () => {
    expect(isVideoUrl('https://cdn.com/video.mp4')).toBe(true);
    expect(isVideoUrl('https://cdn.com/clip.webm')).toBe(true);
    expect(isVideoUrl('https://cdn.com/movie.mkv?t=1')).toBe(true);
    expect(isVideoUrl('https://cdn.com/master.m3u8')).toBe(false);
  });
});

describe('Formatting', () => {
  it('formatBytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1023)).toBe('1023 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1048576)).toBe('1.0 MB');
    expect(formatBytes(1073741824)).toBe('1.0 GB');
    expect(formatBytes(null)).toBe('');
  });

  it('formatDuration', () => {
    expect(formatDuration(0)).toBe(null);
    expect(formatDuration(59)).toBe('0:59');
    expect(formatDuration(60)).toBe('1:00');
    expect(formatDuration(125)).toBe('2:05');
    expect(formatDuration(3661)).toBe('1:01:01');
  });

  it('cleanFilename', () => {
    expect(cleanFilename('My Video: Part 1')).toBe('My Video_ Part 1');
    expect(cleanFilename('Test<>File')).toBe('Test__File');
    expect(cleanFilename(null)).toBe('video');
    expect(cleanFilename('')).toBe('video');
  });
});

describe('parseRange', () => {
  it('parses valid ranges', () => {
    expect(parseRange('bytes=0-999')).toEqual({ start: 0, end: 999 });
    expect(parseRange('bytes=1000-')).toEqual({ start: 1000, end: null });
  });

  it('returns null for invalid', () => {
    expect(parseRange(null)).toBe(null);
    expect(parseRange('')).toBe(null);
    expect(parseRange('invalid')).toBe(null);
  });
});

describe('extractResFromUrl', () => {
  it('extracts resolution patterns', () => {
    expect(extractResFromUrl('video_720p.m3u8')).toBe('720p');
    expect(extractResFromUrl('stream-1080p-index.m3u8')).toBe('1080p');
    expect(extractResFromUrl('1920x1080/playlist.m3u8')).toBe('1920x1080');
    expect(extractResFromUrl('quality=480')).toBe('480p');
  });

  it('returns null when no match', () => {
    expect(extractResFromUrl('video.m3u8')).toBe(null);
    expect(extractResFromUrl(null)).toBe(null);
  });
});

describe('guessHlsType', () => {
  it('identifies master playlists', () => {
    expect(guessHlsType('master.m3u8')).toBe('master');
    expect(guessHlsType('index.m3u8')).toBe('master');
    expect(guessHlsType('manifest.m3u8')).toBe('master');
  });

  it('identifies media playlists', () => {
    expect(guessHlsType('chunklist_720p.m3u8')).toBe('media');
    expect(guessHlsType('video_1080p.m3u8')).toBe('media');
    expect(guessHlsType('stream_0.m3u8')).toBe('media');
  });

  it('returns unknown for ambiguous', () => {
    expect(guessHlsType('random.m3u8')).toBe('unknown');
  });
});

describe('guessExt', () => {
  it('extracts from URL', () => {
    expect(guessExt('video.mp4')).toBe('mp4');
    expect(guessExt('video.webm?t=1')).toBe('webm');
  });

  it('falls back to type', () => {
    expect(guessExt('https://cdn.com/stream', 'video/webm')).toBe('webm');
    expect(guessExt('https://cdn.com/stream', 'video/quicktime')).toBe('mov');
  });

  it('defaults to mp4', () => {
    expect(guessExt('https://cdn.com/stream')).toBe('mp4');
  });
});

describe('LRU Cache', () => {
  it('lruGet moves item to end', () => {
    const map = new Map([['a', 1], ['b', 2], ['c', 3]]);
    lruGet(map, 'a');
    expect([...map.keys()]).toEqual(['b', 'c', 'a']);
  });

  it('lruSet enforces max', () => {
    const map = new Map<string, number>();
    lruSet(map, 'a', 1, 2);
    lruSet(map, 'b', 2, 2);
    lruSet(map, 'c', 3, 2);
    expect(map.size).toBe(2);
    expect(map.has('a')).toBe(false);
  });
});
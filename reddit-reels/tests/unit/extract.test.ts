import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { embedUrlFrom, extractPost, redgifsIdFrom } from '../../src/feed/extract';
import { installDom, uninstallDom } from './setup-dom';

const html = readFileSync(new URL('../fixtures/feed.html', import.meta.url), 'utf8');

describe('extractPost on real Reddit markup (captured 2026-10)', () => {
  beforeAll(() => {
    installDom();
    document.body.innerHTML = html;
  });
  afterAll(uninstallDom);

  const get = (id: string) => extractPost(document.getElementById(id) as HTMLElement)!;

  it('video with packaged mp4: mp4 list best-first, HLS kept as fallback', () => {
    const p = get('t3_1wwbxm7');
    expect(p.kind).toBe('video');
    expect(p.title).toBe('Different balls with water drops');
    expect(p.subreddit).toBe('r/oddlysatisfying');
    expect(p.author).toBe('DrBlaziken');
    expect(p.score).toBeGreaterThan(1000);
    expect(p.permalink).toStartWith('/r/oddlysatisfying/comments/1wwbxm7/');
    expect(p.video!.mp4.length).toBeGreaterThan(1);
    expect(p.video!.mp4[0]).toContain('packaged-media.redd.it');
    expect(p.video!.hls).toContain('HLSPlaylist.m3u8');
    expect(p.video!.poster).toStartWith('https://');
    expect(p.video!.height).toBeGreaterThan(p.video!.width); // portrait clip
  });

  it('video without packaged mp4 falls back to HLS', () => {
    const p = get('t3_1w687dr');
    expect(p.kind).toBe('video');
    expect(p.video!.mp4).toEqual([]);
    expect(p.video!.hls).toContain('v.redd.it');
  });

  it('gallery reads every slide, including lazy ones', () => {
    const p = get('t3_1wwj155');
    expect(p.kind).toBe('gallery');
    expect(p.images!.length).toBeGreaterThan(1);
    for (const src of p.images!) expect(src).toContain('redd.it');
  });

  it('image prefers the full-size i.redd.it file', () => {
    const p = get('t3_1wbnrm5');
    expect(p.kind).toBe('image');
    expect(p.images![0]).toMatch(/redd\.it/);
  });

  it('text and link posts', () => {
    expect(get('t3_1ww7cwj').kind).toBe('text');
    const link = get('t3_1ww29sz');
    expect(link.kind).toBe('link');
    expect(link.linkUrl).toStartWith('https://');
  });

  it('RedGifs links become redgifs posts, not link cards', () => {
    const el = document.createElement('shreddit-post');
    el.id = 't3_rg';
    el.setAttribute('post-type', 'link');
    el.setAttribute('content-href', 'https://www.redgifs.com/watch/SomeCamelCaseName');
    const p = extractPost(el)!;
    expect(p.kind).toBe('redgifs');
    expect(p.redgifsId).toBe('somecamelcasename');
  });
});

describe('url helpers', () => {
  it('redgifs ids from watch, ifr and i URLs', () => {
    expect(redgifsIdFrom('https://redgifs.com/watch/abcDef')).toBe('abcdef');
    expect(redgifsIdFrom('https://www.redgifs.com/ifr/xyz')).toBe('xyz');
    expect(redgifsIdFrom('https://i.redgifs.com/i/qq.jpg')).toBe('qq');
    expect(redgifsIdFrom('https://example.com/watch/x')).toBeNull();
  });

  it('embeds for YouTube and Streamable', () => {
    expect(embedUrlFrom('https://youtu.be/dQw4w9WgXcQ')).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(embedUrlFrom('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toContain('dQw4w9WgXcQ');
    expect(embedUrlFrom('https://streamable.com/abc12')).toBe('https://streamable.com/e/abc12?autoplay=1');
    expect(embedUrlFrom('https://example.com')).toBeNull();
  });
});

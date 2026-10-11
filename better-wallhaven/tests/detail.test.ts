import { describe, expect, it } from 'bun:test';
import { buildDetailHtml } from '../src/detail';
import type { ThumbMeta } from '../src/extract';

const free: ThumbMeta = {
  id: 'jel1jq',
  pageUrl: 'https://wallhaven.cc/w/jel1jq',
  thumbUrl: 'https://th.wallhaven.cc/small/je/jel1jq.jpg',
  res: '3840 x 2160',
  favs: '53',
  category: 'General',
  purity: 'SFW',
  fileType: 'JPG',
};

const full = {
  url: 'https://w.wallhaven.cc/full/je/wallhaven-jel1jq.jpg',
  size: '4.53 MB',
  properties: [
    ['Uploader', 'jrmnt'],
    ['Resolution', '3840x2160'],
    ['Favorites', '53'],
    ['Type', 'JPG'],
    ['Views', '1987'],
  ] as [string, string][],
  tagsHtml: '<li class="tag"><a href="https://wallhaven.cc/tag/323">artwork</a></li>',
};

describe('buildDetailHtml (below-thumbnail HD block)', () => {
  it('shows only a loading hint before fetch (free data lives in chips)', () => {
    const html = buildDetailHtml(free, null, 'loading');
    expect(html).toContain('4KB');
    expect(html).not.toContain('3840 x 2160');
    expect(html).not.toContain('53');
  });

  it('headlines file size and drops chips-duplicate props', () => {
    const html = buildDetailHtml(free, full, 'ready');
    expect(html).toContain('4.53 MB');
    expect(html).toContain('Size:');
    expect(html).toContain('whs-label');
    expect(html).toContain('Uploader');
    expect(html).toContain('Views');
    expect(html).toContain('artwork');
    expect(html).not.toContain('3840 x 2160');
    expect(html).not.toContain('<dt>Resolution</dt>');
    expect(html).not.toContain('<dt>Favorites</dt>');
    expect(html).not.toContain('<dt>Type</dt>');
  });

  it('escapes property names and shows retry hint on error', () => {
    const html = buildDetailHtml(free, null, 'error');
    expect(html).toContain('retry');
    const ready = buildDetailHtml(free, { url: 'u', size: 's', properties: [['<b>', 'x']], tagsHtml: '' }, 'ready');
    expect(ready).toContain('&lt;b&gt;');
    expect(ready).not.toContain('<b>');
  });
});

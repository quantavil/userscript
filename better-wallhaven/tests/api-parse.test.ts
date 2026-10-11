import { describe, expect, it } from 'bun:test';

const sample = {
  data: {
    id: 'jel1jq',
    path: 'https://w.wallhaven.cc/full/je/wallhaven-jel1jq.jpg',
    file_size: 4753754,
    file_type: 'image/jpeg',
    resolution: '3840x2160',
    ratio: '1.78',
    views: 1987,
    favorites: 53,
    category: 'general',
    purity: 'sfw',
    created_at: '2026-09-22 07:53:43',
    source: 'https://example.com/art',
    colors: ['#000000', '#424153'],
    uploader: { username: 'jrmnt' },
    tags: [
      { id: 323, name: 'artwork' },
      { id: 1863, name: 'robot' },
    ],
  },
};

describe('parseApiMeta (4KB JSON)', () => {
  it('maps path, size, props and tags', async () => {
    const { parseApiMeta } = await import('../src/api');
    const meta = parseApiMeta(sample);
    expect(meta).not.toBeNull();
    expect(meta!.url).toBe('https://w.wallhaven.cc/full/je/wallhaven-jel1jq.jpg');
    expect(meta!.size).toBe('4.53 MB');
    expect(meta!.tagsHtml).toContain('artwork');
    expect(meta!.tagsHtml).toContain('robot');
    const keys = meta!.properties.map(p => p[0]);
    expect(keys).toContain('Uploader');
    expect(keys).toContain('Resolution');
    expect(keys).toContain('Views');
    const byKey = Object.fromEntries(meta!.properties);
    expect(byKey['Purity']).toBe('SFW');
    expect(byKey['Type']).toBe('JPG');
  });

  it('returns null without path', async () => {
    const { parseApiMeta } = await import('../src/api');
    expect(parseApiMeta({ data: {} })).toBeNull();
    expect(parseApiMeta({})).toBeNull();
  });
});

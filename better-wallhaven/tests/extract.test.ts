import { describe, expect, it } from 'bun:test';

function fakeThumb(opts: {
  id?: string;
  cls?: string;
  res?: string;
  favs?: string;
  png?: boolean;
  href?: string;
  thumbUrl?: string;
}) {
  return {
    getAttribute: (k: string) => (k === 'data-wallpaper-id' ? opts.id || '' : null),
    className: opts.cls || '',
    querySelector: (sel: string) => {
      if (sel === 'a.preview') return opts.href || opts.id ? { href: opts.href || `https://wallhaven.cc/w/${opts.id}` } : null;
      if (sel === 'img') return { currentSrc: '', src: '', dataset: { src: opts.thumbUrl || '' }, getAttribute: () => opts.thumbUrl || '' };
      if (sel === '.thumb-info .wall-res') return opts.res ? { textContent: opts.res } : null;
      if (sel === '.thumb-info .wall-favs') return opts.favs != null ? { textContent: opts.favs } : null;
      if (sel === '.png') return opts.png ? {} : null;
      return null;
    },
  } as any;
}

describe('extractThumbMeta (zero-network)', () => {
  it('parses free listing fields without fetch', async () => {
    const { extractThumbMeta } = await import('../src/extract');
    const m = extractThumbMeta(
      fakeThumb({ id: 'jel1jq', cls: 'thumb thumb-jel1jq thumb-sfw thumb-general', res: '3840 x 2160', favs: '53', thumbUrl: 'https://th.wallhaven.cc/small/je/jel1jq.jpg' })
    );
    expect(m.id).toBe('jel1jq');
    expect(m.res).toBe('3840 x 2160');
    expect(m.favs).toBe('53');
    expect(m.category).toBe('General');
    expect(m.purity).toBe('SFW');
    expect(m.fileType).toBe('JPG');
    expect(m.thumbUrl).toContain('th.wallhaven.cc/small/je/jel1jq.jpg');
  });

  it('detects PNG badge and anime category', async () => {
    const { extractThumbMeta } = await import('../src/extract');
    const m = extractThumbMeta(
      fakeThumb({ id: '1qodm3', cls: 'thumb thumb-sfw thumb-anime', res: '5768 x 2688', favs: '48', png: true })
    );
    expect(m.fileType).toBe('PNG');
    expect(m.category).toBe('Anime');
  });

  it('derives lg/orig thumb URLs without requests', async () => {
    const { largerThumb } = await import('../src/extract');
    expect(largerThumb('https://th.wallhaven.cc/small/je/jel1jq.jpg', 'lg')).toBe('https://th.wallhaven.cc/lg/je/jel1jq.jpg');
    expect(largerThumb('https://th.wallhaven.cc/small/je/jel1jq.jpg', 'orig')).toBe('https://th.wallhaven.cc/orig/je/jel1jq.jpg');
    expect(largerThumb('', 'lg')).toBe('');
  });

  it('prevents substring false-positive collisions with wallpaper IDs (blue dot anomaly fix)', async () => {
    const { extractThumbMeta } = await import('../src/extract');
    // ID starting with 'people' must NOT trigger category People when it is General
    const m1 = extractThumbMeta(
      fakeThumb({ id: 'people99', cls: 'thumb thumb-people99 thumb-general thumb-sfw' })
    );
    expect(m1.category).toBe('General');
    expect(m1.purity).toBe('SFW');

    // ID starting with 'sfw' must NOT trigger purity SFW when it is Sketchy
    const m2 = extractThumbMeta(
      fakeThumb({ id: 'sfw88', cls: 'thumb thumb-sfw88 thumb-sketchy thumb-anime' })
    );
    expect(m2.category).toBe('Anime');
    expect(m2.purity).toBe('Sketchy');

    // ID starting with 'sketchy' must NOT trigger purity Sketchy when it is SFW
    const m3 = extractThumbMeta(
      fakeThumb({ id: 'sketchy00', cls: 'thumb thumb-sketchy00 thumb-sfw thumb-people' })
    );
    expect(m3.category).toBe('People');
    expect(m3.purity).toBe('SFW');

    // ID starting with 'nsfw' must NOT trigger purity NSFW when it is SFW
    const m4 = extractThumbMeta(
      fakeThumb({ id: 'nsfw99', cls: 'thumb thumb-nsfw99 thumb-sfw thumb-anime' })
    );
    expect(m4.category).toBe('Anime');
    expect(m4.purity).toBe('SFW');
  });

  it('extracts correctly when DOM element supports classList', async () => {
    const { extractThumbMeta } = await import('../src/extract');
    const classes = ['thumb', 'thumb-12345', 'thumb-nsfw', 'thumb-people'];
    const thumbWithClassList = {
      getAttribute: () => '12345',
      className: classes.join(' '),
      classList: {
        contains: (cls: string) => classes.includes(cls),
      },
      querySelector: () => null,
    } as any;

    const m = extractThumbMeta(thumbWithClassList);
    expect(m.category).toBe('People');
    expect(m.purity).toBe('NSFW');
  });
});

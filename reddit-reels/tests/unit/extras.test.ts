import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { extractPost } from '../../src/feed/extract';
import { sanitizeMarkdownHtml } from '../../src/feed/sanitize';
import { webUrlFor } from '../../src/page/declutter';
import { titleSize } from '../../src/reel/slide';
import { installDom, uninstallDom } from './setup-dom';

const html = readFileSync(new URL('../fixtures/extras.html', import.meta.url), 'utf8');

describe('gif and text posts on real Reddit markup', () => {
  beforeAll(() => {
    installDom('https://www.reddit.com/r/gifs/');
    document.body.innerHTML = html;
  });
  afterAll(uninstallDom);

  const get = (id: string) => {
    const p = extractPost(document.getElementById(id) as HTMLElement);
    if (!p) throw new Error(`no post ${id}`);
    return p;
  };

  it('"gif" posts play their mp4 directly, never through hls.js', () => {
    const p = get('t3_1wwi277');
    expect(p.kind).toBe('video');
    expect(p.video?.hls).toBe('');
    expect(p.video?.mp4[0]).toContain('format=mp4');
    expect(p.video?.gif).toBe(true);
  });

  it('text posts keep paragraphs and bold, drop everything else', () => {
    const p = get('t3_1wvxw2i');
    expect(p.kind).toBe('text');
    expect(p.text?.length).toBeGreaterThan(200);
    expect(p.html).toContain('<p>');
    expect(p.html).toContain('<strong>');
    expect(p.html).not.toMatch(/class=|style=|id=|<div|<script/);
    // Reddit wraps the preview in a link to the post; that link must not swallow the body.
    expect(p.html).not.toContain('/comments/1wvxw2i/');
  });
});

describe('sanitizeMarkdownHtml', () => {
  beforeAll(() => installDom());
  afterAll(uninstallDom);

  it('keeps safe links, drops scripts, handlers and javascript: URLs', () => {
    const box = document.createElement('div');
    box.innerHTML = `
      <p onclick="x()">Hi <a href="/r/test/">sub</a> <a href="javascript:alert(1)">bad</a></p>
      <script>alert(1)</script><img src="https://i.redd.it/a.png" onerror="x()">
      <ul><li><em>one</em></li></ul><span class="md-spoiler-text">secret</span>`;
    const out = sanitizeMarkdownHtml(box);
    expect(out).toContain('href="https://www.reddit.com/r/test/"');
    expect(out).toContain('target="_blank"');
    expect(out).not.toContain('javascript:');
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('<img');
    expect(out).toContain('[image]');
    expect(out).toContain('<li><em>one</em></li>');
    expect(out).toContain('<span class="spoiler">secret</span>');
    expect(out).toContain(' bad</p>'); // the text survives, the link doesn't
  });
});

describe('app links', () => {
  beforeAll(() => installDom());
  afterAll(uninstallDom);

  it('maps applink.reddit.com to www.reddit.com and strips app tracking', () => {
    expect(
      webUrlFor(
        'https://applink.reddit.com/r/AskReddit/comments/1ww7cwj/x/?utm_source=app_first_navigation&mweb_loid=t2_1&ext-referrer=DIRECT',
      ),
    ).toBe('https://www.reddit.com/r/AskReddit/comments/1ww7cwj/x/');
    expect(webUrlFor('https://applink.reddit.com/user/someone/?sort=top')).toBe(
      'https://www.reddit.com/user/someone/?sort=top',
    );
  });

  it('leaves other links alone', () => {
    expect(webUrlFor('https://www.reddit.com/r/a/')).toBeNull();
    expect(webUrlFor('https://reddit.onelink.me/MRHZ?x=1')).toBeNull();
    expect(webUrlFor('/r/a/')).toBeNull();
  });
});

describe('titleSize', () => {
  it('short title-only posts get the poster size; long titles shrink', () => {
    expect(titleSize('What company hates its customers?', false)).toBe('xl');
    expect(titleSize('Short title', true)).toBe('l');
    expect(titleSize('x'.repeat(120), true)).toBe('m');
  });
});

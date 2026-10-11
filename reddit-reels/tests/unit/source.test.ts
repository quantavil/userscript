import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { FeedSource, findLoadAfter } from '../../src/feed/source';
import { installDom, uninstallDom } from './setup-dom';

const html = readFileSync(new URL('../fixtures/feed.html', import.meta.url), 'utf8');

function page(ids: string[], nextAfter: string | null): string {
  const posts = ids
    .map(
      (id) =>
        `<article><shreddit-post id="${id}" post-type="text" post-title="${id}" permalink="/r/x/comments/${id}/"></shreddit-post></article>`,
    )
    .join('');
  const next = nextAfter
    ? `<faceplate-partial slot="load-after" src="/svc/shreddit/community-more-posts/best/?after=${nextAfter}"></faceplate-partial>`
    : '';
  return `<!DOCTYPE html><html><body>${posts}<shreddit-ad-post><shreddit-post id="t3_ad"></shreddit-post></shreddit-ad-post>${next}</body></html>`;
}

describe('FeedSource', () => {
  let realFetch: typeof fetch;
  beforeEach(() => {
    installDom();
    document.body.innerHTML = html;
    realFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    uninstallDom();
  });

  it('scans posts in feed order and dedupes', () => {
    const s = new FeedSource();
    expect(s.scan().length).toBe(6);
    expect(s.scan().length).toBe(0);
    expect(s.posts[0].id).toBe('t3_1wwbxm7');
  });

  it('finds Reddit load-after partial', () => {
    expect(findLoadAfter(document)?.getAttribute('src')).toContain('after=');
  });

  it('loads the next page through the same partial Reddit uses, inserts it into the live feed, and follows the cursor', async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (url: string) => {
      calls.push(String(url));
      const body = calls.length === 1 ? page(['t3_a', 't3_b'], 'NEXT') : page(['t3_c'], null);
      return new Response(body, { status: 200 });
    }) as any;

    const s = new FeedSource();
    s.scan();
    let added: string[] = [];
    s.onAdded((posts) => {
      added = added.concat(posts.map((p) => p.id));
    });

    expect(await s.loadMore()).toBe(2);
    expect(calls[0]).toContain('/svc/shreddit/community-more-posts/best/?after=dDNfZml4dHVyZQ');
    expect(added).toEqual(['t3_a', 't3_b']);
    // Live elements in Reddit's feed (native voting works), ads skipped.
    expect(document.getElementById('t3_a')?.closest('shreddit-feed')).not.toBeNull();
    expect(s.posts.find((p) => p.id === 't3_ad')).toBeUndefined();
    expect(findLoadAfter(document)?.getAttribute('src')).toContain('after=NEXT');

    expect(await s.loadMore()).toBe(1);
    expect(calls[1]).toContain('after=NEXT');
    expect(s.hasMore).toBe(false);
    expect(await s.loadMore()).toBe(0);
  });

  it('concurrent loadMore calls share one request', async () => {
    let n = 0;
    globalThis.fetch = (async () => {
      n++;
      return new Response(page(['t3_z'], null), { status: 200 });
    }) as any;
    const s = new FeedSource();
    s.scan();
    await Promise.all([s.loadMore(), s.loadMore(), s.loadMore()]);
    expect(n).toBe(1);
  });
});

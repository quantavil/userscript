/**
 * Serves real Reddit feed markup (tests/fixtures/feed.html) at a feed URL, plus
 * hls.js and the built userscript, so the reel can be tested without reddit.com.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '../..');
const feed = readFileSync(join(import.meta.dir, 'feed.html'), 'utf8');
const page = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<style>/* stand-in for Reddit's own CSS: keep media inside the viewport */
body{margin:0;font-family:sans-serif} img,video,svg,iframe{max-width:100%;height:auto} svg{width:16px;height:16px}
article{display:block;overflow:hidden;border-bottom:1px solid #ccc;padding:8px}</style></head>
<body><header id="reddit-header">reddit</header><main>${feed}</main>
<script src="/hls.min.js"></script><script src="/reddit-reels.user.js"></script></body></html>`;

Bun.serve({
  port: 3000,
  fetch(req) {
    const { pathname } = new URL(req.url);
    if (pathname === '/hls.min.js') return new Response(Bun.file(join(ROOT, 'node_modules/hls.js/dist/hls.min.js')));
    if (pathname === '/reddit-reels.user.js') {
      const bundle = join(ROOT, 'dist/reddit-reels.user.js');
      return existsSync(bundle) ? new Response(Bun.file(bundle)) : new Response('build first', { status: 500 });
    }
    if (pathname.startsWith('/svc/shreddit/community-more-posts/')) {
      const after = new URL(req.url).searchParams.get('after');
      const ids = after === 'PAGE2' ? [] : ['t3_more1', 't3_more2'];
      const posts = ids
        .map((id) => `<article><shreddit-post id="${id}" post-type="text" post-title="More ${id}" subreddit-prefixed-name="r/oddlysatisfying" permalink="/r/oddlysatisfying/comments/${id}/x/"></shreddit-post></article>`)
        .join('');
      const next = after === 'PAGE2' ? '' : '<faceplate-partial slot="load-after" src="/svc/shreddit/community-more-posts/best/?after=PAGE2"></faceplate-partial>';
      return new Response(`<!DOCTYPE html><html><body>${posts}${next}</body></html>`, { headers: { 'content-type': 'text/html' } });
    }
    if (pathname.includes('/comments/')) return new Response('<!DOCTYPE html><html><body><h1>Post page</h1></body></html>', { headers: { 'content-type': 'text/html' } });
    return new Response(page, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  },
});
console.log('fixture server on :3000');

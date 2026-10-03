/**
 * Reads a Post from Reddit's <shreddit-post> markup. Everything comes from
 * attributes Reddit already rendered: no network, no shadow-DOM digging.
 */

import { sanitizeMarkdownHtml } from './sanitize';
import type { Post, PostKind, VideoSource } from './types';

const REDGIFS_RE = /redgifs\.com\/(?:watch|ifr|i)\/([a-z0-9]+)/i;
const YOUTUBE_RE = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i;
const STREAMABLE_RE = /streamable\.com\/(?:e\/)?([a-z0-9]+)/i;

export function redgifsIdFrom(url: string): string | null {
  const m = url.match(REDGIFS_RE);
  return m ? m[1].toLowerCase() : null;
}

export function embedUrlFrom(url: string): string | null {
  const yt = url.match(YOUTUBE_RE);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&playsinline=1&rel=0`;
  const st = url.match(STREAMABLE_RE);
  if (st && /streamable\.com/i.test(url)) return `https://streamable.com/e/${st[1]}?autoplay=1`;
  return null;
}

function num(v: string | null): number {
  const n = parseInt(v || '', 10);
  return Number.isFinite(n) ? n : 0;
}

function readVideo(el: HTMLElement): VideoSource | undefined {
  const player = el.querySelector<HTMLElement>('shreddit-player, shreddit-player-2');
  if (!player) return undefined;
  const mp4: { url: string; h: number; w: number }[] = [];
  const packed = player.getAttribute('packaged-media-json');
  if (packed) {
    try {
      const perms = JSON.parse(packed)?.playbackMp4s?.permutations || [];
      for (const p of perms) {
        const url = p?.source?.url;
        if (typeof url === 'string') {
          mp4.push({
            url,
            h: p.source.dimensions?.height || 0,
            w: p.source.dimensions?.width || 0,
          });
        }
      }
    } catch {}
  }
  mp4.sort((a, b) => b.h - a.h);
  // `src` is an HLS playlist for real videos, but a plain mp4 for "gif" posts
  // (preview.redd.it/…gif?format=mp4): feeding that to hls.js fails.
  const src = player.getAttribute('src') || '';
  const isHls = /\.m3u8(\?|$)/i.test(src) || /v\.redd\.it\/.+\/HLSPlaylist/i.test(src);
  let hls = '';
  if (isHls) hls = src;
  else if (src && !mp4.some((m) => m.url === src)) mp4.push({ url: src, h: 0, w: 0 });
  if (!mp4.length && !hls) return undefined;
  return {
    mp4: mp4.map((m) => m.url),
    hls,
    gif: player.hasAttribute('gif') || /\.gif$/i.test(src.split('?')[0]),
    poster: player.getAttribute('poster') || '',
    captions: player.getAttribute('caption-url') || '',
    width: mp4[0]?.w || 0,
    height: mp4[0]?.h || 0,
  };
}

function imgSrc(img: HTMLImageElement | null): string {
  if (!img) return '';
  return img.getAttribute('src') || img.getAttribute('data-lazy-src') || '';
}

function readGallery(el: HTMLElement): string[] {
  const carousel = el.querySelector('gallery-carousel');
  if (!carousel) return [];
  const out: string[] = [];
  carousel.querySelectorAll('li').forEach((li) => {
    const src = imgSrc(li.querySelector('img'));
    if (src && !out.includes(src)) out.push(src);
  });
  return out;
}

function readImage(el: HTMLElement, contentHref: string): string {
  const full = imgSrc(el.querySelector<HTMLImageElement>('img.media-lightbox-img'));
  if (full) return full;
  const preview = imgSrc(el.querySelector<HTMLImageElement>('img.preview-img, img.i18n-post-media-img'));
  if (preview) return preview;
  return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(contentHref) ? contentHref : '';
}

export function extractPost(el: HTMLElement): Post | null {
  const id = el.id || el.getAttribute('id') || '';
  if (!id) return null;
  const type = (el.getAttribute('post-type') || '').toLowerCase();
  const contentHref = el.getAttribute('content-href') || '';
  const domain = el.getAttribute('domain') || '';
  const iframeSrc = el.querySelector('iframe')?.getAttribute('src') || '';

  const post: Post = {
    id,
    kind: 'link',
    title: el.getAttribute('post-title') || '',
    subreddit: el.getAttribute('subreddit-prefixed-name') || '',
    author: el.getAttribute('author') || '',
    score: num(el.getAttribute('score')),
    comments: num(el.getAttribute('comment-count')),
    permalink: el.getAttribute('permalink') || '',
    nsfw: el.hasAttribute('nsfw'),
    el,
  };

  let kind: PostKind | null = null;
  const redgifsId = redgifsIdFrom(contentHref) || redgifsIdFrom(iframeSrc);
  const video = readVideo(el);
  const embedUrl = embedUrlFrom(contentHref);

  if (redgifsId) {
    kind = 'redgifs';
    post.redgifsId = redgifsId;
  } else if (video) {
    kind = 'video';
    post.video = video;
  } else if (embedUrl) {
    kind = 'embed';
    post.embedUrl = embedUrl;
  } else if (type === 'gallery') {
    const images = readGallery(el);
    if (images.length) {
      kind = 'gallery';
      post.images = images;
    }
  }
  if (!kind && (type === 'image' || /i\.redd\.it/i.test(domain))) {
    const src = readImage(el, contentHref);
    if (src) {
      kind = 'image';
      post.images = [src];
    }
  }
  if (!kind && (type === 'text' || type === 'self')) {
    kind = 'text';
    // One at a time: a selector list matches in document order, and the outer
    // element wraps the body in a link to the post.
    const body =
      el.querySelector<HTMLElement>('shreddit-post-text-body .md') ||
      el.querySelector<HTMLElement>('[slot="text-body"] .md') ||
      el.querySelector<HTMLElement>('shreddit-post-text-body');
    post.text = (body?.textContent || '').replace(/\s+\n/g, '\n').trim().slice(0, 6000);
    if (body) post.html = sanitizeMarkdownHtml(body);
  }
  if (!kind) {
    kind = 'link';
    post.linkUrl = contentHref;
    post.thumbnail = imgSrc(el.querySelector<HTMLImageElement>('[slot="thumbnail"] img'));
  }
  post.kind = kind;
  return post;
}

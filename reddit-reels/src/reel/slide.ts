/**
 * Slide = one post. The shell (info + rail) is cheap and built for every post;
 * heavy content (images, iframes, the shared video) is mounted only near the
 * active slide and unmounted when it scrolls away.
 */

import type { Post } from '../feed/types';
import { escapeHtml, extractDomain, formatCount, isSafeUrl } from '../utils';
import { ICONS } from './icons';

export interface SlideRefs {
  root: HTMLElement;
  inner: HTMLElement;
  media: HTMLElement;
  backdrop: HTMLImageElement | null;
  mounted: boolean;
}

const REDDIT = 'https://www.reddit.com';

export function postUrl(post: Post): string {
  if (post.permalink.startsWith('http')) return post.permalink;
  const origin = typeof location !== 'undefined' ? location.origin : REDDIT;
  return `${origin}${post.permalink}`;
}

export function isVideoKind(post: Post): boolean {
  return post.kind === 'video' || post.kind === 'redgifs';
}

function posterOf(post: Post): string {
  if (post.kind === 'video') return post.video?.poster || '';
  if (post.kind === 'gallery' || post.kind === 'image') return post.images?.[0] || '';
  return '';
}

export function buildSlide(post: Post, index: number): SlideRefs {
  const root = document.createElement('section');
  root.className = `slide kind-${post.kind}${isVideoKind(post) ? ' has-video' : ''}`;
  root.dataset.index = String(index);
  root.dataset.id = post.id;
  if (post.video && post.video.height / Math.max(1, post.video.width) >= 1.5) root.classList.add('portrait');

  const sub = escapeHtml(post.subreddit);
  const subHref = post.subreddit ? `${REDDIT}/${encodeURI(post.subreddit)}/` : '';
  const author = escapeHtml(post.author);
  root.innerHTML = `
    <div class="slide-inner">
      <div class="media"></div>
      <div class="spinner"></div>
      <div class="shade top"></div>
      <div class="shade"></div>
      <div class="unmute-hint">${ICONS.soundOff}<span>Tap for sound</span></div>
      <div class="info">
        <div class="meta">
          ${sub ? `<a class="sub" href="${escapeHtml(subHref)}">${sub}</a>` : ''}
          ${author ? `<span class="author">u/${author}</span>` : ''}
          ${post.nsfw ? '<span class="nsfw">NSFW</span>' : ''}
        </div>
        <p class="title">${escapeHtml(post.title)}</p>
      </div>
      <div class="rail">
        <div class="item">
          <button type="button" class="up" data-action="up" aria-label="Upvote" aria-pressed="false">${ICONS.up(false)}</button>
          <span class="score">${formatCount(post.score)}</span>
          <button type="button" class="down" data-action="down" aria-label="Downvote" aria-pressed="false">${ICONS.down(false)}</button>
        </div>
        <div class="item">
          <button type="button" data-action="comments" aria-label="Open comments">${ICONS.comments}</button>
          <span>${formatCount(post.comments)}</span>
        </div>
        ${
          post.kind === 'video' && post.video?.captions
            ? `<div class="item"><button type="button" class="cc" data-action="captions" aria-label="Captions" aria-pressed="false">${ICONS.cc}</button></div>`
            : ''
        }
        ${
          isVideoKind(post) || post.kind === 'image' || post.kind === 'gallery'
            ? `<div class="item"><button type="button" data-action="fit" aria-label="Fit or fill screen">${ICONS.fit}</button></div>`
            : ''
        }
      </div>
    </div>
  `;
  return {
    root,
    inner: root.querySelector('.slide-inner') as HTMLElement,
    media: root.querySelector('.media') as HTMLElement,
    backdrop: null,
    mounted: false,
  };
}

function img(src: string, cls = 'main'): HTMLImageElement {
  const el = document.createElement('img');
  el.className = cls;
  el.decoding = 'async';
  el.referrerPolicy = 'no-referrer';
  el.alt = '';
  el.draggable = false;
  el.src = src;
  return el;
}

/** Mount the heavy content (not the shared video; the reel attaches that). */
export function mountSlide(refs: SlideRefs, post: Post, active: boolean): void {
  if (refs.mounted) {
    // Iframe embeds only live while active (their audio can't be paused reliably).
    if (post.kind === 'embed') syncEmbed(refs, post, active);
    return;
  }
  refs.mounted = true;

  const poster = posterOf(post);
  if (poster && post.kind !== 'gallery') {
    refs.backdrop = img(poster, 'backdrop');
    refs.root.insertBefore(refs.backdrop, refs.inner);
  }

  if (post.kind === 'image' && post.images?.[0]) {
    refs.media.appendChild(img(post.images[0]));
  } else if (post.kind === 'gallery' && post.images?.length) {
    const strip = document.createElement('div');
    strip.className = 'gallery';
    for (const src of post.images) {
      const cell = document.createElement('div');
      const im = img(src, '');
      im.loading = 'lazy';
      cell.appendChild(im);
      strip.appendChild(cell);
    }
    const count = document.createElement('div');
    count.className = 'count';
    count.textContent = `1/${post.images.length}`;
    strip.addEventListener(
      'scroll',
      () => {
        const i = Math.round(strip.scrollLeft / Math.max(1, strip.clientWidth));
        count.textContent = `${i + 1}/${post.images!.length}`;
      },
      { passive: true },
    );
    refs.media.append(strip, count);
  } else if (post.kind === 'video' && post.video?.poster) {
    refs.media.appendChild(img(post.video.poster, 'main poster'));
  } else if (post.kind === 'text' || post.kind === 'link') {
    refs.media.appendChild(buildCard(post));
  } else if (post.kind === 'embed') {
    syncEmbed(refs, post, active);
  }
}

function syncEmbed(refs: SlideRefs, post: Post, active: boolean): void {
  const existing = refs.media.querySelector('iframe');
  if (active && !existing && post.embedUrl && isSafeUrl(post.embedUrl)) {
    const frame = document.createElement('iframe');
    frame.src = post.embedUrl;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.setAttribute('allowfullscreen', '');
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    refs.media.appendChild(frame);
    if (/shorts\/|streamable/i.test(post.linkUrl || post.embedUrl)) refs.root.classList.add('vertical-embed');
  } else if (!active && existing) {
    existing.remove();
  }
}

function buildCard(post: Post): HTMLElement {
  const card = document.createElement('div');
  card.className = 'card';
  const inner = document.createElement('div');
  inner.className = 'card-inner';
  if (post.kind === 'link') {
    const href = post.linkUrl && isSafeUrl(post.linkUrl) ? post.linkUrl : '';
    inner.innerHTML = `
      ${post.thumbnail ? '<img class="thumb" alt="">' : ''}
      <div class="domain">${escapeHtml(extractDomain(href))}</div>
      <h2>${escapeHtml(post.title)}</h2>
      ${href ? `<a class="cta" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">Open link ${ICONS.external}</a>` : ''}
    `;
    const thumb = inner.querySelector<HTMLImageElement>('img.thumb');
    if (thumb && post.thumbnail) {
      thumb.referrerPolicy = 'no-referrer';
      thumb.src = post.thumbnail;
    }
  } else {
    inner.innerHTML = `<h2>${escapeHtml(post.title)}</h2>${post.text ? `<p>${escapeHtml(post.text)}</p>` : ''}`;
  }
  card.appendChild(inner);
  return card;
}

export function unmountSlide(refs: SlideRefs): void {
  if (!refs.mounted) return;
  refs.mounted = false;
  refs.backdrop?.remove();
  refs.backdrop = null;
  // The shared video is detached by the player itself; everything else goes.
  Array.from(refs.media.children).forEach((c) => {
    if (!(c instanceof HTMLVideoElement)) c.remove();
  });
  refs.root.classList.remove('vertical-embed', 'loading');
}

export function setVoteUi(refs: SlideRefs, state: 1 | 0 | -1, score: number): void {
  const up = refs.root.querySelector<HTMLButtonElement>('button.up');
  const down = refs.root.querySelector<HTMLButtonElement>('button.down');
  if (up) {
    up.classList.toggle('on', state === 1);
    up.setAttribute('aria-pressed', String(state === 1));
    up.innerHTML = ICONS.up(state === 1);
  }
  if (down) {
    down.classList.toggle('on', state === -1);
    down.setAttribute('aria-pressed', String(state === -1));
    down.innerHTML = ICONS.down(state === -1);
  }
  const label = refs.root.querySelector('.score');
  if (label) label.textContent = formatCount(score);
}

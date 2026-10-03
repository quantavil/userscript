/**
 * Feed source: the posts Reddit rendered, plus more pages fetched through the
 * same HTML endpoint Reddit's own feed uses (`faceplate-partial[slot=load-after]`,
 * e.g. /svc/shreddit/community-more-posts/...?after=). Fetched posts are inserted
 * into Reddit's real feed, so they are live elements (native voting works) and
 * Reddit's own pagination continues from the same cursor.
 */

import { extractPost } from './extract';
import type { Post } from './types';

const LOAD_AFTER = 'faceplate-partial[slot="load-after"]';

export function findLoadAfter(root: ParentNode): Element | null {
  const slotted = root.querySelector(LOAD_AFTER);
  if (slotted) return slotted;
  for (const p of Array.from(root.querySelectorAll('faceplate-partial'))) {
    const src = p.getAttribute('src') || '';
    if (/[?&]after=/.test(src) && /more-posts|\/feeds\//.test(src)) return p;
  }
  return null;
}

export class FeedSource {
  readonly posts: Post[] = [];
  private byId = new Map<string, Post>();
  private loading: Promise<number> | null = null;
  private exhausted = false;
  private observer: MutationObserver | null = null;
  private scanTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<(added: Post[]) => void>();

  onAdded(cb: (added: Post[]) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** Pick up every post currently in Reddit's page (feed order). */
  scan(): Post[] {
    const added: Post[] = [];
    document.querySelectorAll<HTMLElement>('shreddit-post').forEach((el) => {
      if (el.closest('shreddit-ad-post') || el.hasAttribute('promoted')) return;
      const known = this.byId.get(el.id);
      if (known) {
        // Reddit may re-render a post; keep the live element for voting.
        if (known.el !== el) known.el = el;
        return;
      }
      const post = extractPost(el);
      if (!post) return;
      this.byId.set(post.id, post);
      this.posts.push(post);
      added.push(post);
    });
    if (added.length) for (const cb of this.listeners) cb(added);
    return added;
  }

  get hasMore(): boolean {
    return !this.exhausted && !!findLoadAfter(document);
  }

  /** Fetch the next page; resolves to the number of new posts. */
  loadMore(): Promise<number> {
    if (this.loading) return this.loading;
    this.loading = this.fetchNext().finally(() => {
      this.loading = null;
    });
    return this.loading;
  }

  private async fetchNext(): Promise<number> {
    const partial = findLoadAfter(document);
    const src = partial?.getAttribute('src');
    if (!partial || !src || this.exhausted) return 0;

    let html = '';
    try {
      const res = await fetch(new URL(src, location.origin).toString(), { credentials: 'include' });
      if (!res.ok) return 0;
      html = await res.text();
    } catch {
      return 0;
    }
    if (!partial.isConnected) return this.scan().length; // Reddit loaded it meanwhile

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const blocks: Element[] = [];
    doc.querySelectorAll('shreddit-post').forEach((p) => {
      if (p.closest('shreddit-ad-post')) return;
      const block = p.closest('article') || p;
      if (!blocks.includes(block)) blocks.push(block);
    });
    const next = findLoadAfter(doc);

    const parent = partial.parentElement;
    if (parent) {
      for (const block of blocks) parent.insertBefore(document.importNode(block, true), partial);
      if (next) {
        parent.insertBefore(document.importNode(next, true), partial);
      }
    }
    partial.remove();
    if (!next) this.exhausted = true;
    return this.scan().length;
  }

  /** Follow posts Reddit adds by itself (its own infinite scroll, re-renders). */
  observe(): void {
    if (this.observer) return;
    this.observer = new MutationObserver(() => {
      if (this.scanTimer) return;
      this.scanTimer = setTimeout(() => {
        this.scanTimer = null;
        this.scan();
      }, 200);
    });
    // The feed is all that matters; watching the whole body rescans on every unrelated change.
    const feed = document.querySelector('shreddit-feed') || document.body;
    this.observer.observe(feed, { childList: true, subtree: true });
  }

  disconnect(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.scanTimer) clearTimeout(this.scanTimer);
    this.scanTimer = null;
  }

  /** Forget everything (route changed to a different feed). */
  reset(): void {
    this.disconnect();
    this.posts.length = 0;
    this.byId.clear();
    this.exhausted = false;
  }
}

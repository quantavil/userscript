/**
 * Native voting: click the Upvote/Downvote buttons inside the live
 * <shreddit-post> shadow root, so Reddit handles auth, CSRF and login prompts.
 */

import type { Post } from './types';

export type VoteState = 1 | 0 | -1;

function voteButton(el: HTMLElement, dir: 'up' | 'down'): HTMLButtonElement | null {
  const label = dir === 'up' ? 'upvote' : 'downvote';
  const roots: ParentNode[] = [];
  if (el.shadowRoot) roots.push(el.shadowRoot);
  roots.push(el);
  for (const root of roots) {
    const btn =
      root.querySelector<HTMLButtonElement>(`button[${label}]`) ||
      Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
        (b) => (b.getAttribute('aria-label') || '').trim().toLowerCase() === label,
      );
    if (btn) return btn;
  }
  return null;
}

export function readVote(post: Post): VoteState {
  const el = post.el;
  if (!el) return 0;
  const isOn = (b: HTMLButtonElement | null) =>
    !!b && (b.getAttribute('aria-pressed') === 'true' || b.hasAttribute('data-active'));
  if (isOn(voteButton(el, 'up'))) return 1;
  if (isOn(voteButton(el, 'down'))) return -1;
  const attr = el.getAttribute('vote-type') || el.getAttribute('user-vote') || '';
  if (/up/i.test(attr)) return 1;
  if (/down/i.test(attr)) return -1;
  return 0;
}

/** Clicks Reddit's own button. Returns false when no live button exists. */
export function vote(post: Post, dir: 'up' | 'down'): boolean {
  const el = post.el;
  if (!el?.isConnected) return false;
  const btn = voteButton(el, dir);
  if (!btn) return false;
  btn.click();
  return true;
}

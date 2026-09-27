/**
 * Reel Mode Overlay UI Component
 * Floating action rail (upvote, downvote, comments, subtitles) and metadata badge.
 * Mute is a single global control in the top bar (no per-post sound button).
 */

import { ReelPost, proxyUpvote, proxyDownvote } from '../extractor';
import { escapeHtml, formatCount, openUrl } from '../utils';
import { openCommentsDrawer } from './comments-drawer';
import { audioManager } from '../media';

export function getUpvoteIconSvg(isUpvoted: boolean): string {
  return `<svg width="26" height="26" viewBox="0 0 24 24" fill="${isUpvoted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
}

export function getDownvoteIconSvg(isDownvoted: boolean): string {
  return `<svg width="26" height="26" viewBox="0 0 24 24" fill="${isDownvoted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
}

export function getCcIconSvg(enabled: boolean = false): string {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${enabled ? '2.4' : '2.2'}" stroke-linecap="round" stroke-linejoin="round" data-enabled="${enabled}">
    <rect x="2" y="4" width="20" height="16" rx="3" ry="3"></rect>
    <path d="M7 15h0a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h1"></path>
    <path d="M15 15h0a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h1"></path>
  </svg>`;
}

export function getFitFillIconSvg(): string {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="15 3 21 3 21 9"></polyline>
    <polyline points="9 21 3 21 3 15"></polyline>
    <line x1="21" y1="3" x2="14" y2="10"></line>
    <line x1="3" y1="21" x2="10" y2="14"></line>
  </svg>`;
}

export function getCommentIconSvg(): string {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
  </svg>`;
}

export interface OverlayOptions {
  hasVideo: boolean;
  isSubtitlesEnabled?: () => boolean;
  onToggleSubtitles?: () => void;
  onToggleFitFill?: () => void;
}

export function renderReelOverlay(
  postEl: HTMLElement,
  post: ReelPost,
  options: OverlayOptions
): HTMLElement | null {
  if (postEl.querySelector('.rr-post-overlay')) return null;

  const overlay = document.createElement('div');
  overlay.className = 'rr-post-overlay';

  const isUpvoted = !!post.isUpvoted;
  const isDownvoted = !!post.isDownvoted;
  const isSubtitles = options.isSubtitlesEnabled ? options.isSubtitlesEnabled() : false;
  // Baseline vote state at parse/render time. Reddit's displayed score already
  // includes the user's existing vote, so deltas must be computed relative to
  // this baseline (not against an assumed no-vote zero).
  const initialVoteVal = isUpvoted ? 1 : isDownvoted ? -1 : 0;
  const baseScore = post.score;
  const isHiddenScore = !!post.isScoreHidden;

  const formatScoreDisplay = (currentScore: number): string => {
    if (isHiddenScore) return 'Vote';
    return formatCount(currentScore);
  };

  const cleanSub = post.subreddit ? post.subreddit.replace(/^\/?/, '') : '';

  overlay.innerHTML = `
    <!-- Bottom-Left Post Information -->
    <div class="rr-post-info">
      <div class="rr-post-meta">
        ${post.subreddit ? `<a class="rr-sub-badge" role="link" tabindex="0" href="https://www.reddit.com/${escapeHtml(cleanSub)}/" target="_blank" rel="noopener noreferrer">${escapeHtml(post.subreddit)}</a>` : ''}
        ${post.subreddit && post.author ? `<span class="rr-dot">•</span>` : ''}
        ${post.author ? `<a class="rr-author" role="link" tabindex="0" href="https://www.reddit.com/user/${escapeHtml(post.author.replace(/^u\//, ''))}/" target="_blank" rel="noopener noreferrer">u/${escapeHtml(post.author.replace(/^u\//, ''))}</a>` : ''}
      </div>
      <div class="rr-post-title" title="${escapeHtml(post.title)}">${escapeHtml(post.title)}</div>
    </div>

    <!-- Bottom-Right Vertical Action Rail (NO SHARE BUTTON, NO SOUND BUTTON — mute lives in top bar) -->
    <div class="rr-action-rail">
      <!-- 1. Subtitles Toggle (ONLY rendered if post has video) -->
      ${
        options.hasVideo && options.onToggleSubtitles
          ? `
          <div class="rr-action-item">
            <button
              type="button"
              class="rr-action-btn rr-cc-btn ${isSubtitles ? 'is-active-cc' : ''}"
              aria-label="${isSubtitles ? 'Disable Subtitles' : 'Enable Subtitles'}"
              aria-pressed="${isSubtitles}"
              title="${isSubtitles ? 'Disable Subtitles' : 'Enable Subtitles'}"
            >
              ${getCcIconSvg(isSubtitles)}
            </button>
          </div>
          `
          : ''
      }

      <!-- 2. Fit/Fill Mode Toggle -->
      <div class="rr-action-item">
        <button
          type="button"
          class="rr-action-btn rr-fit-btn"
          aria-label="Toggle Fit or Fill scaling"
          title="Toggle Fit / Fill (Original vs Full Bleed)"
        >
          ${getFitFillIconSvg()}
        </button>
      </div>

      <!-- 3. Vote Cluster (Upvote, Score, Downvote) -->
      <div class="rr-action-item rr-vote-group">
        <button
          type="button"
          class="rr-action-btn rr-upvote-btn ${isUpvoted ? 'is-active-up' : ''}"
          aria-label="Upvote"
          aria-pressed="${isUpvoted}"
          title="Upvote"
        >
          ${getUpvoteIconSvg(isUpvoted)}
        </button>
        <span class="rr-action-label rr-score-label" aria-live="polite">${formatScoreDisplay(post.score)}</span>
        <button
          type="button"
          class="rr-action-btn rr-downvote-btn ${isDownvoted ? 'is-active-down' : ''}"
          aria-label="Downvote"
          aria-pressed="${isDownvoted}"
          title="Downvote"
        >
          ${getDownvoteIconSvg(isDownvoted)}
        </button>
      </div>

      <!-- 4. Reddit Comments (Directly opens in-reel comments drawer) -->
      <div class="rr-action-item">
        <button
          type="button"
          class="rr-action-btn rr-comment-btn"
          aria-label="Open Reddit comments"
          title="Open Reddit comments"
        >
          ${getCommentIconSvg()}
        </button>
        <span class="rr-action-label">${formatCount(post.commentCount)}</span>
      </div>
    </div>
  `;

  // Attach event handlers
  const upvoteBtn = overlay.querySelector<HTMLButtonElement>('.rr-upvote-btn');
  const downvoteBtn = overlay.querySelector<HTMLButtonElement>('.rr-downvote-btn');
  const fitBtn = overlay.querySelector<HTMLButtonElement>('.rr-fit-btn');
  const commentBtn = overlay.querySelector<HTMLButtonElement>('.rr-comment-btn');
  const ccBtn = overlay.querySelector<HTMLButtonElement>('.rr-cc-btn');
  const scoreLabel = overlay.querySelector<HTMLElement>('.rr-score-label');
  const subBadge = overlay.querySelector<HTMLAnchorElement>('.rr-sub-badge');
  const authorBadge = overlay.querySelector<HTMLAnchorElement>('.rr-author');

  if (fitBtn && options.onToggleFitFill) {
    fitBtn.onclick = (e) => {
      e.stopPropagation();
      options.onToggleFitFill!();
    };
  }

  if (upvoteBtn) {
    upvoteBtn.onclick = (e) => {
      e.stopPropagation();
      const ok = proxyUpvote(post, () => syncVoteUI());
      syncVoteUI(!ok);
    };
  }

  if (downvoteBtn) {
    downvoteBtn.onclick = (e) => {
      e.stopPropagation();
      const ok = proxyDownvote(post, () => syncVoteUI());
      syncVoteUI(!ok);
    };
  }

  function syncVoteUI(revert = false): void {
    const isUp = revert ? initialVoteVal === 1 : !!post.isUpvoted;
    const isDown = revert ? initialVoteVal === -1 : !!post.isDownvoted;

    if (upvoteBtn) {
      upvoteBtn.classList.toggle('is-active-up', isUp);
      upvoteBtn.setAttribute('aria-pressed', String(isUp));
      upvoteBtn.innerHTML = getUpvoteIconSvg(isUp);
    }
    if (downvoteBtn) {
      downvoteBtn.classList.toggle('is-active-down', isDown);
      downvoteBtn.setAttribute('aria-pressed', String(isDown));
      downvoteBtn.innerHTML = getDownvoteIconSvg(isDown);
    }
    if (scoreLabel) {
      const curVal = isUp ? 1 : isDown ? -1 : 0;
      const newScore = baseScore + (curVal - initialVoteVal);
      scoreLabel.textContent = formatScoreDisplay(newScore);
    }
  }

  if (commentBtn) {
    commentBtn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      const currentVideo = audioManager.findVideo(postEl);
      const wasPlaying = currentVideo && !currentVideo.paused;
      openCommentsDrawer(post, {
        onBeforeOpen: () => {
          if (currentVideo && !currentVideo.paused) {
            try { currentVideo.pause(); } catch {}
          }
        },
        onClose: () => {
          if (wasPlaying && currentVideo) {
            try { currentVideo.play().catch(() => {}); } catch {}
          }
        },
      });
    };
  }

  if (ccBtn && options.onToggleSubtitles) {
    ccBtn.onclick = (e) => {
      e.stopPropagation();
      options.onToggleSubtitles!();
    };
  }

  if (subBadge) {
    subBadge.onclick = (e) => {
      e.stopPropagation();
    };
  }

  if (authorBadge) {
    authorBadge.onclick = (e) => {
      e.stopPropagation();
    };
  }

  postEl.appendChild(overlay);
  return overlay;
}

export function syncOverlaySubtitlesButtons(enabled: boolean): void {
  document.querySelectorAll<HTMLButtonElement>('.rr-cc-btn').forEach((btn) => {
    btn.classList.toggle('is-active-cc', enabled);
    btn.setAttribute('aria-label', enabled ? 'Disable Subtitles' : 'Enable Subtitles');
    btn.setAttribute('title', enabled ? 'Disable Subtitles' : 'Enable Subtitles');
    btn.innerHTML = getCcIconSvg(enabled);
  });
}

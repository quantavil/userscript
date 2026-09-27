import { ReelPost } from '../extractor/types';
import { escapeHtml, openUrl, sanitizeUrl } from '../utils';

/**
 * Renders a clean, scrollable discussion card for text-only Reddit posts
 */
export function renderTextCard(postEl: HTMLElement, post: ReelPost): void {
  if (postEl.querySelector('.rr-text-card-container')) return;

  const rawTargetUrl = post.permalink
    ? post.permalink.startsWith('http')
      ? post.permalink
      : `https://www.reddit.com${post.permalink}`
    : post.contentHref || '';
  const targetUrl = sanitizeUrl(rawTargetUrl);

  const container = document.createElement('div');
  container.className = 'rr-text-card-container';

  let rawBody = (post.textBody || '').trim();
  if (post.title) {
    const trimmedTitle = post.title.trim();
    if (rawBody.startsWith(trimmedTitle)) {
      rawBody = rawBody.slice(trimmedTitle.length).trim();
    }
  }

  const paragraphs = rawBody
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const formattedBodyHtml =
    paragraphs.length > 0
      ? paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')
      : rawBody
        ? `<p>${escapeHtml(rawBody)}</p>`
        : '';

  const pillText = post.subreddit ? post.subreddit : 'Discussion';

  container.innerHTML = `
    <div class="rr-text-card" role="article" aria-label="${escapeHtml(post.title)}">
      <div class="rr-text-card-header">
        <div class="rr-text-pill" title="${escapeHtml(pillText)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span>${escapeHtml(pillText)}</span>
        </div>
        ${
          targetUrl
            ? `<a href="${escapeHtml(targetUrl)}" target="_blank" rel="noopener noreferrer" class="rr-text-open-btn" title="Open full post on Reddit">
                <span>Read Full</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>`
            : ''
        }
      </div>
      <h2 class="rr-text-card-title">
        ${targetUrl ? `<a href="${escapeHtml(targetUrl)}" target="_blank" rel="noopener noreferrer" class="rr-text-title-link">${escapeHtml(post.title)}</a>` : escapeHtml(post.title)}
      </h2>
      ${
        formattedBodyHtml
          ? `<div class="rr-text-card-body">${formattedBodyHtml}</div>`
          : ''
      }
    </div>
  `;

  const openBtn = container.querySelector<HTMLElement>('.rr-text-open-btn');
  if (openBtn) {
    openBtn.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // Allow scrolling inside the text card body without triggering snap-scroll conflicts
  const cardBody = container.querySelector<HTMLElement>('.rr-text-card-body');
  if (cardBody) {
    cardBody.addEventListener('wheel', (e) => {
      e.stopPropagation();
    }, { passive: true });
    cardBody.addEventListener('touchmove', (e) => {
      e.stopPropagation();
    }, { passive: true });
  }

  postEl.appendChild(container);
}

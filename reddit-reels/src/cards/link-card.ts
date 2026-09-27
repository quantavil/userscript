import { ReelPost } from '../extractor/types';
import { escapeHtml, extractDomain, openUrl, sanitizeUrl } from '../utils';

/**
 * Locate best thumbnail preview image for an article/link post
 */
function findThumbnailUrl(postEl: HTMLElement, post: ReelPost): string | undefined {
  if (post.mediaUrl && !post.mediaUrl.endsWith('.mp4') && !post.mediaUrl.endsWith('.m3u8')) {
    return post.mediaUrl;
  }
  const img = postEl.querySelector<HTMLImageElement>(
    'img#post-image, [data-post-media-primary], shreddit-aspect-ratio img, [slot="post-media-container"] img:not(.shreddit-subreddit-icon__icon), img.preview-img, img.preview'
  );
  if (img?.src && !img.src.startsWith('data:image/svg')) {
    return img.src;
  }
  return undefined;
}

/**
 * Renders the Link Card with ambient backdrop and interactive CTA
 */
export function renderLinkCard(postEl: HTMLElement, post: ReelPost): void {
  if (postEl.querySelector('.rr-link-card-container')) return;

  const domain = extractDomain(post.contentHref);
  const thumbUrl = findThumbnailUrl(postEl, post);
  const targetUrl =
    post.contentHref ||
    (post.permalink.startsWith('http') ? post.permalink : `https://www.reddit.com${post.permalink}`);

  const safeTarget = sanitizeUrl(targetUrl);

  const container = document.createElement('div');
  container.className = 'rr-link-card-container';

  container.innerHTML = `
    <div class="rr-link-card" role="region" aria-label="Article: ${escapeHtml(post.title)}">
      ${
        thumbUrl
          ? `<div class="rr-link-card-thumb-wrap">
               <img src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(post.title)}" class="rr-link-card-thumb" />
             </div>`
          : ''
      }
      <div class="rr-link-card-body">
        ${
          domain
            ? `<div class="rr-link-card-domain rr-link-domain-badge">
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                   <circle cx="12" cy="12" r="10"></circle>
                   <line x1="2" y1="12" x2="22" y2="12"></line>
                   <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path>
                 </svg>
                 <span>${escapeHtml(domain)}</span>
               </div>`
            : ''
        }
        <h3 class="rr-link-card-title">
          <a href="${escapeHtml(safeTarget)}" target="_blank" rel="noopener noreferrer" class="rr-link-card-title-link">${escapeHtml(post.title)}</a>
        </h3>
        <a href="${escapeHtml(safeTarget)}" target="_blank" rel="noopener noreferrer" class="rr-link-card-cta" title="Open article in new tab">
          <span>Read Article</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </a>
      </div>
    </div>
  `;

  const linkCard = container.querySelector<HTMLElement>('.rr-link-card');
  const ctaBtn = container.querySelector<HTMLElement>('.rr-link-card-cta');

  const openLink = (e: Event) => {
    e.stopPropagation();
    if (safeTarget) {
      openUrl(safeTarget);
    }
  };

  linkCard?.addEventListener('click', openLink);
  linkCard?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      openLink(e);
    }
  });
  ctaBtn?.addEventListener('click', openLink);

  postEl.appendChild(container);
}


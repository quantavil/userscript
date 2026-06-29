import { PerformerProfile } from '../types';

export const Badges = {
  /** Render badges on a thumbnail exactly once. Visibility is toggled via CSS on #thumbs. */
  render(thumbshotEl: HTMLElement, profile: PerformerProfile): void {
    if (thumbshotEl.hasAttribute('data-bp-badged')) return;
    thumbshotEl.setAttribute('data-bp-badged', 'true');

    const anchor = thumbshotEl.querySelector('a');
    if (!anchor) return;

    anchor.style.position = 'relative';
    anchor.style.display = 'block';

    // Top-Left: Age
    if (profile.personal.age) {
      const badge = document.createElement('div');
      badge.className = 'bp-badge bp-badge-top-left';
      badge.textContent = `${profile.personal.age}y`;
      anchor.appendChild(badge);
    }

    // Bottom-Left: Combined Cup & Boobs (dot + cup letter)
    if (profile.body.cup) {
      const badge = document.createElement('div');
      badge.className = 'bp-badge bp-badge-bottom-left';

      let dotHtml = '';
      if (profile.body.boobs !== 'Unknown') {
        const color = profile.body.boobs === 'Natural' ? 'var(--bp-success)' : 'var(--bp-danger)';
        dotHtml = `<svg viewBox="0 0 10 10" width="8" height="8" style="display:inline-block;vertical-align:middle;margin-right:3px;"><circle cx="5" cy="5" r="4.5" fill="${color}"/></svg>`;
      }

      badge.innerHTML = `${dotHtml}<span style="vertical-align:middle;">${profile.body.cup}</span>`;
      anchor.appendChild(badge);
    }

    // Bottom-Right: Country Code
    if (profile.personal.countryCode) {
      const badge = document.createElement('div');
      badge.className = 'bp-badge bp-badge-bottom-right';
      badge.textContent = profile.personal.countryCode;
      anchor.appendChild(badge);
    }
  },

  remove(thumbshotEl: HTMLElement): void {
    thumbshotEl.removeAttribute('data-bp-badged');
    thumbshotEl.querySelectorAll('.bp-badge').forEach((b) => b.remove());
  }
};

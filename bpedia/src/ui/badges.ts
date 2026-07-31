import { PerformerProfile } from '../types';

export const Badges = {
  /** Render badges on a thumbnail exactly once. Visibility is toggled via CSS on #thumbs. */
  render(thumbshotEl: HTMLElement, profile: PerformerProfile): void {
    if (thumbshotEl.hasAttribute('data-bp-badged')) return;
    thumbshotEl.setAttribute('data-bp-badged', 'true');

    const anchor = thumbshotEl.querySelector('a');
    if (!anchor) return;

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

      if (profile.body.boobs !== 'Unknown') {
        const color = profile.body.boobs === 'Natural' ? 'var(--bp-success)' : 'var(--bp-danger)';
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', '0 0 10 10');
        svg.setAttribute('width', '8');
        svg.setAttribute('height', '8');
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', profile.body.boobs);

        const title = document.createElementNS(svgNS, 'title');
        title.textContent = profile.body.boobs;
        svg.appendChild(title);

        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', '5');
        circle.setAttribute('cy', '5');
        circle.setAttribute('r', '4.5');
        circle.setAttribute('fill', color);
        svg.appendChild(circle);
        badge.appendChild(svg);
      }

      const span = document.createElement('span');
      span.style.verticalAlign = 'middle';
      span.textContent = profile.body.cup;
      badge.appendChild(span);

      anchor.appendChild(badge);
    }

    // Bottom-Right: Country Code
    if (profile.personal.countryCode) {
      const badge = document.createElement('div');
      badge.className = 'bp-badge bp-badge-bottom-right';
      badge.textContent = profile.personal.countryCode;
      anchor.appendChild(badge);
    }
  }
};

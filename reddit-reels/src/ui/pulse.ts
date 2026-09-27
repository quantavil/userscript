/**
 * Animated pulse feedback for play/pause and scale mode changes
 */

export function showPlayPulse(isPlaying: boolean): void {
  const existing = document.querySelector('.rr-play-pulse');
  if (existing) existing.remove();

  const pulse = document.createElement('div');
  pulse.className = 'rr-play-pulse';
  pulse.innerHTML = isPlaying
    ? `<svg width="44" height="44" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`
    : `<svg width="44" height="44" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;

  document.body.appendChild(pulse);
  setTimeout(() => pulse.remove(), 550);
}

export function showScalePulse(mode: string): void {
  const existing = document.querySelector('.rr-scale-pulse');
  if (existing) existing.remove();

  const pulse = document.createElement('div');
  pulse.className = 'rr-scale-pulse';
  pulse.textContent = mode;

  document.body.appendChild(pulse);
  setTimeout(() => pulse.remove(), 650);
}

export function showVotePulse(upvoted: boolean | null): void {
  const existing = document.querySelector('.rr-play-pulse');
  if (existing) existing.remove();

  if (upvoted === null) {
    // Vote cleared / removed: show neutral un-voted outline pulse
    const pulse = document.createElement('div');
    pulse.className = 'rr-play-pulse';
    pulse.innerHTML = `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7.5-4.9-10-9.5C.4 8.6 2.4 5 5.8 5c2 0 3.4 1.1 4.2 2.3h4C14.8 6.1 16.2 5 18.2 5c3.4 0 5.4 3.6 3.8 6.5C19.5 16.1 12 21 12 21z" transform="scale(0.9) translate(1.3,1.3)"></path></svg>`;
    document.body.appendChild(pulse);
    setTimeout(() => pulse.remove(), 550);
    return;
  }

  const pulse = document.createElement('div');
  pulse.className = 'rr-play-pulse';
  pulse.innerHTML = upvoted
    ? `<svg width="44" height="44" viewBox="0 0 24 24" fill="#ff4500"><path d="M12 21s-7.5-4.9-10-9.5C.4 8.6 2.4 5 5.8 5c2 0 3.4 1.1 4.2 2.3h4C14.8 6.1 16.2 5 18.2 5c3.4 0 5.4 3.6 3.8 6.5C19.5 16.1 12 21 12 21z" transform="scale(0.9) translate(1.3,1.3)"></path></svg>`
    : `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#7193ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

  document.body.appendChild(pulse);
  setTimeout(() => pulse.remove(), 550);
}

export function showVolumePulse(level: number, muted: boolean): void {
  const existing = document.querySelector('.rr-scale-pulse');
  if (existing) existing.remove();

  const pct = Math.round(level * 100);
  const pulse = document.createElement('div');
  pulse.className = 'rr-scale-pulse';
  pulse.textContent = muted || pct === 0 ? 'Muted' : `Volume ${pct}%`;

  document.body.appendChild(pulse);
  setTimeout(() => pulse.remove(), 650);
}

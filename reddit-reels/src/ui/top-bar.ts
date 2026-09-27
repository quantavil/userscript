/**
 * Top Bar UI Component for Reel Mode
 * Displays exit button, videos-only filter pill, and global sound toggle
 */

export interface TopBarHandlers {
  onExit: () => void;
  onToggleFilter: () => void;
  onToggleMute: () => void;
}

export function getSoundIconSvg(isMuted: boolean): string {
  return isMuted
    ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`
    : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
}

export function getFilterIconSvg(): string {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.5"></rect><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"></path></svg>`;
}

export function getFilterLabelHtml(videosOnly: boolean): string {
  return `<span class="rr-filter-icon">${getFilterIconSvg()}</span><span>${videosOnly ? 'Videos only' : 'All posts'}</span>`;
}

export function createTopBar(
  isMuted: boolean,
  videosOnly: boolean,
  handlers: TopBarHandlers
): HTMLElement {
  const topBar = document.createElement('div');
  topBar.className = 'rr-top-bar';

  // Exit button (X)
  const exitBtn = document.createElement('button');
  exitBtn.type = 'button';
  exitBtn.className = 'rr-exit-btn';
  exitBtn.setAttribute('aria-label', 'Exit Reel Mode');
  exitBtn.title = 'Exit Reel Mode';
  exitBtn.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
  exitBtn.onclick = (e) => {
    e.stopPropagation();
    handlers.onExit();
  };

  // Top Controls (Filter pill + Sound toggle)
  const controls = document.createElement('div');
  controls.className = 'rr-top-controls';

  // Filter button (Videos Only vs All Reels)
  const filterBtn = document.createElement('button');
  filterBtn.type = 'button';
  filterBtn.className = `rr-filter-btn-top ${videosOnly ? 'is-active' : ''}`;
  filterBtn.setAttribute('aria-label', 'Toggle Videos Only Filter');
  filterBtn.title = videosOnly
    ? 'Showing Videos Only (Click to show all)'
    : 'Showing All Reels (Click for videos only)';
  filterBtn.innerHTML = getFilterLabelHtml(videosOnly);
  filterBtn.onclick = (e) => {
    e.stopPropagation();
    handlers.onToggleFilter();
  };

  // Sound toggle button
  const soundBtn = document.createElement('button');
  soundBtn.type = 'button';
  soundBtn.className = `rr-sound-btn-top ${isMuted ? 'is-muted' : ''}`;
  soundBtn.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute');
  soundBtn.title = isMuted ? 'Unmute' : 'Mute';
  soundBtn.innerHTML = getSoundIconSvg(isMuted);
  soundBtn.onclick = (e) => {
    e.stopPropagation();
    handlers.onToggleMute();
  };

  controls.appendChild(filterBtn);
  controls.appendChild(soundBtn);

  topBar.appendChild(exitBtn);
  topBar.appendChild(controls);

  return topBar;
}

export function syncTopBarState(
  topBar: HTMLElement | null,
  isMuted: boolean,
  videosOnly: boolean
): void {
  if (!topBar) return;

  const filterBtn = topBar.querySelector<HTMLButtonElement>('.rr-filter-btn-top');
  if (filterBtn) {
    filterBtn.classList.toggle('is-active', videosOnly);
    filterBtn.title = videosOnly
      ? 'Showing Videos Only (Click to show all)'
      : 'Showing All Reels (Click for videos only)';
    filterBtn.innerHTML = getFilterLabelHtml(videosOnly);
  }

  const soundBtn = topBar.querySelector<HTMLButtonElement>('.rr-sound-btn-top');
  if (soundBtn) {
    soundBtn.classList.toggle('is-muted', isMuted);
    soundBtn.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute');
    soundBtn.title = isMuted ? 'Unmute' : 'Mute';
    soundBtn.innerHTML = getSoundIconSvg(isMuted);
  }
}

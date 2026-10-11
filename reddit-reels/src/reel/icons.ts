const svg = (body: string, fill = 'none') =>
  `<svg viewBox="0 0 24 24" width="26" height="26" fill="${fill}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  close: svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
  up: (on: boolean) => svg('<path d="M12 4l7 8h-4v8H9v-8H5z"/>', on ? 'currentColor' : 'none'),
  down: (on: boolean) => svg('<path d="M12 20l-7-8h4V4h6v8h4z"/>', on ? 'currentColor' : 'none'),
  comments: svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z"/>'),
  soundOn: svg(
    '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>',
  ),
  soundOff: svg(
    '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>',
  ),
  fit: svg(
    '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>',
  ),
  cc: svg('<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M10 10.5a2 2 0 1 0 0 3M17 10.5a2 2 0 1 0 0 3"/>'),
  external: svg(
    '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  ),
  play: svg('<polygon points="7 4 20 12 7 20 7 4"/>', 'currentColor'),
  pause: svg('<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>', 'currentColor'),
  heart: svg(
    '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    'currentColor',
  ),
  reel: svg(
    '<rect x="5" y="2" width="14" height="20" rx="3"/><polygon points="10 9 15 12 10 15 10 9" fill="currentColor"/>',
  ),
};

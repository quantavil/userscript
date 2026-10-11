const w = (inner: string, label: string) =>
  `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-label="${label}" role="img">${inner}</svg>`;

export const I = {  download: w('<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M4 21h16"/>', 'Download'),
  expand: w('<path d="M8 3H3v5"/><path d="M16 3h5v5"/><path d="M8 21H3v-5"/><path d="M16 21h5v-5"/>', 'Expand'),
  open: w('<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M20 14v6H4V4h6"/>', 'Open'),
  star: w('<path d="m12 3 2.7 5.8 6.3.8-4.6 4.3 1.2 6.1-5.6-3.1-5.6 3.1 1.2-6.1L3 9.6l6.3-.8z"/>', 'Favorite'),
  zap: w('<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>', 'HD info'),
  close: w('<path d="M6 6l12 12"/><path d="M18 6 6 18"/>', 'Close'),
  prev: w('<path d="m14 6-6 6 6 6"/>', 'Previous'),
  next: w('<path d="m10 6 6 6-6 6"/>', 'Next'),
  sliders: w('<path d="M4 8h10"/><path d="M18 8h2"/><circle cx="16" cy="8" r="2"/><path d="M4 16h4"/><path d="M12 16h8"/><circle cx="10" cy="16" r="2"/>', 'Grid size'),
  check: w('<path d="m4 12 5 5L20 6"/>', 'Done'),
  spin: `<svg class="wh-spin" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-label="Loading"><path d="M12 3a9 9 0 1 0 9 9"/></svg>`,
  chev: w('<path d="m6 9 6 6 6-6"/>', 'Details'),
};

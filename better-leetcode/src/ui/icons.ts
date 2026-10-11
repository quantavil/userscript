const wrap = (inner: string, size = 18) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const iconCopy = (size?: number) =>
  wrap(
    '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    size,
  );
export const iconCheck = (size?: number) => wrap('<path d="M20 6 9 17l-5-5"/>', size);
export const iconAlert = (size?: number) =>
  wrap(
    '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
    size,
  );
export const iconSettings = (size?: number) =>
  wrap('<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>', size);
export const iconClose = (size?: number) => wrap('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', size);

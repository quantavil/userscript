// Centralized SVG icon system — Lucide-inspired paths, programmatic creation (no innerHTML for Trusted Types)
const NS = 'http://www.w3.org/2000/svg';

function svg(size: number): SVGSVGElement {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('width', String(size));
  s.setAttribute('height', String(size));
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.75');
  s.setAttribute('stroke-linecap', 'round');
  s.setAttribute('stroke-linejoin', 'round');
  return s;
}

function p(parent: SVGSVGElement, d: string): void {
  const el = document.createElementNS(NS, 'path');
  el.setAttribute('d', d);
  parent.appendChild(el);
}

const PATHS: Record<string, string[]> = {
  folder: [
    'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z',
  ],
  folderOpen: [
    'M6 14l1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v1',
  ],
  file: [
    'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z',
    'M14 2v6h6',
  ],
  paperclip: [
    'm21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48',
  ],
  x: [
    'M18 6 6 18',
    'M6 6l12 12',
  ],
  chevronRight: [
    'm9 18 6-6-6-6',
  ],
  chevronDown: [
    'm6 9 6 6 6-6',
  ],
  arrowLeft: [
    'M19 12H5',
    'm12 19-7-7 7-7',
  ],
  plus: [
    'M12 5v14',
    'M5 12h14',
  ],
  download: [
    'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
    'm7 10 5 5 5-5',
    'M12 15V3',
  ],
  zap: [
    'M13 2 3 14h9l-1 8 10-12h-9l1-8z',
  ],
  search: [
    'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z',
    'm21 21-4.35-4.35',
  ],
  settings: [
    'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
    'M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0z',
  ],
  upload: [
    'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
    'm17 8-5-5-5 5',
    'M12 3v12',
  ],
};

export function icon(name: string, size = 16): SVGSVGElement {
  const s = svg(size);
  for (const d of PATHS[name] || []) p(s, d);
  return s;
}

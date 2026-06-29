const NS = 'http://www.w3.org/2000/svg';

function svg(size: number, strokeWidth: number = 2, fill: string = 'none', stroke: string = 'currentColor'): SVGSVGElement {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('width', String(size));
  s.setAttribute('height', String(size));
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('fill', fill);
  if (stroke !== 'none') {
    s.setAttribute('stroke', stroke);
    s.setAttribute('stroke-width', String(strokeWidth));
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
  }
  return s;
}

const PATHS: Record<string, { paths: string[]; isStroke: boolean; fill?: string; stroke?: string; viewBox?: string }> = {
  filter: {
    paths: ['M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z'],
    isStroke: false,
    fill: 'currentColor',
    stroke: 'none'
  },
  settings: {
    paths: [
      'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z'
    ],
    isStroke: false,
    fill: 'currentColor',
    stroke: 'none'
  },
  x: {
    paths: [
      'M18 6 6 18',
      'M6 6l12 12'
    ],
    isStroke: true
  },
  back: {
    paths: [
      'M19 12H5',
      'M12 19l-7-7 7-7'
    ],
    isStroke: true
  }
};

export function icon(name: string, size = 20, strokeWidth = 2): SVGSVGElement {
  const conf = PATHS[name];
  if (!conf) {
    return svg(size, strokeWidth);
  }

  const s = svg(size, strokeWidth, conf.fill || 'none', conf.stroke || 'currentColor');
  if (conf.viewBox) s.setAttribute('viewBox', conf.viewBox);

  conf.paths.forEach((d) => {
    const el = document.createElementNS(NS, 'path');
    el.setAttribute('d', d);
    if (!conf.isStroke) {
      el.setAttribute('fill', conf.fill || 'currentColor');
    }
    s.appendChild(el);
  });

  return s;
}

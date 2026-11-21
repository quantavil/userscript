import { EXCLUDE_FROM_PDF_SELECTOR, PAGE_STYLE_ID } from '../core/constants';

export function purgeLegacyFab(): void {
  if (typeof document === 'undefined') return;
  const legacy = document.getElementById('vls-evgm-pdf-fab-host');
  if (legacy) legacy.remove();
}

export function injectPageStyles(): void {
  purgeLegacyFab();
  if (document.getElementById(PAGE_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = PAGE_STYLE_ID;
  style.textContent = /* css */ `
    /* Suppress legacy standalone PDF FAB from older scripts to prevent duplicate buttons */
    #vls-evgm-pdf-fab-host,
    [id*="vls-evgm-pdf"] {
      display: none !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }

    #vgmSerachTable thead th {
      font-weight: 700 !important;
      color: #0f172a !important;
    }

    #vgmSerachTable tbody td {
      font-weight: 600 !important;
      color: #111827 !important;
      letter-spacing: 0.01em;
      -webkit-font-smoothing: antialiased;
    }

    @media print {
      ${EXCLUDE_FROM_PDF_SELECTOR} {
        display: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

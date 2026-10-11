/**
 * CSS injected at document-start.
 * Uses MutationObserver guard to handle document-start before head/documentElement exist.
 */

const CSS = `
/* ── Broker affiliate bar below header ─────────────────────────────────── */
.tlu-wrap                    { display: none !important; }

/* ── Broker promo cards inside nav mega-menu ───────────────────────────── */
.nmm-promo-strip             { display: none !important; }

/* ── Ad blocks / placeholders (site-wide) ──────────────────────────────── */
.ad-block,
.ad-placeholder,
.ad-ph-inner,
[class*="ad-970"],
[class*="ad-300"]            { display: none !important; }

/* ── Footer: full footer removal ───────────────────────────────────────── */
footer.site-footer,
.site-footer,
.adv-strip,
.ft-partners                 { display: none !important; }

/* ── Homepage: broker carousel & compare sections ──────────────────────── */
.broker-carousel-section,
.compare-section             { display: none !important; }

/* ── Sidebars: homepage, IPO detail & report pages ─────────────────────── */
/* Hides "Top Brokers", "Quick Links", "SME IPO Enquiry", "Open Demat" etc. */
aside.sidebar,
.sidebar,
aside.detail-side,
.detail-side,
aside.report-sidebar,
.report-sidebar,
.invest-cta,
.broker-cta-card             { display: none !important; }

/* ── IPO Detail & Report Pages: in-content affiliate ads & banners ──────── */
/* Hides "🚀 Apply for IPOs Online – Free Demat Account" banner */
.ipo-apply-section,
#ipoApplySection,
/* Hides Zerodha/AngelOne "Open Free Account →" cards inside details tables */
tr.ad-tr,
td.ad,
.ndrop-broker-card,
.nmm-ad-card,
.nmm-ad-img,
.mob-broker-list,
#stock-brokers-section,
#findYourBroker,
.find-your-broker-navbar     { display: none !important; }

/* ── Layout fixes: expand main content to full width ───────────────────── */
/* Collapse homepage grid from 2 columns (815px 280px) to full width */
.main-grid                   { grid-template-columns: 1fr !important; }

/* Collapse IPO detail page grid from 2 columns (975px 300px) to full width */
.detail-grid                 { grid-template-columns: 1fr !important; }
.detail-main                 { width: 100% !important; max-width: 100% !important; }

/* Collapse report page grid (GMP live, subscription, allotment) to full width */
.report-grid                 { grid-template-columns: 1fr !important; }


/* ── Table fix: TR gradients end in white — dark mode bug ──────────────── */
/* Site CSS sets background: linear-gradient(90deg, <dark-color> 0%,        */
/* rgb(255,255,255) 100%) on each TR. In light mode the white end           */
/* is invisible. In dark mode it covers the PRICE BAND / PERIOD cols.       */
/* Removing background-image lets the correct dark background-color         */
/* (already set by the site's own dark mode CSS) show through.              */
[data-theme="dark"] .gmp-table-creative tr { background-image: none !important; }


/* ── Section Dividers for Smart Relevance Sort (Table & Grid) ───────────── */
.big-section-divider td {
  padding: 10px 16px !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  letter-spacing: 0.2px;
  border-top: 1px solid #e2e8f0 !important;
  border-bottom: 1px solid #e2e8f0 !important;
}

.big-grid-divider {
  grid-column: 1 / -1 !important;
  width: 100% !important;
  padding: 10px 16px !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  border-radius: 8px !important;
  margin: 10px 0 4px 0 !important;
  border: 1px solid #e2e8f0 !important;
  box-sizing: border-box !important;
}

.big-divider-open,
.big-divider-open td {
  background: #ecfdf5 !important;
  color: #065f46 !important;
  border-color: #a7f3d0 !important;
}

.big-divider-upcoming,
.big-divider-upcoming td {
  background: #fffbeb !important;
  color: #92400e !important;
  border-color: #fde68a !important;
}

.big-divider-closed,
.big-divider-closed td {
  background: #f8fafc !important;
  color: #475569 !important;
  border-color: #e2e8f0 !important;
}

[data-theme="dark"] .big-section-divider td,
[data-theme="dark"] .big-grid-divider {
  border-color: #1e293b !important;
}

[data-theme="dark"] .big-divider-open,
[data-theme="dark"] .big-divider-open td {
  background: rgba(16, 185, 129, 0.15) !important;
  color: #6ee7b7 !important;
  border-color: rgba(16, 185, 129, 0.3) !important;
}

[data-theme="dark"] .big-divider-upcoming,
[data-theme="dark"] .big-divider-upcoming td {
  background: rgba(245, 158, 11, 0.15) !important;
  color: #fcd34d !important;
  border-color: rgba(245, 158, 11, 0.3) !important;
}

[data-theme="dark"] .big-divider-closed,
[data-theme="dark"] .big-divider-closed td {
  background: rgba(100, 116, 139, 0.15) !important;
  color: #94a3b8 !important;
  border-color: rgba(100, 116, 139, 0.3) !important;
}
`;

export function injectStyles(): void {
  const style = document.createElement('style');
  style.id = 'better-ig-styles';
  style.textContent = CSS;
  (document.head ?? document.documentElement)?.prepend(style);
}

/**
 * All colours come from AlternativeTo's own CSS custom properties, which the
 * site re-defines per theme — so this stylesheet follows dark mode for free.
 */
export const CSS = `
:root { --bat-top: 58px; }

/* ---------- links on cards ---------- */
.bat-links {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
  margin-top: 6px;
  grid-column: 1 / -1;
}
.bat-links-empty {
  font-size: 0.78em;
  color: var(--meta, #888);
  font-style: italic;
}
.bat-links-pending {
  height: 20px;
  border-radius: 5px;
  width: 190px;
  background: var(--gray150, #eee);
  opacity: 0.6;
}
.bat-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 9px;
  border-radius: 6px;
  font-size: 0.76em;
  font-weight: 500;
  line-height: 1;
  text-decoration: none !important;
  white-space: nowrap;
  border: 1px solid transparent;
  transition: filter 0.12s ease, transform 0.12s ease;
}
.bat-chip:hover { filter: brightness(1.12); transform: translateY(-1px); }
.bat-chip::before { font-size: 1.05em; line-height: 1; }
.bat-chip-official {
  background: var(--positiveGreenerLight, #e3f6ee);
  color: var(--positiveGreenerDark, #04724d) !important;
  border-color: color-mix(in srgb, var(--positiveGreener, #0a8) 35%, transparent);
}
.bat-chip-official::before { content: "\\1F310"; }
.bat-chip-source {
  background: var(--gray200, #22252b);
  color: var(--mainFg, #eee) !important;
  border-color: var(--gray300, #2c2f35);
}
.bat-chip-source::before { content: "\\276F"; font-weight: 700; }
.bat-chip-appstore {
  background: var(--brandLight3, #e7f2fb);
  color: var(--linkColor, #0b6fb8) !important;
}
.bat-chip-appstore::before { content: "\\2B07"; }
.bat-chip-social {
  background: transparent;
  color: var(--meta, #888) !important;
  border-color: var(--gray300, #ccc);
}
.bat-chip-social::before { content: "\\1F4AC"; }

/* ----------- pinned compact filter bar -----------
   Everything below is keyed off the site's own data-testid attributes rather
   than classes added from JS: React owns className on these nodes and wipes
   anything this script adds on its next re-render. */
html.bat-on nav:has(> [data-testid="app-filter-bar-wrapper"]) {
  position: static !important;
  z-index: auto !important;
}
html.bat-on [data-testid="app-filter-bar-wrapper"] { display: none !important; }

.bat-bar {
  position: sticky;
  top: var(--bat-top);
  z-index: 12;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  background: var(--mainBg, #fff);
  border: 1px solid var(--gray300, #d8dde3);
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
  margin: 0 0 10px;
  font-size: 14px;
  color: var(--mainFg, #222);
}
.bat-bar input,
.bat-bar button {
  font: inherit;
  color: inherit;
  background: var(--gray50, #f6f8fa);
  border: 1px solid var(--gray300, #d8dde3);
  border-radius: 8px;
  height: 30px;
  padding: 0 9px;
  box-sizing: border-box;
}
.bat-bar input:focus-visible,
.bat-bar button:focus-visible { outline: 2px solid var(--linkColor, #0b6fb8); outline-offset: 1px; }
.bat-search { flex: 1 1 190px; min-width: 130px; }
.bat-likes { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
.bat-likes::before { content: "\\2665"; color: #e0245e; }
.bat-likes input { width: 62px; text-align: center; padding: 0 4px; }
.bat-likes span { color: var(--meta, #888); }

.bat-toggle { cursor: pointer; white-space: nowrap; }
/* Fixed colours on purpose: --linkColor is a pale blue in dark mode, so white
   text on it was unreadable. This pair works against either theme. */
.bat-toggle[aria-pressed="true"] {
  background: #1665a8;
  border-color: #1665a8;
  color: #fff !important;
}
.bat-filters-btn { cursor: pointer; font-weight: 600; white-space: nowrap; }
.bat-filters-btn::after { content: " \\25BE"; }
html.bat-panel-open .bat-filters-btn::after { content: " \\25B4"; }
.bat-count { margin-left: auto; color: var(--meta, #888); white-space: nowrap; font-size: 0.9em; }
.bat-reset { cursor: pointer; }

.bat-chips { display: flex; flex-wrap: wrap; gap: 6px; width: 100%; }
.bat-chips:empty { display: none; }
.bat-facet {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 6px 0 9px;
  border-radius: 7px;
  font-size: 0.8em;
  background: var(--brandLight3, #e7f2fb);
  color: var(--linkColor, #0b6fb8);
  text-decoration: none !important;
}
.bat-facet b { font-weight: 600; }
.bat-facet::after { content: "\\2715"; opacity: 0.6; font-size: 1.05em; }
.bat-facet:hover::after { opacity: 1; }

/* The site's own facet panel, hidden at rest and shown untouched when opened —
   no box, no cap, no scroller: its native multi-column layout is the one that
   reads well, and constraining it only ever made it worse. */
html.bat-on:not(.bat-panel-open) [data-testid="app-filter-bar"] { display: none !important; }

/* An attribute, not a class — React rewrites className on the cards. */
[data-bat-hide] { display: none !important; }
.bat-empty-note {
  padding: 26px 14px;
  text-align: center;
  color: var(--meta, #888);
}

/* ---------- dark mode button in the header ---------- */
.bat-theme {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  margin: 0 4px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 8px;
  background: transparent;
  color: #fff;
  font-size: 15px;
  line-height: 1;
  padding: 0;
}
.bat-theme:hover { background: rgba(255, 255, 255, 0.16); }

@media (max-width: 640px) {
  .bat-bar { gap: 6px; padding: 6px 10px; border-radius: 10px; }
  /* 16px or iOS zooms the whole page in when the field is focused. */
  .bat-bar input { font-size: 16px; }
  .bat-bar input, .bat-bar button { height: 34px; }
  .bat-search { flex-basis: 100%; min-width: 0; }
  .bat-likes { flex: 1 1 130px; }
  .bat-likes input { width: 100%; min-width: 0; }
  .bat-toggle, .bat-filters-btn { flex: 1 1 auto; }
  .bat-count { margin-left: 0; width: 100%; text-align: right; }
}
`;

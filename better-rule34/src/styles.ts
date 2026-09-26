export const CSS = `
/* ==========================================================================
   Better Rule34Video - Industrial Brutalism + Erotic Latex Edition
   ========================================================================== */

/* --- SITE-WIDE THEME ENHANCEMENTS --- */
body {
  background: #08060a !important;
  color: #e5e5e9 !important;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
}

/* Base substrate texture */
body::before {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 99999;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 3px,
    rgba(255, 0, 85, 0.015) 3px,
    rgba(255, 0, 85, 0.015) 6px
  );
  opacity: 0.6;
}

/* Header & Container Cleanup */
.header {
  background: #0a070e !important;
  border-bottom: 1px solid #ff0055 !important;
  box-shadow: 0 4px 20px rgba(255, 0, 85, 0.15) !important;
}

.logo a svg {
  filter: drop-shadow(0 0 8px rgba(255, 0, 85, 0.6));
}

.headline .title {
  font-family: 'JetBrains Mono', 'IBM Plex Mono', monospace !important;
  text-transform: uppercase !important;
  letter-spacing: 0.06em !important;
  color: #ffffff !important;
  border-left: 3px solid #ff0055;
  padding-left: 10px;
}

/* Card Enhancements - Brutalist Erotic Precision Frame */
.item.thumb {
  background: #0e0a14 !important;
  border: 1px solid rgba(255, 0, 85, 0.25) !important;
  border-radius: 4px !important;
  padding: 6px 6px 8px 6px !important;
  margin-bottom: 16px !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.7) !important;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}

.item.thumb:hover {
  transform: translateY(-3px) !important;
  border-color: #ff0055 !important;
  box-shadow: 0 8px 24px rgba(255, 0, 85, 0.35), 0 0 10px rgba(255, 0, 85, 0.15) !important;
}

.item.thumb a.th,
.item.thumb .th {
  display: block !important;
  text-decoration: none !important;
  color: inherit !important;
  width: 100% !important;
  outline: none !important;
}

.item.thumb .img.wrap_image,
.item.thumb .wrap_image,
.th .wrap_image {
  position: relative !important;
  border-radius: 2px !important;
  overflow: hidden !important;
  background: #050307 !important;
  border: 1px solid rgba(255, 255, 255, 0.06) !important;
  width: 100% !important;
  display: block !important;
}

.item.thumb .wrap_image img {
  width: 100% !important;
  height: auto !important;
  display: block !important;
}

.item.thumb .thumb_title {
  color: #f1f1f5 !important;
  font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
  font-size: 12.5px !important;
  font-weight: 600 !important;
  line-height: 1.35 !important;
  height: 2.7em !important;
  max-height: 2.7em !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  display: -webkit-box !important;
  -webkit-box-orient: vertical !important;
  -webkit-line-clamp: 2 !important;
  margin: 6px 0 4px 0 !important;
  padding: 0 2px !important;
  transition: color 0.15s ease !important;
}

.item.thumb:hover .thumb_title {
  color: #ff0055 !important;
}



/* Metadata Row (Clean 2-item layout: Rating on left, Views on right - NO overlap) */
.item.thumb .thumb_info,
.item.thumb .video-card-meta {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 6px !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 11px !important;
  color: #8c8998 !important;
  padding: 2px 2px 0 2px !important;
  margin: 0 !important;
  line-height: 1.2 !important;
  width: 100% !important;
  box-sizing: border-box !important;
}

/* Rating */
.item.thumb .thumb_info .rating,
.item.thumb .video-card-meta__rating {
  color: #00e676 !important;
  font-weight: 700 !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 3px !important;
  white-space: nowrap !important;
}

.item.thumb .thumb_info .rating svg,
.item.thumb .video-card-meta__rating svg {
  fill: #00e676 !important;
  width: 12px !important;
  height: 12px !important;
}

/* Views (Explicitly targeting video-views-count so comment count is never matched) */
.item.thumb .video-views-count,
.item.thumb .video-card-meta__views {
  color: #a5a2b3 !important;
  font-weight: 700 !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 3px !important;
  white-space: nowrap !important;
}

.item.thumb .video-views-count svg,
.item.thumb .video-card-meta__views svg {
  fill: #a5a2b3 !important;
  width: 12px !important;
  height: 12px !important;
}

/* HIDE "x min / hours ago" as requested */
.item.thumb .thumb_info .added,
.item.thumb .video-card-meta__date,
.item.thumb .added,
.thumb_info .added,
.video-card-meta__date {
  display: none !important;
  visibility: hidden !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}

/* HIDE comments on cards only (scoped: watch-page #comments_box untouched) */
.item.thumb .video-comments-count,
.item.thumb .video-card-meta__comments,
.item.thumb .comments,
.item.thumb .comments-count,
.item.thumb [class*="comment" i],
.item.thumb [title*="comment" i],
.item.thumb [aria-label*="comment" i],
.item.thumb .thumb_info .comments {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  width: 0 !important;
  height: 0 !important;
  pointer-events: none !important;
}

/* Suppress ads */
.spot-thumb,
.spots,
.sidebar_ad_buttons,
.footer_spots,
ins.adsbyjuicy,
.item.thumb:has(header),
.item.thumb:has(iframe) {
  display: none !important;
}

.item.thumb[data-br34-hidden="true"] {
  display: none !important;
}

/* ==========================================================================
   Rethemed Native Filters & Sorting Panel (Industrial Brutalist)
   ========================================================================== */
.filters-panel {
  display: block !important;
  background: #0e0a14 !important;
  border: 1px solid rgba(255, 0, 85, 0.35) !important;
  border-radius: 6px !important;
  margin: 14px 0 20px 0 !important;
  padding: 0 !important;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.7), 0 0 15px rgba(255, 0, 85, 0.1) !important;
  overflow: hidden !important;
  font-family: 'JetBrains Mono', monospace !important;
}

.filters-panel__toggle {
  width: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 10px 16px !important;
  background: rgba(16, 10, 22, 0.95) !important;
  border: none !important;
  border-bottom: 1px solid rgba(255, 0, 85, 0.25) !important;
  color: #ff0055 !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 11.5px !important;
  font-weight: 800 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
  cursor: pointer !important;
  outline: none !important;
  transition: background 0.15s ease, color 0.15s ease !important;
}

.filters-panel__toggle:hover {
  background: rgba(255, 0, 85, 0.12) !important;
  color: #ffffff !important;
}

.filters-panel__toggle-icon {
  fill: #ff0055 !important;
  width: 12px !important;
  height: 12px !important;
  transition: transform 0.2s ease !important;
}

.filters-panel__toggle[aria-expanded="false"] .filters-panel__toggle-icon {
  transform: rotate(-90deg) !important;
}

/* Collapsed state (wired by nativefilter.ts): hide the body, flatten toggle */
.filters-panel.br34-collapsed .filters-panel__body {
  display: none !important;
}

.filters-panel__toggle[aria-expanded="false"] {
  border-bottom: none !important;
}

.filters-panel__body {
  padding: 14px 16px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
  background: #0a070e !important;
}

.filters-panel__section {
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
  border-bottom: 1px dashed rgba(255, 0, 85, 0.15) !important;
  padding-bottom: 10px !important;
}

.filters-panel__section:last-child {
  border-bottom: none !important;
  padding-bottom: 0 !important;
}

.filters-panel__label,
.filters-group__label {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  font-size: 10px !important;
  font-weight: 800 !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
  color: #9893a6 !important;
  margin-bottom: 2px !important;
}

.filters-panel__label svg,
.filters-group__label svg {
  fill: #ff0055 !important;
  width: 12px !important;
  height: 12px !important;
}

.filters-panel .btn,
.filters-panel__controls--chips .btn,
.filters-group__controls .btn {
  background: #0f0b17 !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 4px !important;
  color: #a39eb0 !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
  padding: 5px 10px !important;
  text-decoration: none !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  transition: all 0.14s ease !important;
  line-height: 1.3 !important;
}

.filters-panel .btn:hover,
.filters-panel__controls--chips .btn:hover,
.filters-group__controls .btn:hover {
  border-color: #ff0055 !important;
  color: #ffffff !important;
  box-shadow: 0 0 8px rgba(255, 0, 85, 0.3) !important;
}

.filters-panel .btn.active,
.filters-panel__controls--chips .btn.active,
.filters-group__controls .btn.active {
  background: #ff0055 !important;
  border-color: #ff0055 !important;
  color: #000000 !important;
  font-weight: 900 !important;
  box-shadow: 0 0 10px rgba(255, 0, 85, 0.55) !important;
}

.filters-panel .btn_custom {
  position: relative !important;
  background: #0f0b17 !important;
  border: 1px solid rgba(255, 0, 85, 0.35) !important;
  color: #ffffff !important;
}

.filters-panel .date-filter-dropdown,
.filters-panel .filter-custom {
  background: #0e0a14 !important;
  border: 1px solid #ff0055 !important;
  border-radius: 4px !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.9), 0 0 15px rgba(255, 0, 85, 0.25) !important;
  padding: 4px 0 !important;
  z-index: 1000 !important;
}

.filters-panel .date-filter-dropdown li a,
.filters-panel .filter-custom li a {
  color: #c5c2d3 !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 10px !important;
  padding: 5px 12px !important;
  display: block !important;
  text-decoration: none !important;
  transition: background 0.12s ease, color 0.12s ease !important;
}

.filters-panel .date-filter-dropdown li a:hover,
.filters-panel .filter-custom li a:hover {
  background: rgba(255, 0, 85, 0.15) !important;
  color: #ff0055 !important;
}

.filters-panel .date-filter-dropdown li a.active,
.filters-panel .filter-custom li a.active {
  background: #ff0055 !important;
  color: #000000 !important;
  font-weight: 800 !important;
}

.filters-panel input[type="date"],
.filters-panel input[type="number"],
.filters-panel .duration-filter__input {
  background: #050307 !important;
  border: 1px solid rgba(255, 0, 85, 0.35) !important;
  border-radius: 4px !important;
  color: #ffffff !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 10px !important;
  padding: 4px 8px !important;
  outline: none !important;
  transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
}

.filters-panel input[type="date"]:focus,
.filters-panel input[type="number"]:focus,
.filters-panel .duration-filter__input:focus {
  border-color: #ff0055 !important;
  box-shadow: 0 0 8px rgba(255, 0, 85, 0.4) !important;
}

.filters-panel .duration-filter__label {
  color: #9893a6 !important;
  font-size: 9.5px !important;
  font-weight: 700 !important;
  margin-right: 4px !important;
}

.filters-panel .duration-filter__apply {
  background: rgba(18, 12, 24, 0.9) !important;
  border: 1px solid rgba(255, 0, 85, 0.4) !important;
  border-radius: 4px !important;
  color: #e5e5eb !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 10px !important;
  font-weight: 800 !important;
  padding: 4px 10px !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

.filters-panel .duration-filter__apply:hover {
  background: #ff0055 !important;
  color: #000000 !important;
  box-shadow: 0 0 8px rgba(255, 0, 85, 0.6) !important;
}

/* ==========================================================================
   Floating Brutalist FAB Button
   ========================================================================== */
.br34-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2147483647;
  height: 40px;
  padding: 0 14px;
  border-radius: 8px;
  background: rgba(9, 6, 13, 0.95);
  border: 1px solid #ff0055;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.8), 0 0 14px rgba(255, 0, 85, 0.35);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  outline: none;
  user-select: none;
  transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.br34-fab:hover {
  background: #ff0055;
  color: #000000;
  box-shadow: 0 0 25px rgba(255, 0, 85, 0.8);
  transform: translateY(-2px);
}

.br34-fab:active {
  transform: translateY(0);
}

.br34-fab-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff0055;
  box-shadow: 0 0 8px #ff0055;
  display: inline-block;
  animation: br34-dot-blink 1.4s infinite ease-in-out;
}

@media (prefers-reduced-motion: reduce) {
  .br34-fab-dot,
  .br34-spinner {
    animation: none;
  }
}

.br34-fab:hover .br34-fab-dot {
  background: #000000;
  box-shadow: none;
}

@keyframes br34-dot-blink {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(0.7); }
}

.br34-fab-badge {
  background: #ff0055;
  color: #000000;
  font-size: 10px;
  font-weight: 900;
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 2px;
}

/* ==========================================================================
   Floating Brutalist Telemetry Modal (Vertical Console)
   ========================================================================== */
.br34-panel {
  position: fixed;
  bottom: 74px;
  right: 24px;
  z-index: 2147483646;
  width: 290px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 90px);
  background: rgba(10, 7, 14, 0.97);
  border: 1px solid rgba(255, 0, 85, 0.45);
  border-radius: 8px;
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.95), 0 0 25px rgba(255, 0, 85, 0.22);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  display: flex;
  flex-direction: column;
  color: #e5e5eb;
  font-family: 'JetBrains Mono', monospace;
  overflow: hidden;
  opacity: 0;
  transform: translateY(12px) scale(0.98);
  pointer-events: none;
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.br34-panel.open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

/* Header */
.br34-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 0, 85, 0.25);
  background: rgba(16, 10, 22, 0.95);
}

.br34-title-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.br34-title {
  font-size: 11.5px;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #ff0055;
  text-transform: uppercase;
}

.br34-title-sub {
  font-size: 9.5px;
  font-weight: 700;
  color: #9c97a8;
  letter-spacing: 0.05em;
}

.br34-panel-close {
  background: transparent;
  border: 1px solid rgba(255, 0, 85, 0.4);
  color: #ff0055;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.br34-panel-close:hover {
  background: #ff0055;
  color: #000000;
  box-shadow: 0 0 10px rgba(255, 0, 85, 0.7);
}

/* Body */
.br34-panel-body {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 11px;
  overflow-y: auto;
  max-height: calc(100vh - 165px);
}

/* Search input */
.br34-search-box {
  width: 100%;
  margin: 0;
}

.br34-search-input {
  width: 100%;
  height: 32px;
  background: rgba(5, 3, 7, 0.95);
  border: 1px solid rgba(255, 0, 85, 0.35);
  border-radius: 5px;
  color: #ffffff;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  padding: 6px 10px;
  outline: none;
  box-sizing: border-box;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.br34-search-input:focus {
  border-color: #ff0055;
  box-shadow: 0 0 10px rgba(255, 0, 85, 0.4);
}

/* Sliders Stack (Vertical orientation) */
.br34-sliders-vertical {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin: 0;
  padding: 0;
}

.br34-slider-card {
  display: flex;
  flex-direction: column;
}

.br34-sect-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 9.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9893a6;
  margin-bottom: 2px;
}

.br34-sect-val {
  color: #ffffff;
  font-weight: 800;
  font-size: 9.5px;
  background: rgba(255, 0, 85, 0.15);
  border: 1px solid rgba(255, 0, 85, 0.6);
  border-radius: 3px;
  padding: 1px 6px;
}

.br34-range-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: #1c1322;
  outline: none;
  cursor: pointer;
  margin: 3px 0;
  accent-color: #ff0055;
}

.br34-range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ff0055;
  border: 1px solid #ffffff;
  box-shadow: 0 0 8px #ff0055;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.br34-range-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
  background: #ffffff;
  border-color: #ff0055;
}

.br34-range-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ff0055;
  border: 1px solid #ffffff;
  box-shadow: 0 0 8px #ff0055;
  cursor: pointer;
}

/* Grid 2x2 for Tactile Toggles */
.br34-grid-2x2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  width: 100%;
  margin: 0;
}

/* Chips in grid */
.br34-chip {
  background: #0f0b17;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 5px;
  color: #a39eb0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 7px 4px;
  text-align: center;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all 0.14s ease;
  line-height: 1.2;
}

.br34-chip:hover {
  border-color: #ff0055;
  color: #ffffff;
}

.br34-chip.active {
  background: #ff0055;
  border-color: #ff0055;
  color: #000000;
  font-weight: 900;
  box-shadow: 0 0 10px rgba(255, 0, 85, 0.55);
}

.br34-chip.active-purple {
  background: #bf00ff;
  border-color: #bf00ff;
  color: #000000;
  font-weight: 900;
  box-shadow: 0 0 10px rgba(191, 0, 255, 0.55);
}

/* Footer Actions */
.br34-panel-footer {
  padding: 10px 14px;
  border-top: 1px solid rgba(255, 0, 85, 0.25);
  display: flex;
  background: rgba(16, 10, 22, 0.95);
}

.br34-btn-reset {
  width: 100%;
  background: rgba(18, 12, 24, 0.9);
  border: 1px solid rgba(255, 0, 85, 0.4);
  border-radius: 5px;
  color: #e5e5eb;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}

.br34-btn-reset:hover {
  background: #ff0055;
  border-color: #ff0055;
  color: #000000;
  box-shadow: 0 0 14px rgba(255, 0, 85, 0.6);
}

/* ==========================================================================
   Auto-Pager Telemetry Status
   ========================================================================== */
.br34-autopager-container {
  width: 100%;
  margin: 30px 0 50px;
  text-align: center;
  clear: both;
}

.br34-autopager-loading {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: rgba(9, 6, 13, 0.95);
  border: 1px solid #ff0055;
  border-radius: 6px;
  padding: 8px 18px;
  color: #ffffff;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  box-shadow: 0 0 15px rgba(255, 0, 85, 0.35);
}

.br34-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 0, 85, 0.2);
  border-top-color: #ff0055;
  border-radius: 50%;
  animation: br34-spin 0.6s linear infinite;
}

@keyframes br34-spin {
  to { transform: rotate(360deg); }
}

.br34-autopager-end {
  display: inline-block;
  background: rgba(9, 6, 13, 0.95);
  border: 1px solid rgba(255, 0, 85, 0.3);
  border-radius: 6px;
  color: #8c8998;
  font-family: 'JetBrains Mono', monospace;
  padding: 8px 18px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.br34-load-more-btn {
  background: #ff0055;
  border: 1px solid #ff0055;
  border-radius: 6px;
  color: #000000;
  font-family: 'JetBrains Mono', monospace;
  padding: 8px 20px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 0 15px rgba(255, 0, 85, 0.4);
  transition: all 0.15s ease;
}

.br34-load-more-btn:hover {
  background: #ffffff;
  border-color: #ffffff;
  color: #000000;
}

/* ==========================================================================
    Page separator (auto-pager batch boundary: [ PAGE N ])
    ========================================================================== */
.br34-page-sep {
  width: 100%;
  flex-basis: 100%;
  grid-column: 1 / -1;
  clear: both;
  text-align: center;
  margin: 18px 0 22px;
  padding: 7px 0;
  border-top: 1px dashed rgba(255, 0, 85, 0.4);
  border-bottom: 1px dashed rgba(255, 0, 85, 0.4);
  color: #ff0055;
  background: rgba(255, 0, 85, 0.05);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.1em;
  user-select: none;
}

/* ==========================================================================
    Dock (bookmark button + CTRL fab, bottom-right)
    ========================================================================== */
.br34-dock {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 8px;
}

.br34-dock .br34-fab {
  position: static;
}

.br34-bookmark-btn {
  height: 40px;
  width: 40px;
  padding: 0;
  border-radius: 8px;
  background: rgba(9, 6, 13, 0.95);
  border: 1px solid #ff0055;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.8), 0 0 14px rgba(255, 0, 85, 0.35);
  color: #ff0055;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  outline: none;
  user-select: none;
  transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.br34-bookmark-btn:hover {
  background: #ff0055;
  color: #000000;
  box-shadow: 0 0 25px rgba(255, 0, 85, 0.8);
  transform: translateY(-2px);
}

.br34-bookmark-btn.saved {
  background: #ff0055;
  color: #000000;
  box-shadow: 0 0 25px rgba(255, 0, 85, 0.8);
}

.br34-bookmark-btn.saved svg {
  fill: currentColor;
}

/* Card Bookmark Ribbon */
.br34-card-bookmark {
  position: absolute !important;
  top: 6px !important;
  right: 6px !important;
  z-index: 15 !important;
  width: 26px !important;
  height: 26px !important;
  padding: 0 !important;
  background: rgba(10, 7, 14, 0.85) !important;
  border: 1px solid rgba(255, 0, 85, 0.45) !important;
  border-radius: 4px !important;
  color: #ff0055 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  opacity: 0 !important;
  transform: scale(0.9) !important;
  transition: all 0.15s ease !important;
  outline: none !important;
}

.item.thumb:hover .br34-card-bookmark {
  opacity: 1 !important;
  transform: scale(1) !important;
}

.br34-card-bookmark:hover {
  background: #ff0055 !important;
  color: #000000 !important;
  box-shadow: 0 0 10px rgba(255, 0, 85, 0.8) !important;
}

.br34-card-bookmark.saved {
  opacity: 1 !important;
  transform: scale(1) !important;
  background: #ff0055 !important;
  color: #000000 !important;
  box-shadow: 0 0 10px rgba(255, 0, 85, 0.6) !important;
}

.br34-card-bookmark.saved svg {
  fill: currentColor !important;
}

/* Dock Bookmark Badge */
.br34-bookmark-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ff0055;
  color: #000000;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 900;
  padding: 1px 5px;
  border-radius: 4px;
  box-shadow: 0 0 8px rgba(255, 0, 85, 0.7);
  line-height: 1.1;
}

/* Micro Toast */
.br34-toast {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  z-index: 2147483647;
  background: rgba(10, 7, 14, 0.96);
  border: 1px solid #ff0055;
  border-radius: 6px;
  color: #ffffff;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 8px 18px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.9), 0 0 16px rgba(255, 0, 85, 0.4);
  opacity: 0;
  pointer-events: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  text-transform: uppercase;
}

.br34-toast.visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* EROS Archive Modal */
.br34-archive-modal {
  position: fixed;
  bottom: 74px;
  right: 24px;
  z-index: 2147483646;
  width: 380px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 90px);
  background: rgba(10, 7, 14, 0.97);
  border: 1px solid rgba(255, 0, 85, 0.45);
  border-radius: 8px;
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.95), 0 0 25px rgba(255, 0, 85, 0.22);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  display: flex;
  flex-direction: column;
  color: #e5e5eb;
  font-family: 'JetBrains Mono', monospace;
  overflow: hidden;
  opacity: 0;
  transform: translateY(12px) scale(0.98);
  pointer-events: none;
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.br34-archive-modal.open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.br34-archive-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: rgba(16, 10, 22, 0.95);
  border-bottom: 1px solid rgba(255, 0, 85, 0.25);
}

.br34-archive-tab {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #9c97a8;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 8px 10px;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s ease;
}

.br34-archive-tab:hover {
  color: #ffffff;
  background: rgba(255, 0, 85, 0.08);
}

.br34-archive-tab.active {
  color: #ff0055;
  border-bottom-color: #ff0055;
  background: rgba(255, 0, 85, 0.12);
}

.br34-archive-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  max-height: calc(100vh - 200px);
}

.br34-archive-toolbar {
  width: 100%;
  margin-bottom: 4px;
}

.br34-btn-mark-sector {
  width: 100%;
  background: rgba(18, 12, 24, 0.9);
  border: 1px solid rgba(255, 0, 85, 0.45);
  border-radius: 5px;
  color: #ff0055;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}

.br34-btn-mark-sector:hover {
  background: #ff0055;
  color: #000000;
  box-shadow: 0 0 12px rgba(255, 0, 85, 0.6);
}

.br34-btn-mark-sector.saved {
  background: rgba(255, 0, 85, 0.2);
  border-color: #ff0055;
  color: #ffffff;
}

.br34-archive-empty {
  text-align: center;
  padding: 30px 15px;
  color: #7d798a;
  font-size: 10.5px;
  line-height: 1.5;
}

.br34-archive-empty-title {
  color: #ff0055;
  font-weight: 800;
  margin-bottom: 6px;
  letter-spacing: 0.08em;
}

.br34-archive-empty-sub {
  font-size: 9.5px;
}

.br34-archive-list,
.br34-video-archive-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.br34-archive-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #0e0a14;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-left: 3px solid #ff0055;
  border-radius: 4px;
  padding: 7px 10px;
  gap: 8px;
  transition: border-color 0.15s ease;
}

.br34-archive-item:hover {
  border-color: rgba(255, 0, 85, 0.4);
  border-left-color: #ff0055;
}

.br34-archive-item.is-current {
  border-color: #ff0055;
  background: rgba(255, 0, 85, 0.08);
}

.br34-archive-item-main {
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
}

.br34-archive-item-title {
  font-size: 11px;
  font-weight: 800;
  color: #f1f1f5;
  letter-spacing: 0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.br34-archive-item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 9.5px;
  color: #8c8998;
}

.br34-tag-page {
  color: #ff0055;
  font-weight: 800;
}

.br34-archive-item-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.br34-btn-jump {
  background: #ff0055;
  border: 1px solid #ff0055;
  border-radius: 3px;
  color: #000000;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px;
  font-weight: 900;
  padding: 3px 8px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.12s ease;
}

.br34-btn-jump:hover {
  background: #ffffff;
  border-color: #ffffff;
  color: #000000;
}

.br34-btn-del {
  background: transparent;
  border: 1px solid rgba(255, 0, 85, 0.3);
  border-radius: 3px;
  color: #ff0055;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px;
  font-weight: 800;
  padding: 3px 6px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.br34-btn-del:hover {
  background: #ff0055;
  color: #000000;
}

.br34-video-archive-card {
  display: flex;
  align-items: center;
  background: #0e0a14;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 6px;
  gap: 8px;
  transition: border-color 0.15s ease;
}

.br34-video-archive-card:hover {
  border-color: rgba(255, 0, 85, 0.45);
}

.br34-video-archive-thumb-wrap {
  position: relative;
  width: 58px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 2px;
  overflow: hidden;
  background: #050307;
}

.br34-video-archive-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.br34-video-archive-dur {
  position: absolute;
  bottom: 2px;
  right: 2px;
  background: rgba(0, 0, 0, 0.85);
  color: #ffffff;
  font-size: 8px;
  font-weight: 700;
  padding: 1px 3px;
  border-radius: 2px;
  line-height: 1;
}

.br34-video-archive-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.br34-video-archive-title {
  font-size: 10.5px;
  font-weight: 700;
  color: #e5e5eb;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.br34-video-archive-title:hover {
  color: #ff0055;
}

.br34-video-archive-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 9px;
  color: #8c8998;
}

.br34-video-archive-rating {
  color: #00e676;
  font-weight: 700;
}

.br34-video-archive-views {
  color: #a5a2b3;
}

.br34-video-archive-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.br34-archive-footer {
  padding: 8px 12px;
  border-top: 1px solid rgba(255, 0, 85, 0.25);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  background: rgba(16, 10, 22, 0.95);
}

.br34-archive-action-btn {
  flex: 1;
  background: rgba(18, 12, 24, 0.9);
  border: 1px solid rgba(255, 0, 85, 0.35);
  border-radius: 4px;
  color: #e5e5eb;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px;
  font-weight: 800;
  padding: 5px 4px;
  cursor: pointer;
  text-align: center;
  transition: all 0.12s ease;
  white-space: nowrap;
}

.br34-archive-action-btn:hover {
  background: #ff0055;
  color: #000000;
}

.br34-archive-action-btn.danger {
  border-color: rgba(255, 0, 85, 0.6);
  color: #ff0055;
}

.br34-archive-action-btn.danger:hover {
  background: #ff0055;
  color: #000000;
}

/* ==========================================================================
    Mobile Specific
    ========================================================================== */
@media (max-width: 480px) {
  .br34-dock {
    bottom: 16px;
    right: 16px;
  }

  .br34-bookmark-btn {
    height: 38px;
    width: 38px;
  }

  .br34-fab {
    bottom: 16px;
    right: 16px;
    height: 38px;
    padding: 0 12px;
    font-size: 11px;
  }

  .br34-panel,
  .br34-archive-modal {
    right: 10px;
    bottom: 60px;
    width: calc(100vw - 20px);
    max-width: 340px;
  }

  .br34-panel-header {
    padding: 8px 12px;
  }

  .br34-panel-body,
  .br34-archive-body {
    padding: 10px 12px;
    gap: 10px;
  }

  .br34-sliders-vertical {
    gap: 7px;
  }

  .br34-chip {
    font-size: 9.5px;
    padding: 6px 2px;
  }

  .br34-panel-footer,
  .br34-archive-footer {
    padding: 8px 12px;
  }
}
`;


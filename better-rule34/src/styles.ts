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


/* HIDE comments on cards only (watch-page #comments_box untouched) */
.item.thumb .video-comments-count,
.item.thumb [class*="comment" i] {
  display: none !important;
}


/* Suppress ads */
.spot-thumb,
.spots,
.sidebar_ad_buttons,
.footer_spots,
ins.adsbyjuicy {
  display: none !important;
}


.item.thumb[data-br34-hidden="true"] {
  display: none !important;
}

/* ==========================================================================
   Better Rule34Video
   ========================================================================== */

/* Autopager status: loading, end of list, retry */
.br34-sentinel { height: 1px; }
.br34-autopager-container { width: 100%; margin: 30px 0 50px; text-align: center; clear: both; }
.br34-autopager-loading {
  display: inline-flex; align-items: center; gap: 10px;
  background: rgba(9, 6, 13, 0.95); border: 1px solid #ff0055; border-radius: 6px;
  padding: 8px 18px; color: #fff;
  font: 700 11px/1 'JetBrains Mono', monospace; letter-spacing: 0.08em; text-transform: uppercase;
}
.br34-spinner {
  width: 12px; height: 12px; border: 2px solid rgba(255, 0, 85, 0.2); border-top-color: #ff0055;
  border-radius: 50%; animation: br34-spin 0.6s linear infinite;
}
@keyframes br34-spin { to { transform: rotate(360deg); } }
.br34-autopager-end {
  display: inline-block; background: rgba(9, 6, 13, 0.95); border: 1px solid rgba(255, 0, 85, 0.3);
  border-radius: 6px; color: #8c8998; padding: 8px 18px;
  font: 700 11px/1.4 'JetBrains Mono', monospace; letter-spacing: 0.08em; text-transform: uppercase;
}
.br34-autopager-error { border-color: #ff0055; color: #ff0055; }
.br34-retry {
  margin-left: 6px; padding: 4px 10px; color: #ff0055; background: transparent;
  border: 1px solid #ff0055; border-radius: 4px; cursor: pointer;
  font: 800 10px/1 'JetBrains Mono', monospace; letter-spacing: 0.08em;
}
.br34-retry:hover { background: #ff0055; color: #000; }

/* Page boundary between auto-loaded pages */
.br34-page-sep {
  width: 100%; flex-basis: 100%; grid-column: 1 / -1; clear: both; text-align: center;
  margin: 18px 0 22px; padding: 7px 0;
  border-top: 1px dashed rgba(255, 0, 85, 0.4); border-bottom: 1px dashed rgba(255, 0, 85, 0.4);
  color: #ff0055; background: rgba(255, 0, 85, 0.05);
  font: 800 10.5px/1.4 'JetBrains Mono', monospace; letter-spacing: 0.1em; user-select: none;
}

/* Watched cards: a dark, desaturated layer over the whole thumbnail.
   It does not depend on which element or class the site uses for the image. */
.item.thumb.br34-watched .wrap_image::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 4;
  background: rgba(8, 6, 10, 0.55);
  backdrop-filter: grayscale(1);
  -webkit-backdrop-filter: grayscale(1);
  pointer-events: none;
}
.item.thumb.br34-watched .thumb_title,
.item.thumb.br34-watched .thumb_info { opacity: 0.5; }
.item.thumb .wrap_image .time,
.item.thumb .wrap_image .quality,
.item.thumb .wrap_image .sound,
.item.thumb .wrap_image .futa { z-index: 5; }

/* Mark button on each card: always visible, filled when watched */
.br34-mark {
  position: absolute; top: 6px; left: 6px; z-index: 6;
  padding: 3px 7px; color: #f1f1f5; background: rgba(10, 7, 14, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.35); border-radius: 3px; cursor: pointer;
  font: 700 10px/1.2 'JetBrains Mono', monospace; letter-spacing: 0.04em;
}
.br34-mark:hover { border-color: #ff0055; color: #fff; }
.br34-mark[aria-pressed="true"] { background: #ff0055; border-color: #ff0055; color: #000; }

/* Autoplay previews: invisible until a frame is actually playing */
.br34-autoplay-video {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
  z-index: 2; pointer-events: none; opacity: 0; transition: opacity 0.2s ease;
  background: #050307;
}
.br34-playing .br34-autoplay-video { opacity: 1; }
.br34-playing .custom-play { opacity: 0 !important; }

/* Min rating and min views inside the ALL FILTERS sheet */
.br34-root { margin-top: 2px; }
.br34-count { margin: 8px 0 0; }

/* Video page: "Mark watched" in the action row, and the fallback button */
.vp-btn.br34-watch-btn.is-on { color: #ff0055; }
.br34-dock { position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; display: flex; gap: 8px; }

@media (prefers-reduced-motion: reduce) {
  .br34-spinner { animation: none; }
  .br34-autoplay-video, .item.thumb { transition: none !important; }
}
`;

export const STYLES = `
/* Omarchy Plugins Enhancer — Brutalist Architecture */

/* GitHub Button on Card (Sharp, Icon-only, Zero Radius, Technical Border) */
.ope-github-btn {
  position: relative;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 25px;
  height: 25px;
  width: 25px;
  padding: 0;
  border: 1px solid var(--line, #28282c);
  border-radius: 0 !important;
  background: var(--panel, #0b0b0d);
  color: var(--muted, #94a3b8);
  box-sizing: border-box;
  cursor: pointer;
  text-decoration: none;
  transition: color 100ms ease, border-color 100ms ease, background-color 100ms ease;
}

.ope-github-btn:hover,
.ope-github-btn:focus-visible {
  color: var(--text, #fff);
  border-color: var(--card-accent, var(--accent, #a78bfa));
  background: var(--panel-2, #101012);
}

.ope-github-btn svg {
  width: 13px;
  height: 13px;
  fill: currentColor;
  flex-shrink: 0;
}

/* Seen Toggle Badge on Card (Sharp Square Technical Tag) */
.ope-seen-badge {
  position: relative;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--line, #28282c);
  border-radius: 0 !important;
  background: var(--bg, #000);
  color: var(--faint, #64748b);
  cursor: pointer;
  transition: all 100ms ease;
}

.ope-seen-badge:hover {
  color: var(--accent, #a78bfa);
  border-color: var(--accent, #a78bfa);
  background: var(--panel, #0b0b0d);
}

.ope-seen-badge.is-seen {
  color: var(--accent, #a78bfa);
  border-color: var(--line-strong, #3a3a3f);
  background: var(--panel, #0b0b0d);
}

/* MODE 1: GREY OUT (DIM) */
.ope-mode-dim .plugin-card.ope-seen {
  opacity: 0.35;
  filter: grayscale(0.9);
  transition: opacity 150ms ease, filter 150ms ease, border-color 100ms ease;
}

.ope-mode-dim .plugin-card.ope-seen:hover,
.ope-mode-dim .plugin-card.ope-seen:focus-within {
  opacity: 1;
  filter: none;
  border-color: var(--line-strong, #3a3a3f);
}

/* MODE 2: HIDE (COMPACT BRUTALIST CARD SHOWING TITLE, FULL DESCRIPTION IN MICRO MONOSPACE, STATS & GITHUB) */
.ope-mode-collapse .plugin-card.ope-seen {
  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-start !important;
  min-height: 0 !important;
  height: auto !important;
  align-self: start !important;
  padding: 10px 12px !important;
  box-sizing: border-box !important;
  background: var(--panel, #0b0b0d) !important;
  border: 1px solid var(--line, #28282c) !important;
  border-radius: 0 !important;
  gap: 6px !important;
  opacity: 0.75 !important;
  transition: opacity 120ms ease, border-color 120ms ease, background-color 120ms ease !important;
}

.ope-mode-collapse .plugin-card.ope-seen:hover,
.ope-mode-collapse .plugin-card.ope-seen:focus-within {
  opacity: 1 !important;
  border-color: var(--card-accent, var(--accent, #a78bfa)) !important;
  background: var(--panel-2, #101012) !important;
}

/* In collapsed mode: hide large preview, status lines, tags, author, install copy button, and extra cards */
.ope-mode-collapse .plugin-card.ope-seen .plugin-preview,
.ope-mode-collapse .plugin-card.ope-seen .card-status-line,
.ope-mode-collapse .plugin-card.ope-seen .plugin-tags,
.ope-mode-collapse .plugin-card.ope-seen .plugin-author,
.ope-mode-collapse .plugin-card.ope-seen .card-install,
.ope-mode-collapse .plugin-card.ope-seen .card-states,
.ope-mode-collapse .plugin-card.ope-seen .card-verification {
  display: none !important;
}

.ope-mode-collapse .plugin-card.ope-seen .plugin-card-body {
  position: relative !important;
  display: flex !important;
  flex-direction: column !important;
  width: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
  gap: 6px !important;
  min-width: 0 !important;
  min-height: 0 !important;
}

.ope-mode-collapse .plugin-card.ope-seen .plugin-card-content {
  display: flex !important;
  flex-direction: column !important;
  gap: 6px !important;
  width: 100% !important;
  min-width: 0 !important;
}

/* Single Header Row: Title on left, [Social Stars/Hearts] + [Seen Badge] on right */
.ope-mode-collapse .plugin-card.ope-seen .plugin-title-line {
  position: relative !important;
  z-index: 4 !important;
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: flex-start !important;
  width: 100% !important;
  padding: 0 !important;
  padding-right: 0 !important;
  margin: 0 !important;
  gap: 6px !important;
  min-height: 24px !important;
  flex-wrap: nowrap !important;
}

.ope-mode-collapse .plugin-card.ope-seen.built-in-card .plugin-title-line {
  padding-right: 0 !important;
}

.ope-mode-collapse .plugin-card.ope-seen .plugin-title-line h3 {
  font-family: var(--mono, monospace) !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.04em !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  margin: 0 !important;
  color: var(--text, #fff) !important;
  flex: 0 1 auto !important;
  min-width: 0 !important;
}

.ope-mode-collapse .plugin-card.ope-seen .plugin-title-line .status-badge,
.ope-mode-collapse .plugin-card.ope-seen .plugin-title-line .builtin-badge {
  flex-shrink: 0 !important;
  margin: 0 !important;
}

/* De-absolute .card-social so it flows naturally in header without overlapping description */
.ope-mode-collapse .plugin-card.ope-seen .card-social {
  position: relative !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  left: auto !important;
  z-index: 4 !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  height: 22px !important;
  margin: 0 !important;
  margin-left: auto !important;
  flex-shrink: 0 !important;
}

.ope-mode-collapse .plugin-card.ope-seen .card-stars,
.ope-mode-collapse .plugin-card.ope-seen .plugin-heart {
  height: 22px !important;
  min-height: 22px !important;
  width: auto !important;
  min-width: 44px !important;
  padding: 0 5px !important;
  border: 1px solid var(--line-strong, #3a3a3f) !important;
  border-radius: 0 !important;
  font-family: var(--mono, monospace) !important;
  font-size: 10px !important;
  font-weight: 650 !important;
  line-height: 1 !important;
  box-sizing: border-box !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 4px !important;
}

/* Seen toggle badge in header: right-aligned if alone, adjacent if next to social */
.ope-mode-collapse .plugin-card.ope-seen .ope-seen-badge {
  position: relative !important;
  z-index: 4 !important;
  height: 22px !important;
  width: 22px !important;
  min-width: 22px !important;
  min-height: 22px !important;
  box-sizing: border-box !important;
  margin: 0 !important;
  margin-left: auto !important;
  flex-shrink: 0 !important;
}

.ope-mode-collapse .plugin-card.ope-seen .card-social ~ .ope-seen-badge {
  margin-left: 0 !important;
}

/* Full description in smaller monospace font (8.5px), completely visible, no truncation */
.ope-mode-collapse .plugin-card.ope-seen .plugin-description,
.ope-mode-collapse .plugin-card.ope-seen .plugin-card-body .plugin-description {
  display: block !important;
  position: relative !important;
  z-index: 2 !important;
  font-family: var(--mono, monospace) !important;
  font-size: 8.5px !important;
  line-height: 1.4 !important;
  letter-spacing: 0.01em !important;
  color: var(--muted, #94a3b8) !important;
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
  min-height: 0 !important;
  max-height: none !important;
  -webkit-mask-image: none !important;
  mask-image: none !important;
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
  text-wrap: pretty !important;
}

.ope-mode-collapse .plugin-card.ope-seen .plugin-card-bottom {
  position: relative !important;
  z-index: 4 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  margin-top: 2px !important;
  padding-top: 6px !important;
  border-top: 1px solid var(--line-soft, #1c1c20) !important;
  width: 100% !important;
}

.ope-mode-collapse .plugin-card.ope-seen .plugin-card-actions {
  min-height: 25px !important;
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
}

/* Auto Pager Sentinel */
#ope-sentinel {
  display: block;
  width: 100%;
  height: 2px;
  margin: 0;
  padding: 0;
  pointer-events: none;
  visibility: hidden;
}

/* Brutalist Floating HUD / Control Unit (Single Sharp Border, No Double Shadow) */
.ope-toolbar {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 0 !important;
  background: var(--bg, #000);
  border: 1px solid var(--line-strong, #3a3a3f);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.7);
  font-family: var(--mono, ui-monospace, SFMono-Regular, monospace);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--text, #e2e8f0);
  user-select: none;
  box-sizing: border-box;
}

/* When collapsed by default, only show the trigger button cleanly */
.ope-toolbar.collapsed {
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none;
}

.ope-toolbar.collapsed .ope-toolbar-body {
  display: none;
}

.ope-toolbar-body {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ope-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--line, #28282c);
  border-radius: 0 !important;
  background: var(--panel, #0b0b0d);
  color: var(--muted, #94a3b8);
  font-family: inherit;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  box-sizing: border-box;
  transition: all 100ms ease;
}

.ope-btn:hover {
  color: var(--text, #fff);
  border-color: var(--muted, #94a3b8);
  background: var(--panel-2, #101012);
}

.ope-btn.active {
  background: var(--panel-2, #101012);
  color: var(--accent, #a78bfa);
  border-color: var(--accent, #a78bfa);
}

.ope-mode-group {
  display: flex;
  align-items: center;
  border: 1px solid var(--line, #28282c);
  border-radius: 0 !important;
  overflow: hidden;
  height: 28px;
}

.ope-mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 100%;
  padding: 0 8px;
  border: none;
  border-right: 1px solid var(--line, #28282c);
  border-radius: 0 !important;
  background: var(--panel, #0b0b0d);
  color: var(--muted, #94a3b8);
  font-family: inherit;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 100ms ease;
}

.ope-mode-btn:last-child {
  border-right: none;
}

.ope-mode-btn:hover {
  color: var(--text, #fff);
  background: var(--panel-2, #101012);
}

.ope-mode-btn.active {
  background: #15131f;
  color: var(--accent, #a78bfa);
}

.ope-clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--line, #28282c);
  border-radius: 0 !important;
  background: var(--panel, #0b0b0d);
  color: var(--faint, #64748b);
  font-family: inherit;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 100ms ease;
}

.ope-clear-btn:hover {
  color: #ff5c57;
  border-color: #ff5c57;
  background: #1c0f11;
}

.ope-collapse-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--line-strong, #3a3a3f);
  border-radius: 0 !important;
  background: var(--panel, #0b0b0d);
  color: var(--muted, #94a3b8);
  cursor: pointer;
  padding: 0;
  box-sizing: border-box;
  transition: all 100ms ease;
}

.ope-collapse-btn:hover {
  color: var(--text, #fff);
  border-color: var(--muted, #94a3b8);
  background: var(--panel-2, #101012);
}
`;

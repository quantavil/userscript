export const STYLES = `
/* YouTube Theme: Left-edge Bookmark Tab */
#yt-filter-toggle {
  position: fixed;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  z-index: 99999;
  background: #212121;
  color: #f1f1f1;
  border: 1px solid #383838;
  border-left: none;
  border-radius: 0 10px 10px 0;
  padding: 14px 8px;
  cursor: pointer;
  font: 500 12px/1 'YouTube Sans', 'Roboto', Arial, sans-serif;
  letter-spacing: 1.2px;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.5);
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s, box-shadow 0.2s, border-color 0.2s, opacity 0.2s, padding 0.2s;
  writing-mode: vertical-rl;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 8px;
  touch-action: manipulation;
}
#yt-filter-toggle:hover,
#yt-filter-toggle:active {
  background: #2a2a2a;
  border-color: #ff0000;
  box-shadow: 3px 0 16px rgba(255, 0, 0, 0.25);
  padding-right: 11px;
  color: #fff;
}
#yt-filter-toggle.active {
  border-color: #ff0000;
  color: #fff;
  background: #261616;
  box-shadow: 3px 0 16px rgba(255, 0, 0, 0.35);
}
#yt-filter-toggle.panel-open {
  transform: translateY(-50%) translateX(-100%);
  opacity: 0;
  pointer-events: none;
}
.ytf-toggle-icon {
  width: 15px;
  height: 15px;
  writing-mode: horizontal-tb;
  display: flex;
  align-items: center;
  justify-content: center;
  fill: currentColor;
}
.ytf-active-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ff0000;
  box-shadow: 0 0 6px #ff0000;
  display: none;
}
#yt-filter-toggle.active .ytf-active-dot {
  display: block;
}

/* Dimmed / Greyed-out Watched Videos */
.ytf-dimmed {
  opacity: 0.25 !important;
  filter: grayscale(90%) !important;
  transition: opacity 0.2s ease, filter 0.2s ease !important;
}
.ytf-dimmed:hover {
  opacity: 0.95 !important;
  filter: grayscale(0%) !important;
}

/* YouTube Theme: Left-side Drawer Panel */
#yt-filter-panel {
  position: fixed;
  top: 50%;
  left: -380px;
  transform: translateY(-50%);
  z-index: 100000;
  width: 350px;
  max-height: 90vh;
  overflow-y: auto;
  overflow-x: hidden;
  background: #0f0f0f;
  color: #f1f1f1;
  border: 1px solid #282828;
  border-left: none;
  border-radius: 0 14px 14px 0;
  box-shadow: 6px 0 32px rgba(0, 0, 0, 0.85);
  padding: 18px;
  font: 13px/1.4 'YouTube Sans', 'Roboto', Arial, sans-serif;
  transition: left 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  box-sizing: border-box;
}
#yt-filter-panel.visible {
  left: 0;
}

#yt-filter-panel::-webkit-scrollbar {
  width: 5px;
}
#yt-filter-panel::-webkit-scrollbar-track {
  background: #141414;
}
#yt-filter-panel::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}
#yt-filter-panel::-webkit-scrollbar-thumb:hover {
  background: #4f4f4f;
}

#yt-filter-panel h3 {
  margin: 0 0 14px;
  font: 500 16px/1.2 'YouTube Sans', 'Roboto', Arial, sans-serif;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #272727;
  padding-bottom: 12px;
  user-select: none;
}

.ytf-title-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.ytf-title-icon {
  width: 18px;
  height: 18px;
  fill: #ff0000;
}

/* Red Close Button */
.ytf-close {
  cursor: pointer;
  font-size: 20px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
  color: #ff4d4d;
}
.ytf-close:hover,
.ytf-close:active {
  background: rgba(255, 77, 77, 0.18);
  color: #ff2222;
  transform: scale(1.1);
}

/* Profile Selector Bar */
.ytf-profile-section {
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid #222;
}
.ytf-profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.ytf-profile-header label {
  color: #aaa;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
}
.ytf-profile-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.ytf-profile-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 14px;
  background: #1e1e1e;
  border: 1px solid #333;
  color: #aaa;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.18s ease;
  user-select: none;
}
.ytf-profile-pill:hover,
.ytf-profile-pill:active {
  background: #2a2a2a;
  color: #fff;
  border-color: #555;
}
.ytf-profile-pill.active {
  background: #f1f1f1;
  color: #0f0f0f;
  border-color: #fff;
  font-weight: 600;
}
.ytf-profile-delete {
  margin-left: 6px;
  color: #888;
  font-size: 13px;
  line-height: 1;
  transition: color 0.15s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ytf-profile-delete:hover,
.ytf-profile-delete:active {
  color: #ff4d4d;
}

.ytf-save-profile-btn {
  padding: 4px 8px;
  border-radius: 14px;
  background: transparent;
  border: 1px dashed #444;
  color: #888;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.18s ease;
}
.ytf-save-profile-btn:hover,
.ytf-save-profile-btn:active {
  border-color: #888;
  color: #fff;
}

/* Watched Videos Segmented Control */
.ytf-segmented-control {
  display: flex;
  background: #181818;
  border: 1px solid #303030;
  border-radius: 16px;
  padding: 2px;
  margin-top: 4px;
}
.ytf-segment-btn {
  flex: 1;
  background: transparent;
  border: none;
  border-radius: 14px;
  padding: 6px 10px;
  color: #aaa;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;
}
.ytf-segment-btn:hover,
.ytf-segment-btn:active {
  color: #fff;
}
.ytf-segment-btn.active {
  background: #2e2e2e;
  color: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
}

/* Content Toggles: Hide Shorts & Hide Posts */
.ytf-toggle-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.ytf-switch-label {
  flex: 1;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #181818;
  border: 1px solid #303030;
  border-radius: 8px;
  padding: 7px 10px;
  color: #ccc;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  transition: all 0.18s ease;
}
.ytf-switch-label:hover {
  background: #222;
  color: #fff;
  border-color: #444;
}
.ytf-switch-label.active {
  background: #261616;
  border-color: #ff0000;
  color: #fff;
}
.ytf-checkbox {
  accent-color: #ff0000;
  cursor: pointer;
  width: 14px;
  height: 14px;
  margin: 0;
}

/* Header Row with Inline Label & Quick Chips */
.ytf-group {
  margin-bottom: 14px;
}
.ytf-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.ytf-header-row label {
  color: #aaa;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
  user-select: none;
}

.ytf-inline-chips {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.ytf-chip {
  padding: 3px 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #aaa;
  font-size: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;
  user-select: none;
  line-height: 1.2;
}
.ytf-chip:hover,
.ytf-chip:active {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.28);
}
.ytf-chip:active {
  transform: scale(0.94);
}

.ytf-row {
  display: flex;
  gap: 8px;
  position: relative;
  z-index: 1;
}
.ytf-input-wrapper {
  flex: 1;
  position: relative;
}

/* Custom Inputs - Clean YouTube Dark Style */
.ytf-input {
  width: 100%;
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid #303030;
  background: #181818;
  color: #fff;
  font-size: 13px;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
  position: relative;
  z-index: 2;
  box-sizing: border-box;
}

/* Remove number input spin up/down buttons completely */
.ytf-input::-webkit-outer-spin-button,
.ytf-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.ytf-input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.ytf-input:focus {
  outline: none;
  border-color: #f1f1f1;
  background: #202020;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.12);
  z-index: 3;
}
.ytf-input.error {
  border-color: #ff4d4d;
  background: rgba(255, 77, 77, 0.1);
  box-shadow: 0 0 0 2px rgba(255, 77, 77, 0.2);
}
.ytf-input::placeholder {
  color: #717171;
}

.ytf-input[type="date"] {
  position: relative;
  z-index: 2;
}
.ytf-input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
  cursor: pointer;
  position: relative;
  z-index: 4;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}
.ytf-input[type="date"]::-webkit-calendar-picker-indicator:hover {
  opacity: 1;
}
.ytf-input[type="date"]::-webkit-datetime-edit {
  color: #fff;
}
.ytf-input[type="date"]::-webkit-datetime-edit-fields-wrapper {
  padding: 0;
}
.ytf-input[type="date"]::-webkit-inner-spin-button {
  display: none;
}

/* Tag Chips Input Container (Keywords & Channels) */
.ytf-tag-input-box {
  background: #181818;
  border: 1px solid #303030;
  border-radius: 8px;
  padding: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
  transition: border-color 0.2s;
}
.ytf-tag-input-box:focus-within {
  border-color: #f1f1f1;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.12);
}
.ytf-tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #282828;
  border: 1px solid #3c3c3c;
  border-radius: 12px;
  padding: 2px 7px;
  font-size: 11px;
  color: #eee;
  user-select: none;
}
.ytf-tag-chip.vip {
  background: #1e281e;
  border-color: #2e4d2e;
  color: #4ade80;
}
.ytf-tag-chip.blacklist {
  background: #2c1a1a;
  border-color: #4d2e2e;
  color: #f87171;
}
.ytf-tag-remove {
  cursor: pointer;
  color: #888;
  font-size: 13px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
}
.ytf-tag-remove:hover,
.ytf-tag-remove:active {
  color: #ff4d4d;
}
.ytf-tag-field {
  flex: 1;
  min-width: 90px;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 12px;
  padding: 3px 5px;
  outline: none;
}
.ytf-tag-field::placeholder {
  color: #666;
}

.ytf-error-msg {
  color: #ff4d4d;
  font-size: 11px;
  margin-top: 4px;
  display: none;
  animation: ytfFadeIn 0.2s ease;
}
.ytf-error-msg.show {
  display: block;
}

@keyframes ytfFadeIn {
  from {
    opacity: 0;
    transform: translateY(-2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.ytf-actions {
  display: flex;
  gap: 8px;
  margin-top: 18px;
}
.ytf-btn {
  flex: 1;
  padding: 10px 14px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.1);
  color: #f1f1f1;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.18s ease;
}
.ytf-btn:hover:not(:disabled),
.ytf-btn:active:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}
.ytf-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* YouTube Style Primary CTA */
.ytf-btn.primary {
  background: #f1f1f1;
  border: none;
  color: #0f0f0f;
  font-weight: 600;
}
.ytf-btn.primary:hover:not(:disabled),
.ytf-btn.primary:active:not(:disabled) {
  background: #ffffff;
  box-shadow: 0 2px 10px rgba(255, 255, 255, 0.2);
}
.ytf-btn.primary.active {
  background: #cc0000;
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(204, 0, 0, 0.4);
}
.ytf-btn.primary.active:hover:not(:disabled),
.ytf-btn.primary.active:active:not(:disabled) {
  background: #ff0000;
  box-shadow: 0 3px 14px rgba(255, 0, 0, 0.5);
}

.ytf-stats {
  margin-top: 14px;
  padding: 10px;
  background: #181818;
  border-radius: 8px;
  border: 1px solid #282828;
  color: #aaa;
  text-align: center;
  font-size: 12px;
  font-weight: 500;
}
.ytf-hidden {
  display: none !important;
}

/* Mobile Responsiveness (Phones & Small Screens) */
@media (max-width: 480px) {
  #yt-filter-panel {
    width: min(320px, 92vw);
    max-height: 85vh;
    padding: 14px;
    border-radius: 0 12px 12px 0;
  }
  #yt-filter-toggle {
    padding: 10px 5px;
    font-size: 10px;
    letter-spacing: 0.8px;
  }
  .ytf-row {
    flex-direction: column;
    gap: 6px;
  }
  .ytf-tag-input-box {
    padding: 4px;
  }
}
`;

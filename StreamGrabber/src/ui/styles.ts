/**
 * CSS styles for the UI
 */

export const STYLES = `
/* StreamGrabber Styles - Scoped to avoid conflicts */

#sg-fab-container,
#sg-modal-container,
#sg-toast-container {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
  box-sizing: border-box !important;
}

#sg-fab-container *,
#sg-modal-container *,
#sg-toast-container * {
  box-sizing: border-box !important;
}

/* CSS Variables */
:root {
  --sg-bg: #1e1e1e;
  --sg-bg-2: #252525;
  --sg-bg-3: #2d2d2d;
  --sg-border: #353535;
  --sg-border-2: #404040;
  --sg-fg: #e0e0e0;
  --sg-fg-dim: #aaa;
  --sg-fg-dimmer: #888;
  --sg-ok: #10b981;
  --sg-bad: #e74c3c;
  --sg-warn: #f59e0b;
  --sg-badge: #dc3545;
  --sg-accent: #6366f1;
  --sg-radius: 8px;
  --sg-shadow: 0 4px 12px rgba(0,0,0,0.4);
}

/* Animations */
@keyframes sg-spin {
  to { transform: rotate(360deg); }
}

@keyframes sg-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ===================== FAB Button ===================== */

.sg-fab {
  all: initial !important;
  position: fixed !important;
  right: 20px !important;
  bottom: 20px !important;
  z-index: 2147483647 !important;
  width: 56px !important;
  height: 56px !important;
  border-radius: 50% !important;
  display: none !important;
  align-items: center !important;
  justify-content: center !important;
  background: var(--sg-accent) !important;
  color: #ffffff !important;
  border: 2px solid #404040 !important;
  cursor: pointer !important;
  overflow: visible !important;
  font-family: system-ui, sans-serif !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
  transition: transform 0.15s, background 0.15s !important;
}

.sg-fab.show {
  display: flex !important;
}

.sg-fab:hover {
  background: #404040 !important;
  transform: scale(1.05) !important;
}

.sg-fab:active {
  transform: scale(0.95) !important;
}

.sg-fab.idle {
  opacity: 0.6 !important;
}

.sg-fab.busy {
  pointer-events: none !important;
}

.sg-fab.busy > span:first-child {
  opacity: 0 !important;
}

.sg-fab.busy::after {
  content: '' !important;
  position: absolute !important;
  width: 20px !important;
  height: 20px !important;
  border: 2px solid #404040 !important;
  border-top-color: #ffffff !important;
  border-radius: 50% !important;
  animation: sg-spin 0.6s linear infinite !important;
}

.sg-fab svg {
  width: 24px !important;
  height: 24px !important;
  fill: none !important;
  stroke: currentColor !important;
}

/* Badge */
.sg-badge {
  all: initial !important;
  position: absolute !important;
  top: -4px !important;
  right: -4px !important;
  background: #dc3545 !important;
  color: #ffffff !important;
  font-weight: 600 !important;
  font-size: 11px !important;
  font-family: system-ui, sans-serif !important;
  padding: 2px 6px !important;
  border-radius: 10px !important;
  display: none !important;
  line-height: 1.2 !important;
  border: 2px solid #1e1e1e !important;
  min-width: 20px !important;
  text-align: center !important;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
}

.sg-badge.show {
  display: inline-block !important;
}

/* ===================== Modal ===================== */

.sg-modal {
  all: initial !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  z-index: 2147483647 !important;
  display: none !important;
  align-items: center !important;
  justify-content: center !important;
  background: rgba(0,0,0,0.8) !important;
  backdrop-filter: blur(4px) !important;
  font-family: system-ui, sans-serif !important;
}

.sg-modal.show {
  display: flex !important;
}

/* Card */
.sg-card {
  all: initial !important;
  display: flex !important;
  flex-direction: column !important;
  background: #1e1e1e !important;
  color: #e0e0e0 !important;
  border: 1px solid #404040 !important;
  border-radius: 12px !important;
  width: min(520px, 94vw) !important;
  max-height: 84vh !important;
  overflow: hidden !important;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
  font-family: system-ui, sans-serif !important;
}

.sg-card-head {
  all: initial !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 16px 20px !important;
  border-bottom: 1px solid #353535 !important;
  background: #252525 !important;
  font-family: system-ui, sans-serif !important;
}

.sg-card-title {
  all: initial !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  color: #ffffff !important;
  font-family: system-ui, sans-serif !important;
}

.sg-card-body {
  all: initial !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
  padding: 16px 20px 20px !important;
  overflow-y: auto !important;
  max-height: calc(84vh - 70px) !important;
  font-family: system-ui, sans-serif !important;
}

.sg-card-body::-webkit-scrollbar {
  width: 6px !important;
}

.sg-card-body::-webkit-scrollbar-thumb {
  background: #404040 !important;
  border-radius: 3px !important;
}

/* Buttons */
.sg-btn {
  all: initial !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: #2d2d2d !important;
  border: 1px solid #404040 !important;
  color: #aaaaaa !important;
  border-radius: 8px !important;
  padding: 8px !important;
  cursor: pointer !important;
  min-width: 36px !important;
  min-height: 36px !important;
  transition: background 0.15s, color 0.15s !important;
  font-family: system-ui, sans-serif !important;
}

.sg-btn:hover {
  background: #404040 !important;
  color: #ffffff !important;
}

.sg-btn svg {
  width: 18px !important;
  height: 18px !important;
  fill: none !important;
  stroke: currentColor !important;
}

.sg-btn-small {
  padding: 6px !important;
  min-width: 28px !important;
  min-height: 28px !important;
}

.sg-btn-small svg {
  width: 14px !important;
  height: 14px !important;
}

/* Checkbox option */
.sg-option {
  all: initial !important;
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  font-size: 13px !important;
  color: #aaaaaa !important;
  padding: 12px 14px !important;
  background: #252525 !important;
  border-radius: 8px !important;
  border: 1px solid #353535 !important;
  cursor: pointer !important;
  font-family: system-ui, sans-serif !important;
}

.sg-option:hover {
  background: #2d2d2d !important;
}

.sg-option input[type="checkbox"] {
  width: 18px !important;
  height: 18px !important;
  cursor: pointer !important;
  accent-color: #6366f1 !important;
  margin: 0 !important;
}

/* Item List */
.sg-list {
  all: initial !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
  font-family: system-ui, sans-serif !important;
}

.sg-item {
  all: initial !important;
  display: block !important;
  background: #252525 !important;
  border: 1px solid #353535 !important;
  border-radius: 8px !important;
  padding: 14px 16px !important;
  cursor: pointer !important;
  transition: border-color 0.15s, background 0.15s !important;
  font-family: system-ui, sans-serif !important;
}

.sg-item:hover {
  background: #2d2d2d !important;
  border-color: #505050 !important;
}

.sg-item:focus {
  outline: 2px solid #6366f1 !important;
  outline-offset: -2px !important;
}

.sg-item-top {
  all: initial !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  margin-bottom: 8px !important;
  font-family: system-ui, sans-serif !important;
}

.sg-item-title {
  all: initial !important;
  display: flex !important;
  align-items: center !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  color: #ffffff !important;
  line-height: 1.4 !important;
  flex: 1 !important;
  font-family: system-ui, sans-serif !important;
}

.sg-item-url {
  all: initial !important;
  display: block !important;
  font-size: 11px !important;
  color: #666666 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  font-family: ui-monospace, 'SF Mono', Consolas, monospace !important;
}

.sg-item-sub {
  all: initial !important;
  display: block !important;
  font-size: 11px !important;
  color: #888888 !important;
  margin-bottom: 4px !important;
  font-family: system-ui, sans-serif !important;
}

.sg-item-size {
  all: initial !important;
  font-size: 12px !important;
  color: #888888 !important;
  white-space: nowrap !important;
  font-family: system-ui, sans-serif !important;
}

/* Type Badges */
.sg-badge-type {
  all: initial !important;
  display: inline-block !important;
  font-size: 9px !important;
  padding: 3px 7px !important;
  border-radius: 4px !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.3px !important;
  white-space: nowrap !important;
  font-family: system-ui, sans-serif !important;
}

.sg-badge-type.master { background: #6366f1 !important; color: #ffffff !important; }
.sg-badge-type.video { background: #10b981 !important; color: #ffffff !important; }
.sg-badge-type.direct { background: #f59e0b !important; color: #ffffff !important; }
.sg-badge-type.live { background: #ef4444 !important; color: #ffffff !important; }
.sg-badge-type.encrypted { background: #8b5cf6 !important; color: #ffffff !important; }
.sg-badge-type.analyzing { 
  background: #6b7280 !important; 
  color: #ffffff !important; 
  animation: sg-pulse 1s infinite !important;
}
.sg-badge-type.remote { background: #06b6d4 !important; color: #ffffff !important; }
.sg-badge-type.error { background: #e74c3c !important; color: #ffffff !important; }

/* Copy Button */
.sg-copy-btn {
  all: initial !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: #2d2d2d !important;
  border: 1px solid #404040 !important;
  color: #aaaaaa !important;
  border-radius: 6px !important;
  padding: 8px !important;
  cursor: pointer !important;
  flex-shrink: 0 !important;
  transition: background 0.15s, color 0.15s !important;
  font-family: system-ui, sans-serif !important;
}

.sg-copy-btn:hover {
  background: #404040 !important;
  color: #ffffff !important;
}

.sg-copy-btn svg {
  width: 14px !important;
  height: 14px !important;
  fill: none !important;
  stroke: currentColor !important;
}

.sg-copy-btn.copied {
  background: #10b981 !important;
  border-color: #10b981 !important;
  color: #ffffff !important;
}

/* Empty State */
.sg-empty {
  all: initial !important;
  display: block !important;
  padding: 40px !important;
  color: #666666 !important;
  font-size: 14px !important;
  text-align: center !important;
  line-height: 1.6 !important;
  font-family: system-ui, sans-serif !important;
}

.sg-empty small {
  display: block !important;
  margin-top: 8px !important;
  font-size: 12px !important;
  opacity: 0.7 !important;
}

/* ===================== Toast Container ===================== */

.sg-toast {
  all: initial !important;
  position: fixed !important;
  right: 20px !important;
  bottom: 90px !important;
  z-index: 2147483646 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
  max-width: 380px !important;
  max-height: 70vh !important;
  overflow-y: auto !important;
  align-items: flex-end !important;
  font-family: system-ui, sans-serif !important;
}

/* Progress Card */
.sg-progress {
  all: initial !important;
  display: flex !important;
  flex-direction: column !important;
  background: #1e1e1e !important;
  color: #e0e0e0 !important;
  border: 1px solid #404040 !important;
  border-radius: 10px !important;
  padding: 14px 16px !important;
  min-width: 300px !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
  font-family: system-ui, sans-serif !important;
}

.sg-progress-row {
  all: initial !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  margin-bottom: 10px !important;
  font-family: system-ui, sans-serif !important;
}

.sg-progress-name {
  all: initial !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  max-width: 200px !important;
  color: #ffffff !important;
  font-family: system-ui, sans-serif !important;
}

.sg-progress-ctrls {
  all: initial !important;
  display: flex !important;
  gap: 6px !important;
  margin-left: auto !important;
  font-family: system-ui, sans-serif !important;
}

.sg-progress-bar {
  all: initial !important;
  display: block !important;
  height: 8px !important;
  background: #252525 !important;
  border-radius: 4px !important;
  overflow: hidden !important;
  border: 1px solid #353535 !important;
}

.sg-progress-fill {
  all: initial !important;
  display: block !important;
  height: 8px !important;
  width: 0 !important;
  background: #ffffff !important;
  transition: width 0.15s ease-out !important;
}

.sg-progress-status {
  all: initial !important;
  display: flex !important;
  justify-content: space-between !important;
  margin-top: 8px !important;
  font-size: 11px !important;
  font-family: system-ui, sans-serif !important;
}

.sg-progress-status span:first-child {
  color: #888888 !important;
}

.sg-progress-status span:last-child {
  color: #e0e0e0 !important;
}

/* Paused state */
.sg-progress.paused .sg-progress-fill {
  background: #f59e0b !important;
}

/* Minimized state */
.sg-progress.minimized {
  padding: 8px !important;
  min-width: auto !important;
}

.sg-progress.minimized .sg-progress-bar,
.sg-progress.minimized .sg-progress-status,
.sg-progress.minimized .sg-progress-name {
  display: none !important;
}

.sg-progress.minimized .sg-progress-row {
  margin-bottom: 0 !important;
  justify-content: center !important;
}

.sg-progress.minimized .sg-progress-ctrls {
  margin: 0 !important;
  gap: 0 !important;
}

.sg-progress.minimized .sg-progress-ctrls > *:not(.btn-minimize) {
  display: none !important;
}

/* ===================== Mobile ===================== */

@media (max-width: 640px) {
  .sg-fab {
    right: 16px !important;
    bottom: 16px !important;
    width: 52px !important;
    height: 52px !important;
  }
  
  .sg-toast {
    left: 16px !important;
    right: 16px !important;
    bottom: 80px !important;
    max-width: none !important;
    align-items: stretch !important;
  }
  
  .sg-progress {
    min-width: 0 !important;
    width: 100% !important;
  }
  
  .sg-card {
    max-height: 90vh !important;
    width: 100% !important;
    margin: 8px !important;
    border-radius: 10px !important;
  }
  
  .sg-card-body {
    max-height: calc(90vh - 70px) !important;
  }
}
`;
/**
 * CSS styles for the UI
 */

export const STYLES = `
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
  --sg-font: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --sg-mono: ui-monospace, 'SF Mono', Consolas, monospace;
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

@keyframes sg-fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes sg-slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* FAB Button */
.sg-fab {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483647;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: none;
  align-items: center;
  justify-content: center;
  background: var(--sg-bg-3);
  color: #fff;
  border: 1px solid var(--sg-border-2);
  cursor: pointer;
  overflow: visible;
  font-family: var(--sg-font);
  transition: opacity 0.2s, background 0.15s, transform 0.15s;
  box-shadow: var(--sg-shadow);
}

.sg-fab.show { 
  display: flex; 
  animation: sg-fade-in 0.2s ease-out;
}
.sg-fab.idle { opacity: 0.5; }
.sg-fab:hover { 
  background: #353535; 
  opacity: 1; 
  transform: scale(1.05);
}
.sg-fab:active {
  transform: scale(0.95);
}
.sg-fab:focus {
  outline: 2px solid var(--sg-accent);
  outline-offset: 2px;
}
.sg-fab.busy { pointer-events: none; }
.sg-fab.busy svg { opacity: 0; }

.sg-fab.busy::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  border: 2px solid var(--sg-border-2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: sg-spin 0.6s linear infinite;
}

.sg-fab svg { width: 16px; height: 16px; }

/* Badge */
.sg-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: var(--sg-badge);
  color: #fff;
  font-weight: 600;
  font-size: 10px;
  padding: 3px 5px;
  border-radius: 10px;
  display: none;
  line-height: 1;
  border: 2px solid var(--sg-bg);
  min-width: 18px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.sg-badge.show { display: inline-block; }

/* Modal Overlay */
.sg-modal {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(4px);
  font-family: var(--sg-font);
  opacity: 0;
  transition: opacity 0.2s;
}

.sg-modal.show { 
  display: flex; 
  opacity: 1;
}

/* Card */
.sg-card {
  background: var(--sg-bg);
  color: var(--sg-fg);
  border: 1px solid var(--sg-border-2);
  border-radius: 10px;
  width: min(520px, 94vw);
  max-height: 84vh;
  overflow: hidden;
  box-shadow: var(--sg-shadow);
  animation: sg-slide-up 0.25s ease-out;
}

.sg-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #2d2d2d;
  background: var(--sg-bg-2);
}

.sg-card-title {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
}

.sg-card-body {
  padding: 12px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  max-height: calc(84vh - 110px);
}

.sg-card-body::-webkit-scrollbar { width: 6px; }
.sg-card-body::-webkit-scrollbar-track { background: transparent; }
.sg-card-body::-webkit-scrollbar-thumb { 
  background: var(--sg-border-2); 
  border-radius: 3px; 
}
.sg-card-body::-webkit-scrollbar-thumb:hover { 
  background: var(--sg-fg-dimmer); 
}

/* Buttons */
.sg-btn {
  background: var(--sg-bg-3);
  border: 1px solid var(--sg-border-2);
  color: var(--sg-fg-dim);
  border-radius: var(--sg-radius);
  padding: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;
  transition: background 0.15s, color 0.15s, transform 0.1s;
}

.sg-btn:hover { 
  background: #353535; 
  color: #fff; 
}
.sg-btn:active {
  transform: scale(0.95);
}
.sg-btn:focus {
  outline: 2px solid var(--sg-accent);
  outline-offset: 1px;
}
.sg-btn svg { width: 16px; height: 16px; }

.sg-btn-small {
  padding: 6px 8px;
  min-width: auto;
  min-height: auto;
}

.sg-btn-small svg { width: 13px; height: 13px; }

/* Checkbox option */
.sg-option {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 12px;
  color: var(--sg-fg-dim);
  padding: 10px 12px;
  background: var(--sg-bg-2);
  border-radius: var(--sg-radius);
  border: 1px solid var(--sg-border);
  cursor: pointer;
  transition: background 0.15s;
}

.sg-option:hover {
  background: var(--sg-bg-3);
}

.sg-option input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--sg-accent);
  margin: 0;
}

/* Item List */
.sg-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sg-item {
  background: var(--sg-bg-2);
  border: 1px solid var(--sg-border);
  border-radius: var(--sg-radius);
  padding: 12px 14px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, transform 0.1s;
}

.sg-item:hover {
  background: #2d2d2d;
  border-color: var(--sg-border-2);
}

.sg-item:active {
  transform: scale(0.99);
}

.sg-item:focus {
  outline: 2px solid var(--sg-accent);
  outline-offset: -2px;
}

.sg-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.sg-item-title {
  font-weight: 600;
  font-size: 13px;
  color: #fff;
  line-height: 1.4;
  flex: 1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.sg-item-url {
  font-size: 11px;
  color: var(--sg-fg-dimmer);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--sg-mono);
}

.sg-item-sub {
  font-size: 10px;
  color: #666;
  margin-top: 4px;
  margin-bottom: 2px;
}

.sg-item-size {
  font-size: 11px;
  color: #888;
  margin-left: auto;
  white-space: nowrap;
  padding-left: 8px;
}

/* Type Badges */
.sg-badge-type {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  white-space: nowrap;
}

.sg-badge-type.master { background: #6366f1; color: #fff; }
.sg-badge-type.video { background: #10b981; color: #fff; }
.sg-badge-type.direct { background: #f59e0b; color: #fff; }
.sg-badge-type.live { background: #ef4444; color: #fff; }
.sg-badge-type.encrypted { background: #8b5cf6; color: #fff; }
.sg-badge-type.analyzing { 
  background: #6b7280; 
  color: #fff; 
  animation: sg-pulse 1s infinite;
}
.sg-badge-type.remote { 
  background: #06b6d4; 
  color: #fff; 
}
.sg-badge-type.error {
  background: var(--sg-bad);
  color: #fff;
}

/* Copy Button */
.sg-copy-btn {
  background: var(--sg-bg-3);
  border: 1px solid var(--sg-border-2);
  color: var(--sg-fg-dim);
  border-radius: 6px;
  padding: 7px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s, transform 0.1s;
}

.sg-copy-btn:hover { background: #353535; color: #fff; }
.sg-copy-btn:active { transform: scale(0.9); }
.sg-copy-btn svg { width: 13px; height: 13px; }
.sg-copy-btn.copied { 
  background: var(--sg-ok); 
  border-color: var(--sg-ok); 
  color: #fff; 
}

/* Empty State */
.sg-empty {
  padding: 32px;
  color: var(--sg-fg-dimmer);
  font-size: 13px;
  text-align: center;
  line-height: 1.6;
}

.sg-empty small {
  display: block;
  margin-top: 8px;
  font-size: 11px;
  color: var(--sg-fg-dimmer);
  opacity: 0.7;
}

/* Toast Container */
.sg-toast {
  position: fixed;
  right: 16px;
  bottom: 72px;
  z-index: 2147483646;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 380px;
  max-height: 70vh;
  overflow-y: auto;
  align-items: flex-end;
  font-family: var(--sg-font);
  pointer-events: none;
}

.sg-toast > * {
  pointer-events: auto;
}

.sg-toast::-webkit-scrollbar { width: 5px; }
.sg-toast::-webkit-scrollbar-thumb { background: var(--sg-border-2); border-radius: 3px; }

/* Progress Card */
.sg-progress {
  background: var(--sg-bg);
  color: var(--sg-fg);
  border: 1px solid var(--sg-border-2);
  border-radius: 10px;
  padding: 13px 15px;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--sg-shadow);
  animation: sg-slide-up 0.2s ease-out;
}

.sg-progress-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 9px;
}

.sg-progress-name {
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 230px;
  color: #fff;
}

.sg-progress-ctrls {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

.sg-progress-bar {
  height: 7px;
  background: var(--sg-bg-2);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--sg-border);
}

.sg-progress-fill {
  height: 7px;
  width: 0;
  background: #fff;
  transition: width 0.15s ease-out, background 0.3s;
}

.sg-progress-status {
  margin-top: 6px;
  font-size: 11px;
  display: flex;
  justify-content: space-between;
}

.sg-progress-status span:first-child { color: #999; }

/* Paused Progress */
.sg-progress.paused .sg-progress-fill {
  background: var(--sg-warn) !important;
}

.sg-progress.paused .sg-progress-name::after {
  content: ' (Paused)';
  color: var(--sg-warn);
  font-weight: normal;
  font-size: 11px;
}

/* Minimized Progress */
.sg-progress.minimized {
  padding: 6px;
  min-width: auto;
  width: auto;
  display: inline-flex;
}

.sg-progress.minimized .sg-progress-bar,
.sg-progress.minimized .sg-progress-status,
.sg-progress.minimized .sg-progress-name { display: none !important; }

.sg-progress.minimized .sg-progress-row:first-child { 
  margin-bottom: 0; 
  justify-content: center; 
}
.sg-progress.minimized .sg-progress-ctrls { margin: 0; gap: 0; }
.sg-progress.minimized .sg-progress-ctrls > :not(.btn-minimize) { 
  display: none !important; 
}

/* Focus visible for accessibility */
.sg-fab:focus-visible,
.sg-btn:focus-visible,
.sg-item:focus-visible,
.sg-copy-btn:focus-visible {
  outline: 2px solid var(--sg-accent);
  outline-offset: 2px;
}

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  .sg-fab,
  .sg-btn,
  .sg-item,
  .sg-copy-btn,
  .sg-progress-fill,
  .sg-modal,
  .sg-card {
    animation: none !important;
    transition: none !important;
  }
}

/* Mobile */
@media (max-width: 640px) {
  .sg-fab { 
    right: 12px; 
    bottom: 12px; 
    width: 46px; 
    height: 46px; 
  }
  .sg-fab svg { width: 15px; height: 15px; }
  
  .sg-toast { 
    left: 12px; 
    right: 12px; 
    bottom: 68px; 
    max-width: none; 
    align-items: stretch;
  }
  
  .sg-progress {
    min-width: 0;
    width: 100%;
  }
  
  .sg-card { 
    max-height: 90vh; 
    border-radius: 10px; 
    width: 100%;
    margin: 8px;
  }
  .sg-card-body { max-height: calc(90vh - 100px); }
  
  .sg-item-title {
    font-size: 12px;
  }
  
  .sg-item-url {
    font-size: 10px;
  }
}

/* Dark mode scrollbar for Firefox */
@supports (scrollbar-color: auto) {
  .sg-card-body,
  .sg-toast {
    scrollbar-color: var(--sg-border-2) transparent;
    scrollbar-width: thin;
  }
}
`;
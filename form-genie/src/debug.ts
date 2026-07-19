/**
 * Debug utilities. When enabled: namespaced logging, timing, and an on-page
 * overlay outlining scanned fields with their matched key + confidence. Zero
 * overhead when disabled (guarded at the call site).
 */
import type { FieldMatch } from './engine/match';

let enabled = false;
const TAG = '[form-genie]';

export function setDebug(on: boolean): void {
  enabled = on;
  if (!on) clearOverlay();
}

export function isDebug(): boolean {
  return enabled;
}

export function log(...args: unknown[]): void {
  if (enabled) console.log(TAG, ...args);
}

export function time<T>(label: string, fn: () => T): T {
  if (!enabled) return fn();
  const t0 = performance.now();
  const out = fn();
  console.log(TAG, `${label} took ${(performance.now() - t0).toFixed(1)}ms`);
  return out;
}

const OVERLAY_ID = 'fg-debug-overlay';
const OVERLAY_TTL = 15000;
let overlayTimer: ReturnType<typeof setTimeout> | null = null;

export function clearOverlay(): void {
  document.getElementById(OVERLAY_ID)?.remove();
  if (overlayTimer) { clearTimeout(overlayTimer); overlayTimer = null; }
}

/**
 * Draw labelled boxes over each matched field for on-device diagnosis.
 * Boxes use document coordinates inside an absolute layer, so they scroll
 * with the page instead of sticking to the viewport; the layer self-clears
 * after a few seconds.
 */
export function drawOverlay(matches: FieldMatch[]): void {
  if (!enabled) return;
  clearOverlay();
  const layer = document.createElement('div');
  layer.id = OVERLAY_ID;
  Object.assign(layer.style, {
    position: 'absolute', left: '0', top: '0', width: '0', height: '0',
    overflow: 'visible', zIndex: '2147483646', pointerEvents: 'none',
  } as CSSStyleDeclaration);

  for (const m of matches) {
    const rect = m.descriptor.unit.el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    const color = !m.key ? '#ef4444' : m.confidence >= 0.75 ? '#22c55e' : '#f59e0b';
    const box = document.createElement('div');
    Object.assign(box.style, {
      position: 'absolute',
      left: `${rect.left + window.scrollX}px`, top: `${rect.top + window.scrollY}px`,
      width: `${rect.width}px`, height: `${rect.height}px`,
      border: `2px solid ${color}`, boxSizing: 'border-box',
    } as CSSStyleDeclaration);
    const tag = document.createElement('div');
    tag.textContent = m.key ? `${m.key} ${m.confidence.toFixed(2)}` : 'unmatched';
    Object.assign(tag.style, {
      position: 'absolute', top: '-14px', left: '0',
      font: '10px monospace', color: '#fff', background: color,
      padding: '0 3px', whiteSpace: 'nowrap',
    } as CSSStyleDeclaration);
    box.appendChild(tag);
    layer.appendChild(box);
  }
  document.documentElement.appendChild(layer);
  overlayTimer = setTimeout(clearOverlay, OVERLAY_TTL);
}

import type { MediaItem, ProgressCardController } from '../types';
import { ICONS } from './icons';
import { formatBytes, shortId as uid } from '../utils';

// ============================================
// Utilities
// ============================================

/** Build className string from conditional classes */
const cn = (...classes: (string | false | null | undefined)[]): string =>
  classes.filter(Boolean).join(' ');

/** Create element helper */
function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string | boolean | number | null | undefined>,
  children?: (Node | string)[] | string
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);

  if (attrs) {
    for (const [key, val] of Object.entries(attrs)) {
      if (val == null || val === false) continue;
      el.setAttribute(key, val === true ? '' : String(val));
    }
  }

  if (children) {
    if (typeof children === 'string') {
      // Only use innerHTML for trusted content (icons)
      el.innerHTML = children;
    } else {
      for (const child of children) {
        el.append(typeof child === 'string' ? document.createTextNode(child) : child);
      }
    }
  }

  return el;
}

/** Copy text to clipboard with visual feedback */
async function copyToClipboard(text: string, btn: HTMLElement): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = Object.assign(document.createElement('textarea'), {
      value: text,
      style: 'position:fixed;opacity:0;pointer-events:none',
    });

    // Append to the implementation root (Shadow DOM) instead of body for hydration safety
    const root = btn.getRootNode();
    const target = (root instanceof ShadowRoot || root instanceof Document) ? root : document.body;
    target.appendChild(textarea);

    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    if (!ok) return false;
  }

  const original = btn.innerHTML;
  btn.innerHTML = ICONS.check;
  btn.classList.add('copied');
  setTimeout(() => {
    btn.innerHTML = original;
    btn.classList.remove('copied');
  }, 1200);
  return true;
}

// ============================================
// FAB Component
// ============================================

export interface FabState {
  show: boolean;
  busy: boolean;
  idle: boolean;
  count: number;
}

let fabEl: HTMLButtonElement | null = null;
let fabIcon: HTMLSpanElement | null = null;
let fabBadge: HTMLSpanElement | null = null;

export function renderFab(
  container: HTMLElement,
  state: FabState,
  onClick: () => void
): void {
  // Create once, update thereafter
  if (!fabEl) {
    fabEl = h('button', { class: 'sg-fab', type: 'button' });
    fabIcon = h('span', { class: 'sg-fab-icon' }, ICONS.download);
    fabBadge = h('span', { class: 'sg-badge' });
    fabEl.append(fabIcon, fabBadge);
    fabEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    container.appendChild(fabEl);
  }

  // Update state
  fabEl.className = cn('sg-fab', state.show && 'show', state.busy && 'busy', state.idle && 'idle');
  fabEl.disabled = state.busy;
  fabEl.title = `Download media (${state.count})`;

  if (fabBadge) {
    fabBadge.className = cn('sg-badge', state.count > 0 && 'show');
    fabBadge.textContent = state.count > 99 ? '99+' : String(state.count);
  }
}

// ============================================
// Modal Component
// ============================================

// DOM Cache
let modalEl: HTMLDivElement | null = null;
let listEl: HTMLDivElement | null = null;
let titleEl: HTMLDivElement | null = null;
let filterCb: HTMLInputElement | null = null;

export function renderModal(
  container: HTMLElement,
  show: boolean,
  title: string,
  items: MediaItem[],
  showFilter: boolean,
  excludeSmall: boolean,
  onClose: () => void,
  onSelect: (item: MediaItem) => void,
  onFilterChange: (checked: boolean) => void
): void {
  // 1. Hide/Remove if not shown
  if (!show) {
    if (modalEl) {
      modalEl.classList.remove('show');
      // Timeout to remove from DOM after animation? Or just keep it?
      // For simplicity, we just hide it via class, or remove it.
      // Current styles use .show to display.
      // If we remove it, we lose the cache benefits for re-opening.
      // But clearing innerHTML was the old way.
      // Let's keep it in DOM but hidden.
      // Actually, old code did: container.innerHTML = '';
      // If we want to persist, we should append once.

      // If container was cleared externally, our cache is invalid.
      if (!container.contains(modalEl)) {
        modalEl = null;
        listEl = null;
      }
    }
    return;
  }

  // 2. Create if missing
  if (!modalEl || !container.contains(modalEl)) {
    // Force cleanup of container if we are engaging (assuming we own it)
    container.innerHTML = '';

    modalEl = h('div', { class: 'sg-modal' }) as HTMLDivElement;
    modalEl.addEventListener('click', (e) => e.target === modalEl && onClose());

    const card = h('div', { class: 'sg-card', role: 'dialog', 'aria-modal': 'true' });

    // Header
    const header = h('div', { class: 'sg-card-head' });
    titleEl = h('div', { class: 'sg-card-title' }) as HTMLDivElement;
    header.append(
      titleEl,
      createIconButton(ICONS.close, 'Close (Esc)', onClose)
    );
    card.appendChild(header);

    // Body
    const body = h('div', { class: 'sg-card-body' });

    // Filter (always create placeholder, toggle visibility)
    const label = h('label', { class: 'sg-option' });
    filterCb = h('input', { type: 'checkbox' }) as HTMLInputElement;
    filterCb.addEventListener('change', () => onFilterChange(filterCb!.checked));
    label.append(filterCb, ' Exclude small (< 1MB)');
    body.appendChild(label);

    // Store label reference? No, we can just hide the whole label if needed
    // But for now, let's keep it simple.

    listEl = h('div', { class: 'sg-list' }) as HTMLDivElement;
    body.appendChild(listEl);

    card.appendChild(body);
    modalEl.appendChild(card);
    container.appendChild(modalEl);
  }

  // 3. Update State
  modalEl.classList.add('show');
  if (titleEl) titleEl.textContent = title;

  if (filterCb) {
    filterCb.checked = excludeSmall || false;
    // Toggle visibility of filter logic
    const label = filterCb.parentElement;
    if (label) {
      label.style.display = (showFilter && items.some((i) => i.size != null)) ? 'flex' : 'none';
    }
  }

  // 4. Update List
  // Optimization: Simple destroy & rebuild for now (better than destroying modal)
  if (listEl) {
    listEl.innerHTML = '';
    if (items.length === 0) {
      const empty = h('div', { class: 'sg-empty' });
      empty.innerHTML = 'No media detected.<br><small>Play a video to detect streams.</small>';
      listEl.appendChild(empty);
    } else {
      items.forEach((item) => listEl!.appendChild(createItemElement(item, onSelect)));
    }
  }
}

function createIconButton(icon: string, title: string, onClick: () => void): HTMLButtonElement {
  const btn = h('button', { class: 'sg-btn', title, type: 'button' }, icon) as HTMLButtonElement;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    onClick();
  });
  return btn;
}

function createItemElement(item: MediaItem, onSelect: (item: MediaItem) => void): HTMLElement {
  const el = h('div', { class: 'sg-item', role: 'button', tabindex: '0' });

  // Top row: title + badges + size + copy
  const top = h('div', { class: 'sg-item-top' });

  const titleDiv = h('div', { class: 'sg-item-title' });
  titleDiv.appendChild(Object.assign(h('span'), { textContent: item.label }));
  getBadges(item).forEach((b) => titleDiv.appendChild(b));
  top.appendChild(titleDiv);

  if (item.size) {
    top.appendChild(Object.assign(h('span', { class: 'sg-item-size' }), { textContent: formatBytes(item.size) }));
  }

  const copyBtn = h('button', { class: 'sg-copy-btn', title: 'Copy URL', type: 'button' }, ICONS.copy);
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    copyToClipboard(item.url, copyBtn);
  });
  top.appendChild(copyBtn);
  el.appendChild(top);

  // Sublabel
  if (item.sublabel) {
    el.appendChild(Object.assign(h('div', { class: 'sg-item-sub' }), { textContent: item.sublabel }));
  }

  // Page title
  if (item.pageTitle) {
    el.appendChild(Object.assign(h('div', { class: 'sg-item-title-context' }), { textContent: item.pageTitle }));
  }

  // URL (truncated)
  const urlEl = h('div', { class: 'sg-item-url', title: item.url });
  urlEl.textContent = item.url.length > 60 ? item.url.slice(0, 60) + '…' : item.url;
  el.appendChild(urlEl);

  // Handlers
  el.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.sg-copy-btn')) onSelect(item);
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(item);
    }
  });

  return el;
}

function getBadges(item: MediaItem): HTMLElement[] {
  const badges: HTMLElement[] = [];
  const add = (text: string, type: string) => {
    const el = h('span', { class: `sg-badge-type ${type}` });
    el.textContent = text;
    badges.push(el);
  };

  if (item.kind === 'hls') {
    if (item.hlsType === 'error' || item.hlsType === 'invalid') {
      add(item.hlsType === 'error' ? 'Error' : 'Invalid', 'error');
    } else if (item.hlsType === 'master') {
      add('Master', 'master');
    } else if (item.hlsType === 'media') {
      add('Video', 'video');
    } else if (item.enriching) {
      add('...', 'analyzing');
    } else {
      add('HLS', 'video');
    }
    if (item.isLive) add('Live', 'live');
    if (item.encrypted) add('🔒', 'encrypted');
  } else if (item.kind === 'video') {
    add('Direct', 'direct');
  } else if (item.kind === 'variant') {
    add('Quality', 'video');
  }

  if (item.isRemote) add('iFrame', 'remote');
  return badges;
}

// ============================================
// Progress Card
// ============================================

class ProgressCard implements ProgressCardController {
  private el: HTMLDivElement;
  private fillEl: HTMLDivElement;
  private statusEl: HTMLSpanElement;
  private percentEl: HTMLSpanElement;
  private pauseBtn: HTMLButtonElement | null = null;
  private minBtn: HTMLButtonElement;

  private minimized = false;
  private paused = false;
  private percent = 0;
  private status: string;
  private onStop?: () => 'paused' | 'resumed';
  private onCancelFn?: () => void;

  constructor(
    private container: HTMLElement,
    private title: string,
    private src: string,
    segs = 0
  ) {
    this.status = segs ? `${segs} segments` : 'Starting...';
    this.el = h('div', { class: 'sg-progress', id: `sg-progress-${uid()}` }) as HTMLDivElement;

    // Row: name + controls
    const row = h('div', { class: 'sg-progress-row' });
    row.appendChild(Object.assign(h('div', { class: 'sg-progress-name', title: src }), { textContent: title }));

    const ctrls = h('div', { class: 'sg-progress-ctrls' });

    // Minimize button
    this.minBtn = h('button', { class: 'sg-btn sg-btn-sm btn-minimize', title: 'Minimize', type: 'button' }, ICONS.minimize) as HTMLButtonElement;
    this.minBtn.addEventListener('click', () => this.toggleMinimize());
    ctrls.appendChild(this.minBtn);

    // Cancel button
    const cancelBtn = h('button', { class: 'sg-btn sg-btn-sm', title: 'Cancel', type: 'button' }, ICONS.cancel) as HTMLButtonElement;
    cancelBtn.addEventListener('click', () => this.onCancelFn?.());
    ctrls.appendChild(cancelBtn);

    row.appendChild(ctrls);
    this.el.appendChild(row);

    // Progress bar
    const bar = h('div', { class: 'sg-progress-bar' });
    this.fillEl = h('div', { class: 'sg-progress-fill' }) as HTMLDivElement;
    bar.appendChild(this.fillEl);
    this.el.appendChild(bar);

    // Status row
    const statusRow = h('div', { class: 'sg-progress-status' });
    this.statusEl = h('span') as HTMLSpanElement;
    this.statusEl.textContent = this.status;
    this.percentEl = h('span') as HTMLSpanElement;
    this.percentEl.textContent = '0%';
    statusRow.append(this.statusEl, this.percentEl);
    this.el.appendChild(statusRow);

    container.appendChild(this.el);
  }

  private toggleMinimize(): void {
    this.minimized = !this.minimized;
    this.minBtn.innerHTML = this.minimized ? ICONS.maximize : ICONS.minimize;
    this.minBtn.title = this.minimized ? 'Expand' : 'Minimize';
    this.updateClass();
  }

  private updateClass(): void {
    this.el.className = cn('sg-progress', this.minimized && 'minimized', this.paused && 'paused');
  }

  update(percent: number, text = ''): void {
    this.percent = Math.max(0, Math.min(100, percent));
    if (text) this.status = text;
    this.fillEl.style.setProperty('width', `${this.percent}%`, 'important');
    this.statusEl.textContent = this.status;
    this.percentEl.textContent = `${Math.floor(this.percent)}%`;
  }

  done(ok = true, msg?: string): void {
    this.fillEl.style.width = '100%';
    this.fillEl.classList.add(ok ? 'success' : 'error');
    this.statusEl.textContent = msg || (ok ? 'Complete ✓' : 'Failed ✗');
    this.percentEl.textContent = '100%';
    setTimeout(() => this.remove(), 2500);
  }

  remove(): void {
    this.el.remove();
  }

  setOnStop(fn: () => 'paused' | 'resumed'): void {
    this.onStop = fn;
    if (this.pauseBtn) return; // Already added

    // Insert pause button before minimize
    this.pauseBtn = h('button', { class: 'sg-btn sg-btn-sm', title: 'Pause', type: 'button' }, ICONS.pause) as HTMLButtonElement;
    this.pauseBtn.addEventListener('click', () => {
      if (!this.onStop) return;
      const result = this.onStop();
      this.paused = result === 'paused';
      this.pauseBtn!.innerHTML = this.paused ? ICONS.play : ICONS.pause;
      this.pauseBtn!.title = this.paused ? 'Resume' : 'Pause';
      this.updateClass();
    });
    this.minBtn.before(this.pauseBtn);
  }

  setOnCancel(fn: () => void): void {
    this.onCancelFn = fn;
  }
}

export function createProgressCard(
  container: HTMLElement,
  title: string,
  src: string,
  segs = 0
): ProgressCardController {
  return new ProgressCard(container, title, src, segs);
}
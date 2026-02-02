import type { MediaItem, ProgressCardController } from '../types';
import { ICONS } from './icons';
import { formatBytes, uid } from '../utils';

// ============================================
// Clipboard
// ============================================

async function copyToClipboard(text: string, btn: HTMLElement): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } catch {
      document.body.removeChild(textarea);
      return false;
    }
    document.body.removeChild(textarea);
  }

  const originalHTML = btn.innerHTML;
  btn.innerHTML = ICONS.check;
  btn.classList.add('copied');
  setTimeout(() => {
    btn.innerHTML = originalHTML;
    btn.classList.remove('copied');
  }, 1500);
  return true;
}

// ============================================
// Helper: Create element
// ============================================

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string | boolean | number | null | undefined>,
  children?: (Node | string)[] | string
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);

  if (attrs) {
    for (const [key, val] of Object.entries(attrs)) {
      if (val == null || val === false) continue;
      if (val === true) {
        el.setAttribute(key, '');
      } else {
        el.setAttribute(key, String(val));
      }
    }
  }

  if (children) {
    if (typeof children === 'string') {
      el.innerHTML = children;
    } else {
      for (const child of children) {
        if (typeof child === 'string') {
          el.appendChild(document.createTextNode(child));
        } else {
          el.appendChild(child);
        }
      }
    }
  }

  return el;
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

export function renderFab(
  container: HTMLElement,
  fabState: FabState,
  onClick: () => void
): void {
  // Clear container
  // Create or reuse FAB
  let fab = container.querySelector('.sg-fab') as HTMLButtonElement | null;
  let iconSpan: HTMLSpanElement;
  let badge: HTMLSpanElement;

  if (!fab) {
    fab = h('button', { class: 'sg-fab' });

    iconSpan = h('span');
    iconSpan.innerHTML = ICONS.download;
    fab.appendChild(iconSpan);

    badge = h('span', { class: 'sg-badge' });
    fab.appendChild(badge);

    fab.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    container.appendChild(fab);
  } else {
    iconSpan = fab.querySelector('span:first-child') as HTMLSpanElement;
    badge = fab.querySelector('.sg-badge') as HTMLSpanElement;
  }

  // Update classes
  const classes = ['sg-fab'];
  if (fabState.show) classes.push('show');
  if (fabState.busy) classes.push('busy');
  if (fabState.idle) classes.push('idle');
  fab.className = classes.join(' ');

  fab.title = `Download detected media (${fabState.count} items)`;
  fab.disabled = fabState.busy;
  if (fabState.busy) fab.setAttribute('disabled', ''); else fab.removeAttribute('disabled');

  // Update Badge
  const badgeClasses = ['sg-badge'];
  if (fabState.count > 0) badgeClasses.push('show');
  badge.className = badgeClasses.join(' ');
  badge.textContent = fabState.count > 99 ? '99+' : String(fabState.count);

  console.log('[SG] FAB rendered to DOM:', {
    classes: fab.className,
    inDOM: document.body.contains(fab),
    display: getComputedStyle(fab).display
  });
}

// ============================================
// Modal Panel Component
// ============================================

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
  // Clear container
  container.innerHTML = '';

  // Build modal overlay
  const modalClasses = ['sg-modal'];
  if (show) modalClasses.push('show');

  const modal = h('div', { class: modalClasses.join(' ') });

  // Backdrop click handler
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      onClose();
    }
  });

  // Card
  const card = h('div', {
    class: 'sg-card',
    role: 'dialog',
    'aria-modal': 'true',
  });

  // Header
  const header = h('div', { class: 'sg-card-head' });

  const titleEl = h('div', { class: 'sg-card-title' });
  titleEl.textContent = title;
  header.appendChild(titleEl);

  const closeBtn = h('button', { class: 'sg-btn', title: 'Close (Esc)' });
  closeBtn.innerHTML = ICONS.close;
  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    onClose();
  });
  header.appendChild(closeBtn);

  card.appendChild(header);

  // Body
  const body = h('div', { class: 'sg-card-body' });

  // Filter option
  const anySizeKnown = items.some(i => i.size != null);
  if (showFilter && anySizeKnown) {
    const option = h('label', { class: 'sg-option' });

    const checkbox = h('input', {
      type: 'checkbox',
      checked: excludeSmall ? true : null,
    }) as HTMLInputElement;
    checkbox.addEventListener('change', () => {
      onFilterChange(checkbox.checked);
    });
    option.appendChild(checkbox);

    option.appendChild(document.createTextNode(' Exclude small (< 1MB)'));
    body.appendChild(option);
  }

  // Item list
  const list = h('div', { class: 'sg-list' });

  if (items.length === 0) {
    const empty = h('div', { class: 'sg-empty' });
    empty.innerHTML = 'No media detected yet.<br><small>Try playing a video on this page.</small>';
    list.appendChild(empty);
  } else {
    for (const item of items) {
      const itemEl = createItemElement(item, onSelect);
      list.appendChild(itemEl);
    }
  }

  body.appendChild(list);
  card.appendChild(body);
  modal.appendChild(card);
  container.appendChild(modal);

  console.log('[SG] Modal rendered to DOM:', {
    show,
    classes: modal.className,
    inDOM: document.body.contains(modal),
    display: getComputedStyle(modal).display,
    itemCount: items.length,
  });
}

function createItemElement(
  item: MediaItem,
  onSelect: (item: MediaItem) => void
): HTMLElement {
  const el = h('div', {
    class: 'sg-item',
    role: 'button',
    tabindex: '0',
  });

  // Top row
  const top = h('div', { class: 'sg-item-top' });

  // Title with badges
  const titleDiv = h('div', { class: 'sg-item-title' });

  const labelSpan = h('span');
  labelSpan.textContent = item.label;
  titleDiv.appendChild(labelSpan);

  // Badges
  const badges = getBadges(item);
  for (const badge of badges) {
    titleDiv.appendChild(badge);
  }

  top.appendChild(titleDiv);

  // Size
  if (item.size) {
    const sizeSpan = h('span', { class: 'sg-item-size' });
    sizeSpan.textContent = formatBytes(item.size);
    top.appendChild(sizeSpan);
  }

  // Copy button
  const copyBtn = h('button', { class: 'sg-copy-btn', title: 'Copy URL' });
  copyBtn.innerHTML = ICONS.copy;
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    copyToClipboard(item.url, copyBtn);
  });
  top.appendChild(copyBtn);

  el.appendChild(top);

  // Sublabel
  if (item.sublabel) {
    const subEl = h('div', { class: 'sg-item-sub' });
    subEl.textContent = item.sublabel;
    el.appendChild(subEl);
  }

  // URL
  const urlEl = h('div', { class: 'sg-item-url', title: item.url });
  urlEl.textContent = item.url.length > 65 ? item.url.slice(0, 65) + '…' : item.url;
  el.appendChild(urlEl);

  // Click handler
  el.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.sg-copy-btn')) {
      onSelect(item);
    }
  });

  // Keyboard handler
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

  const addBadge = (text: string, type: string) => {
    const badge = h('span', { class: `sg-badge-type ${type}` });
    badge.textContent = text;
    badges.push(badge);
  };

  if (item.kind === 'hls') {
    if (item.hlsType === 'error') {
      addBadge('Error', 'error');
    } else if (item.hlsType === 'invalid') {
      addBadge('Invalid', 'error');
    } else if (item.hlsType === 'master') {
      addBadge('Master', 'master');
    } else if (item.hlsType === 'media') {
      addBadge('Video', 'video');
    } else if (item.enriching) {
      addBadge('...', 'analyzing');
    } else {
      addBadge('HLS', 'video');
    }

    if (item.isLive) {
      addBadge('Live', 'live');
    }
    if (item.encrypted) {
      addBadge('🔒', 'encrypted');
    }
  } else if (item.kind === 'video') {
    addBadge('Direct', 'direct');
  } else if (item.kind === 'variant') {
    addBadge('Quality', 'video');
  }

  if (item.isRemote) {
    addBadge('iFrame', 'remote');
  }

  return badges;
}

// ============================================
// Progress Card
// ============================================

class ProgressCardImpl implements ProgressCardController {
  private container: HTMLElement;
  private element: HTMLDivElement;
  private fillEl: HTMLDivElement | null = null;
  private statusTextEl: HTMLSpanElement | null = null;
  private percentEl: HTMLSpanElement | null = null;
  private pauseBtn: HTMLButtonElement | null = null;

  private minimized = false;
  private percent = 0;
  private statusText: string;
  private isPaused = false;
  private onStopFn?: () => 'paused' | 'resumed';
  private onCancelFn?: () => void;
  private title: string;
  private src: string;

  constructor(container: HTMLElement, title: string, src: string, segs = 0) {
    this.container = container;
    this.title = title;
    this.src = src;
    this.statusText = segs ? `${segs} segments` : 'Starting...';

    this.element = document.createElement('div');
    this.element.className = 'sg-progress';
    this.element.id = `sg-progress-${uid()}`;

    this.buildDOM();
    this.container.appendChild(this.element);
  }

  private buildDOM(): void {
    this.element.innerHTML = '';

    // Row with name and controls
    const row = h('div', { class: 'sg-progress-row' });

    const nameEl = h('div', { class: 'sg-progress-name', title: this.src });
    nameEl.textContent = this.title;
    row.appendChild(nameEl);

    const ctrls = h('div', { class: 'sg-progress-ctrls' });

    // Pause/Resume button (only if handler is set)
    if (this.onStopFn) {
      this.pauseBtn = h('button', {
        class: 'sg-btn sg-btn-small',
        title: this.isPaused ? 'Resume' : 'Pause',
      }) as HTMLButtonElement;
      this.pauseBtn.innerHTML = this.isPaused ? ICONS.play : ICONS.pause;
      this.pauseBtn.addEventListener('click', () => {
        if (this.onStopFn) {
          const result = this.onStopFn();
          this.isPaused = result === 'paused';
          if (this.pauseBtn) {
            this.pauseBtn.innerHTML = this.isPaused ? ICONS.play : ICONS.pause;
            this.pauseBtn.title = this.isPaused ? 'Resume' : 'Pause';
          }
          this.updateClass();
        }
      });
      ctrls.appendChild(this.pauseBtn);
    }

    // Minimize button
    const minBtn = h('button', {
      class: 'sg-btn sg-btn-small btn-minimize',
      title: this.minimized ? 'Expand' : 'Minimize',
    }) as HTMLButtonElement;
    minBtn.innerHTML = this.minimized ? ICONS.maximize : ICONS.minimize;
    minBtn.addEventListener('click', () => {
      this.minimized = !this.minimized;
      minBtn.innerHTML = this.minimized ? ICONS.maximize : ICONS.minimize;
      minBtn.title = this.minimized ? 'Expand' : 'Minimize';
      this.updateClass();
    });
    ctrls.appendChild(minBtn);

    // Cancel button
    const cancelBtn = h('button', {
      class: 'sg-btn sg-btn-small',
      title: 'Cancel',
    }) as HTMLButtonElement;
    cancelBtn.innerHTML = ICONS.cancel;
    cancelBtn.addEventListener('click', () => {
      this.onCancelFn?.();
    });
    ctrls.appendChild(cancelBtn);

    row.appendChild(ctrls);
    this.element.appendChild(row);

    // Progress bar
    const bar = h('div', { class: 'sg-progress-bar' });
    this.fillEl = h('div', { class: 'sg-progress-fill' }) as HTMLDivElement;
    this.fillEl.style.width = `${this.percent}%`;
    bar.appendChild(this.fillEl);
    this.element.appendChild(bar);

    // Status
    const status = h('div', { class: 'sg-progress-status' });
    this.statusTextEl = h('span') as HTMLSpanElement;
    this.statusTextEl.textContent = this.statusText;
    status.appendChild(this.statusTextEl);

    this.percentEl = h('span') as HTMLSpanElement;
    this.percentEl.textContent = `${Math.floor(this.percent)}%`;
    status.appendChild(this.percentEl);

    this.element.appendChild(status);

    this.updateClass();
  }

  private updateClass(): void {
    const classes = ['sg-progress'];
    if (this.minimized) classes.push('minimized');
    if (this.isPaused) classes.push('paused');
    this.element.className = classes.join(' ');
  }

  update(percent: number, text = ''): void {
    this.percent = Math.max(0, Math.min(100, percent));
    if (text) this.statusText = text;

    if (this.fillEl) {
      this.fillEl.style.width = `${this.percent}%`;
    }
    if (this.statusTextEl) {
      this.statusTextEl.textContent = this.statusText;
    }
    if (this.percentEl) {
      this.percentEl.textContent = `${Math.floor(this.percent)}%`;
    }
  }

  done(ok = true, msg?: string): void {
    if (this.fillEl) {
      this.fillEl.style.background = ok ? 'var(--sg-ok)' : 'var(--sg-bad)';
      this.fillEl.style.width = '100%';
    }
    this.percent = 100;
    this.statusText = msg || (ok ? 'Complete ✓' : 'Failed ✗');

    if (this.statusTextEl) {
      this.statusTextEl.textContent = this.statusText;
    }
    if (this.percentEl) {
      this.percentEl.textContent = '100%';
    }

    setTimeout(() => this.remove(), 2500);
  }

  remove(): void {
    this.element.remove();
  }

  setOnStop(fn: () => 'paused' | 'resumed'): void {
    this.onStopFn = fn;
    // Rebuild DOM to add the pause button
    this.buildDOM();
  }

  setOnCancel(fn: () => void): void {
    this.onCancelFn = fn;
  }
} // End ProgressCardImpl (manual adjustment for replacement context)

function cleanupProgressCard(card: ProgressCardImpl) {
  card.remove();
}

export function createProgressCard(
  container: HTMLElement,
  title: string,
  src: string,
  segs = 0
): ProgressCardController {
  return new ProgressCardImpl(container, title, src, segs);
}
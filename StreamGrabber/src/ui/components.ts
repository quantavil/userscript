import { html, render, nothing, type TemplateResult } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { classMap } from 'lit-html/directives/class-map.js';
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
  const fabClasses = {
    'sg-fab': true,
    'show': fabState.show,
    'busy': fabState.busy,
    'idle': fabState.idle,
  };

  const badgeClasses = {
    'sg-badge': true,
    'show': fabState.count > 0,
  };

  const template = html`
    <button
      class=${classMap(fabClasses)}
      title="Download detected media (${fabState.count} items)"
      @click=${onClick}
      ?disabled=${fabState.busy}
    >
      <span>${unsafeHTML(ICONS.download)}</span>
      <span class=${classMap(badgeClasses)}>
        ${fabState.count > 99 ? '99+' : fabState.count}
      </span>
    </button>
  `;

  render(template, container);
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
  const anySizeKnown = items.some(i => i.size != null);

  const modalClasses = {
    'sg-modal': true,
    'show': show,
  };

  const renderItem = (item: MediaItem, index: number) => {
    const shortUrl = item.url.length > 65 ? item.url.slice(0, 65) + '…' : item.url;

    const badges: TemplateResult[] = [];

    // Kind badge
    if (item.kind === 'hls') {
      if (item.hlsType === 'error') {
        badges.push(html`<span class="sg-badge-type error">Error</span>`);
      } else if (item.hlsType === 'invalid') {
        badges.push(html`<span class="sg-badge-type error">Invalid</span>`);
      } else if (item.hlsType === 'master') {
        badges.push(html`<span class="sg-badge-type master">Master</span>`);
      } else if (item.hlsType === 'media') {
        badges.push(html`<span class="sg-badge-type video">Video</span>`);
      } else if (item.enriching) {
        badges.push(html`<span class="sg-badge-type analyzing">...</span>`);
      } else {
        badges.push(html`<span class="sg-badge-type video">HLS</span>`);
      }

      if (item.isLive) {
        badges.push(html`<span class="sg-badge-type live">Live</span>`);
      }
      if (item.encrypted) {
        badges.push(html`<span class="sg-badge-type encrypted">🔒</span>`);
      }
    } else if (item.kind === 'video') {
      badges.push(html`<span class="sg-badge-type direct">Direct</span>`);
    } else if (item.kind === 'variant') {
      badges.push(html`<span class="sg-badge-type video">Quality</span>`);
    }

    // Remote badge (from iframe)
    if (item.isRemote) {
      badges.push(html`<span class="sg-badge-type remote">iFrame</span>`);
    }

    const handleCopy = (e: Event) => {
      e.stopPropagation();
      copyToClipboard(item.url, e.currentTarget as HTMLElement);
    };

    const handleClick = (e: Event) => {
      if (!(e.target as HTMLElement).closest('.sg-copy-btn')) {
        onSelect(item);
      }
    };

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(item);
      }
    };

    return html`
      <div
        class="sg-item"
        role="button"
        tabindex="0"
        data-index=${index}
        @click=${handleClick}
        @keydown=${handleKeydown}
      >
        <div class="sg-item-top">
          <div class="sg-item-title">
            <span>${item.label}</span>
            ${badges}
          </div>
          ${item.size ? html`<span class="sg-item-size">${formatBytes(item.size)}</span>` : nothing}
          <button class="sg-copy-btn" title="Copy URL" @click=${handleCopy}>
            ${unsafeHTML(ICONS.copy)}
          </button>
        </div>
        ${item.sublabel ? html`<div class="sg-item-sub">${item.sublabel}</div>` : nothing}
        <div class="sg-item-url" title=${item.url}>${shortUrl}</div>
      </div>
    `;
  };

  const handleBackdropClick = (e: Event) => {
    if (e.target === e.currentTarget) onClose();
  };

  const template = html`
    <div
      class=${classMap(modalClasses)}
      @click=${handleBackdropClick}
    >
      <div class="sg-card" role="dialog" aria-modal="true" aria-labelledby="sg-modal-title">
        <div class="sg-card-head">
          <div class="sg-card-title" id="sg-modal-title">${title}</div>
          <button class="sg-btn" title="Close (Esc)" @click=${onClose}>
            ${unsafeHTML(ICONS.close)}
          </button>
        </div>
        <div class="sg-card-body">
          ${showFilter && anySizeKnown ? html`
            <label class="sg-option">
              <input
                type="checkbox"
                ?checked=${excludeSmall}
                @change=${(e: Event) => onFilterChange((e.target as HTMLInputElement).checked)}
              >
              Exclude small (&lt; 1MB)
            </label>
          ` : nothing}
          <div class="sg-list">
            ${items.length > 0
      ? items.map((item, i) => renderItem(item, i))
      : html`<div class="sg-empty">No media detected yet.<br><small>Try playing a video on this page.</small></div>`
    }
          </div>
        </div>
      </div>
    </div>
  `;

  render(template, container);
}

// ============================================
// Progress Card
// ============================================

class ProgressCardImpl implements ProgressCardController {
  private container: HTMLElement;
  private element: HTMLDivElement;
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
    this.container.appendChild(this.element);

    this.render();
  }

  private render(): void {
    const handleStop = () => {
      if (this.onStopFn) {
        const result = this.onStopFn();
        this.isPaused = result === 'paused';
        this.render();
      }
    };

    const handleMinimize = () => {
      this.minimized = !this.minimized;
      this.render();
    };

    const handleCancel = () => {
      this.onCancelFn?.();
    };

    const progressClasses = {
      'sg-progress': true,
      'minimized': this.minimized,
      'paused': this.isPaused,
    };

    const template = html`
      <div class="sg-progress-row">
        <div class="sg-progress-name" title=${this.src}>${this.title}</div>
        <div class="sg-progress-ctrls">
          ${this.onStopFn ? html`
            <button 
              class="sg-btn sg-btn-small" 
              title=${this.isPaused ? 'Resume' : 'Pause'} 
              @click=${handleStop}
            >
              ${unsafeHTML(this.isPaused ? ICONS.play : ICONS.pause)}
            </button>
          ` : nothing}
          <button 
            class="sg-btn sg-btn-small btn-minimize" 
            title=${this.minimized ? 'Expand' : 'Minimize'} 
            @click=${handleMinimize}
          >
            ${unsafeHTML(this.minimized ? ICONS.maximize : ICONS.minimize)}
          </button>
          <button class="sg-btn sg-btn-small" title="Cancel" @click=${handleCancel}>
            ${unsafeHTML(ICONS.cancel)}
          </button>
        </div>
      </div>
      <div class="sg-progress-bar">
        <div class="sg-progress-fill" style="width: ${this.percent}%"></div>
      </div>
      <div class="sg-progress-status">
        <span>${this.statusText}</span>
        <span>${Math.floor(this.percent)}%</span>
      </div>
    `;

    // Build class string
    const classStr = Object.entries(progressClasses)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(' ');

    this.element.className = classStr;
    render(template, this.element);
  }

  update(percent: number, text = ''): void {
    this.percent = Math.max(0, Math.min(100, percent));
    if (text) this.statusText = text;
    this.render();
  }

  done(ok = true, msg?: string): void {
    const fill = this.element.querySelector('.sg-progress-fill') as HTMLElement;
    if (fill) {
      fill.style.background = ok ? 'var(--sg-ok)' : 'var(--sg-bad)';
    }
    this.percent = 100;
    this.statusText = msg || (ok ? 'Complete ✓' : 'Failed ✗');
    this.render();
    setTimeout(() => this.remove(), 2500);
  }

  remove(): void {
    this.element.remove();
  }

  setOnStop(fn: () => 'paused' | 'resumed'): void {
    this.onStopFn = fn;
    this.render();
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
  return new ProgressCardImpl(container, title, src, segs);
}
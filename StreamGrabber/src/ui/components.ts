import { html, render, nothing, type TemplateResult } from 'lit-html';
import type { MediaItem, ProgressCardController } from '../types';
import { CFG } from '../config';
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
  const classes = [
    'sg-fab',
    fabState.show ? 'show' : '',
    fabState.busy ? 'busy' : '',
    fabState.idle ? 'idle' : '',
  ].filter(Boolean).join(' ');
  
  const template = html`
    <button
      class=${classes}
      title="Download detected media"
      @click=${onClick}
      ?disabled=${fabState.busy}
    >
      <span .innerHTML=${ICONS.download}></span>
      <span class=${`sg-badge ${fabState.count > 0 ? 'show' : ''}`}>
        ${fabState.count}
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
  
  const renderItem = (item: MediaItem) => {
    const shortUrl = item.url.length > 65 ? item.url.slice(0, 65) + '…' : item.url;
    
    const badges: TemplateResult[] = [];
    if (item.kind === 'hls') {
      if (item.hlsType === 'master') {
        badges.push(html`<span class="sg-badge-type master">Master</span>`);
      } else if (item.hlsType === 'media') {
        badges.push(html`<span class="sg-badge-type video">Video</span>`);
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
            <span .innerHTML=${ICONS.copy}></span>
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
      class=${`sg-modal ${show ? 'show' : ''}`}
      @click=${handleBackdropClick}
    >
      <div class="sg-card" role="dialog" aria-modal="true">
        <div class="sg-card-head">
          <div class="sg-card-title">${title}</div>
          <button class="sg-btn" title="Close" @click=${onClose}>
            <span .innerHTML=${ICONS.close}></span>
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
              ? items.map(renderItem)
              : html`<div class="sg-empty">No media detected yet.</div>`
            }
          </div>
        </div>
      </div>
    </div>
  `;
  
  render(template, container);
}

// ============================================
// Progress Card (Fixed Implementation)
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
    this.statusText = segs ? `${segs} segs` : '';
    
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
              <span .innerHTML=${this.isPaused ? ICONS.play : ICONS.pause}></span>
            </button>
          ` : nothing}
          <button 
            class="sg-btn sg-btn-small btn-minimize" 
            title=${this.minimized ? 'Show' : 'Hide'} 
            @click=${handleMinimize}
          >
            <span .innerHTML=${this.minimized ? ICONS.maximize : ICONS.minimize}></span>
          </button>
          <button class="sg-btn sg-btn-small" title="Cancel" @click=${handleCancel}>
            <span .innerHTML=${ICONS.cancel}></span>
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
    
    this.element.className = `sg-progress ${this.minimized ? 'minimized' : ''}`;
    render(template, this.element);
  }
  
  update(percent: number, text = ''): void {
    this.percent = Math.max(0, Math.min(100, percent));
    this.statusText = text;
    this.render();
  }
  
  done(ok = true, msg?: string): void {
    const fill = this.element.querySelector('.sg-progress-fill') as HTMLElement;
    if (fill) {
      fill.style.background = ok ? '#10b981' : '#e74c3c';
    }
    this.percent = 100;
    this.statusText = msg || (ok ? '✓' : '✗');
    this.render();
    setTimeout(() => this.remove(), 2200);
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
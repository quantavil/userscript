import { C, type CachedMeta } from './cache';
import { loadMeta } from './api';
import { dlFile } from './sidebar';

export interface LightboxElements {
  lb: HTMLElement;
  loading: HTMLElement;
  info: HTMLElement;
  img: HTMLImageElement;
  dl: HTMLButtonElement;
  close: HTMLButtonElement;
  prev: HTMLButtonElement;
  next: HTMLButtonElement;
}

export function createLightbox(): LightboxElements {
  const lb = document.createElement('div');
  lb.id = 'whLb';
  lb.innerHTML = `
    <div class="whlb-loading"></div>
    <div class="whlb-bar">
      <span class="whlb-info"></span>
      <div class="whlb-btns">
        <button class="whlb-action whlb-dl">⬇ Download (D)</button>
        <button class="whlb-action whlb-close">✕ Close (Esc)</button>
      </div>
    </div>
    <button class="whlb-arrow whlb-prev">‹</button>
    <img class="whlb-img">
    <button class="whlb-arrow whlb-next">›</button>
  `;
  document.body.appendChild(lb);

  return {
    lb,
    loading: lb.querySelector('.whlb-loading')!,
    info: lb.querySelector('.whlb-info')!,
    img: lb.querySelector('.whlb-img')!,
    dl: lb.querySelector('.whlb-dl')!,
    close: lb.querySelector('.whlb-close')!,
    prev: lb.querySelector('.whlb-prev')!,
    next: lb.querySelector('.whlb-next')!,
  };
}

export class LightboxManager {
  private els: LightboxElements;
  private currentId: string | null = null;
  private currentData: CachedMeta | null = null;
  private onStepCallback: (dir: number) => void;

  constructor(els: LightboxElements, onStep: (dir: number) => void) {
    this.els = els;
    this.onStepCallback = onStep;

    this.els.close.addEventListener('click', () => this.close());
    this.els.lb.addEventListener('click', e => {
      if (e.target === this.els.lb) this.close();
    });
    this.els.prev.addEventListener('click', () => this.step(-1));
    this.els.next.addEventListener('click', () => this.step(1));
    this.els.dl.addEventListener('click', () => {
      if (this.currentData) {
        dlFile(this.currentData.url, this.currentData.url.split('/').pop() || 'wallpaper.png');
      }
    });

    document.addEventListener('keydown', e => {
      if (!this.isOpen()) return;
      switch (e.key) {
        case 'Escape':
          this.close();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.step(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.step(1);
          break;
        case 'd':
        case 'D':
          if (!e.ctrlKey && !e.altKey && !e.metaKey && this.currentData) {
            e.preventDefault();
            dlFile(this.currentData.url, this.currentData.url.split('/').pop() || 'wallpaper.png');
          }
          break;
      }
    });
  }

  public isOpen(): boolean {
    return this.els.lb.classList.contains('on');
  }

  public open(id: string) {
    this.currentId = id;
    this.els.lb.classList.add('on');
    this.els.img.removeAttribute('src');
    this.els.loading.textContent = 'Loading…';
    this.els.info.textContent = id;
    this.currentData = null;

    // Try persistent cache
    const cached = C.get(id);
    if (cached) {
      this.currentData = cached;
      this.els.loading.textContent = '';
      this.els.img.src = cached.url;
      this.els.info.textContent = `${id} · ${cached.sizeString}`;
      return;
    }

    // Load details page in background
    loadMeta(id, meta => {
      if (this.currentId !== id) return; // user navigated away
      if (!meta) {
        this.els.loading.textContent = 'Failed to load';
        return;
      }
      this.currentData = { url: meta.url, sizeString: meta.size };
      this.els.loading.textContent = '';
      this.els.img.src = meta.url;
      this.els.info.textContent = `${id} · ${meta.size}`;
    });
  }

  public close() {
    this.els.lb.classList.remove('on');
    this.currentId = null;
    this.currentData = null;
    this.els.img.removeAttribute('src');
  }

  public getCurrentId(): string | null {
    return this.currentId;
  }

  private step(dir: number) {
    this.onStepCallback(dir);
  }
}

import { BaseAdapter } from './BaseAdapter';
import { cleanNumber } from '../utils/formatters';
import { injectHeartUI } from '../core/ui';
import { cleanProductUrl } from '../utils/urlCleaner';
import type { WishlistItem } from '../core/types';

export class FlipkartAdapter extends BaseAdapter {
  processCards() {
    const cards = new Set<HTMLElement>();

    // 1. Desktop card containers
    document.querySelectorAll('div[data-id], div.slAVV4').forEach(el => {
      cards.add(el as HTMLElement);
    });

    // 2. Mobile/Generic card containers (find ancestors of product links containing an image)
    document.querySelectorAll('a[href*="/p/"]').forEach(linkEl => {
      // Skip links inside the wishlist panel to avoid cyclical card detection
      if (linkEl.closest('.aiw-panel')) return;

      let parent = linkEl.parentElement;
      let bestBoundary: HTMLElement | null = null;
      while (parent && parent !== document.body) {
        // Enforce that the parent does not contain links to different product PIDs
        const pids = new Set<string>();
        const productLinks = parent.querySelectorAll('a[href*="/p/"]');
        for (const l of productLinks) {
          const pid = this.getProductId(parent, l as HTMLAnchorElement);
          if (pid) pids.add(pid);
        }
        if (pids.size > 1) {
          // Parent spans multiple products -> stop climbing!
          break;
        }
        
        bestBoundary = parent;

        if (this.hasProductImage(parent) && (parent.classList.contains('css-g5y9jx') || parent.style.width || parent.style.minHeight)) {
          break;
        }
        parent = parent.parentElement;
      }
      if (bestBoundary) {
        cards.add(bestBoundary);
      }
    });

    cards.forEach(card => {
      try {
        if (this.isAdOrSponsored(card)) return;

        const titleEl = card.querySelector('a[href*="/p/"][title]') ?? card.querySelector('a[href*="/p/"]');
        const fId = this.getProductId(card, titleEl as HTMLAnchorElement | null);
        if (!fId) return;

        const id = `fk_${fId}`;
        const existingHeart = card.querySelector<HTMLDivElement>('.aiw-heart-container');
        if (existingHeart) {
          if (existingHeart.dataset.wishlistId === id && card.dataset.wishlistDone === '1') {
            return;
          }
          existingHeart.remove();
          delete card.dataset.wishlistDone;
        }

        if (card.closest('[data-wishlist-done="1"]')) return;
        if (card.querySelector('[data-wishlist-done="1"]')) return;

        const price = this.getPrice(card);
        if (price === null || price <= 0) return;

        // Resolve title text by checking the main product image alt attribute, falling back to anchor title
        const imgEl = card.querySelector('img[alt]');
        let titleText = imgEl?.getAttribute('alt')?.trim() || '';

        if (!titleText || titleText.length <= 2) {
          titleText = titleEl ? (titleEl.getAttribute('title') || titleEl.textContent?.trim() || '') : '';
        }

        const meta = this.getMetaWithId(card, titleEl as HTMLAnchorElement | null, titleText, price, fId);
        if (meta) {
          this.injectUI(card, meta);
          card.dataset.wishlistDone = '1';
        }
      } catch (e) {
        console.error('AI Wishlist: Error processing Flipkart card', e);
      }
    });
  }

  private getProductId(card: HTMLElement, titleEl: HTMLAnchorElement | null): string {
    let fId = card.dataset.id || '';
    if (!fId && titleEl) {
      const rawUrl = titleEl.getAttribute('href') || '';
      const pidMatch = rawUrl.match(/[?&]pid=([^&]+)/);
      if (pidMatch) {
        fId = pidMatch[1]!;
      } else {
        const itemMatch = rawUrl.match(/\/p\/([^?]+)/);
        if (itemMatch) {
          fId = itemMatch[1]!;
        }
      }
    }
    return fId;
  }

  private getPrice(card: HTMLElement): number | null {
    // Scan all leaf nodes containing the rupee symbol (₹)
    const rupeeEls = Array.from(card.querySelectorAll('*')).filter(el => {
      return el.children.length === 0 && (el.textContent || '').includes('₹');
    }) as HTMLElement[];

    for (const el of rupeeEls) {
      // Check computed text-decoration styles to skip original MRP prices
      if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
        const style = window.getComputedStyle(el);
        const decor = style.textDecorationLine || style.textDecoration || '';
        if (decor.includes('line-through')) {
          continue;
        }
      }
      // Check inline style fallback
      if (el.style.textDecorationLine === 'line-through' || 
          el.style.textDecoration === 'line-through' ||
          el.getAttribute('style')?.includes('line-through')) {
        continue;
      }
      const val = cleanNumber(el.textContent || '');
      if (val !== null && val > 0) return val;
    }

    return null;
  }

  private getMetaWithId(card: HTMLElement, titleEl: HTMLAnchorElement | null, title: string, price: number, fId: string): WishlistItem | null {
    const rawUrl = titleEl?.getAttribute('href') || '';
    const imgEl = card.querySelector('img');

    return {
      id: `fk_${fId}`,
      title,
      price,
      imageUrl: this.getBestImageUrl(imgEl as HTMLElement | null),
      url: cleanProductUrl(rawUrl, 'Flipkart'),
      platform: 'Flipkart'
    };
  }

  private injectUI(card: HTMLElement, meta: WishlistItem) {
    injectHeartUI(card, meta);
  }

  private hasProductImage(el: HTMLElement): boolean {
    return Array.from(el.querySelectorAll('img')).some(img => {
      const src = img.getAttribute('src') || '';
      return src.includes('/image/') && !src.includes('/www/') && !src.includes('/promos/');
    });
  }
}

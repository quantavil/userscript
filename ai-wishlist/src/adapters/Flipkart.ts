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
      while (parent && parent !== document.body) {
        if (parent.querySelector('img') && (parent.classList.contains('css-g5y9jx') || parent.style.width || parent.style.minHeight)) {
          cards.add(parent);
          break;
        }
        parent = parent.parentElement;
      }
    });

    cards.forEach(card => {
      try {
        if (card.dataset.wishlistDone) return;
        if (card.closest('[data-wishlist-done="1"]')) return;
        if (card.querySelector('[data-wishlist-done="1"]')) return;

        const price = this.getPrice(card);
        if (price === null || price <= 0) return;

        // Resolve title text by checking the main product image alt attribute, falling back to anchor title
        const imgEl = card.querySelector('img[alt]');
        let titleText = imgEl?.getAttribute('alt')?.trim() || '';
        const titleEl = card.querySelector('a[href*="/p/"][title]') ?? card.querySelector('a[href*="/p/"]');

        if (!titleText || titleText.length <= 2) {
          titleText = titleEl ? (titleEl.getAttribute('title') || titleEl.textContent?.trim() || '') : '';
        }

        const meta = this.getMeta(card, titleEl as HTMLAnchorElement | null, titleText, price);
        if (meta) {
          this.injectUI(card, meta);
          card.dataset.wishlistDone = '1';
        }
      } catch (e) {
        console.error('AI Wishlist: Error processing Flipkart card', e);
      }
    });
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

  private getMeta(card: HTMLElement, titleEl: HTMLAnchorElement | null, title: string, price: number): WishlistItem | null {
    const rawUrl = titleEl?.getAttribute('href') || '';
    
    let fId = card.dataset.id || '';
    if (!fId && rawUrl) {
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

    if (!fId) return null;

    const imgEl = card.querySelector('img');

    return {
      id: `fk_${fId}`,
      title,
      price,
      imageUrl: imgEl?.getAttribute('src') || '',
      url: cleanProductUrl(rawUrl, 'Flipkart'),
      platform: 'Flipkart'
    };
  }

  private injectUI(card: HTMLElement, meta: WishlistItem) {
    injectHeartUI(card, meta);
  }
}

import { BaseAdapter } from './BaseAdapter';
import { cleanNumber } from '../utils/formatters';
import { injectHeartUI } from '../core/ui';
import type { WishlistItem } from '../core/types';

export class AmazonAdapter extends BaseAdapter {
  processCards() {
    const selectors = [
      'div[data-component-type="s-search-result"]',
      '.p13n-sc-uncoverable-faceout',
      '.puis-card-container',
      '.s-card-container'
    ];

    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach(el => {
        try {
          const card = el as HTMLElement;
          if (card.dataset.wishlistDone) return;
          if (card.closest('[data-wishlist-done="1"]')) return;
          if (card.querySelector('[data-wishlist-done="1"]')) return;

          const price = this.getPrice(card);
          if (price === null) return; 

          const title = this.getTitle(card);
          if (!title) return;

          const meta = this.getMeta(card, title, price);
          if (meta) {
            this.injectUI(card, meta);
            card.dataset.wishlistDone = '1';
          }
        } catch (e) {
          console.error('AI Wishlist: Error processing Amazon card', e);
        }
      });
    }
  }

  private getPrice(card: HTMLElement): number | null {
    const inclLink = card.querySelector('a.s-no-hover:not([href*="#customerReviews"])');
    if (inclLink) {
      const offscreen = inclLink.querySelector('.a-price .a-offscreen');
      if (offscreen) return cleanNumber(offscreen.textContent || '');
    }
    // ponytail: simplified by removing hashed CSS modules classes, relying on stable class
    const bestPrice = card.querySelector('.p13n-sc-price');
    if (bestPrice) return cleanNumber(bestPrice.textContent || '');
    const currentPrice = card.querySelector('.a-price:not([data-a-strike="true"]) .a-offscreen');
    if (currentPrice) return cleanNumber(currentPrice.textContent || '');
    return null;
  }

  private getTitle(card: HTMLElement): string {
    const h2 = card.querySelector('h2');
    if (h2) return h2.getAttribute('aria-label') || h2.querySelector('span')?.textContent?.trim() || h2.textContent?.trim() || '';
    const bestTitle = card.querySelector('div._cDEzb_p13n-sc-css-line-clamp-3_g3dy1, .p13n-sc-truncate');
    if (bestTitle) return bestTitle.textContent?.trim() || '';
    return '';
  }

  private getMeta(card: HTMLElement, title: string, price: number): WishlistItem | null {
    let asin = card.dataset.asin || '';
    if (!asin) {
      const nestedAsinEl = card.querySelector('[data-asin]');
      if (nestedAsinEl) {
        asin = (nestedAsinEl as HTMLElement).dataset.asin || '';
      }
    }
    if (!asin) {
      const csaAsinEl = card.querySelector('[data-csa-c-asin]');
      if (csaAsinEl) {
        asin = csaAsinEl.getAttribute('data-csa-c-asin') || '';
      }
    }
    if (!asin) {
      const link = card.querySelector('a[href*="/dp/"]');
      if (link) {
        const href = link.getAttribute('href') || '';
        const match = href.match(/\/dp\/([A-Z0-9]{10})/i);
        if (match) {
          asin = match[1]!;
        }
      }
    }

    if (!asin) return null;

    const imgEl = card.querySelector('img.s-image');

    return {
      id: `amz_${asin}`,
      title,
      price,
      imageUrl: imgEl?.getAttribute('src') || '',
      url: `https://www.amazon.in/dp/${asin}`,
      platform: 'Amazon'
    };
  }

  private injectUI(card: HTMLElement, meta: WishlistItem) {
    injectHeartUI(card, meta);
  }
}

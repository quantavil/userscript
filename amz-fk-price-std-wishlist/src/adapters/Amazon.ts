import { BaseAdapter } from './BaseAdapter';
import { cleanNumber } from '../utils/formatters';
import { parseTitleToRate } from '../core/parser';
import { injectRateUI } from '../core/ui';
import type { WishlistItem } from '../core/types';

export class AmazonAdapter extends BaseAdapter {
  processCards() {
    const selectors = [
      'div[data-component-type="s-search-result"]',
      '.p13n-sc-uncoverable-faceout',
    ];

    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach(el => {
        try {
          const card = el as HTMLElement;
          if (card.dataset.rateDone) return;

          const price = this.getPrice(card);
          if (price === null) return; 

          const title = this.getTitle(card);
          if (!title) return;

          const rate = parseTitleToRate(price, title);
          const rateText = rate?.text || 'NA';
          const isItemRate = rate?.isItemRate ?? true;
          const meta = this.getMeta(card, title, price, rateText);
          
          this.injectUI(card, rateText, isItemRate, meta);
          card.dataset.rateDone = '1';
        } catch (e) {
          console.error('Price Standardizer: Error processing Amazon card', e);
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
    const bestPrice = card.querySelector('span._cDEzb_p13n-sc-price_3mJ9Z, .p13n-sc-price');
    if (bestPrice) return cleanNumber(bestPrice.textContent || '');
    const currentPrice = card.querySelector('.a-price:not([data-a-strike="true"]) .a-offscreen');
    if (currentPrice) return cleanNumber(currentPrice.textContent || '');
    return null;
  }

  private getTitle(card: HTMLElement): string {
    const h2 = card.querySelector('h2.a-size-base-plus, h2.a-size-mini');
    if (h2) return h2.getAttribute('aria-label') || h2.querySelector('span')?.textContent?.trim() || '';
    const bestTitle = card.querySelector('div._cDEzb_p13n-sc-css-line-clamp-3_g3dy1, .p13n-sc-truncate');
    if (bestTitle) return bestTitle.textContent?.trim() || '';
    return '';
  }

  private getMeta(card: HTMLElement, title: string, price: number, rateText: string): WishlistItem {
    const asin = card.dataset.asin || '';
    const imgEl = card.querySelector('img.s-image');
    
    let rating: number | null = null;
    let numRatings: number | null = null;
    
    // 1. Extract rating from the icon alt text or the adjacent span
    const ratingIcon = card.querySelector('i[data-cy="reviews-ratings-slot"] span.a-icon-alt');
    if (ratingIcon) {
      const rMatch = (ratingIcon.textContent || '').match(/([\d.]+)/);
      if (rMatch) rating = parseFloat(rMatch[1]!);
    } else {
      const ratingSpan = card.querySelector('span.a-size-small.a-color-base');
      if (ratingSpan) {
        const rMatch = (ratingSpan.textContent || '').match(/([\d.]+)/);
        if (rMatch) rating = parseFloat(rMatch[1]!);
      }
    }

    // 2. Extract number of ratings from the link aria-label or span text
    const numRatingsLink = card.querySelector('a[aria-label*="ratings"]');
    if (numRatingsLink) {
      const nText = numRatingsLink.getAttribute('aria-label')?.replace(/[^\d]/g, '').trim() || '';
      if (nText) numRatings = parseInt(nText);
    } else {
      const numRatingsSpan = card.querySelector('span.a-size-mini.puis-normal-weight-text');
      if (numRatingsSpan) {
        const nText = numRatingsSpan.textContent?.replace(/[^\d]/g, '').trim() || '';
        if (nText) numRatings = parseInt(nText);
      }
    }

    return {
      id: asin ? `amz_${asin}` : `amz_${Math.random().toString(36).substr(2, 9)}`,
      title,
      price,
      rateText,
      imageUrl: imgEl?.getAttribute('src') || '',
      url: asin ? `https://www.amazon.in/dp/${asin}` : '',
      platform: 'Amazon',
      rating,
      numRatings
    };
  }

  private injectUI(card: HTMLElement, text: string, isItemRate: boolean, meta: WishlistItem) {
    const container = card.querySelector('div.a-row.a-size-base.a-color-base')
      ?? card.querySelector('._cDEzb_p13n-sc-price-animation-wrapper_3PzN2')
      ?? card;
    injectRateUI(container as HTMLElement, text, isItemRate, meta);
  }
}

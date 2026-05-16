import { BaseAdapter } from './BaseAdapter';
import { cleanNumber } from '../utils/formatters';
import { extractWeights, computeRate, parseMultiPackText, parseTitleToRate } from '../core/parser';
import { injectRateUI } from '../core/ui';
import { cleanProductUrl } from '../utils/urlCleaner';
import type { ProductMeta } from '../core/types';

export class FlipkartAdapter extends BaseAdapter {
  processCards() {
    document.querySelectorAll('div[data-id], div.slAVV4').forEach(el => {
      try {
        const card = el as HTMLElement;
        if (card.dataset.rateDone) return;

        const priceEl = card.querySelector('div.hZ3P6w') ?? card.querySelector('div.Nx9bqj');
        if (!priceEl) return;
        const price = cleanNumber(priceEl.textContent || '');
        if (price === null || price <= 0) return;

        const qtyEl = card.querySelector('div.U_GKRr') ?? card.querySelector('div.WKTcLC');
        const qtyText = qtyEl?.textContent?.trim() || '';
        const titleEl = card.querySelector('a.pIpigb') ?? card.querySelector('a.WKTcLC');
        const titleText = titleEl ? (titleEl.getAttribute('title') || titleEl.textContent?.trim() || '') : '';

        const meta = this.getMeta(card, titleEl as HTMLAnchorElement | null, titleText, price, '');
        this.processFlipkartCard(card, price, qtyText, titleText, meta);
        card.dataset.rateDone = '1';
      } catch (e) {
        console.error('Price Standardizer: Error processing Flipkart card', e);
      }
    });
  }

  private processFlipkartCard(card: HTMLElement, price: number, qtyText: string, titleText: string, meta: ProductMeta) {
    if (qtyText) {
      const multiPack = parseMultiPackText(qtyText);
      if (multiPack && multiPack.totalValue > 0 && multiPack.unit) {
        const rate = computeRate(price, multiPack.totalValue, multiPack.unit);
        if (rate) {
          meta.rateText = rate.text;
          this.injectUI(card, rate.text, rate.isItemRate, meta);
          return;
        }
      }

      const weights = extractWeights(qtyText);
      if (weights.length === 1) {
        const w = weights[0]!;
        const rate = computeRate(price, w.val, w.unit);
        if (rate) {
          meta.rateText = rate.text;
          this.injectUI(card, rate.text, rate.isItemRate, meta);
          return;
        }
      }

      const setMatch = qtyText.match(/(\d+)\s*Items?\s*in\s*the\s*set/i);
      if (setMatch) {
        const itemCount = parseInt(setMatch[1]!);
        const titleWeights = extractWeights(titleText);

        if (titleWeights.length === 1 && /\b(?:each|per\s*piece)\b/i.test(titleText)) {
          const tw = titleWeights[0]!;
          const totalValue = tw.val * itemCount;
          const rate = computeRate(price, totalValue, tw.unit);
          if (rate) {
            meta.rateText = rate.text;
            this.injectUI(card, rate.text, rate.isItemRate, meta);
            return;
          }
        } else if (titleWeights.length === itemCount && titleWeights.length > 0) {
          const firstUnit = titleWeights[0]!.unit;
          if (titleWeights.every(w => w.unit === firstUnit)) {
            const totalValue = titleWeights.reduce((s, w) => s + w.val, 0);
            const rate = computeRate(price, totalValue, firstUnit);
            if (rate) {
              meta.rateText = rate.text;
              this.injectUI(card, rate.text, rate.isItemRate, meta);
              return;
            }
          }
        }

        const perItemRate = computeRate(price, itemCount, 'item');
        if (perItemRate) {
          meta.rateText = perItemRate.text;
          this.injectUI(card, perItemRate.text, perItemRate.isItemRate, meta);
          return;
        }
      }
    }

    const rate = parseTitleToRate(price, titleText);
    if (rate) {
      meta.rateText = rate.text;
      this.injectUI(card, rate.text, rate.isItemRate, meta);
    }
  }

  private getMeta(card: HTMLElement, titleEl: HTMLAnchorElement | null, title: string, price: number, rateText: string): ProductMeta {
    const fId = card.dataset.id || '';
    const imgEl = card.querySelector('img');
    const rawUrl = titleEl?.getAttribute('href') || '';

    let rating: number | null = null;
    let numRatings: number | null = null;

    // 1. Extract rating from the primary rating div or fallback
    const ratingEl = card.querySelector('div.MKiFS6') ?? card.querySelector('div.XQDdHH');
    if (ratingEl) {
      const rText = ratingEl.textContent || '';
      const rMatch = rText.match(/([\d.]+)/);
      if (rMatch) rating = parseFloat(rMatch[1]!);
    }

    // 2. Extract number of ratings from the specific reviews span
    const numRatingsEl = card.querySelector('span.PvbNMB');
    if (numRatingsEl) {
      const nText = numRatingsEl.textContent?.replace(/[^\d]/g, '').trim() || '';
      if (nText) numRatings = parseInt(nText);
    }

    return {
      id: fId ? `fk_${fId}` : `fk_${Math.random().toString(36).substr(2, 9)}`,
      title,
      price,
      rateText,
      imageUrl: imgEl?.getAttribute('src') || '',
      url: cleanProductUrl(rawUrl, 'Flipkart'),
      platform: 'Flipkart',
      rating,
      numRatings
    };
  }

  private injectUI(card: HTMLElement, text: string, isItemRate: boolean, meta: ProductMeta) {
    const container = card.querySelector('div.QiMO5r')
      ?? card.querySelector('.Nx9bqj')?.parentElement
      ?? card;
    injectRateUI(container as HTMLElement, text, isItemRate, meta);
  }
}

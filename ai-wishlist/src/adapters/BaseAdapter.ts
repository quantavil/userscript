export abstract class BaseAdapter {
  private observerTimeout: number | null = null;
  private static FLAG_KEY = '__aiWishlist_observer';

  abstract processCards(): void;

  initObserver() {
    if ((window as any)[BaseAdapter.FLAG_KEY]) return;
    (window as any)[BaseAdapter.FLAG_KEY] = true;

    this.processCards();

    // SPA navigation detection: clear processed markers when URL changes
    let lastUrl = location.href;

    new MutationObserver((mutations) => {
      // Detect SPA navigation
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        document.querySelectorAll('[data-wishlist-done]').forEach(el => {
          delete (el as HTMLElement).dataset.wishlistDone;
        });
      }

      if (mutations.some(m => m.addedNodes.length > 0)) {
        if (this.observerTimeout) clearTimeout(this.observerTimeout);
        this.observerTimeout = window.setTimeout(() => {
          this.processCards();
        }, 100);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  protected getBestImageUrl(imgEl: HTMLElement | null): string {
    if (!imgEl) return '';
    
    // Try standard data attributes for lazy loading
    const dataSrc = imgEl.getAttribute('data-src') || 
                    imgEl.getAttribute('data-lazy-src') || 
                    imgEl.getAttribute('data-old-hires');
    if (dataSrc && dataSrc.startsWith('http')) return dataSrc;

    // Try srcset next
    const srcset = imgEl.getAttribute('srcset');
    if (srcset) {
      const best = srcset.split(',').pop()?.trim().split(' ')[0];
      if (best && best.startsWith('http')) return best;
    }

    const src = imgEl.getAttribute('src') || '';
    if (src && !src.startsWith('data:image/')) {
      return src;
    }

    // Fallback: check all other attributes starting with "data-" for absolute URLs
    for (const attr of imgEl.getAttributeNames()) {
      if (attr.startsWith('data-')) {
        const val = imgEl.getAttribute(attr);
        if (val && val.startsWith('http')) {
          return val;
        }
      }
    }

    return src;
  }

  protected isAdOrSponsored(el: HTMLElement): boolean {
    if (!el) return false;
    const textContent = el.textContent || '';
    if (textContent.includes('Sponsored')) return true;

    // Check for exact "Ad" or "AD" in small leaf nodes
    const allElements = el.querySelectorAll('*');
    for (const child of Array.from(allElements)) {
      if (child.children.length === 0) {
        const txt = child.textContent?.trim();
        if (txt === 'Ad' || txt === 'AD' || txt === 'Advertisement') {
          return true;
        }
      }
    }

    // Class name patterns commonly used for ads
    const classes = Array.from(el.classList);
    if (classes.some(c => c.toLowerCase().includes('sponsored') || c.toLowerCase().includes('ad-container'))) {
      return true;
    }

    return false;
  }
}


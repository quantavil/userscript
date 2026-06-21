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
}

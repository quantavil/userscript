import { AmazonAdapter } from './adapters/Amazon';
import { FlipkartAdapter } from './adapters/Flipkart';
import { initWishlistUI } from './core/wishlistUI';
import STYLES from './styles.css?inline';

function start() {
  // Inject global CSS stylesheet
  const styleEl = document.createElement('style');
  styleEl.id = 'ai-wishlist-styles';
  styleEl.textContent = STYLES;
  (document.head || document.documentElement).appendChild(styleEl);

  const hostname = window.location.hostname;

  if (hostname.includes('amazon.')) {
    const amazon = new AmazonAdapter();
    amazon.initObserver();
  } else if (hostname.includes('flipkart.com')) {
    const flipkart = new FlipkartAdapter();
    flipkart.initObserver();
  }

  // Initialize the global floating wishlist UI
  initWishlistUI();
}

start();

import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Amazon & Flipkart Price Standardizer + Wishlist',
        namespace: 'http://github.com/quantavil',
        version: '5.5',
        description: 'Standardizes unit prices (₹/100g, ₹/100ml) and adds a unified wishlist for Amazon and Flipkart. Export saved items as Markdown tables.',
        author: 'quantavil',
        match: [
          'https://www.flipkart.com/*',
          'https://www.amazon.in/*',
          'https://www.amazon.com/*'
        ],
        license: 'MIT',
        'run-at': 'document-idle',
        grant: ['GM_getValue', 'GM_setValue'],
      },
    }),
  ],
});

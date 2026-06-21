import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Amazon & Flipkart AI Wishlist',
        namespace: 'http://github.com/quantavil/userscript',
        version: '1.8.0',
        description: 'Adds a unified cross-platform AI wishlist with background specifications parsing for Amazon and Flipkart.',
        author: 'quantavil',
        match: [
          'https://www.flipkart.com/*',
          'https://www.amazon.in/*',
          'https://www.amazon.com/*'
        ],
        license: 'MIT',
        'run-at': 'document-idle',
        grant: ['GM_getValue', 'GM_setValue', 'GM_xmlhttpRequest', 'GM_registerMenuCommand'],
        connect: ['flipkart.com', 'amazon.in', 'amazon.com', 'generativelanguage.googleapis.com', '*'],
      },
    }),
  ],
});

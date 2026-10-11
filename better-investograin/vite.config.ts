import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  build: { outDir: 'dist' },
  plugins: [
    monkey({
      entry: 'src/main.ts',
      build: { fileName: 'better-investograin.user.js' },
      userscript: {
        name: 'Better InvestorGain',
        namespace: 'https://github.com/quantavil/userscript/',
        version: '1.2.0',
        description:
          'Hides ads, broker affiliate promo bars, sponsor strips, and partner footer sections on InvestorGain.com — keeping only the IPO data you care about.',
        author: 'quantavil',
        match: ['*://*.investorgain.com/*'],
        grant: [],
        license: 'GPL-3.0-or-later',
        'run-at': 'document-start',
      },
    }),
  ],
});

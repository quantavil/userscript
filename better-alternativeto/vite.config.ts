import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  build: { outDir: 'dist' },
  plugins: [
    monkey({
      entry: 'src/main.ts',
      build: { fileName: 'better-alternativeto.user.js' },
      userscript: {
        name: 'Better AlternativeTo',
        namespace: 'https://github.com/quantavil/userscript/',
        version: '1.1.0',
        description:
          'Shows website/GitHub/app-store/social links straight on the cards, pins a compact filter bar with search + likes range, and puts dark mode in the header.',
        author: 'quantavil',
        match: ['*://*.alternativeto.net/*'],
        grant: [],
        license: 'MIT',
      },
    }),
  ],
});

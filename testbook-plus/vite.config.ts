import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Testbook Plus',
        namespace: 'tb-plus',
        version: '2.0.0',
        description: 'Enhances Testbook UI, blocks tracking, and auto-crawls & downloads question papers as clean Markdown.',
        author: 'quantavil',
        match: ['https://testbook.com/*', 'https://*.testbook.com/*'],
        'run-at': 'document-start',
        grant: [],
      },
    }),
  ],
});
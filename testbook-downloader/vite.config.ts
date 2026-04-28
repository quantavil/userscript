import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Testbook Markdown Downloader',
        namespace: 'tb-md-dl',
        version: '1.0.7',
        description: 'Auto-crawls and downloads Testbook question papers as Markdown.',
        author: 'quantavil',
        match: ['https://testbook.com/*'],
        grant: [],
      },
    }),
  ],
});
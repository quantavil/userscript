import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Oliveboard Plus',
        namespace: 'ob-enhancer',
        version: '1.1.0',
        description: 'Enhance Oliveboard UI and functionality.',
        author: 'quantavil',
        match: ['*://*.oliveboard.in/*'],
        'run-at': 'document-start',
        grant: [],
      },
    }),
  ],
});
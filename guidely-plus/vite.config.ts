import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Guidely Plus',
        namespace: 'guidely-enhancer',
        version: '1.0.0',
        description: 'Enhance Guidely UI and extract markdown.',
        author: 'quantavil',
        match: ['*://*.guidely.in/*'],
        'run-at': 'document-start',
        grant: [],
      },
    }),
  ],
});

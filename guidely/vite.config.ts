import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Guidely Plus',
        namespace: 'npm/vite-plugin-monkey',
        match: ['*://*.guidely.in/*'],
        grant: ['GM_setClipboard'],
        version: '1.0.0',
        author: 'quantavil',
      },
    }),
  ],
});
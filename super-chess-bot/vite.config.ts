import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import { userscriptMetadata } from './src/userscript-metadata.js';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/index.ts',
      userscript: userscriptMetadata,
      build: {
        fileName: 'bundle.user.js',
      },
    }),
  ],
});

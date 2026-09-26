import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  build: { outDir: 'dist' },
  plugins: [
    monkey({
      entry: 'src/main.ts',
      build: { fileName: 'better-rule34.user.js' },
      userscript: {
        name: 'Better Rule34Video',
        namespace: 'https://github.com/quantavil/userscript/',
        version: '1.5.0',
        description:
          'Streamlined filter bar, instant client search & filtering, ad cleaner, and seamless auto next page infinite scroll for Rule34Video.',
        match: [
          '*://*.rule34video.com/*',
          '*://rule34video.com/*',
          '*://*.rule35video.com/*',
          '*://rule35video.com/*',
        ],
        license: 'MIT',
        'run-at': 'document-end',
      },
    }),
  ],
});

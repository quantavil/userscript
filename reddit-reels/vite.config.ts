import { defineConfig } from 'vite';
import monkey, { cdn } from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/index.ts',
      userscript: {
        name: 'Reddit Reels',
        namespace: 'https://github.com/quantavil/userscript/tree/main/reddit-reels',
        match: ['https://www.reddit.com/*', 'https://reddit.com/*'],
        noframes: true,
        description:
          'Mobile-first full-screen reels for Reddit feeds: swipe, one stream with sound, Reddit video and RedGifs, native voting.',
        author: 'quantavil',
        version: '3.1.0',
        license: 'MIT',
        'run-at': 'document-end',
        homepage: 'https://github.com/quantavil/userscript/tree/main/reddit-reels',
        supportURL: 'https://github.com/quantavil/userscript/issues',
        grant: ['GM_getValue', 'GM_setValue', 'GM_xmlhttpRequest'],
        connect: ['api.redgifs.com', 'media.redgifs.com', 'redgifs.com'],
      },
      build: {
        externalGlobals: {
          'hls.js': cdn.jsdelivr('Hls', 'dist/hls.min.js'),
        },
      },
    }),
  ],
  build: {
    minify: false,
    cssMinify: false,
    target: 'es2022',
  },
});

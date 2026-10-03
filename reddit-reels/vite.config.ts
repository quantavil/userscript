import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/index.ts',
      userscript: {
        name: 'Reddit Reels',
        namespace: 'https://github.com/quantavil/userscript/tree/main/reddit-reels',
        match: [
          'https://*.reddit.com/*',
          'https://reddit.com/*',
          'https://*.redgifs.com/ifr/*',
          'https://www.redgifs.com/ifr/*'
        ],
        description: 'Turns Reddit feeds into a swipeable reel in place: one post per screen, single unmuted stream, RedGifs, native player controls and voting.',
        author: 'quantavil',
        version: '2.0.0',
        license: 'MIT',
        'run-at': 'document-end',
        homepage: 'https://github.com/quantavil/userscript/tree/main/reddit-reels',
        supportURL: 'https://github.com/quantavil/userscript/issues',
        grant: [
          'GM_addStyle',
          'GM_setValue',
          'GM_getValue'
        ],
      },
    }),
  ],
  build: {
    minify: false,
    cssMinify: false,
    target: 'es2022',
  },
});

import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import pkg from './package.json';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/index.ts',
      userscript: {
        name: '♟Super-chess-Bot',
        namespace: 'http://tampermonkey.net/',
        version: pkg.version,
        description: 'Super chess Bot is a tournament level bullet bot',
        author: 'quantavil',
        match: [
          'https://www.chess.com/play/computer*',
          'https://www.chess.com/game/*',
          'https://www.chess.com/play/online*'
        ],
        license: 'MIT',
        icon: 'https://www.google.com/s2/favicons?sz=64&domain=chess.com',
        antifeature: [
          {
            type: 'membership',
            description: 'free to use'
          }
        ]
      },
      build: {
        fileName: 'bundle.user.js'
      }
    }),
  ],
});

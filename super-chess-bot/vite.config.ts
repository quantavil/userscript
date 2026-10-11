import stockfishPkg from 'stockfish/package.json' with { type: 'json' };
import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import pkg from './package.json' with { type: 'json' };

const stockfishFile = `stockfish-${stockfishPkg.buildVersion}-lite-single`;
const stockfishResourceUrl = `https://unpkg.com/stockfish@${stockfishPkg.version}/bin/${stockfishFile}`;

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/index.ts',
      userscript: {
        name: '♟Super-chess-Bot',
        namespace: 'http://tampermonkey.net/',
        version: pkg.version,
        description: 'Local Stockfish analysis and move automation for Chess.com computer games',
        author: 'quantavil',
        match: [
          'https://www.chess.com/play/computer*',
          'https://www.chess.com/game/*',
          'https://www.chess.com/play/online*',
        ],
        grant: ['GM_getResourceText', 'GM_getResourceURL', 'unsafeWindow'],
        resource: {
          'stockfish.js': `${stockfishResourceUrl}.js`,
          'stockfish.wasm': `${stockfishResourceUrl}.wasm`,
        },
        license: 'GPL-3.0-or-later',
        icon: 'https://www.google.com/s2/favicons?sz=64&domain=chess.com',
      },
      build: {
        fileName: 'bundle.user.js',
      },
    }),
  ],
});

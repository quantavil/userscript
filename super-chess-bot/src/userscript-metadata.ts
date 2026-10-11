import stockfishPkg from 'stockfish/package.json' with { type: 'json' };
import type { MonkeyUserScript } from 'vite-plugin-monkey';
import pkg from '../package.json' with { type: 'json' };

const stockfishFile = `stockfish-${stockfishPkg.buildVersion}-lite-single`;
const stockfishResourceUrl = `https://unpkg.com/stockfish@${stockfishPkg.version}/bin/${stockfishFile}`;

export const userscriptMetadata: MonkeyUserScript = {
  name: '♟Super-chess-Bot',
  namespace: 'http://tampermonkey.net/',
  version: pkg.version,
  description: pkg.description,
  author: 'quantavil',
  match: [
    'https://www.chess.com/play/computer*',
    'https://www.chess.com/game/*',
    'https://www.chess.com/play/online*',
    'https://www.pychess.org/*',
    'https://pychess.org/*',
  ],
  grant: ['GM_getResourceText', 'GM_getResourceURL', 'unsafeWindow'],
  resource: {
    'stockfish.js': `${stockfishResourceUrl}.js`,
    'stockfish.wasm': `${stockfishResourceUrl}.wasm`,
  },
  license: 'GPL-3.0-or-later',
  icon: 'https://www.google.com/s2/favicons?sz=64&domain=chess.com',
};

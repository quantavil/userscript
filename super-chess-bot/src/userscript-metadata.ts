import fairyStockfishPkg from 'fairy-stockfish-nnue.wasm/package.json' with { type: 'json' };
import stockfishPkg from 'stockfish/package.json' with { type: 'json' };
import type { MonkeyUserScript } from 'vite-plugin-monkey';
import pkg from '../package.json' with { type: 'json' };

const stockfishFile = `stockfish-${stockfishPkg.buildVersion}-lite-single`;
const stockfishResourceUrl = `https://unpkg.com/stockfish@${stockfishPkg.version}/bin/${stockfishFile}`;

export const STOCKFISH_JS_HASH = 'ccb130d7ff29408531c47d859a49f91d59d4f482d05a53eb1a3231a4f624c91a';
export const STOCKFISH_WASM_HASH = 'ee4f115bdb2d32cadf96cada104a05b5ec257d7ad6f57582190b49bc71f096de';
export const FAIRY_STOCKFISH_JS_HASH = '9080a62e3133e50da0c47b88b186d9c29ed37cc5129401bdeed8bffb5b9a4ca9';
export const FAIRY_STOCKFISH_WASM_HASH = '7cea742b8ca1a324fbc500f89112f168134cf68eb49475df23be6c42336255c6';
const fairyStockfishResourceUrl = `https://unpkg.com/fairy-stockfish-nnue.wasm@${fairyStockfishPkg.version}/stockfish`;

export type BuildTarget = 'all' | 'chesscom';

export function getUserscriptMetadata(target: BuildTarget = 'all'): MonkeyUserScript {
  const isChesscom = target === 'chesscom';
  return {
    name: isChesscom ? '♟Super-chess-Bot (Chess.com)' : '♟Super-chess-Bot',
    namespace: 'https://github.com/quantavil/userscript',
    version: pkg.version,
    description: isChesscom
      ? 'Local Stockfish analysis and move automation for Chess.com standard games'
      : pkg.description,
    author: 'quantavil',
    match: isChesscom
      ? ['https://chess.com/*', 'https://www.chess.com/*']
      : [
          'https://lichess.org/*',
          'https://www.lichess.org/*',
          'https://chess.com/*',
          'https://www.chess.com/*',
          'https://www.pychess.org/*',
          'https://pychess.org/*',
        ],
    'run-at': 'document-start',
    'inject-into': 'page',
    grant: ['GM_getResourceText', 'GM_getResourceURL', 'GM_registerMenuCommand', 'unsafeWindow'],
    resource: isChesscom
      ? {
          'stockfish.js': `${stockfishResourceUrl}.js#sha256=${STOCKFISH_JS_HASH}`,
          'stockfish.wasm': `${stockfishResourceUrl}.wasm#sha256=${STOCKFISH_WASM_HASH}`,
        }
      : {
          'stockfish.js': `${stockfishResourceUrl}.js#sha256=${STOCKFISH_JS_HASH}`,
          'stockfish.wasm': `${stockfishResourceUrl}.wasm#sha256=${STOCKFISH_WASM_HASH}`,
          'fairy-stockfish.js': `${fairyStockfishResourceUrl}.js#sha256=${FAIRY_STOCKFISH_JS_HASH}`,
          'fairy-stockfish.wasm': `${fairyStockfishResourceUrl}.wasm#sha256=${FAIRY_STOCKFISH_WASM_HASH}`,
        },
    license: 'GPL-3.0-or-later',
    icon: 'https://www.google.com/s2/favicons?sz=64&domain=chess.com',
  };
}

export const userscriptMetadata: MonkeyUserScript = getUserscriptMetadata('all');

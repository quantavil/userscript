const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

const metadata = `// ==UserScript==
// @name          ♟Super-chess-Bot
// @namespace     http://tampermonkey.net/
// @version       ${pkg.version}
// @description   Super chess Bot is a tournament level bullet bot
// @author        quantavil
// @match         https://www.chess.com/play/computer*
// @match         https://www.chess.com/game/*
// @match         https://www.chess.com/play/online*
// @license       MIT
// @icon          https://www.google.com/s2/favicons?sz=64&domain=chess.com
// @grant         GM_xmlhttpRequest
// @connect       stockfish.online
// @antifeature   membership
// ==/UserScript==

`;

const watchMode = process.argv.includes('--watch');

const buildOptions = {
    entryPoints: ['src/index.js'],
    outfile: 'dist/bundle.user.js',
    bundle: true,
    format: 'iife',
    banner: { js: metadata },
    logLevel: 'info',
};

async function build() {
    if (watchMode) {
        const ctx = await esbuild.context(buildOptions);
        await ctx.watch();
        console.log('Watching for changes...');
    } else {
        await esbuild.build(buildOptions);
        console.log('Build complete.');
    }
}

build().catch(() => process.exit(1));

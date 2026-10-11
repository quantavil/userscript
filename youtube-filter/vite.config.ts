import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/index.ts',
      userscript: {
        name: 'YouTube Video Filter',
        namespace: 'https://github.com/quantavil/userscript/youtube-filter',
        version: pkg.version,
        description: pkg.description,
        author: 'quantavil',
        match: ['https://www.youtube.com/*', 'https://m.youtube.com/*'],
        grant: ['GM_addStyle', 'GM_registerMenuCommand'],
        license: 'GPL-3.0-or-later',
        'run-at': 'document-end'
      },
      build: {
        fileName: 'youtube-filter.user.js'
      }
    })
  ],
  build: {
    minify: false,
    target: 'es2022'
  }
});

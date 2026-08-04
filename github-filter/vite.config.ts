import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/index.ts',
      userscript: {
        name: 'GitHub Advanced Search',
        namespace: 'https://github.com/quantavil/userscript/github-filter',
        version: pkg.version,
        description: pkg.description,
        match: ['https://github.com/*'],
        grant: ['GM_registerMenuCommand'],
        icon: 'https://github.githubassets.com/favicons/favicon.svg',
        license: 'MIT',
        'run-at': 'document-idle'
      },
      build: {
        fileName: 'github-filter.user.js'
      }
    })
  ],
  build: {
    minify: false,
    target: 'es2022'
  }
});

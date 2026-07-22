import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/index.ts',
      userscript: {
        name: 'Better Search ⭐',
        namespace: 'https://github.com/quantavil/userscript/better-search',
        version: pkg.version,
        description: pkg.description,
        author: 'quantavil',
        license: 'MIT',
        // Single regex for all Google TLDs — no 200-line @match list
        include: [
          /^https?:\/\/(?:www\.)?google\.[a-z]{2,6}(?:\.[a-z]{2,3})?\/search/,
          '*://www.bing.com/search*',
          '*://*.bing.com/search*',
          '*://duckduckgo.com/*',
          '*://*.duckduckgo.com/*',
          '*://search.brave.com/search*',
          /^https?:\/\/(?:[a-z]+\.)?yandex\.[a-z]{2,}\/search/,
          /^https?:\/\/(?:[a-z]+\.)?ya\.ru\/search/,
        ],
        grant: ['GM_getValue', 'GM_setValue', 'GM_registerMenuCommand', 'GM_xmlhttpRequest'],
        connect: ['gist.githubusercontent.com', 'api.github.com'],
        'run-at': 'document-idle',
      },
      build: {
        fileName: 'better-search.user.js',
      },
    }),
  ],
  build: {
    minify: false,
    target: 'es2022',
  },
});

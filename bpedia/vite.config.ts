import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Babepedia Advanced Filter & Badges',
        namespace: 'quantavil/bpedia',
        version: '1.1.1',
        description: 'Advanced filtering and on-thumbnail stats/badges for Babepedia list pages with dynamic progress scraper and responsive Apple Glassmorphic UI.',
        author: 'quantavil',
        license: 'MIT',
        match: [
          'https://www.babepedia.com/*',
          'https://babepedia.com/*'
        ],
        connect: [
          'www.babepedia.com',
          'babepedia.com'
        ],
        grant: [
          'GM_setValue',
          'GM_getValue',
          'GM_deleteValue',
          'GM_listValues',
          'GM_xmlhttpRequest'
        ],
        'run-at': 'document-end'
      },
      build: {
        fileName: 'bpedia-filter.user.js'
      }
    })
  ],
  build: {
    minify: false
  }
});

import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Wallhaven Enhancer',
        namespace: 'https://github.com/quantavil/userscript/',
        version: '2.0',
        description: 'Explorer-style detail pane: stats on thumbs, click-to-select, low-res preview, full-res lightbox, D download, favorite proxy, prev/next',
        match: ['*://wallhaven.cc/*'],
        grant: [
          'GM_addStyle',
          'GM_xmlhttpRequest',
          'GM_download',
        ],
        connect: [
          'w.wallhaven.cc',
          'wallhaven.cc'
        ],
        license: 'MIT',
      },
    }),
  ],
});

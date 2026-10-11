import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  build: { outDir: 'dist' },
  plugins: [
    monkey({
      entry: 'src/main.ts',
      build: { fileName: 'site-orbit.user.js' },
      userscript: {
        name: 'SiteOrbit',
        namespace: 'https://github.com/quantavil/userscript/',
        version: pkg.version,
        description: pkg.description,
        author: pkg.author,
        match: ['http://*/*', 'https://*/*'],
        noframes: true,
        connect: ['tranco-list.eu', 'cloudflare-dns.com'],
        grant: [
          'GM_xmlhttpRequest',
          'GM_getValue',
          'GM_setValue',
          'GM_deleteValue',
          'GM_listValues',
          'GM_registerMenuCommand',
          'GM_download',
        ],
        license: 'GPL-3.0-or-later',
      },
    }),
  ],
});

import { readFileSync } from 'node:fs';
import monkey from 'vite-plugin-monkey';
import { defineConfig, lazyPlugins } from 'vite-plus';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  fmt: {},
  lint: {
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    rules: { 'vite-plus/prefer-vite-plus-imports': 'error' },
    options: { typeAware: true, typeCheck: true },
  },
  build: { outDir: 'dist' },
  plugins: lazyPlugins(() => [
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
  ]),
});

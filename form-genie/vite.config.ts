import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Form Genie',
        namespace: 'https://github.com/quantavil/userscript/form-genie',
        version: pkg.version,
        description: pkg.description,
        author: 'quantavil',
        license: 'MIT',
        match: ['http://*/*', 'https://*/*'],
        grant: [
          'GM_getValue',
          'GM_setValue',
          'GM_deleteValue',
          'GM_registerMenuCommand',
          'GM_xmlhttpRequest',
        ],
        connect: ['generativelanguage.googleapis.com'],
        'run-at': 'document-idle',
        noframes: true,
      },
      build: {
        fileName: 'form-genie.user.js',
      },
    }),
  ],
  build: {
    minify: false,
    target: 'esnext',
  },
});

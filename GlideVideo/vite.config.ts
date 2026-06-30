import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/index.ts',
      userscript: {
        name: 'GlideVideo: Better Video Controls with Gesture for Mobile Web',
        namespace: 'https://github.com/quantavil/userscript/GlideVideo',
        version: pkg.version,
        description: pkg.description,
        match: ['*://*/*'],
        grant: [
          'GM_registerMenuCommand',
          'GM_getValue',
          'GM_setValue'
        ],
        license: 'MIT',
        'run-at': 'document-start'
      },
      build: {
        fileName: 'glidevideo.user.js'
      }
    })
  ],
  build: {
    minify: false,
    target: 'es2022'
  }
});

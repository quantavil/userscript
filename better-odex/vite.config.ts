import { readFileSync } from 'node:fs';
import preact from '@preact/preset-vite';
import monkey from 'vite-plugin-monkey';
import { defineConfig } from 'vite-plus';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [
    preact(),
    monkey({
      entry: 'src/main.tsx',
      userscript: {
        name: 'Better ODeX',
        namespace: 'https://github.com/quantavil/userscript/better-odex',
        version: pkg.version,
        description: pkg.description,
        author: pkg.author,
        license: pkg.license,
        match: ['*://*.odexglobal.com/*', '*://*.odex.co/*'],
        include: ['*://*/*VGM*'],
        'run-at': 'document-idle',
        grant: ['none'],
      },
      build: {
        fileName: 'better-odex.user.js',
      },
    }),
  ],
  lint: {
    ignorePatterns: ['dist/**'],
  },
  fmt: {
    semi: true,
    singleQuote: true,
  },
  build: {
    minify: true,
    target: 'es2022',
  },
});

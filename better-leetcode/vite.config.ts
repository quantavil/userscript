import monkey from 'vite-plugin-monkey';
import { defineConfig, lazyPlugins } from 'vite-plus';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  fmt: {},
  lint: {
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    rules: { 'vite-plus/prefer-vite-plus-imports': 'error' },
    options: { typeAware: true, typeCheck: true },
  },
  plugins: lazyPlugins(() => [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Better LeetCode',
        namespace: 'https://github.com/quantavil/userscript/tree/main/better-leetcode',
        version: pkg.version,
        description: pkg.description,
        author: 'quantavil',
        license: 'GPL-3.0-or-later',
        homepage: 'https://github.com/quantavil/userscript/tree/main/better-leetcode',
        supportURL: 'https://github.com/quantavil/userscript/issues',
        match: ['https://leetcode.com/*'],
        // document-start: the submit hook has to be in place before the app boots.
        'run-at': 'document-start',
        noframes: true,
      },
      build: { fileName: 'better-leetcode.user.js' },
    }),
  ]),
});

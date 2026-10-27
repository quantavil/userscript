import { defineConfig } from 'vite-plus';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Better Gmail',
        namespace: 'better-gmail',
        description: 'Readable inbox rows and copy tools for Gmail.',
        license: 'GPL-3.0-or-later',
        match: ['https://mail.google.com/mail/*'],
        'run-at': 'document-idle',
        noframes: true,
      },
    }),
  ],
  build: {
    // A personal userscript gains nothing from minification, and readable output
    // makes stack traces from Gmail's console usable.
    minify: false,
  },
  lint: {
    ignorePatterns: ['dist/**'],
    options: { typeAware: true, typeCheck: true },
  },
  fmt: {
    ignorePatterns: ['dist/**', 'bun.lock'],
    singleQuote: true,
    sortPackageJson: true,
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
  },
  staged: {
    '*': 'vp check --fix',
  },
});

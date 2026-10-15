import { fileURLToPath } from 'node:url';
import monkey from 'vite-plugin-monkey';
import { defineConfig, lazyPlugins, type Plugin } from 'vite-plus';
import { type BuildTarget, getUserscriptMetadata } from './src/userscript/metadata.js';

const target: BuildTarget = process.env.BUILD_TARGET === 'chesscom' ? 'chesscom' : 'all';

function chesscomOnlyResolver(): Plugin {
  const chesscomOnlyFile = fileURLToPath(new URL('./src/sites/entries/chesscom-only.ts', import.meta.url));
  return {
    name: 'chesscom-only-site-resolver',
    enforce: 'pre',
    resolveId(source) {
      if (source.endsWith('/sites/registry.js') || source.endsWith('/sites/registry')) {
        return chesscomOnlyFile;
      }
    },
  };
}

export default defineConfig({
  fmt: {},
  lint: {
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    rules: { 'vite-plus/prefer-vite-plus-imports': 'error' },
    options: { typeAware: true, typeCheck: true },
  },
  build: {
    emptyOutDir: false,
  },
  plugins: lazyPlugins(() => [
    ...(target === 'chesscom' ? [chesscomOnlyResolver()] : []),
    monkey({
      entry: 'src/main.ts',
      userscript: getUserscriptMetadata(target),
      build: {
        fileName: target === 'chesscom' ? 'chesscom.user.js' : 'bundle.user.js',
      },
    }),
  ]),
});

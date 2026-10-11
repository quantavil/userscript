import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import monkey from 'vite-plugin-monkey';
import { type BuildTarget, getUserscriptMetadata } from './src/userscript-metadata.js';

const target: BuildTarget = process.env.BUILD_TARGET === 'chesscom' ? 'chesscom' : 'all';

function chesscomOnlyResolver(): Plugin {
  const chesscomOnlyFile = fileURLToPath(new URL('./src/sites/chesscom-only.ts', import.meta.url));
  return {
    name: 'chesscom-only-site-resolver',
    enforce: 'pre',
    resolveId(source) {
      if (source.endsWith('/sites/index.js') || source.endsWith('/sites/index')) {
        return chesscomOnlyFile;
      }
    },
  };
}

export default defineConfig({
  build: {
    emptyOutDir: false,
  },
  plugins: [
    ...(target === 'chesscom' ? [chesscomOnlyResolver()] : []),
    monkey({
      entry: 'src/index.ts',
      userscript: getUserscriptMetadata(target),
      build: {
        fileName: target === 'chesscom' ? 'chesscom.user.js' : 'bundle.user.js',
      },
    }),
  ],
});

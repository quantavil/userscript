import { copyFileSync, readFileSync, writeFileSync } from 'fs';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const outDir = 'dist-extension';

// Firefox MV3 content scripts are classic scripts, not modules — so this is a
// single self-contained IIFE. background.js has no imports and is copied as-is
// rather than run through a bundler that would have nothing to do.
export default defineConfig({
  define: {
    'process.env.VITEST': 'false'
  },
  build: {
    outDir,
    emptyOutDir: true,
    minify: false,
    target: 'es2022',
    lib: {
      entry: 'src/platform/extension-entry.ts',
      formats: ['iife'],
      name: 'GlideVideo',
      fileName: () => 'content.js'
    }
  },
  plugins: [
    {
      name: 'glidevideo-extension-assets',
      closeBundle() {
        // Same single-source-of-version rule the userscript build follows.
        const manifest = JSON.parse(
          readFileSync('extension/manifest.json', 'utf-8')
        );
        manifest.version = pkg.version;
        manifest.description = pkg.description;
        writeFileSync(
          `${outDir}/manifest.json`,
          `${JSON.stringify(manifest, null, 2)}\n`
        );
        copyFileSync('extension/background.js', `${outDir}/background.js`);
        copyFileSync('extension/icon.svg', `${outDir}/icon.svg`);
      }
    }
  ]
});

import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const outDir = 'dist-extension';

export default defineConfig({
  build: {
    outDir,
    emptyOutDir: true,
    minify: false,
    target: 'es2022',
    lib: {
      entry: 'src/extension-main.ts',
      formats: ['iife'],
      name: 'SiteOrbit',
      fileName: () => 'content.js',
    },
  },
  plugins: [
    {
      name: 'site-orbit-extension-assets',
      closeBundle() {
        const manifest = JSON.parse(readFileSync('extension/manifest.json', 'utf-8'));
        manifest.version = pkg.version;
        manifest.description = pkg.description;
        writeFileSync(`${outDir}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
        copyFileSync('extension/background.js', `${outDir}/background.js`);
        copyFileSync('extension/icon.svg', `${outDir}/icon.svg`);
      },
    },
  ],
});

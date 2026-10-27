import { defineConfig } from 'vite-plus';
import monkey from 'vite-plugin-monkey';
export default defineConfig({
  plugins: [monkey({ entry: 'src/main.tsx', userscript: {
    name: 'Better ICEGATE', namespace: 'better-icegate', version: '1.1.0',
    description: 'Favorite shortcuts for the ICEGATE dashboard',
    match: ['https://foservices.icegate.gov.in/*'],
    license: 'GPL-3.0-or-later', 'run-at': 'document-idle', noframes: true,
  } })],
  build: { minify: false },
});

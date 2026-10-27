import { defineConfig } from 'vite-plus';
import monkey from 'vite-plugin-monkey';
export default defineConfig({
  plugins: [monkey({ entry: 'src/main.tsx', userscript: {
    name: 'Better ICEGATE', namespace: 'better-icegate', version: '1.6.1',
    description: 'Favorite shortcuts, Shipping Bill tools and a searchable eSANCHIT document-type dropdown for ICEGATE',
    match: ['https://foservices.icegate.gov.in/*', 'https://www.icegate.gov.in/esanchit/*', 'https://esanchit.icegate.gov.in/*'],
    license: 'GPL-3.0-or-later', 'run-at': 'document-idle', noframes: true,
    grant: ['GM_getValue', 'GM_setValue', 'GM_deleteValue', 'GM_addValueChangeListener'],
  } })],
  build: { minify: false },
});

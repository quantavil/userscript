import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'ImpexCube Duty Structure -> Markdown Exporter',
        namespace: 'hsn-exporter',
        version: '1.0.4',
        license: 'MIT',
        noframes: true,
        description: 'Extracts Export Duty Structure data from ImpexCube for HSN codes and outputs a clean consolidated Markdown file.',
        author: 'quantavil',
        match: [
          'https://impexcube.in/*',
          'https://*.impexcube.in/*',
          'https://gemini.google.com/*',
          'https://claude.ai/*',
          'https://chatgpt.com/*',
          'https://grok.com/*'
        ],
        connect: [
          'impexcube.in',
          'www.impexcube.in'
        ],
        grant: [
          'GM_xmlhttpRequest',
          'GM_registerMenuCommand'
        ]
      }
    })
  ]
});

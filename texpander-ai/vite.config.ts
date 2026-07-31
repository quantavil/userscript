import { defineConfig } from 'vite'
import monkey from 'vite-plugin-monkey'

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'texpander-ai',
        namespace: 'https://github.com/quantavil/texpander-ai',
        version: '3.0.0',
        description: 'AI-powered text expander with Gemini integration',
        author: 'quantavil',
        match: ['*://*/*'],
        grant: ['GM_getValue', 'GM_setValue', 'GM_registerMenuCommand', 'GM_addStyle', 'GM_xmlhttpRequest'],
        connect: ['generativelanguage.googleapis.com'],
        'run-at': 'document-start',
        license: 'MIT',
      },
      build: { externalGlobals: {} },
    }),
  ],
})
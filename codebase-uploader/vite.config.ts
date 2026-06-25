import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/index.ts',
      userscript: {
        name: 'Codebase Uploader (Power User Mode)',
        namespace: 'http://tampermonkey.net/',
        version: '4.0.0',
        description: 'Fully customizable codebase uploader for AI chats. Editable limits, ignore lists, binary file support. Power-user tool.',
        author: 'quantavil',
        match: [
          '*://*.kimi.com/*',
          '*://*.qwen.com/*',
          '*://arena.lmsys.org/*',
          '*://*.z.ai/*',
          '*://chatgpt.com/*',
          '*://claude.ai/*'
        ],
        grant: 'none'
      },
      build: {
        fileName: 'codebase-uploader.user.js'
      }
    })
  ],
  build: {
    minify: false,
    target: 'es2022'
  }
});

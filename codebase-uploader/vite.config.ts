import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/index.ts',
      userscript: {
        name: 'Codebase Uploader',
        namespace: 'http://tampermonkey.net/',
        version: '1.2.0',
        description: 'An elegant, zero-dependency userscript that packages directories and codebases for AI chats. Features smart markdown chunking, customizable ignore patterns, binary file uploads, and a premium Liquid Glass interface.',
        author: 'quantavil',
        license: 'MIT',
        match: [
          '*://*.kimi.com/*',
          '*://*.qwen.ai/*',
          '*://arena.lmsys.org/*',
          '*://*.z.ai/*',
          '*://chatgpt.com/*',
          '*://claude.ai/*',
          '*://gemini.google.com/*',
          '*://aistudio.google.com/*',
          '*://*.deepseek.com/*',
          '*://*.perplexity.ai/*',
          '*://*.grok.com/*',
          '*://chat.mistral.ai/*',
          '*://copilot.microsoft.com/*',
          '*://huggingface.co/chat/*',
          '*://*.groq.com/*',
          '*://openrouter.ai/*',
          '*://*.meta.ai/*',
          '*://*.arena.ai/*',
          '*://aistudio.xiaomimimo.com/*',
          '*://agent.minimax.io/*'
        ],
        noframes: true,
        'run-at': 'document-start',
        grant: 'GM_registerMenuCommand'
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

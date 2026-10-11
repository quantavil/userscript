import { defineConfig } from 'vitest/config';

// Deliberately separate from vite.config.ts so vite-plugin-monkey does not run
// during tests. happy-dom is only here to give the atom parser a real DOMParser.
export default defineConfig({
  test: { include: ['src/**/*.test.ts'], environment: 'happy-dom' }
});

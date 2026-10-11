import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  testIgnore: ['**/unit/**'],
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    // Bundled Chromium has no H.264: tests check the pipeline, not decoding.
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  projects: [{ name: 'Mobile (Pixel 7)', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'bun tests/fixtures/server.ts',
    url: 'http://127.0.0.1:3000/r/oddlysatisfying/',
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
});

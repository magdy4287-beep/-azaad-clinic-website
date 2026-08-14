import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './qa',
  testMatch: '**/*.spec.mjs',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['line'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.AZAAD_BASE_URL || 'https://azaad-clinic-website.vercel.app',
    headless: true,
    trace: 'retain-on-failure',
  },
});

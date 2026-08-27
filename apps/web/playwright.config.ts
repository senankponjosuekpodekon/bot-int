import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 60_000,
  reporter: 'list',
  use: {
    baseURL,
    navigationTimeout: 60_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npx turbo run dev --filter @stiamond/api --filter @stiamond/web',
        cwd: '../..',
        url: 'http://localhost:3001/health',
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
      },
});

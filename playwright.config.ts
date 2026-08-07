import { defineConfig, devices } from '@playwright/test';

/**
 * E2E runs against the web build of the application shell (Vite dev server).
 * This lets the happy-path navigation flow run in CI on Linux without a full
 * Tauri (native) build. Native end-to-end runs are layered on in a later sprint.
 */
export default defineConfig({
  testDir: './apps/desktop/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:1420',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm --filter @luman/desktop dev',
    url: 'http://localhost:1420',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

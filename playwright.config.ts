import { defineConfig } from '@playwright/test';

// Runs against the local dev server in demo mode (no Supabase credentials
// needed) — e2e/auth flows test both happy paths and failure states.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'test-results/playwright-html' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
    env: { VITE_DEMO_MODE: 'true' },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});

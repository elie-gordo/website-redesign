import { defineConfig, devices } from '@playwright/test';

// Astro allows a single preview server: reuse a running one locally (`npm run preview`).
// Set BASE_URL to test a deployed site instead (no local server is started).
const PORT = 4321;
const BASE_URL = process.env.BASE_URL;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  // More workers saturate the GPU with concurrent WebGL viewers and cause timeouts.
  workers: 3,
  reporter: 'list',
  use: { baseURL: BASE_URL ?? `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: BASE_URL
    ? undefined
    : {
        command: `npx astro preview --port ${PORT}`,
        port: PORT,
        reuseExistingServer: !process.env.CI,
      },
});

import { defineConfig, devices } from '@playwright/test';

const gatewayData = { DATA_SOURCE_SHIPMENTS: 'gateway', DATA_SOURCE_TRACKING: 'gateway' };

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3101',
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: 'gateway.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    { name: 'phone', testIgnore: 'gateway.spec.ts', use: { ...devices['Pixel 7'] } },
    { name: 'gateway', testMatch: 'gateway.spec.ts', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'pnpm exec next start -p 3101',
      url: 'http://localhost:3101/login',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'node e2e/stub-gateway.mjs',
      url: 'http://localhost:3103/health',
      reuseExistingServer: false,
    },
    {
      // Real-data mode, using the stand-in gateway.
      command: 'pnpm exec next start -p 3104',
      url: 'http://localhost:3104/login',
      reuseExistingServer: false,
      timeout: 60_000,
      env: { ...gatewayData, GATEWAY_URL: 'http://localhost:3103' },
    },
    {
      // Real-data mode with nothing listening, to test the backend being down.
      command: 'pnpm exec next start -p 3105',
      url: 'http://localhost:3105/login',
      reuseExistingServer: false,
      timeout: 60_000,
      env: { ...gatewayData, GATEWAY_URL: 'http://localhost:3199' },
    },
  ],
});

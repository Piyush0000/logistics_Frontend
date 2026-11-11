import { defineConfig, devices } from '@playwright/test';
import { e2ePort, e2eUrl } from './e2e/helpers';

const gatewayData = {
  DATA_SOURCE_SHIPMENTS: 'gateway',
  DATA_SOURCE_ORDERS: 'gateway',
  DATA_SOURCE_TRACKING: 'gateway',
  DATA_SOURCE_WEBHOOKS: 'gateway',
  DATA_SOURCE_PICKUPS: 'gateway',
  DATA_SOURCE_RTO: 'gateway',
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: e2eUrl(3101),
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
      command: 'pnpm exec next start -p ' + e2ePort(3101),
      url: e2eUrl(3101) + '/login',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'node e2e/stub-gateway.mjs',
      url: e2eUrl(3103) + '/health',
      reuseExistingServer: false,
    },
    {
      // Real-data mode, using the stand-in gateway.
      command: 'pnpm exec next start -p ' + e2ePort(3104),
      url: e2eUrl(3104) + '/login',
      reuseExistingServer: false,
      timeout: 60_000,
      env: { ...gatewayData, GATEWAY_URL: e2eUrl(3103) },
    },
    {
      // Real-data mode with nothing listening, to test the backend being down.
      command: 'pnpm exec next start -p ' + e2ePort(3105),
      url: e2eUrl(3105) + '/login',
      reuseExistingServer: false,
      timeout: 60_000,
      env: { ...gatewayData, GATEWAY_URL: e2eUrl(3199) },
    },
    {
      // Wallet, COD and setup progress in real-data mode, which have no gateway routes yet.
      command: 'pnpm exec next start -p ' + e2ePort(3106),
      url: e2eUrl(3106) + '/login',
      reuseExistingServer: false,
      timeout: 60_000,
      env: { DATA_SOURCE_WALLET: 'gateway', DATA_SOURCE_COD: 'gateway', DATA_SOURCE_NDR: 'gateway', DATA_SOURCE_ONBOARDING: 'gateway', DATA_SOURCE_B2B: 'gateway', DATA_SOURCE_PICKUP_ADDRESSES: 'gateway', DATA_SOURCE_PICKUPS: 'gateway', DATA_SOURCE_INVOICES: 'gateway', DATA_SOURCE_WEIGHT: 'gateway', DATA_SOURCE_WEIGHT_SETTINGS: 'gateway', DATA_SOURCE_RATES: 'gateway', DATA_SOURCE_PROFILE: 'gateway' },
    },
  ],
});

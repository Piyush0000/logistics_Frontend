import { defineConfig, devices } from '@playwright/test';
import { e2ePort, e2eUrl } from './e2e/helpers';

// Test servers run production builds, which refuse the demo sign-in unless this is set
// (src/lib/data/session/index.ts). Only these local test servers turn it on.
const demoLogin = { ALLOW_DEMO_LOGIN: 'true' };
// The admin account for e2e (matches e2e/admin-helpers.ts). Production builds refuse admin sign-in
// without these, so only the main test server gets them.
const testAdmin = {
  ADMIN_EMAIL: 'admin@evocships.test',
  ADMIN_PASSWORD: 'evoc-admin-e2e-password',
  ADMIN_SESSION_SECRET: 'e2e-only-admin-session-secret-0123456789',
};

const gatewayData = {
  DATA_SOURCE_SHIPMENTS: 'gateway',
  DATA_SOURCE_ORDERS: 'gateway',
  DATA_SOURCE_TRACKING: 'gateway',
  DATA_SOURCE_WEBHOOKS: 'gateway',
  DATA_SOURCE_PICKUPS: 'gateway',
  DATA_SOURCE_RTO: 'gateway',
  DATA_SOURCE_ANALYTICS: 'gateway',
  DATA_SOURCE_MESSAGES: 'gateway',
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
      // Only this server serves the error-page test route; every other server answers it with 404.
      env: { ...demoLogin, ...testAdmin, E2E_ERROR_ROUTE: 'on' },
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
      env: { ...demoLogin, ...gatewayData, GATEWAY_URL: e2eUrl(3103) },
    },
    {
      // Real-data mode with nothing listening, to test the backend being down.
      command: 'pnpm exec next start -p ' + e2ePort(3105),
      url: e2eUrl(3105) + '/login',
      reuseExistingServer: false,
      timeout: 60_000,
      env: { ...demoLogin, ...gatewayData, GATEWAY_URL: e2eUrl(3199) },
    },
    {
      // Real-data mode for every feature the gateway has no route for (wallet, COD, NDR, setup,
      // B2B, pickups, invoices, weight, rates, analytics, profile, messages, company, team, support,
      // tracking page, notifications, courier rules and sub-merchants), to test their unavailable states.
      command: 'pnpm exec next start -p ' + e2ePort(3106),
      url: e2eUrl(3106) + '/login',
      reuseExistingServer: false,
      timeout: 60_000,
      env: { ...demoLogin, DATA_SOURCE_WALLET: 'gateway', DATA_SOURCE_COD: 'gateway', DATA_SOURCE_NDR: 'gateway', DATA_SOURCE_ONBOARDING: 'gateway', DATA_SOURCE_B2B: 'gateway', DATA_SOURCE_PICKUP_ADDRESSES: 'gateway', DATA_SOURCE_PICKUPS: 'gateway', DATA_SOURCE_INVOICES: 'gateway', DATA_SOURCE_WEIGHT: 'gateway', DATA_SOURCE_WEIGHT_SETTINGS: 'gateway', DATA_SOURCE_RATES: 'gateway', DATA_SOURCE_ANALYTICS: 'gateway', DATA_SOURCE_PROFILE: 'gateway', DATA_SOURCE_MESSAGES: 'gateway', DATA_SOURCE_COMPANY: 'gateway', DATA_SOURCE_TEAM: 'gateway', DATA_SOURCE_SUPPORT: 'gateway', DATA_SOURCE_TRACKING_PAGE: 'gateway', DATA_SOURCE_NOTIFICATIONS: 'gateway', DATA_SOURCE_COURIER_RULES: 'gateway', DATA_SOURCE_SUB_MERCHANTS: 'gateway' },
    },
    {
      // Mock mode, for specs that submit company details. That sets KYC to submitted for the whole
      // server, which the Home checklist reads, so it must not be the main server.
      command: 'pnpm exec next start -p ' + e2ePort(3108),
      url: e2eUrl(3108) + '/login',
      reuseExistingServer: false,
      timeout: 60_000,
      env: demoLogin,
    },
    {
      // Mock mode, for the courier move tests. They read the exact order, so nothing else may move couriers here.
      command: 'pnpm exec next start -p ' + e2ePort(3110),
      url: e2eUrl(3110) + '/login',
      reuseExistingServer: false,
      timeout: 60_000,
      env: demoLogin,
    },
  ],
});

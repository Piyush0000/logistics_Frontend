/**
 * Every route the app serves, used by `scripts/dev-smoke.mjs` and `scripts/screenshots.mjs`.
 * Each screen task adds its own routes here. Keep each route a single-quoted string starting
 * with '/', because the scripts read this file as text.
 */

/** Signed-in routes, inside the app shell. */
export const APP_ROUTES = [
  '/home',
  '/dashboard',
  '/dashboard?tab=pickups',
  '/dashboard?tab=ndr',
  '/dashboard?tab=rto',
  '/orders',
  '/orders/b2c',
  '/orders/b2b',
  '/orders/create',
  '/orders/bulk',
  '/orders/pickups',
  '/orders/pickups/manifest-print/pk-001',
  '/orders/DEMOEK001',
  '/ndr',
  '/rto',
  '/finances/wallet',
  '/finances/wallet?recharge=1',
  '/finances/cod',
  '/finances/invoices',
  '/finances/invoices/inv-2026-10',
  '/reconciliation/weight',
  '/reconciliation/weight-settings',
  '/tools/rate-card',
  '/tools/rate-calculator',
  '/tools/tracking',
  '/tools/tracking?awb=DEMOEK001',
  '/reports',
  '/support/help',
  '/support/help/verify-a-webhook-signature',
  '/channel-integrations',
  '/settings',
  '/settings/profile',
  '/settings/company',
] as const;

/** Routes anyone can open without signing in. */
export const PUBLIC_ROUTES = ['/login', '/forgot-password', '/terms', '/track/DEMOEK001'] as const;

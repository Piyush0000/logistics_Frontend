/**
 * Every route the app serves, used by `scripts/dev-smoke.mjs` and `scripts/screenshots.mjs`.
 * Each screen task adds its own routes here. Keep each route a single-quoted string starting
 * with '/', because the scripts read this file as text.
 */

/** Signed-in routes, inside the app shell. */
export const APP_ROUTES = [
  '/dashboard',
  '/orders',
  '/orders/create',
  '/orders/DEMOEK001',
  '/ndr',
  '/finances/wallet',
  '/finances/cod',
  '/channel-integrations',
] as const;

/** Routes anyone can open without signing in. */
export const PUBLIC_ROUTES = ['/login', '/terms'] as const;

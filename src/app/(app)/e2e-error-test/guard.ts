/** The browser-test error route exists only on the server that sets E2E_ERROR_ROUTE=on. */
export function errorRouteEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.E2E_ERROR_ROUTE === 'on';
}

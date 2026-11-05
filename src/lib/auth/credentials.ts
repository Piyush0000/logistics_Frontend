import 'server-only';

import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'evoc_session';

export type CredentialArea = 'shipments' | 'webhooks';

// Separate keys, because shipment demo tokens are too short for the webhook routes.
const DEV_TOKEN_VARIABLE: Record<CredentialArea, string> = {
  shipments: 'DEV_SHIPMENTS_TOKEN',
  webhooks: 'DEV_WEBHOOK_TOKEN',
};

type Env = Record<string, string | undefined>;

export function pickCredential(
  area: CredentialArea,
  session: string | undefined,
  env: Env = process.env,
): string | null {
  if (session) return session;
  if (env.NODE_ENV === 'production') return null;
  return env[DEV_TOKEN_VARIABLE[area]] || null;
}

/** The credential for gateway calls in the current request. Dev keys never apply in production. */
export async function merchantCredential(area: CredentialArea): Promise<string | null> {
  const store = await cookies();
  return pickCredential(area, store.get(SESSION_COOKIE)?.value);
}

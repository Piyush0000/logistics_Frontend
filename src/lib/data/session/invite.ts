import 'server-only';

import { z } from 'zod';
import { gatewayFetch } from '../../gateway/client';
import { ROLES } from '../team/types';
import { fromGateway, type DataResult } from '../source';
import type { SignedInUser } from './types';

export interface InvitePreview {
  email: string;
  merchantName: string;
  role: (typeof ROLES)[number];
}

const PreviewSchema = z.object({
  email: z.string(),
  merchant_name: z.string(),
  role: z.enum(ROLES),
});
const SignedInSchema = z.object({
  token: z.string().min(16),
  expires_at: z.string(),
  user: z.object({ email: z.string() }),
});

/** Who an invite link is for. The token is sent in the body, never in a URL. */
export async function previewInvite(token: string): Promise<DataResult<InvitePreview>> {
  const result = await gatewayFetch('/api/v1/auth/invite/preview', {
    method: 'POST',
    body: { token },
    schema: PreviewSchema,
  });
  return fromGateway(
    result.ok
      ? {
          ...result,
          data: { email: result.data.email, merchantName: result.data.merchant_name, role: result.data.role },
        }
      : result,
  );
}

/** Creates the invited person's account and signs them in. */
export async function acceptInvite(input: {
  token: string;
  name: string;
  password: string;
}): Promise<DataResult<SignedInUser>> {
  const result = await gatewayFetch('/api/v1/auth/invite/accept', {
    method: 'POST',
    body: input,
    schema: SignedInSchema,
  });
  return fromGateway(
    result.ok
      ? {
          ...result,
          data: { email: result.data.user.email, token: result.data.token, expiresAt: result.data.expires_at },
        }
      : result,
  );
}

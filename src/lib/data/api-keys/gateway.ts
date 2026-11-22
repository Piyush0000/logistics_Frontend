import 'server-only';

import { z } from 'zod';
import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { fromGateway } from '../source';
import type { ApiKey, ApiKeyService } from './types';

const keySchema = z.object({
  id: z.string(),
  name: z.string(),
  prefix: z.string(),
  created_at: z.string(),
  last_used_at: z.string().nullable().optional(),
});
const toKey = (k: z.infer<typeof keySchema>): ApiKey => ({
  id: k.id,
  name: k.name,
  prefix: k.prefix,
  createdAt: k.created_at,
  lastUsedAt: k.last_used_at ?? null,
});

/** API keys from /api/v1/auth/api-keys. Admins only; a key cannot manage keys. */
export const gatewayApiKeyService: ApiKeyService = {
  async list() {
    const result = await gatewayFetch('/api/v1/auth/api-keys', {
      schema: z.object({ items: z.array(keySchema) }),
      token: await merchantCredential('shipments'),
    });
    return fromGateway(result.ok ? { ...result, data: result.data.items.map(toKey) } : result);
  },

  async create(name) {
    const result = await gatewayFetch('/api/v1/auth/api-keys', {
      method: 'POST',
      schema: keySchema.extend({ key: z.string() }),
      token: await merchantCredential('shipments'),
      body: { name },
    });
    return fromGateway(result.ok ? { ...result, data: { ...toKey(result.data), key: result.data.key } } : result);
  },

  async revoke(id) {
    const result = await gatewayFetch(`/api/v1/auth/api-keys/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      token: await merchantCredential('shipments'),
    });
    return fromGateway(result.ok ? { ...result, data: null } : result);
  },
};

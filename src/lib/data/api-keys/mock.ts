import 'server-only';

import { randomBytes, randomUUID } from 'node:crypto';
import { fromMock } from '../source';
import type { ApiKey, ApiKeyService } from './types';

const keys: ApiKey[] = [];

/** Sample keys for the demo: they open nothing. */
export const mockApiKeyService: ApiKeyService = {
  async list() {
    return fromMock(keys.map((k) => ({ ...k })));
  },
  async create(name) {
    const key = `evs_test_${randomBytes(24).toString('base64url')}`;
    const created: ApiKey = { id: randomUUID(), name, prefix: key.slice(0, 15), createdAt: new Date().toISOString(), lastUsedAt: null };
    keys.unshift(created);
    return fromMock({ ...created, key });
  },
  async revoke(id) {
    const at = keys.findIndex((k) => k.id === id);
    if (at >= 0) keys.splice(at, 1);
    return fromMock(null);
  },
};

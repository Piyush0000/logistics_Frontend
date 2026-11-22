import 'server-only';

import { resolveDataSource } from '../source';
import { gatewayApiKeyService } from './gateway';
import { mockApiKeyService } from './mock';
import type { ApiKeyService } from './types';

export type { ApiKey, ApiKeyService } from './types';

export function apiKeyService(): ApiKeyService {
  return resolveDataSource('api_keys') === 'gateway' ? gatewayApiKeyService : mockApiKeyService;
}

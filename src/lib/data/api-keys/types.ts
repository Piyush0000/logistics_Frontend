import type { DataResult } from '../source';

/** A merchant API key. Only its first characters are ever shown again after creation. */
export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface ApiKeyService {
  list(): Promise<DataResult<ApiKey[]>>;
  /** The full key is in the result once, and never again. */
  create(name: string): Promise<DataResult<ApiKey & { key: string }>>;
  revoke(id: string): Promise<DataResult<null>>;
}

export const MAX_KEY_NAME = 60;

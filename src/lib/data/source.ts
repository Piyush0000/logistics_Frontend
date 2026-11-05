import type { GatewayResult } from '../gateway/client';
import type { ApiError } from '../gateway/errors';

export type DataSource = 'gateway' | 'mock';

/** What every feature returns, so a screen can show a "Sample data" badge for mock results. */
export type DataResult<T> =
  | { ok: true; source: DataSource; data: T }
  | { ok: false; source: DataSource; error: ApiError };

type Env = Record<string, string | undefined>;

/** Picks a feature's source from DATA_SOURCE_<FEATURE>. Features use mock until switched. */
export function resolveDataSource(feature: string, env: Env = process.env): DataSource {
  const name = `DATA_SOURCE_${feature.toUpperCase()}`;
  const value = env[name];
  if (!value) return 'mock';
  if (value === 'gateway' || value === 'mock') return value;
  throw new Error(`${name} must be "gateway" or "mock"`);
}

export function fromMock<T>(data: T): DataResult<T> {
  return { ok: true, source: 'mock', data };
}

export function fromGateway<T>(result: GatewayResult<T>): DataResult<T> {
  return result.ok
    ? { ok: true, source: 'gateway', data: result.data }
    : { ok: false, source: 'gateway', error: result.error };
}

import type { GatewayResult } from '../gateway/client';
import type { ApiError } from '../gateway/errors';

export type DataSource = 'gateway' | 'mock';

/** What every feature returns, so a screen can show a "Sample data" badge for mock results. */
export type DataResult<T> =
  | { ok: true; source: DataSource; data: T }
  | { ok: false; source: DataSource; error: ApiError };

type Env = Record<string, string | undefined>;

/**
 * Picks a feature's source from DATA_SOURCE_<FEATURE>, else DATA_SOURCE_DEFAULT, else mock.
 * Production sets DATA_SOURCE_DEFAULT=gateway, so no screen can fall back to sample data there.
 */
export function resolveDataSource(feature: string, env: Env = process.env): DataSource {
  const own = `DATA_SOURCE_${feature.toUpperCase()}`;
  const name = env[own] ? own : 'DATA_SOURCE_DEFAULT';
  const value = env[name];
  if (!value) return 'mock';
  if (value === 'gateway' || value === 'mock') return value;
  throw new Error(`${name} must be "gateway" or "mock"`);
}

/** True when the app runs on real data only (production): unbuilt screens are then hidden. */
export function liveDataOnly(env: Env = process.env): boolean {
  return env.DATA_SOURCE_DEFAULT === 'gateway';
}

export function fromMock<T>(data: T): DataResult<T> {
  return { ok: true, source: 'mock', data };
}

export function fromGateway<T>(result: GatewayResult<T>): DataResult<T> {
  return result.ok
    ? { ok: true, source: 'gateway', data: result.data }
    : { ok: false, source: 'gateway', error: result.error };
}

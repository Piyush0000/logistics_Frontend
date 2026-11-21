import 'server-only';

import type { GatewayResult } from '../../gateway/client';
import type { ApiError } from '../../gateway/errors';
import type { DataResult } from '../../data/source';

/**
 * The credential for the gateway's admin API (/api/v1/admin/*). It lives only on the frontend
 * server; the browser never sees it.
 */
export function adminToken(): string | null {
  return process.env.ADMIN_API_KEY || null;
}

/** Turns a gateway result into a DataResult, reshaping the data on success. */
export function mapResult<T, U>(result: GatewayResult<T>, map: (data: T) => U): DataResult<U> {
  return result.ok
    ? { ok: true, source: 'gateway', data: map(result.data) }
    : { ok: false, source: 'gateway', error: result.error };
}

/** A failed gateway call as a DataResult of any type. */
export function gatewayError(error: ApiError): DataResult<never> {
  return { ok: false, source: 'gateway', error };
}

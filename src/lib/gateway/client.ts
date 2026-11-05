import 'server-only';

import type { z } from 'zod';
import { apiErrorFromResponse, type ApiError } from './errors';

const DEFAULT_GATEWAY_URL = 'http://localhost:8080';

// The gateway gives its upstream services 5 seconds, so wait longer to receive its 502 response.
const DEFAULT_TIMEOUT_MS = 6000;

export type GatewayResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; error: ApiError };

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  token?: string | null;
  requestId?: string;
  timeoutMs?: number;
}

function buildUrl(path: string, query: RequestOptions['query']): string {
  const base = (process.env.GATEWAY_URL || DEFAULT_GATEWAY_URL).replace(/\/+$/, '');
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) params.set(key, String(value));
  }
  const search = params.toString();
  return `${base}${path}${search ? `?${search}` : ''}`;
}

function buildHeaders({ body, token, requestId }: RequestOptions): Record<string, string> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  if (requestId) headers['x-request-id'] = requestId;
  return headers;
}

function parseJson(text: string): { valid: boolean; value: unknown } {
  try {
    return { valid: true, value: JSON.parse(text) };
  } catch {
    return { valid: false, value: null };
  }
}

function failure(error: ApiError): { ok: false; error: ApiError } {
  return { ok: false, error };
}

function connectionFailure(cause: unknown): { ok: false; error: ApiError } {
  if (cause instanceof Error && cause.name === 'TimeoutError') {
    return failure({
      kind: 'timeout',
      status: 0,
      message: 'The request timed out. Please try again.',
    });
  }
  return failure({
    kind: 'network',
    status: 0,
    message: 'Could not reach the server. Please try again.',
  });
}

function invalidResponse(status: number): { ok: false; error: ApiError } {
  return failure({
    kind: 'invalid_response',
    status,
    message: 'The server sent an unexpected response.',
  });
}

/**
 * Calls the gateway from server code. Expected failures are returned, not thrown, so every
 * screen handles them the same way.
 */
export async function gatewayFetch<S extends z.ZodTypeAny>(
  path: string,
  options: RequestOptions & { schema: S },
): Promise<GatewayResult<z.output<S>>>;
export async function gatewayFetch(
  path: string,
  options?: RequestOptions & { schema?: undefined },
): Promise<GatewayResult<undefined>>;
export async function gatewayFetch(
  path: string,
  options: RequestOptions & { schema?: z.ZodTypeAny } = {},
): Promise<GatewayResult<unknown>> {
  let status: number;
  let text: string;
  try {
    const response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers: buildHeaders(options),
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: 'no-store',
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    status = response.status;
    text = await response.text();
  } catch (cause) {
    return connectionFailure(cause);
  }

  const { valid, value } = parseJson(text);

  if (status < 200 || status >= 300) {
    return failure(apiErrorFromResponse(status, value));
  }

  if (!options.schema) return { ok: true, status, data: undefined };
  if (!valid) return invalidResponse(status);

  const parsed = options.schema.safeParse(value);
  return parsed.success ? { ok: true, status, data: parsed.data } : invalidResponse(status);
}

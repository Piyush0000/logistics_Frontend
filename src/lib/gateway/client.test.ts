import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { gatewayFetch } from './client';

type Handler = (req: IncomingMessage, res: ServerResponse, body: string) => void;

let handler: Handler;
let server: Server;
let baseUrl: string;

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => handler(req, res, body));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.GATEWAY_URL = baseUrl;
});

afterEach(() => {
  process.env.GATEWAY_URL = baseUrl;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  delete process.env.GATEWAY_URL;
});

const StatusSchema = z.object({ status: z.string() });

describe('gatewayFetch', () => {
  it('returns parsed data on success', async () => {
    handler = (_req, res) => json(res, 200, { status: 'ok' });

    const result = await gatewayFetch('/health', { schema: StatusSchema });

    expect(result).toEqual({ ok: true, status: 200, data: { status: 'ok' } });
  });

  it('sends the bearer token and request id', async () => {
    let headers: IncomingMessage['headers'] = {};
    handler = (req, res) => {
      headers = req.headers;
      json(res, 200, { status: 'ok' });
    };

    await gatewayFetch('/health', { schema: StatusSchema, token: 'abc', requestId: 'req-1' });

    expect(headers.authorization).toBe('Bearer abc');
    expect(headers['x-request-id']).toBe('req-1');
  });

  it('omits the authorization header when there is no token', async () => {
    let headers: IncomingMessage['headers'] = {};
    handler = (req, res) => {
      headers = req.headers;
      json(res, 200, { status: 'ok' });
    };

    await gatewayFetch('/health', { schema: StatusSchema });

    expect(headers.authorization).toBeUndefined();
  });

  it('sends a JSON body with the given method', async () => {
    let method = '';
    let received = '';
    let contentType = '';
    handler = (req, res, body) => {
      method = req.method ?? '';
      received = body;
      contentType = req.headers['content-type'] ?? '';
      json(res, 201, { status: 'ok' });
    };

    await gatewayFetch('/api/v1/webhooks', {
      method: 'POST',
      body: { url: 'https://example.com' },
      schema: StatusSchema,
    });

    expect(method).toBe('POST');
    expect(contentType).toBe('application/json');
    expect(JSON.parse(received)).toEqual({ url: 'https://example.com' });
  });

  it('adds query parameters and skips undefined values', async () => {
    let url = '';
    handler = (req, res) => {
      url = req.url ?? '';
      json(res, 200, { status: 'ok' });
    };

    await gatewayFetch('/api/v1/shipments', {
      schema: StatusSchema,
      query: { status: 'DELIVERED', page: 2, carrier: undefined },
    });

    expect(url).toBe('/api/v1/shipments?status=DELIVERED&page=2');
  });

  it('accepts an empty 204 response when no schema is given', async () => {
    handler = (_req, res) => {
      res.writeHead(204);
      res.end();
    };

    const result = await gatewayFetch('/api/v1/webhooks/1', { method: 'DELETE' });

    expect(result).toEqual({ ok: true, status: 204, data: undefined });
  });

  it('maps an error body to an ApiError', async () => {
    handler = (_req, res) =>
      json(res, 502, { error: 'UPSTREAM_UNAVAILABLE', service: 'tracking-engine' });

    const result = await gatewayFetch('/api/v1/shipments/1/tracking', { schema: StatusSchema });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('upstream');
      expect(result.error.service).toBe('tracking-engine');
    }
  });

  it('handles a non-JSON error body', async () => {
    handler = (_req, res) => {
      res.writeHead(500, { 'content-type': 'text/html' });
      res.end('<html>boom</html>');
    };

    const result = await gatewayFetch('/health', { schema: StatusSchema });

    expect(result).toEqual({
      ok: false,
      error: { kind: 'server', status: 500, message: 'Something went wrong. Please try again.' },
    });
  });

  it('reports a non-JSON success body as an invalid response', async () => {
    handler = (_req, res) => {
      res.writeHead(200);
      res.end('not json');
    };

    const result = await gatewayFetch('/health', { schema: StatusSchema });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('invalid_response');
  });

  it('reports a body that fails the schema as an invalid response', async () => {
    handler = (_req, res) => json(res, 200, { status: 42 });

    const result = await gatewayFetch('/health', { schema: StatusSchema });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('invalid_response');
      expect(result.error.status).toBe(200);
    }
  });

  it('reports a timeout when the gateway is too slow', async () => {
    handler = () => {
      /* never responds */
    };

    const result = await gatewayFetch('/health', { schema: StatusSchema, timeoutMs: 50 });

    expect(result).toEqual({
      ok: false,
      error: { kind: 'timeout', status: 0, message: 'The request timed out. Please try again.' },
    });
  });

  it('reports a network error when the gateway is unreachable', async () => {
    process.env.GATEWAY_URL = 'http://127.0.0.1:1';

    const result = await gatewayFetch('/health', { schema: StatusSchema });

    expect(result).toEqual({
      ok: false,
      error: { kind: 'network', status: 0, message: 'Could not reach the server. Please try again.' },
    });
  });

  it('removes a trailing slash from the base URL', async () => {
    let url = '';
    handler = (req, res) => {
      url = req.url ?? '';
      json(res, 200, { status: 'ok' });
    };
    process.env.GATEWAY_URL = `${baseUrl}/`;

    await gatewayFetch('/health', { schema: StatusSchema });

    expect(url).toBe('/health');
  });
});

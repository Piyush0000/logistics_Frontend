import { describe, expect, it } from 'vitest';
import { apiErrorFromResponse } from './errors';

describe('apiErrorFromResponse', () => {
  it('reads the message from a Nest exception body', () => {
    const error = apiErrorFromResponse(503, {
      message: 'Shipment creation is disabled until merchant authentication is configured',
      error: 'Service Unavailable',
      statusCode: 503,
    });

    expect(error).toEqual({
      kind: 'unavailable',
      status: 503,
      message: 'Shipment creation is disabled until merchant authentication is configured',
    });
  });

  it('joins a Nest message array into one message', () => {
    const error = apiErrorFromResponse(400, {
      message: ['limit must be a number', 'page must be a number'],
      statusCode: 400,
    });

    expect(error.message).toBe('limit must be a number, page must be a number');
  });

  it('keeps field issues from a zod validation body', () => {
    const error = apiErrorFromResponse(400, {
      error: 'VALIDATION_FAILED',
      issues: [{ path: 'origin.pincode', message: 'Invalid pincode' }],
    });

    expect(error).toEqual({
      kind: 'validation',
      status: 400,
      message: 'Some fields need attention.',
      issues: [{ path: 'origin.pincode', message: 'Invalid pincode' }],
    });
  });

  it('names the failed service for a gateway upstream failure', () => {
    const error = apiErrorFromResponse(502, {
      error: 'UPSTREAM_UNAVAILABLE',
      service: 'tracking-engine',
    });

    expect(error).toEqual({
      kind: 'upstream',
      status: 502,
      message: 'A backend service is unavailable. Please try again.',
      service: 'tracking-engine',
    });
  });

  it.each([
    [400, 'validation'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [409, 'conflict'],
    [500, 'server'],
    [502, 'upstream'],
    [503, 'unavailable'],
    [418, 'http'],
  ])('classifies status %i as %s', (status, kind) => {
    expect(apiErrorFromResponse(status, null).kind).toBe(kind);
  });

  it('uses a safe default message when the body has none', () => {
    expect(apiErrorFromResponse(500, 'Bad Gateway <html>').message).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('ignores malformed issues instead of passing them on', () => {
    const error = apiErrorFromResponse(400, { error: 'VALIDATION_FAILED', issues: [{ path: 1 }] });

    expect(error.issues).toBeUndefined();
  });
});

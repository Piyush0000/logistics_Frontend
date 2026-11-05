import { describe, expect, it } from 'vitest';
import type { GatewayResult } from '../gateway/client';
import { fromGateway, fromMock, resolveDataSource } from './source';

describe('resolveDataSource', () => {
  it('uses mock when the feature has no setting', () => {
    expect(resolveDataSource('wallet', {})).toBe('mock');
  });

  it('reads the upper-case variable for the feature', () => {
    expect(resolveDataSource('wallet', { DATA_SOURCE_WALLET: 'gateway' })).toBe('gateway');
  });

  it('keeps one feature independent of another', () => {
    expect(resolveDataSource('wallet', { DATA_SOURCE_SHIPMENTS: 'gateway' })).toBe('mock');
  });

  it('treats an empty value as unset', () => {
    expect(resolveDataSource('wallet', { DATA_SOURCE_WALLET: '' })).toBe('mock');
  });

  it('rejects an unknown value instead of silently showing sample data', () => {
    expect(() => resolveDataSource('wallet', { DATA_SOURCE_WALLET: 'live' })).toThrow(
      'DATA_SOURCE_WALLET must be "gateway" or "mock"',
    );
  });
});

describe('fromMock', () => {
  it('labels the data as mock', () => {
    expect(fromMock({ balance: 1 })).toEqual({ ok: true, source: 'mock', data: { balance: 1 } });
  });
});

describe('fromGateway', () => {
  it('labels successful data as gateway', () => {
    const result: GatewayResult<number> = { ok: true, status: 200, data: 7 };

    expect(fromGateway(result)).toEqual({ ok: true, source: 'gateway', data: 7 });
  });

  it('passes the error through on failure', () => {
    const error = { kind: 'timeout', status: 0, message: 'Timed out' } as const;

    expect(fromGateway({ ok: false, error })).toEqual({ ok: false, source: 'gateway', error });
  });
});

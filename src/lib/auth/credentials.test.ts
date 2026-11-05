import { describe, expect, it } from 'vitest';
import { pickCredential } from './credentials';

const devEnv = {
  NODE_ENV: 'development',
  DEV_SHIPMENTS_TOKEN: 'demo-merchant-001',
  DEV_WEBHOOK_TOKEN: 'a-webhook-key-of-at-least-32-characters',
};

describe('pickCredential', () => {
  it('prefers the session over dev keys', () => {
    expect(pickCredential('shipments', 'session-token', devEnv)).toBe('session-token');
  });

  it('uses the shipments dev key for shipments', () => {
    expect(pickCredential('shipments', undefined, devEnv)).toBe('demo-merchant-001');
  });

  it('uses the webhook dev key for webhooks', () => {
    expect(pickCredential('webhooks', undefined, devEnv)).toBe(
      'a-webhook-key-of-at-least-32-characters',
    );
  });

  it('never uses dev keys in production', () => {
    expect(pickCredential('shipments', undefined, { ...devEnv, NODE_ENV: 'production' })).toBeNull();
  });

  it('still uses the session in production', () => {
    expect(pickCredential('shipments', 'session-token', { NODE_ENV: 'production' })).toBe(
      'session-token',
    );
  });

  it('returns null when a dev key is empty', () => {
    expect(pickCredential('webhooks', undefined, { NODE_ENV: 'test', DEV_WEBHOOK_TOKEN: '' })).toBeNull();
  });

  it('ignores an empty session value', () => {
    expect(pickCredential('shipments', '', devEnv)).toBe('demo-merchant-001');
  });
});

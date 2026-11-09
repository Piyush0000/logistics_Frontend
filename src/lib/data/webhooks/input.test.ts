import { describe, expect, it } from 'vitest';
import { WEBHOOK_EVENTS } from './events';
import { parseWebhookInput } from './input';

const events = ['shipment.created'];

describe('parseWebhookInput', () => {
  it('accepts a public HTTPS address and known events', () => {
    expect(parseWebhookInput({ url: ' https://hooks.example.com/in ', events })).toEqual({
      ok: true,
      data: { url: 'https://hooks.example.com/in', events },
    });
  });

  it('accepts every subscribable event', () => {
    const all = WEBHOOK_EVENTS.map(({ value }) => value);

    expect(parseWebhookInput({ url: 'https://hooks.example.com', events: all }).ok).toBe(true);
  });

  // The same rules as services/webhooks/src/subscriptions/subscription.input.ts.
  it.each([
    ['not a URL', 'hello'],
    ['plain HTTP', 'http://hooks.example.com'],
    ['an empty value', ''],
    ['localhost', 'https://localhost/in'],
    ['a .localhost name', 'https://app.localhost/in'],
    ['a .local name', 'https://printer.local/in'],
    ['an .internal name', 'https://api.internal/in'],
    ['an IP address', 'https://192.168.1.10/in'],
    ['an IPv6 address', 'https://[::1]/in'],
    ['a login in the URL', 'https://user:pass@example.com/in'],
    ['a fragment', 'https://example.com/in#part'],
    ['an overlong URL', `https://example.com/${'a'.repeat(2048)}`],
  ])('rejects %s', (_name, url) => {
    const result = parseWebhookInput({ url, events });

    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { url: 'Enter a public HTTPS address, such as https://your-app.com/webhooks.' },
    });
  });

  it('needs at least one event', () => {
    expect(parseWebhookInput({ url: 'https://hooks.example.com', events: [] })).toMatchObject({
      ok: false,
      fieldErrors: { events: 'Choose at least one event.' },
    });
  });

  it('rejects unknown and repeated events', () => {
    for (const bad of [['order.created'], ['shipment.failed', 'shipment.failed']]) {
      expect(parseWebhookInput({ url: 'https://hooks.example.com', events: bad }).ok).toBe(false);
    }
  });

  it('copes with input of the wrong shape', () => {
    expect(parseWebhookInput(null).ok).toBe(false);
    expect(parseWebhookInput({ url: 5, events: 'x' }).ok).toBe(false);
  });
});

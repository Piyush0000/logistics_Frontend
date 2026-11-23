import { describe, expect, it, vi } from 'vitest';
import { gatewayMessagesService } from './gateway';
import { messagesService } from './index';
import { mockMessagesService } from './mock';
import { deliveryRate } from './rate';

vi.mock('../../auth/credentials', () => ({ merchantCredential: async () => 'evs_sess_test' }));

describe('deliveryRate', () => {
  it('calculates delivery rate to one decimal', () => {
    expect(deliveryRate(1000, 980)).toBe('98.0%');
    expect(deliveryRate(236, 229)).toBe('97.0%');
    expect(deliveryRate(3, 1)).toBe('33.3%');
    expect(deliveryRate(7, 7)).toBe('100.0%');
  });

  it('never rounds up to 100.0% while some messages were not delivered', () => {
    expect(deliveryRate(10000, 9996)).toBe('99.9%');
    expect(deliveryRate(10000, 10000)).toBe('100.0%');
  });

  it('shows a dash when nothing was sent, and stays within 0 to 100', () => {
    expect(deliveryRate(0, 0)).toBe('—');
    expect(deliveryRate(Number.NaN, 4)).toBe('—');
    expect(deliveryRate(10, 12)).toBe('100.0%');
    expect(deliveryRate(10, -2)).toBe('0.0%');
  });
});

describe('mock messages', () => {
  it('adds up: the events count every message sent', async () => {
    for (const days of [7, 30] as const) {
      const result = await mockMessagesService.getStats(days);
      expect(result.ok && result.source).toBe('mock');
      if (!result.ok) return;
      expect(result.data.byStatus.reduce((sum, row) => sum + row.count, 0)).toBe(result.data.sent);
    }
  });
});

describe('gateway messages', () => {
  it('reads WhatsApp counts, cost and reasons from the analytics API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          sent: 3,
          skipped: 1,
          failed: 0,
          charged_paise: 300,
          by_event: [{ event: 'DELIVERED', count: 3 }],
          skip_reasons: [{ reason: 'not enough money in the wallet', count: 1 }],
        }),
      ),
    );
    expect(await gatewayMessagesService.getStats(7)).toMatchObject({
      ok: true,
      data: { sent: 3, chargedPaise: 300, byStatus: [{ status: 'DELIVERED', count: 3 }], reasons: [{ count: 1 }] },
    });
    vi.unstubAllGlobals();
  });

  it('picks the service from DATA_SOURCE_MESSAGES', () => {
    const before = process.env.DATA_SOURCE_MESSAGES;
    process.env.DATA_SOURCE_MESSAGES = 'gateway';
    expect(messagesService()).toBe(gatewayMessagesService);
    delete process.env.DATA_SOURCE_MESSAGES;
    expect(messagesService()).toBe(mockMessagesService);
    if (before !== undefined) process.env.DATA_SOURCE_MESSAGES = before;
  });
});

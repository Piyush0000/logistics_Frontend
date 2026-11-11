import { describe, expect, it } from 'vitest';
import { gatewayMessagesService } from './gateway';
import { messagesService } from './index';
import { mockMessagesService } from './mock';
import { deliveryRate } from './rate';

describe('deliveryRate', () => {
  it('calculates delivery rate to one decimal', () => {
    expect(deliveryRate(1000, 980)).toBe('98.0%');
    expect(deliveryRate(236, 229)).toBe('97.0%');
    expect(deliveryRate(3, 1)).toBe('33.3%');
    expect(deliveryRate(7, 7)).toBe('100.0%');
  });

  it('shows a dash when nothing was sent, and stays within 0 to 100', () => {
    expect(deliveryRate(0, 0)).toBe('—');
    expect(deliveryRate(Number.NaN, 4)).toBe('—');
    expect(deliveryRate(10, 12)).toBe('100.0%');
    expect(deliveryRate(10, -2)).toBe('0.0%');
  });
});

describe('mock messages', () => {
  it('adds up: delivered plus failed is sent, and the statuses count every message', async () => {
    for (const days of [7, 30] as const) {
      const result = await mockMessagesService.getStats(days);
      expect(result.ok && result.source).toBe('mock');
      if (!result.ok) return;
      const { sent, delivered, failed, byStatus } = result.data;
      expect(delivered + failed).toBe(sent);
      expect(byStatus.reduce((sum, row) => sum + row.count, 0)).toBe(sent);
    }
  });

  it('reports 980 of 1,000 over 30 days', async () => {
    const result = await mockMessagesService.getStats(30);
    expect(result.ok && deliveryRate(result.data.sent, result.data.delivered)).toBe('98.0%');
  });
});

describe('gateway messages', () => {
  it('shows SMS as unavailable in gateway mode', async () => {
    expect(await gatewayMessagesService.getStats(7)).toMatchObject({
      ok: false,
      source: 'gateway',
      error: { kind: 'unavailable' },
    });
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

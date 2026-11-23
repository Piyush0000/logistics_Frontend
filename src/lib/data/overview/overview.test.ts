import { afterEach, describe, expect, it, vi } from 'vitest';
import { overviewService } from './index';

vi.mock('../../auth/credentials', () => ({ merchantCredential: async () => 'evs_sess_test' }));

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.DATA_SOURCE_OVERVIEW;
});

describe('gateway overview', () => {
  it("reads today's figures and NDR outcomes from the analytics API", async () => {
    process.env.DATA_SOURCE_OVERVIEW = 'gateway';
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () =>
      Response.json({
        orders_today: 12,
        orders_change_percent: 20,
        order_value_today_paise: 1_845_000,
        order_value_change_percent: -5,
        delivered_today: 7,
        delivered_change_percent: 100,
        average_shipping_paise: 6_900,
        minimum_shipping_paise: 4_200,
        ndr: { open: 3, reattempted: 1, delivered: 2, returned: 1 },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    expect(await overviewService().getOverview()).toMatchObject({
      ok: true,
      source: 'gateway',
      data: {
        ordersToday: 12,
        ordersChangePercent: 20,
        revenueTodayPaise: 1_845_000,
        revenueChangePercent: -5,
        deliveriesToday: 7,
        deliveriesChangePercent: 100,
        averageShippingPaise: 6_900,
        minimumShippingPaise: 4_200,
        ndr: { open: 3, reattempted: 1, delivered: 2, returned: 1 },
      },
    });
    expect(new URL(String(fetchMock.mock.calls[0]![0])).pathname).toBe('/api/v1/analytics/today');
  });

  it('reports a malformed answer as an error, never as sample data', async () => {
    process.env.DATA_SOURCE_OVERVIEW = 'gateway';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ orders_today: 'many' })),
    );
    expect(await overviewService().getOverview()).toMatchObject({ ok: false, source: 'gateway' });
  });
});

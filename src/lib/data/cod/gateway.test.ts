import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_COD_FILTERS } from './filters';
import { gatewayCodService } from './gateway';

vi.mock('../../auth/credentials', () => ({ merchantCredential: async () => 'evs_sess_test' }));

afterEach(() => vi.unstubAllGlobals());

const line = (over: Record<string, unknown> = {}) => ({
  id: 'l1',
  awb: '71705910000055',
  shipment_id: 's1',
  carrier: 'delhivery',
  expected_paise: 99_800,
  settled_paise: null,
  settled_at: null,
  delivered_at: '2026-11-18T04:30:00.000Z',
  evoc_awb: 'EVS0000000018',
  reference_id: null,
  ...over,
});

describe('gateway COD service', () => {
  it('lists COD per order: pending at the full amount, settled at what was paid', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        items: [line(), line({ id: 'l2', settled_paise: 95_000, settled_at: '2026-11-25T06:00:00.000Z' })],
        page: 1,
        limit: 20,
        total: 2,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await gatewayCodService.listRemittances({ ...DEFAULT_COD_FILTERS, status: 'pending' });
    const url = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]));
    expect(url.pathname).toBe('/api/v1/cod/remittances');
    expect(url.searchParams.get('status')).toBe('pending');
    expect(result).toMatchObject({
      ok: true,
      source: 'gateway',
      data: {
        total: 2,
        first: 1,
        last: 2,
        entries: [
          { orderNumber: 'EVS0000000018', status: 'pending', remittablePaise: 99_800, deductionsPaise: 0 },
          { status: 'settled', remittablePaise: 95_000, deductionsPaise: 4_800 },
        ],
      },
    });
  });

  it('reads the summary', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          remitted_till_date_paise: 144_800,
          settled_count: 2,
          last_remittance_paise: 144_800,
          next_batch_paise: 0,
          next_batch_count: 0,
          total_due_paise: 0,
          due_count: 0,
        }),
      ),
    );
    expect(await gatewayCodService.getSummary()).toMatchObject({
      ok: true,
      data: { remittedTillDatePaise: 144_800, settledCount: 2 },
    });
  });
});

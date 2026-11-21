import { afterEach, describe, expect, it, vi } from 'vitest';
import { gatewayNdrService } from './gateway';

vi.mock('../../auth/credentials', () => ({ merchantCredential: async () => 'evs_sess_test' }));
import { ndrService } from './index';
import { mockNdrService } from './mock';

describe('mockNdrService', () => {
  it('returns NDR summary and list with source: mock', async () => {
    const result = await mockNdrService.getNdrDashboard();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe('mock');
    expect(result.data.kpis).toBeDefined();
    expect(result.data.kpis.openNdr).toBeGreaterThanOrEqual(0);
    expect(result.data.items.length).toBeGreaterThan(0);
  });

  it('updates an NDR record with re-attempt request', async () => {
    const listResult = await mockNdrService.getNdrDashboard();
    if (!listResult.ok) throw new Error('Failed to get NDR list');
    const firstItem = listResult.data.items[0];
    if (!firstItem) throw new Error('No items in NDR list');

    const actionResult = await mockNdrService.takeNdrAction({
      ndr_id: firstItem.id,
      action: 'REATTEMPT',
      instructions: 'Please call customer before delivery',
      preferred_date: '2026-11-08',
    });

    expect(actionResult.ok).toBe(true);
    if (!actionResult.ok) return;
    expect(actionResult.data.status).toBe('REATTEMPT_REQUESTED');
  });

  it('updates an NDR record with RTO request', async () => {
    const listResult = await mockNdrService.getNdrDashboard();
    if (!listResult.ok) throw new Error('Failed to get NDR list');
    const item = listResult.data.items[1] ?? listResult.data.items[0];
    if (!item) throw new Error('No items in NDR list');

    const actionResult = await mockNdrService.takeNdrAction({
      ndr_id: item.id,
      action: 'RTO',
      instructions: 'Customer refused, return immediately',
    });

    expect(actionResult.ok).toBe(true);
    if (!actionResult.ok) return;
    expect(actionResult.data.status).toBe('RTO_REQUESTED');
  });

  it('returns not found when taking action on unknown NDR id', async () => {
    const actionResult = await mockNdrService.takeNdrAction({
      ndr_id: 'unknown-id-999',
      action: 'REATTEMPT',
    });
    expect(actionResult.ok).toBe(false);
    if (actionResult.ok) return;
    expect(actionResult.error.kind).toBe('not_found');
  });
});

describe('gatewayNdrService', () => {
  const ndrCase = (status: string, over: Record<string, unknown> = {}) => ({
    id: `n-${status}`,
    shipment_id: 's1',
    awb: '71705910000055',
    carrier: 'delhivery',
    status,
    attempt_count: 2,
    last_reason: 'Consignee unavailable',
    last_attempt_at: '2026-11-21T12:30:00.000Z',
    action_error: null,
    history: [{ kind: 'ATTEMPT_FAILED', note: 'Consignee unavailable', at: '2026-11-21T12:30:00.000Z' }],
    evoc_awb: 'EVS0000000018',
    reference_id: 'ORD-1',
    recipient_name: 'Asha',
    recipient_phone: '9876543210',
    destination_city: 'Bengaluru',
    ...over,
  });

  afterEach(() => vi.unstubAllGlobals());

  it('builds the dashboard from the live cases, counting returns', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          items: [
            ndrCase('ACTION_REQUIRED', { action_error: 'NDR_REATTEMPT_REFUSED: too late' }),
            ndrCase('RETURNED'),
            ndrCase('DELIVERED'),
          ],
        }),
      ),
    );
    const result = await gatewayNdrService.getNdrDashboard();
    expect(result).toMatchObject({
      ok: true,
      source: 'gateway',
      data: { kpis: { openNdr: 1, reattempted: 0, delivered: 1, returned: 1 } },
    });
    if (!result.ok) return;
    expect(result.data.items[0]).toMatchObject({
      awb: 'EVS0000000018',
      reference_id: 'ORD-1',
      recipient_name: 'Asha',
      history: [{ action: 'Delivery attempt failed' }],
    });
    expect(result.data.items[0]!.reason).toContain('refused: NDR_REATTEMPT_REFUSED');
    expect(result.data.items[1]!.status).toBe('RTO_REQUESTED');
  });

  it('posts the decision and returns the updated case', async () => {
    const fetchMock = vi.fn(async () => Response.json(ndrCase('REATTEMPT_REQUESTED')));
    vi.stubGlobal('fetch', fetchMock);
    const result = await gatewayNdrService.takeNdrAction({
      ndr_id: 'n-1',
      action: 'REATTEMPT',
      preferred_date: '2026-11-25',
      instructions: ' Call first ',
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(new URL(url).pathname).toBe('/api/v1/ndr/n-1/action');
    expect(JSON.parse(String(init.body))).toEqual({
      action: 'REATTEMPT',
      preferred_date: '2026-11-25',
      instructions: 'Call first',
    });
    expect(result).toMatchObject({ ok: true, data: { status: 'REATTEMPT_REQUESTED' } });
  });
});

describe('ndrService resolution', () => {
  it('ndrService uses mock by default and gateway when set', () => {
    delete process.env.DATA_SOURCE_NDR;
    expect(ndrService()).toBe(mockNdrService);
    process.env.DATA_SOURCE_NDR = 'gateway';
    expect(ndrService()).toBe(gatewayNdrService);
    delete process.env.DATA_SOURCE_NDR;
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchOrderDetail, postCancel } from './gateway';
import { mockOrdersService } from './mock';

function stubGateway(...responses: { status: number; body: unknown }[]) {
  process.env.GATEWAY_URL = 'http://gateway.test';
  const fetchMock = vi.fn();
  for (const r of responses) {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(r.body), { status: r.status }));
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GATEWAY_URL;
});

describe('cancel through the gateway', () => {
  it('posts the reason with the session token and reports the request as sent', async () => {
    const fetchMock = stubGateway({
      status: 202,
      body: { shipment_id: 'x', awb: 'EVS6935467727', status: 'CANCEL_REQUESTED' },
    });
    const result = await postCancel('EVS6935467727', 'wrong address', 'evs_sess_token-value-1234');
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'http://gateway.test/api/v1/shipments/EVS6935467727/cancel',
    );
    expect(fetchMock.mock.calls[0]![1].headers.authorization).toBe(
      'Bearer evs_sess_token-value-1234',
    );
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ reason: 'wrong address' });
    expect(result).toEqual({ ok: true, source: 'gateway', data: { status: 'CANCEL_REQUESTED' } });
  });

  it("shows the courier's refusal as the gateway words it", async () => {
    const message = 'This shipment can no longer be cancelled (status: IN_TRANSIT).';
    stubGateway({ status: 409, body: { message } });
    expect(await postCancel('EVS6935467727', undefined, 'evs_sess_token-value-1234')).toMatchObject({
      ok: false,
      error: { kind: 'conflict', message },
    });
  });
});

describe('shipment detail from the gateway', () => {
  it('carries whether a label exists and whether a cancellation is pending or was refused', async () => {
    stubGateway(
      {
        status: 200,
        body: {
          id: '0f8fad5b-d9cb-469f-a165-70867728950e',
          awb: 'EVS6935467727',
          reference_id: 'ORDER-1',
          status: 'MANIFESTED',
          carrier: 'delhivery',
          payment_type: 'PREPAID',
          created_at: '2026-11-19T18:12:40.000Z',
          last_status_at: '2026-11-19T18:12:40.000Z',
          stuck: false,
          origin: { name: 'EVOC LABS 1 B2C' },
          destination: { name: 'Amit Patel' },
          weight_kg: 0.5,
          dimensions: { length_cm: 10, width_cm: 10, height_cm: 10 },
          items: [{ name: 'Wireless Headphones', quantity: 1, unit_price: 1999 }],
          cod_amount: 0,
          label_available: true,
          cancel_requested: false,
          cancel_error: 'CANCEL_NOT_ALLOWED: already picked up',
        },
      },
      { status: 200, body: { timeline: [] } },
    );
    const result = await fetchOrderDetail('EVS6935467727', 'evs_sess_token-value-1234');
    expect(result).toMatchObject({
      ok: true,
      data: {
        awb: 'EVS6935467727',
        label_available: true,
        cancel_requested: false,
        cancel_error: 'CANCEL_NOT_ALLOWED: already picked up',
        total_amount_paise: 199900,
      },
    });
  });
});

describe('cancel in sample mode', () => {
  it('cancels a sample shipment that has not moved, and refuses one in transit', async () => {
    const list = await mockOrdersService.listOrders({ limit: 100 });
    if (!list.ok) throw new Error('sample list failed');
    const manifested = list.data.items.find((o) => o.status === 'MANIFESTED');
    const moving = list.data.items.find((o) => o.status === 'IN_TRANSIT');
    if (manifested) {
      expect(await mockOrdersService.cancelShipment(manifested.shipment_id)).toMatchObject({
        ok: true,
        source: 'mock',
        data: { status: 'CANCELLED' },
      });
    }
    if (moving) {
      expect(await mockOrdersService.cancelShipment(moving.shipment_id)).toMatchObject({
        ok: false,
        error: { kind: 'conflict' },
      });
    }
    expect(await mockOrdersService.cancelShipment('no-such-shipment')).toMatchObject({
      ok: false,
      error: { kind: 'not_found' },
    });
  });
});

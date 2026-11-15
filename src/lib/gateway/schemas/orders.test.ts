import { describe, expect, it } from 'vitest';
import { normaliseOrdersPage, ShipmentListResponseSchema, ShipmentRecordSchema } from './orders';

describe('ShipmentRecordSchema', () => {
  it('validates a valid shipment record from gateway', () => {
    const raw = {
      shipment_id: '10000000-0000-4000-8000-000000000001',
      reference_id: 'DEMO-001',
      carrier: 'ekart',
      awb: 'DEMOEK001',
      status: 'IN_TRANSIT',
      created_at: '2026-10-23T08:00:00.000Z',
      last_status_at: '2026-10-23T10:00:00.000Z',
      stuck: false,
    };
    const parsed = ShipmentRecordSchema.parse(raw);
    expect(parsed).toEqual(raw);
  });

  it('rejects an invalid record missing awb', () => {
    const raw = {
      shipment_id: '10000000-0000-4000-8000-000000000001',
      carrier: 'ekart',
      status: 'IN_TRANSIT',
    };
    expect(() => ShipmentRecordSchema.parse(raw)).toThrow();
  });
});

describe('ShipmentListResponseSchema', () => {
  it('validates a valid paginated list response', () => {
    const raw = {
      items: [
        {
          shipment_id: '10000000-0000-4000-8000-000000000001',
          reference_id: 'DEMO-001',
          carrier: 'ekart',
          awb: 'DEMOEK001',
          status: 'IN_TRANSIT',
          created_at: '2026-10-23T08:00:00.000Z',
          last_status_at: '2026-10-23T10:00:00.000Z',
          stuck: false,
        },
      ],
      page: 1,
      limit: 50,
      total: 1,
    };
    const parsed = ShipmentListResponseSchema.parse(raw);
    expect(parsed.total).toBe(1);
    expect(parsed.items).toHaveLength(1);
  });
});


describe('normaliseOrdersPage', () => {
  it('keeps the gateway demo shape as it is', () => {
    const raw = {
      items: [
        {
          shipment_id: 's-1',
          reference_id: 'DEMO-001',
          carrier: 'ekart',
          awb: 'DEMOEK001',
          status: 'IN_TRANSIT',
          created_at: '2026-10-23T08:00:00.000Z',
          last_status_at: '2026-10-23T10:00:00.000Z',
          stuck: false,
        },
      ],
      page: 1,
      limit: 50,
      total: 1,
    };
    expect(normaliseOrdersPage(raw)).toEqual(raw);
  });

  it("turns order-engine's { shipments, pagination } into the same shape", () => {
    const page = normaliseOrdersPage({
      shipments: [
        {
          id: 's-2',
          merchant_id: 'm-1',
          reference_id: null,
          carrier: 'delhivery',
          awb: null,
          status: 'CREATE_REQUESTED',
          created_at: '2026-11-01T08:00:00.000Z',
          updated_at: '2026-11-01T09:00:00.000Z',
        },
      ],
      pagination: { page: 2, limit: 20, total: 21, total_pages: 2 },
    });
    expect(page).toEqual({
      items: [
        {
          shipment_id: 's-2',
          reference_id: '',
          carrier: 'delhivery',
          awb: '',
          status: 'CREATE_REQUESTED',
          created_at: '2026-11-01T08:00:00.000Z',
          last_status_at: '2026-11-01T09:00:00.000Z',
          stuck: false,
        },
      ],
      page: 2,
      limit: 20,
      total: 21,
    });
  });

  it('rejects a body in neither shape', () => {
    expect(() => normaliseOrdersPage({ data: [] })).toThrow();
  });
});

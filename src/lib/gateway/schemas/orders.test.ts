import { describe, expect, it } from 'vitest';
import { ShipmentListResponseSchema, ShipmentRecordSchema } from './orders';

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


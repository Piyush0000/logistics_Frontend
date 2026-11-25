import { describe, expect, it } from 'vitest';
import { countPendingApplications } from '../onboarding';
import { mockAdminOverviewService } from './mock';

describe('mockAdminOverviewService', () => {
  it('returns platform overview with synchronized counts', async () => {
    const result = await mockAdminOverviewService.getOverview();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.source).toBe('mock');
    expect(result.data.merchants.total).toBe(8);
    expect(result.data.merchants.pendingKyc).toBe(countPendingApplications());
    expect(result.data.shipments.stuck).toBe(2);

    // Attention items
    const kycAttention = result.data.attention.find((a) => a.id === 'kyc');
    expect(kycAttention).toBeDefined();
    expect(kycAttention?.href).toBe('/admin/onboarding?status=pending');

    const stuckAttention = result.data.attention.find((a) => a.id === 'stuck');
    expect(stuckAttention).toBeDefined();
    expect(stuckAttention?.href).toBe('/admin/shipments?stuck=1');

    const ticketAttention = result.data.attention.find((a) => a.id === 'tickets');
    expect(ticketAttention).toBeDefined();
    expect(ticketAttention?.href).toBe('/admin/support?priority=high');

    // 14 days of chart data
    expect(result.data.shipmentsByDay).toHaveLength(14);

    // Pipeline numbers
    expect(result.data.pipeline.inTransit).toBeGreaterThan(0);
    expect(result.data.pipeline.outForDelivery).toBeGreaterThan(0);
  });
});


describe('courier account alerts', () => {
  it('puts a courier refusing bookings for our account first, with what it said', async () => {
    const { attentionFor } = await import('./gateway');
    const items = attentionFor({
      merchants: { total: 1, active: 1, pending_kyc: 1, suspended: 0 },
      shipments: { today: 0, in_transit: 0, delivered_30d: 0, rto_30d: 0, stuck: 0, failed: 2 },
      money: { wallet_float_paise: 0, negative_wallets: 0, cod_outstanding_paise: 0, charged_30d_paise: 0 },
      shipments_by_day: [],
      courier_alerts: [
        {
          carrier: 'delhivery',
          failures: 2,
          last_at: '2026-11-25T17:21:50.000Z',
          last_error: 'Prepaid client manifest charge API failed due to insufficient balance',
        },
      ],
      pipeline: { to_process: 0, in_transit: 0, out_for_delivery: 0, returning: 0 },
    });
    expect(items[0]).toMatchObject({
      id: 'courier-delhivery',
      tone: 'error',
      title: 'Delhivery refused 2 bookings in the last day: check your Delhivery account',
    });
    expect(items[0]?.detail).toContain('insufficient balance');
    expect(items.map((i) => i.id)).toContain('kyc');
  });
});

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


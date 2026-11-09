import { describe, expect, it } from 'vitest';
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

describe('ndrService resolution', () => {
  it('defaults to mock service', () => {
    const service = ndrService();
    expect(service).toBe(mockNdrService);
  });
});

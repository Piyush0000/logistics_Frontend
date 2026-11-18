import { describe, expect, it } from 'vitest';
import { adminShipmentsService } from './index';

describe('adminShipmentsService', () => {
  it('lists all shipments with pagination', async () => {
    const service = adminShipmentsService();
    const result = await service.listShipments({});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items.length).toBe(10);
    expect(result.data.total).toBe(36);
  });

  it('filters shipments by search query (AWB or merchant name)', async () => {
    const service = adminShipmentsService();
    const result = await service.listShipments({ q: 'EVC240000' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items.length).toBeGreaterThan(0);
    expect(result.data.items[0]!.awb).toBe('EVC240000');
  });

  it('filters shipments by status', async () => {
    const service = adminShipmentsService();
    const result = await service.listShipments({ status: 'DELIVERED' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items.every((s) => s.status === 'DELIVERED')).toBe(true);
  });

  it('filters stuck shipments only', async () => {
    const service = adminShipmentsService();
    const result = await service.listShipments({ stuck: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items.length).toBeGreaterThan(0);
    expect(result.data.items.every((s) => s.stuck)).toBe(true);
  });

  it('filters shipments by merchantId', async () => {
    const service = adminShipmentsService();
    const result = await service.listShipments({ merchantId: 'mer_001' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items.every((s) => s.merchantId === 'mer_001')).toBe(true);
  });

  it('retrieves single shipment detail with timeline events', async () => {
    const service = adminShipmentsService();
    const result = await service.getShipment('EVC240000');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.awb).toBe('EVC240000');
    expect(result.data.timeline.length).toBeGreaterThan(0);
    expect(result.data.origin).toBeTruthy();
    expect(result.data.destination).toBeTruthy();
    expect(result.data.recipientName).toBeTruthy();
  });

  it('returns 404 for unknown AWB', async () => {
    const service = adminShipmentsService();
    const result = await service.getShipment('NON_EXISTENT_AWB_999');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('not_found');
    }
  });

  it('lists NDR shipments with reasons and attempts', async () => {
    const service = adminShipmentsService();
    const result = await service.listNdrShipments();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items.length).toBeGreaterThan(0);
    expect(result.data.items[0]!.ndrReason).toBeTruthy();
    expect(result.data.items[0]!.attemptsCount).toBeGreaterThan(0);
  });

  it('lists RTO shipments with reasons', async () => {
    const service = adminShipmentsService();
    const result = await service.listRtoShipments();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items.length).toBeGreaterThan(0);
    expect(result.data.items[0]!.rtoReason).toBeTruthy();
  });
});

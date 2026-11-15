import { beforeEach, describe, expect, it } from 'vitest';
import { adminMerchantsService, resetMockMerchants } from './index';

describe('admin merchants data service', () => {
  beforeEach(() => {
    resetMockMerchants();
  });

  it('lists merchants sorted by joinedAt descending', async () => {
    const res = await adminMerchantsService().listMerchants({});
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.items.length).toBeGreaterThan(0);
    expect(res.data.total).toBe(res.data.items.length);

    // Verify sort order
    for (let i = 1; i < res.data.items.length; i++) {
      expect(res.data.items[i - 1]!.joinedAt.localeCompare(res.data.items[i]!.joinedAt)).toBeGreaterThanOrEqual(0);
    }
  });

  it('filters merchants by search query', async () => {
    const res = await adminMerchantsService().listMerchants({ q: 'Jaipur' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.items.length).toBeGreaterThan(0);
    expect(res.data.items.every((m) => m.city.toLowerCase().includes('jaipur'))).toBe(true);
  });

  it('filters merchants by status', async () => {
    const res = await adminMerchantsService().listMerchants({ status: 'suspended' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.items.length).toBeGreaterThan(0);
    expect(res.data.items.every((m) => m.status === 'suspended')).toBe(true);
  });

  it('returns an empty page when no merchants match', async () => {
    const res = await adminMerchantsService().listMerchants({ q: 'non-existent-search-term-xyz' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.items).toEqual([]);
    expect(res.data.total).toBe(0);
  });

  it('gets merchant detail by id', async () => {
    const res = await adminMerchantsService().getMerchant('mer_001');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.id).toBe('mer_001');
    expect(res.data.phone).toBeTruthy();
    expect(res.data.gstin).toBe('08AAACK1234F1Z5');
    expect(res.data.shipmentsByStatus.length).toBeGreaterThan(0);
  });

  it('returns 404 not found for an unknown merchant', async () => {
    const res = await adminMerchantsService().getMerchant('mer_unknown');
    expect(res.ok).toBe(false);
    if (res.ok) return;

    expect(res.error.kind).toBe('not_found');
    expect(res.error.status).toBe(404);
  });

  it('rejects setMerchantStatus with a reason that is too short or too long', async () => {
    const short = await adminMerchantsService().setMerchantStatus('mer_001', 'suspended', 'bad');
    expect(short.ok).toBe(false);
    if (!short.ok) {
      expect(short.error.kind).toBe('validation');
      expect(short.error.message).toContain('between 5 and 300');
    }

    const long = await adminMerchantsService().setMerchantStatus('mer_001', 'suspended', 'a'.repeat(301));
    expect(long.ok).toBe(false);
    if (!long.ok) {
      expect(long.error.kind).toBe('validation');
    }
  });

  it('rejects setMerchantStatus for an unknown merchant id', async () => {
    const res = await adminMerchantsService().setMerchantStatus('mer_unknown', 'suspended', 'Valid reason here');
    expect(res.ok).toBe(false);
    if (res.ok) return;

    expect(res.error.kind).toBe('not_found');
  });

  it('suspends and reactivates a merchant and updates mock store', async () => {
    // Suspend mer_001
    const suspendRes = await adminMerchantsService().setMerchantStatus(
      'mer_001',
      'suspended',
      'Account under compliance review',
    );
    expect(suspendRes.ok).toBe(true);
    if (!suspendRes.ok) return;

    expect(suspendRes.data.status).toBe('suspended');
    expect(suspendRes.data.notes[0]).toContain('Suspended: Account under compliance review');

    // Merchant list should reflect the suspended status
    const listRes = await adminMerchantsService().listMerchants({ status: 'suspended' });
    expect(listRes.ok).toBe(true);
    if (!listRes.ok) return;
    expect(listRes.data.items.some((m) => m.id === 'mer_001')).toBe(true);

    // Reactivate mer_001
    const reactivateRes = await adminMerchantsService().setMerchantStatus(
      'mer_001',
      'active',
      'Compliance documents verified',
    );
    expect(reactivateRes.ok).toBe(true);
    if (!reactivateRes.ok) return;

    expect(reactivateRes.data.status).toBe('active');
    expect(reactivateRes.data.notes[0]).toContain('Reactivated: Compliance documents verified');
  });

  it('suspending twice is harmless', async () => {
    const first = await adminMerchantsService().setMerchantStatus('mer_004', 'suspended', 'First suspension note');
    expect(first.ok).toBe(true);

    const second = await adminMerchantsService().setMerchantStatus('mer_004', 'suspended', 'Second suspension note');
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.data.status).toBe('suspended');
    }
  });
});


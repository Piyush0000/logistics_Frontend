import 'server-only';

import { fromMock } from '../../../data/source';
import { matchesQuery, paginate } from '../common';
import { mockNotFound } from '../not-found';
import { SEED_MERCHANTS, type SeedMerchant } from '../seed';
import type { AdminMerchantsService, MerchantDetail, MerchantSummary } from './types';

// Per-merchant figures for the sample data, keyed by merchant id.
const FIGURES: Record<string, { shipments30d: number; walletPaise: number; phone: string; gstin: string | null }> = {
  mer_001: { shipments30d: 1_284, walletPaise: 4_250_000, phone: '+919812300001', gstin: '08AAACK1234F1Z5' },
  mer_002: { shipments30d: 642, walletPaise: 1_180_000, phone: '+919812300002', gstin: '33AAACN2345G1Z2' },
  mer_003: { shipments30d: 2_910, walletPaise: 9_640_000, phone: '+919812300003', gstin: '29AAACU3456H1Z9' },
  mer_004: { shipments30d: 88, walletPaise: -120_000, phone: '+919812300004', gstin: '27AAACS4567J1Z1' },
  mer_005: { shipments30d: 1_506, walletPaise: 2_310_000, phone: '+919812300005', gstin: '07AAACP5678K1Z4' },
  mer_006: { shipments30d: 0, walletPaise: 0, phone: '+919812300006', gstin: '32AAACC6789L1Z7' },
  mer_007: { shipments30d: 0, walletPaise: 50_000, phone: '+919812300007', gstin: null },
  mer_008: { shipments30d: 0, walletPaise: 0, phone: '+919812300008', gstin: null },
};

function summary(merchant: SeedMerchant): MerchantSummary {
  const figures = FIGURES[merchant.id]!;
  return { ...merchant, shipments30d: figures.shipments30d, walletPaise: figures.walletPaise };
}

function detail(merchant: SeedMerchant): MerchantDetail {
  const base = summary(merchant);
  const figures = FIGURES[merchant.id]!;
  const n = base.shipments30d;
  return {
    ...base,
    phone: figures.phone,
    gstin: figures.gstin,
    shipmentsByStatus:
      n === 0
        ? []
        : [
            { status: 'DELIVERED', count: Math.round(n * 0.78) },
            { status: 'IN_TRANSIT', count: Math.round(n * 0.12) },
            { status: 'RTO_INITIATED', count: Math.round(n * 0.06) },
            { status: 'FAILED', count: Math.round(n * 0.04) },
          ],
    notes: merchant.status === 'suspended' ? ['Suspended: wallet below zero for 14 days.'] : [],
  };
}

export const mockAdminMerchantsService: AdminMerchantsService = {
  async listMerchants({ q, status, page }) {
    const rows = SEED_MERCHANTS.filter(
      (merchant) =>
        (!status || merchant.status === status) && matchesQuery(q, merchant.name, merchant.email, merchant.city, merchant.id),
    )
      .map(summary)
      .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
    return fromMock(paginate(rows, page));
  },

  async getMerchant(id) {
    const merchant = SEED_MERCHANTS.find((entry) => entry.id === id);
    return merchant ? fromMock(detail(merchant)) : mockNotFound('Merchant');
  },
};

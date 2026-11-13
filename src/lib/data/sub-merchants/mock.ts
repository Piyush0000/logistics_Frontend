import 'server-only';

import type { ApiError } from '../../gateway/errors';
import type { KycStatus } from '../../kyc';
import { fromMock, type DataResult } from '../source';
import { parseSubMerchantInput } from './input';
import { SUB_MERCHANT_PAGE_SIZE, type SubMerchant, type SubMerchantService } from './types';

// Invented sellers. Dates are fixed so the seeded rows never change between runs.
const NAMES = [
  'Kaveri Handloom',
  'Lotus Leaf Organics',
  'Maple Street Candles',
  'Nilgiri Tea House',
  'Orchid Crafts',
  'Pearl Bay Jewels',
  'Quill and Co',
  'Rangoli Home Decor',
  'Saffron Spice Traders',
  'Tulsi Naturals',
  'Urban Loom',
  'Vedic Wellness Store',
];
const KYC: KycStatus[] = ['verified', 'verified', 'submitted', 'verified', 'rejected', 'not_started'];

const SEED: SubMerchant[] = NAMES.map((name, i) => ({
  id: `sm_${i + 1}`,
  name,
  email: `seller${i + 1}@example.com`,
  gstin: i % 3 === 2 ? null : `27AAPFU${1000 + i}F1ZV`,
  kycStatus: KYC[i % KYC.length] ?? 'submitted',
  bankLast4: String(1200 + i * 37),
  createdAt: `2026-03-${String(i + 1).padStart(2, '0')}T09:30:00+05:30`,
}));

function fail<T>(kind: ApiError['kind'], status: number, message: string): DataResult<T> {
  return { ok: false, source: 'mock', error: { kind, status, message } };
}

/** Sellers kept in memory. The shared instance is what the app uses; tests make their own. */
export function createMockSubMerchantService(seed: SubMerchant[] = SEED): SubMerchantService {
  let items: SubMerchant[] = seed.map((s) => ({ ...s }));
  let nextId = items.length + 1;

  return {
    async list({ page, search }) {
      const needle = search.trim().toLowerCase();
      const matches = items.filter((s) => !needle || s.name.toLowerCase().includes(needle));
      // Reverse first so rows with equal dates keep newest-inserted first; sort is stable.
      const sorted = [...matches].reverse().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const pageCount = Math.max(1, Math.ceil(sorted.length / SUB_MERCHANT_PAGE_SIZE));
      const current = Math.min(Math.max(page, 1), pageCount);
      const start = (current - 1) * SUB_MERCHANT_PAGE_SIZE;
      return fromMock({
        items: sorted.slice(start, start + SUB_MERCHANT_PAGE_SIZE).map((s) => ({ ...s })),
        page: current,
        pageCount,
        total: sorted.length,
      });
    },

    async onboard(input) {
      const parsed = parseSubMerchantInput(input);
      if (!parsed.ok) return fail<SubMerchant>('validation', 400, parsed.message);
      const { value } = parsed;
      if (items.some((s) => s.email === value.email)) {
        return fail<SubMerchant>('conflict', 409, 'A seller with this email is already onboarded.');
      }
      if (value.gstin && items.some((s) => s.gstin === value.gstin)) {
        return fail<SubMerchant>('conflict', 409, 'A seller with this GSTIN is already onboarded.');
      }
      const seller: SubMerchant = {
        id: `sm_${nextId++}`,
        name: value.name,
        email: value.email,
        gstin: value.gstin,
        kycStatus: 'submitted',
        bankLast4: value.bank.account.slice(-4),
        createdAt: new Date().toISOString(),
      };
      items = [...items, seller];
      return fromMock({ ...seller });
    },
  };
}

export const mockSubMerchantService: SubMerchantService = createMockSubMerchantService();

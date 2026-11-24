import 'server-only';

import { fromMock, type DataResult } from '../../../data/source';
import { mockNotFound } from '../not-found';
import { daysAgo, SEED_CARRIERS, seedMerchant } from '../seed';
import { cleanText, isCodMinimum, isCodPercent, isDiscount, isPrice, ZONES } from './pricing-rules';
import type { AdminPricingService, CourierSetting, PriceOverride, RateCardRow } from './types';

const NAMES: Record<string, string> = {
  delhivery: 'Delhivery',
  ekart: 'Ekart',
  bluedart: 'Blue Dart',
  shadowfax: 'Shadowfax',
  dhl: 'DHL',
};

// Base prices for zone A per courier, in paise; each later zone adds a step.
const BASE: Record<string, number> = { delhivery: 3_200, ekart: 2_900, bluedart: 4_600, shadowfax: 2_700, dhl: 6_800 };
const ZONE_STEP = [0, 600, 1_400, 2_300, 3_500];

const failure = (kind: 'validation' | 'conflict', message: string): DataResult<never> => ({
  ok: false,
  source: 'mock',
  error: { kind, status: kind === 'validation' ? 400 : 409, message },
});

/** A fresh sample service. Changes last until the server restarts. */
export function createMockAdminPricingService(): AdminPricingService {
  const rateCard: RateCardRow[] = SEED_CARRIERS.flatMap((carrier) =>
    ZONES.map((zone, index) => ({
      carrier,
      zone,
      basePaise: BASE[carrier]! + ZONE_STEP[index]!,
      extraPer500gPaise: Math.round((BASE[carrier]! + ZONE_STEP[index]!) * 0.6),
      codPercent: carrier === 'dhl' ? 2.5 : 1.75,
      codMinimumPaise: carrier === 'dhl' ? 5_000 : 3_500,
    })),
  );
  const couriers: CourierSetting[] = SEED_CARRIERS.map((carrier, index) => ({
    carrier,
    name: NAMES[carrier]!,
    enabled: carrier !== 'dhl',
    running: true,
    deliveryRate: [94.2, 91.8, 96.1, 89.4, 97.3][index]!,
  }));
  const overrides: PriceOverride[] = [
    {
      id: 'ovr_001',
      merchantId: 'mer_003',
      merchantName: seedMerchant('mer_003')!.name,
      carrier: 'all',
      discountPercent: 8,
      reason: 'Over 2,500 shipments a month.',
      createdAt: daysAgo(20),
    },
    {
      id: 'ovr_002',
      merchantId: 'mer_001',
      merchantName: seedMerchant('mer_001')!.name,
      carrier: 'delhivery',
      discountPercent: 5,
      reason: 'Matched a competing quote for Delhivery.',
      createdAt: daysAgo(6),
    },
  ];
  let nextOverride = overrides.length + 1;

  return {
    async listRateCard() {
      return fromMock(rateCard.map((row) => ({ ...row })));
    },

    async listCouriers() {
      return fromMock(couriers.map((courier) => ({ ...courier })));
    },

    async setCourierEnabled(carrier, enabled) {
      const courier = couriers.find((entry) => entry.carrier === carrier);
      if (!courier) return mockNotFound('Courier');
      if (!enabled && courier.enabled && couriers.filter((entry) => entry.enabled).length === 1) {
        return failure('conflict', `${courier.name} is the only courier on. At least one courier must stay on, so turn another on first.`);
      }
      courier.enabled = enabled;
      return fromMock({ ...courier });
    },

    async updateRate(change) {
      const row = rateCard.find((entry) => entry.carrier === change.carrier && entry.zone === change.zone);
      if (!row) return mockNotFound('Rate card row');
      if (!isPrice(change.basePaise) || !isPrice(change.extraPer500gPaise) || !isCodPercent(change.codPercent) || !isCodMinimum(change.codMinimumPaise)) {
        return failure('validation', 'A price is outside the allowed limits.');
      }
      const before = { ...row };
      Object.assign(row, {
        basePaise: change.basePaise,
        extraPer500gPaise: change.extraPer500gPaise,
        codPercent: change.codPercent,
        codMinimumPaise: change.codMinimumPaise,
      });
      return fromMock({ before, after: { ...row } });
    },

    async listOverrides() {
      return fromMock(overrides.map((entry) => ({ ...entry })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    },

    async addOverride({ merchantId, carrier, discountPercent, reason }) {
      const merchant = seedMerchant(merchantId);
      if (!merchant) return mockNotFound('Merchant');
      if (carrier !== 'all' && !couriers.some((entry) => entry.carrier === carrier)) return mockNotFound('Courier');
      if (!isDiscount(discountPercent)) return failure('validation', 'The discount is outside the allowed limits.');
      const clean = cleanText(reason);
      if (clean.length < 5 || clean.length > 300) return failure('validation', 'The reason is too short or too long.');
      if (overrides.some((entry) => entry.merchantId === merchantId && entry.carrier === carrier)) {
        return failure('conflict', `${merchant.name} already has a custom price for ${carrier === 'all' ? 'all couriers' : NAMES[carrier]}. Remove it first.`);
      }
      const entry: PriceOverride = {
        id: `ovr_${String(nextOverride++).padStart(3, '0')}`,
        merchantId,
        merchantName: merchant.name,
        carrier,
        discountPercent,
        reason: clean,
        createdAt: new Date().toISOString(),
      };
      overrides.push(entry);
      return fromMock({ ...entry });
    },

    async removeOverride(id) {
      const index = overrides.findIndex((entry) => entry.id === id);
      if (index < 0) return mockNotFound('Override');
      const [removed] = overrides.splice(index, 1);
      return fromMock({ ...removed! });
    },
  };
}

// Kept on globalThis so every page and server action in this server sees the same prices.
const shared = globalThis as typeof globalThis & { evocMockAdminPricing?: AdminPricingService };

// The kept service outlives hot reloads in `pnpm dev`. When the code gains or loses a method, start a
// fresh one instead of serving the old shape ("… is not a function" until the server restarts).
let methods: string | undefined;
const methodsOf = (service: object) => Object.keys(service).sort().join();

export function mockAdminPricingService(): AdminPricingService {
  if (shared.evocMockAdminPricing) {
    methods ??= methodsOf(createMockAdminPricingService());
    if (methodsOf(shared.evocMockAdminPricing) === methods) return shared.evocMockAdminPricing;
  }
  shared.evocMockAdminPricing = createMockAdminPricingService();
  return shared.evocMockAdminPricing;
}

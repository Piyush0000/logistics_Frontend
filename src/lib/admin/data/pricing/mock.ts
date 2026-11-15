import 'server-only';

import { fromMock } from '../../../data/source';
import { SEED_CARRIERS } from '../seed';
import { ZONES, type AdminPricingService, type CourierSetting, type RateCardRow } from './types';

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

const RATE_CARD: RateCardRow[] = SEED_CARRIERS.flatMap((carrier) =>
  ZONES.map((zone, index) => ({
    carrier,
    zone,
    basePaise: BASE[carrier]! + ZONE_STEP[index]!,
    extraPer500gPaise: Math.round((BASE[carrier]! + ZONE_STEP[index]!) * 0.6),
    codPercent: carrier === 'dhl' ? 2.5 : 1.75,
    codMinimumPaise: carrier === 'dhl' ? 5_000 : 3_500,
  })),
);

const COURIERS: CourierSetting[] = SEED_CARRIERS.map((carrier, index) => ({
  carrier,
  name: NAMES[carrier]!,
  enabled: carrier !== 'dhl',
  deliveryRate: [94.2, 91.8, 96.1, 89.4, 97.3][index]!,
}));

export const mockAdminPricingService: AdminPricingService = {
  async listRateCard() {
    return fromMock(RATE_CARD);
  },
  async listCouriers() {
    return fromMock(COURIERS);
  },
};

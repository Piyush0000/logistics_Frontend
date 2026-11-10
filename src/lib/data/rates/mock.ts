import { CARRIERS, type CarrierName } from '@logicore/contracts';
import { chargeableWeightKg } from '@/lib/volumetric';
import { fromMock } from '../source';
import { priceInPaise, resolveZone } from './quote';
import { ZONES, type RateCardRow, type RateQuote, type RatesService, type Zone } from './types';

interface CarrierRates {
  /** Base price and each extra 500 g, in paise, for zones A to E. */
  base: Record<Zone, number>;
  extra: Record<Zone, number>;
  codFeePercent: number;
  minCodFeePaise: number;
}

// Sample prices copied from the backend's seed rates, which have no zone E or Blue Dart. Those are invented.
const RATES: Record<CarrierName, CarrierRates> = {
  delhivery: { base: { A: 3500, B: 4000, C: 4500, D: 5500, E: 6600 }, extra: { A: 1200, B: 1500, C: 1700, D: 2200, E: 2600 }, codFeePercent: 2, minCodFeePaise: 1000 },
  shadowfax: { base: { A: 3000, B: 3800, C: 4200, D: 5800, E: 7000 }, extra: { A: 1000, B: 1400, C: 1800, D: 2400, E: 2900 }, codFeePercent: 2, minCodFeePaise: 1000 },
  bluedart: { base: { A: 5000, B: 5600, C: 6200, D: 7400, E: 8900 }, extra: { A: 1800, B: 2100, C: 2400, D: 3000, E: 3600 }, codFeePercent: 2.25, minCodFeePaise: 1200 },
  dhl: { base: { A: 7500, B: 8000, C: 8500, D: 9500, E: 11400 }, extra: { A: 3000, B: 3200, C: 3500, D: 4000, E: 4800 }, codFeePercent: 2.5, minCodFeePaise: 1500 },
  ekart: { base: { A: 3200, B: 3900, C: 4400, D: 5400, E: 6500 }, extra: { A: 1100, B: 1400, C: 1600, D: 2100, E: 2500 }, codFeePercent: 2, minCodFeePaise: 1000 },
};

/** One row for every carrier and zone, carriers in `CARRIERS` order. */
export const SAMPLE_RATE_CARD: RateCardRow[] = CARRIERS.flatMap((carrier) =>
  ZONES.map((zone) => ({
    carrier,
    zone,
    baseWeightKg: 0.5,
    basePaise: RATES[carrier].base[zone],
    additionalPer500gPaise: RATES[carrier].extra[zone],
    codFeePercent: RATES[carrier].codFeePercent,
    minCodFeePaise: RATES[carrier].minCodFeePaise,
  })),
);

// Sample reach: some couriers do not deliver to these destination pincode prefixes (north-east, Jammu and Kashmir).
const NO_DELIVERY_PREFIXES: Partial<Record<CarrierName, string[]>> = {
  shadowfax: ['78', '79'],
  ekart: ['19'],
};
// The backend's DHL adapter has no cash on delivery.
const NO_COD: CarrierName[] = ['dhl'];
// Sample delivery days for zones A to E, plus a day for the slower couriers.
const ZONE_DAYS: Record<Zone, number> = { A: 1, B: 2, C: 3, D: 4, E: 6 };
const EXTRA_DAYS: Partial<Record<CarrierName, number>> = { shadowfax: 1, ekart: 1 };

export const mockRatesService: RatesService = {
  async getRateCard() {
    return fromMock(SAMPLE_RATE_CARD.map((row) => ({ ...row })));
  },

  async quote(input) {
    const zone = resolveZone(input.originPincode, input.destinationPincode);
    const chargeableKg = chargeableWeightKg(input.weightKg, input.dimensions);
    const isCod = input.paymentType === 'COD';

    const quotes: RateQuote[] = CARRIERS.map((carrier) => {
      const codAvailable = !NO_COD.includes(carrier);
      const reaches = !(NO_DELIVERY_PREFIXES[carrier] ?? []).some((prefix) => input.destinationPincode.startsWith(prefix));
      const serviceable = reaches && (codAvailable || !isCod);
      const row = SAMPLE_RATE_CARD.find((r) => r.carrier === carrier && r.zone === zone);
      if (!serviceable || !row) {
        return { carrier, serviceable: false, codAvailable, estimatedDays: null, chargePaise: null, chargeableWeightKg: chargeableKg };
      }
      return {
        carrier,
        serviceable: true,
        codAvailable,
        estimatedDays: ZONE_DAYS[zone] + (EXTRA_DAYS[carrier] ?? 0),
        chargePaise: priceInPaise(row, chargeableKg, isCod ? input.codAmountPaise ?? 0 : undefined),
        chargeableWeightKg: chargeableKg,
      };
    });
    return fromMock(quotes);
  },
};

import 'server-only';

import { addDays } from '../../format/calendar';
import { indianDay } from '../../format/date';
import type { ApiError } from '../../gateway/errors';
import { fromMock, type DataResult } from '../source';
import { checkDispute, isResponseWindowClosed } from './input';
import {
  WEIGHT_PAGE_SIZE,
  type DiscrepancyStatus,
  type WeightDiscrepancy,
  type WeightService,
} from './types';

const TODAY = indianDay(new Date());
const COURIERS = ['delhivery', 'ekart', 'bluedart', 'shadowfax', 'dhl'];

interface Seed {
  awb?: string;
  status: DiscrepancyStatus;
  /** Days from today to the last day the merchant can answer. Negative means the window has closed. */
  days: number;
  declaredKg: number;
  chargedKg: number;
  extraChargePaise: number;
}

/**
 * Open rows at the end of the list for browser tests to accept or dispute. Answering a row is
 * permanent, and every test run on one server shares this store, so each run answers a row of
 * its own (see e2e/weight.spec.ts). wd-015 to wd-038.
 */
export const ANSWERABLE_TEST_ROWS = 24;

// Newest first. wd-001 has a 20-character AWB and an extra charge above one crore rupees, so
// screens are tested with long values. Invented figures, none of them real.
const SEEDS: Seed[] = [
  { awb: 'DEMOLONGAWBWEIGHT001', status: 'open', days: 6, declaredKg: 0.5, chargedKg: 12_500, extraChargePaise: 1_00_00_000_00 },
  { status: 'open', days: 6, declaredKg: 0.5, chargedKg: 1, extraChargePaise: 4_800 },
  { status: 'open', days: 5, declaredKg: 1, chargedKg: 1.5, extraChargePaise: 5_900 },
  { status: 'open', days: 5, declaredKg: 2, chargedKg: 3, extraChargePaise: 9_600 },
  { status: 'open', days: 4, declaredKg: 0.25, chargedKg: 0.5, extraChargePaise: 3_700 },
  { status: 'open', days: 3, declaredKg: 1.2, chargedKg: 2, extraChargePaise: 7_400 },
  { status: 'open', days: -2, declaredKg: 0.8, chargedKg: 1.5, extraChargePaise: 6_200 },
  { status: 'open', days: -6, declaredKg: 3, chargedKg: 5, extraChargePaise: 18_500 },
  { status: 'disputed', days: 2, declaredKg: 1, chargedKg: 2, extraChargePaise: 8_100 },
  { status: 'disputed', days: -1, declaredKg: 0.4, chargedKg: 0.9, extraChargePaise: 4_300 },
  { status: 'accepted', days: -3, declaredKg: 1.5, chargedKg: 2, extraChargePaise: 5_200 },
  { status: 'accepted', days: -8, declaredKg: 2.5, chargedKg: 4, extraChargePaise: 12_900 },
  { status: 'resolved', days: -10, declaredKg: 0.6, chargedKg: 1, extraChargePaise: 3_100 },
  { status: 'resolved', days: -14, declaredKg: 5, chargedKg: 6, extraChargePaise: 7_800 },
  ...Array.from({ length: ANSWERABLE_TEST_ROWS }, (_, n): Seed => {
    const declaredKg = 0.5 + (n % 4) * 0.5;
    return {
      status: 'open',
      days: 4 + (n % 3),
      declaredKg,
      chargedKg: declaredKg + 0.5 + (n % 2) * 0.5,
      extraChargePaise: 4_000 + n * 150,
    };
  }),
];

export const SAMPLE_DISCREPANCIES: WeightDiscrepancy[] = SEEDS.map((seed, index) => {
  const number = String(index + 1).padStart(3, '0');
  return {
    id: `wd-${number}`,
    awb: seed.awb ?? `DEMOWT${number}`,
    carrier: COURIERS[index % COURIERS.length]!,
    declaredKg: seed.declaredKg,
    chargedKg: seed.chargedKg,
    extraChargePaise: seed.extraChargePaise,
    status: seed.status,
    // Newest first: each row was raised a little earlier than the one above it.
    raisedAt: new Date(Date.UTC(2026, 10, 10, 6, 0) - index * 20 * 60 * 60 * 1000).toISOString(),
    respondBy: addDays(TODAY, seed.days),
  };
});

const store: WeightDiscrepancy[] = SAMPLE_DISCREPANCIES.map((row) => ({ ...row }));

function fail<T>(kind: ApiError['kind'], status: number, message: string): DataResult<T> {
  return { ok: false, source: 'mock', error: { kind, status, message } };
}

/** The row an answer applies to, or the failure to return. */
function answerable(id: string): WeightDiscrepancy | DataResult<never> {
  const row = store.find((entry) => entry.id === id);
  if (!row) return fail('not_found', 404, 'Weight discrepancy not found.');
  if (row.status !== 'open') {
    return fail('conflict', 409, 'This discrepancy has already been answered.');
  }
  return row;
}

const isFailure = (value: WeightDiscrepancy | DataResult<never>): value is DataResult<never> =>
  'ok' in value;

export const mockWeightService: WeightService = {
  async getSummary() {
    const pending = store.filter(({ status }) => status === 'open' || status === 'disputed');
    return fromMock({
      open: store.filter(({ status }) => status === 'open').length,
      disputed: store.filter(({ status }) => status === 'disputed').length,
      extraChargePaise: pending.reduce((sum, row) => sum + row.extraChargePaise, 0),
    });
  },

  async listDiscrepancies({ status, q, page }) {
    const needle = q?.trim().toLowerCase();
    const found = store.filter(
      (row) =>
        (!status || row.status === status) && (!needle || row.awb.toLowerCase().includes(needle)),
    );
    const pageCount = Math.max(1, Math.ceil(found.length / WEIGHT_PAGE_SIZE));
    const current = Math.min(Math.max(page, 1), pageCount);
    const start = (current - 1) * WEIGHT_PAGE_SIZE;

    return fromMock({
      items: found.slice(start, start + WEIGHT_PAGE_SIZE).map((row) => ({ ...row })),
      page: current,
      pageCount,
    });
  },

  async accept(id) {
    const row = answerable(id);
    if (isFailure(row)) return row;
    row.status = 'accepted';
    return fromMock({ ...row });
  },

  async dispute(input) {
    const problem = checkDispute(input);
    if (problem) return fail('validation', 400, problem);

    const row = answerable(input.id);
    if (isFailure(row)) return row;
    if (isResponseWindowClosed(row.respondBy)) {
      return fail('conflict', 409, 'The response window has closed, so this can no longer be disputed.');
    }
    // Only the file names, types and sizes arrive here, so there is nothing else to keep.
    row.status = 'disputed';
    return fromMock({ ...row });
  },
};

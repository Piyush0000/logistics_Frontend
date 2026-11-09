import { indianDay } from '../../format/date';
import { fromMock } from '../source';
import type { CodFilters } from './filters';
import type { CodRemittance, CodService } from './types';

export const NEXT_BATCH_SIZE = 5;

const ROW_COUNT = 46;
const PENDING_COUNT = 14;
const COURIERS = ['Delhivery', 'Ekart', 'Shadowfax', 'Bluedart', 'DHL'];

const MINUTE_MS = 60 * 1000;
const GAP_MS = 27 * 60 * MINUTE_MS;
const SETTLEMENT_MS = 7 * 24 * 60 * MINUTE_MS;
const NEWEST = Date.parse('2026-10-29T18:31:00Z');

// The first two rows sit either side of midnight in India, so the date filter can be tested.
const collectedTime = (index: number) =>
  index === 0 ? NEWEST : NEWEST - 2 * MINUTE_MS - (index - 1) * GAP_MS;

/** Invented entries, so no figure or reference here is real. */
export const SAMPLE_REMITTANCES: CodRemittance[] = Array.from({ length: ROW_COUNT }, (_, index) => {
  const codPaise = (1050 + ((index * 370) % 2400)) * 100;
  const deductionsPaise = index % 5 === 4 ? 3000 : 0;
  const settled = index >= PENDING_COUNT;

  return {
    id: `cod-${String(index + 1).padStart(3, '0')}`,
    orderNumber: `DEMO-COD-${3000 - index}`,
    awb: `DEMOAWB${480000 + index}`,
    courier: COURIERS[index % COURIERS.length] ?? 'Delhivery',
    codPaise,
    deductionsPaise,
    remittablePaise: codPaise - deductionsPaise,
    status: settled ? 'settled' : 'pending',
    collectedAt: new Date(collectedTime(index)).toISOString(),
    settledAt: settled ? new Date(collectedTime(index) + SETTLEMENT_MS).toISOString() : null,
  };
});

const sumRemittable = (rows: CodRemittance[]) =>
  rows.reduce((total, row) => total + row.remittablePaise, 0);

function matching(filters: CodFilters): CodRemittance[] {
  return SAMPLE_REMITTANCES.filter((row) => {
    const day = indianDay(row.collectedAt);
    return (
      (filters.status === 'all' || row.status === filters.status) &&
      (!filters.from || day >= filters.from) &&
      (!filters.to || day <= filters.to)
    );
  });
}

export const mockCodService: CodService = {
  async getSummary() {
    const settled = SAMPLE_REMITTANCES.filter(({ status }) => status === 'settled');
    const pending = SAMPLE_REMITTANCES.filter(({ status }) => status === 'pending');
    // The oldest pending orders settle first.
    const nextBatch = pending.slice(-NEXT_BATCH_SIZE);

    return fromMock({
      remittedTillDatePaise: sumRemittable(settled),
      settledCount: settled.length,
      lastRemittancePaise: settled[0]?.remittablePaise ?? 0,
      nextBatchPaise: sumRemittable(nextBatch),
      nextBatchCount: nextBatch.length,
      totalDuePaise: sumRemittable(pending),
      dueCount: pending.length,
    });
  },

  async listRemittances(filters) {
    const found = matching(filters);
    const pageCount = Math.max(1, Math.ceil(found.length / filters.perPage));
    const page = Math.min(filters.page, pageCount);
    const start = (page - 1) * filters.perPage;
    const entries = found.slice(start, start + filters.perPage);

    return fromMock({
      entries,
      page,
      pageCount,
      first: entries.length ? start + 1 : 0,
      last: start + entries.length,
      total: found.length,
    });
  },

  async exportRemittances(filters) {
    return fromMock(matching(filters));
  },
};

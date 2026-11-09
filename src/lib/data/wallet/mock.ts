import { indianDay } from '../../format/date';
import { fromMock } from '../source';
import type { DebitType, WalletFilters } from './filters';
import type { WalletService, WalletTransaction } from './types';

export const PAGE_SIZE = 10;

const NEWEST = Date.parse('2026-10-29T18:31:00Z');
const MINUTE_MS = 60 * 1000;
const GAP_MS = 27 * 60 * MINUTE_MS;

const debit = (
  debitType: DebitType,
  title: string,
  freightPaise: number,
  otherPaise = 0,
  codPaise = 0,
) => ({ debitType, title, freightPaise, otherPaise, codPaise });

const credit = (title: string, amountPaise: number, hasOrder = false) => ({
  title,
  amountPaise,
  hasOrder,
});

const ROWS = [
  debit('rto-freight', 'RTO freight - Delhivery', 6400, 1400),
  debit('rto-freight', 'RTO freight - Ekart', 5800, 1000),
  debit('b2c-prepaid', 'Shipping charge - Delhivery', 7200, 800),
  credit('Wallet recharge', 500000),
  debit('b2c-cod', 'COD shipping charge - Shadowfax', 6400, 600, 2500),
  debit('weight-discrepancy', 'Weight discrepancy - Bluedart', 4500),
  debit('b2c-prepaid', 'Shipping charge - Ekart', 6800, 700),
  debit('reverse-shipment', 'Reverse shipment - Delhivery', 9200, 800),
  credit('Weight dispute refund', 4500, true),
  debit('b2c-cod', 'COD shipping charge - Delhivery', 7000, 500, 3000),
  debit('invoice-payment', 'Invoice payment - October', 180000),
  debit('rto-freight', 'RTO freight - Shadowfax', 6000, 900),
  debit('dispute-rejected', 'Dispute rejected - Delhivery', 3800),
  debit('b2c-prepaid', 'Shipping charge - DHL', 24000, 3000),
  credit('Wallet recharge', 250000),
  debit('invoice-credits', 'Invoice waiver adjustment', 12000),
  debit('b2c-prepaid', 'Shipping charge - Shadowfax', 6600, 600),
  debit('weight-discrepancy', 'Weight discrepancy - Ekart', 5200),
  debit('b2c-cod', 'COD shipping charge - Ekart', 6800, 500, 2800),
  debit('rto-freight', 'RTO freight - Bluedart', 8400, 1100),
  debit('reverse-shipment', 'Reverse shipment - Ekart', 8800, 700),
  debit('b2c-prepaid', 'Shipping charge - Bluedart', 11000, 1200),
  credit('Wallet recharge', 1000000),
  debit('b2c-cod', 'COD shipping charge - Bluedart', 12000, 900, 3500),
];

const orderRef = (index: number) => `DEMO-ORD-${2000 - index}`;

// The first two entries sit either side of midnight in India, so the date filter can be tested.
const occurredAt = (index: number) =>
  new Date(index === 0 ? NEWEST : NEWEST - 2 * MINUTE_MS - (index - 1) * GAP_MS).toISOString();

/** Invented entries, so no figure or reference here is real. */
export const SAMPLE_TRANSACTIONS: WalletTransaction[] = ROWS.map((row, index) => {
  const common = {
    id: `txn-${String(index + 1).padStart(3, '0')}`,
    occurredAt: occurredAt(index),
  };

  if ('debitType' in row) {
    const { debitType, title, freightPaise, otherPaise, codPaise } = row;
    const ref = orderRef(index);
    return {
      ...common,
      direction: 'debit',
      debitType,
      title: `${title} (${ref})`,
      orderRef: ref,
      amountPaise: freightPaise + otherPaise + codPaise,
      breakdown: { freightPaise, otherPaise, codPaise },
    };
  }

  return {
    ...common,
    direction: 'credit',
    debitType: null,
    title: row.title,
    orderRef: row.hasOrder ? orderRef(index) : null,
    amountPaise: row.amountPaise,
    breakdown: null,
  };
});

function matches(entry: WalletTransaction, filters: WalletFilters): boolean {
  const day = indianDay(entry.occurredAt);
  return (
    (filters.type === 'all' || entry.direction === filters.type) &&
    (filters.debitType === 'all' || entry.debitType === filters.debitType) &&
    (!filters.from || day >= filters.from) &&
    (!filters.to || day <= filters.to)
  );
}

export const mockWalletService: WalletService = {
  async getBalance() {
    return fromMock({ availablePaise: 1250000 });
  },

  async listTransactions(filters) {
    const found = SAMPLE_TRANSACTIONS.filter((entry) => matches(entry, filters));
    const pageCount = Math.max(1, Math.ceil(found.length / PAGE_SIZE));
    const page = Math.min(filters.page, pageCount);
    const start = (page - 1) * PAGE_SIZE;

    return fromMock({
      entries: found.slice(start, start + PAGE_SIZE),
      page,
      pageCount,
      total: found.length,
    });
  },
};

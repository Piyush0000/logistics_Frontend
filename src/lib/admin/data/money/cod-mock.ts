import 'server-only';

import { fromMock, type DataResult } from '../../../data/source';
import { paginate } from '../common';
import { mockNotFound } from '../not-found';
import { daysAgo, seedMerchant } from '../seed';
import { daysPastDue, MAX_BANK_CREDIT_PAISE, payoutDueDate } from './cod-rules';
import { cleanReason, isPaiseInRange, REASON_MAX, REASON_MIN } from './wallet-adjustment';
import type {
  AdminMoneyService,
  BankVerification,
  CodException,
  CodRemittance,
  CodRemittanceLine,
  OverdueRemittance,
} from './types';

const day = (offset: number) => daysAgo(offset).slice(0, 10);

interface SeedBatch {
  id: string;
  carrier: string;
  periodEndDaysAgo: number;
  expectedPaise: number;
  /** Paid, with these per-line differences (line index → paise). Absent when not paid yet. */
  paid?: { utr: string; differences: Record<number, number> };
  /** Already reconciled this many days ago. */
  reconciledDaysAgo?: number;
  /** Bank credit already checked, as paise. */
  bankCreditPaise?: number;
}

// Invented batches. Received totals are the line totals, so every figure adds up.
const SEED_BATCHES: SeedBatch[] = [
  { id: 'rem_dl_1102', carrier: 'delhivery', periodEndDaysAgo: 12, expectedPaise: 18_450_000, paid: { utr: 'UTIB0011020045', differences: {} }, reconciledDaysAgo: 9, bankCreditPaise: 18_450_000 },
  // Paid ₹2,100 short over three lines: ₹1,500 and ₹900 less, ₹300 more.
  { id: 'rem_ek_1105', carrier: 'ekart', periodEndDaysAgo: 9, expectedPaise: 9_820_000, paid: { utr: 'HDFC0011050098', differences: { 4: -150_000, 10: -90_000, 20: 30_000 } }, reconciledDaysAgo: 6 },
  { id: 'rem_bd_1108', carrier: 'bluedart', periodEndDaysAgo: 6, expectedPaise: 6_300_000, paid: { utr: 'ICIC0011080012', differences: { 5: -45_000 } } },
  { id: 'rem_dh_1109', carrier: 'dhl', periodEndDaysAgo: 5, expectedPaise: 2_480_000, paid: { utr: 'SBIN0011090077', differences: {} } },
  { id: 'rem_sf_1101', carrier: 'shadowfax', periodEndDaysAgo: 11, expectedPaise: 3_560_000 },
  { id: 'rem_sf_1110', carrier: 'shadowfax', periodEndDaysAgo: 4, expectedPaise: 4_150_000 },
  { id: 'rem_dl_1112', carrier: 'delhivery', periodEndDaysAgo: 2, expectedPaise: 21_070_000 },
];

// Merchants that ship COD in the sample data (see the merchants sample figures).
const COD_MERCHANTS = ['mer_001', 'mer_002', 'mer_003', 'mer_005', 'mer_004'];
const ORDER_RUPEES = [899, 1_249, 1_599, 749, 2_199, 1_099];
const CARRIER_CODE: Record<string, string> = { delhivery: 'DL', ekart: 'EK', bluedart: 'BD', dhl: 'DH', shadowfax: 'SF' };

/** Order amounts that add up exactly to the batch total; the last line takes the remainder. */
function lineAmounts(totalPaise: number): number[] {
  const amounts: number[] = [];
  let sum = 0;
  for (let i = 0; ; i += 1) {
    const next = ORDER_RUPEES[i % ORDER_RUPEES.length]! * 100;
    if (totalPaise - sum <= next + 50_000) break;
    amounts.push(next);
    sum += next;
  }
  amounts.push(totalPaise - sum);
  return amounts;
}

interface Batch {
  remittance: CodRemittance;
  lines: CodRemittanceLine[];
}

function seedBatch(seed: SeedBatch): Batch {
  const reconciled = seed.reconciledDaysAgo !== undefined;
  const number = seed.id.slice(-4);
  const lines = lineAmounts(seed.expectedPaise).map((expectedPaise, index): CodRemittanceLine => {
    const merchant = seedMerchant(COD_MERCHANTS[index % COD_MERCHANTS.length]!)!;
    const difference = seed.paid?.differences[index] ?? 0;
    return {
      awb: `${CARRIER_CODE[seed.carrier] ?? 'EV'}${number}${String(index + 1).padStart(5, '0')}`,
      merchantId: merchant.id,
      merchantName: merchant.name,
      expectedPaise,
      receivedPaise: seed.paid ? expectedPaise + difference : null,
      match: !seed.paid ? 'pending' : !reconciled ? 'unchecked' : difference === 0 ? 'matched' : 'mismatch',
    };
  });
  const receivedPaise = lines.reduce((sum, line) => sum + (line.receivedPaise ?? 0), 0);
  const periodEnd = day(seed.periodEndDaysAgo);
  const remittance: CodRemittance = {
    id: seed.id,
    carrier: seed.carrier,
    periodEnd,
    dueDate: payoutDueDate(seed.carrier, periodEnd),
    expectedPaise: seed.expectedPaise,
    receivedPaise,
    status: !seed.paid ? 'expected' : !reconciled ? 'received' : receivedPaise < seed.expectedPaise ? 'short' : 'reconciled',
    utr: seed.paid?.utr ?? null,
    lineCount: lines.length,
    reconciledAt: reconciled ? daysAgo(seed.reconciledDaysAgo!) : null,
    bankVerification: seed.bankCreditPaise === undefined ? null : verification(seed.bankCreditPaise, receivedPaise, seed.paid?.utr ?? null, daysAgo(seed.reconciledDaysAgo ?? 0)),
  };
  return { remittance, lines };
}

function verification(bankCreditPaise: number, linesTotalPaise: number, utr: string | null, at: string): BankVerification {
  const variancePaise = bankCreditPaise - linesTotalPaise;
  return {
    bankCreditPaise,
    variancePaise,
    result: variancePaise === 0 ? 'verified' : variancePaise < 0 ? 'short' : 'surplus',
    utr,
    verifiedAt: at,
  };
}

const conflict = (message: string): DataResult<never> => ({
  ok: false,
  source: 'mock',
  error: { kind: 'conflict', status: 409, message },
});
const invalid = (message: string): DataResult<never> => ({
  ok: false,
  source: 'mock',
  error: { kind: 'validation', status: 400, message },
});

type CodMethods = Pick<
  AdminMoneyService,
  | 'listRemittances'
  | 'getRemittance'
  | 'reconcileRemittance'
  | 'verifyBankTransfer'
  | 'listCodExceptions'
  | 'resolveCodException'
  | 'listOverdueRemittances'
>;

/** The COD half of the sample money service, with state that lasts as long as the service. */
export function createMockCod(): CodMethods & { remittances(): CodRemittance[] } {
  const batches = new Map(SEED_BATCHES.map((seed) => [seed.id, seedBatch(seed)]));
  const exceptions: CodException[] = [];
  let nextException = 1;

  function openExceptions(batch: Batch, at: string) {
    for (const line of batch.lines) {
      if (line.match !== 'mismatch') continue;
      exceptions.push({
        id: `exc_${String(nextException++).padStart(3, '0')}`,
        batchId: batch.remittance.id,
        carrier: batch.remittance.carrier,
        awb: line.awb,
        merchantName: line.merchantName,
        type: 'amount_mismatch',
        status: 'open',
        expectedPaise: line.expectedPaise,
        receivedPaise: line.receivedPaise ?? 0,
        variancePaise: (line.receivedPaise ?? 0) - line.expectedPaise,
        createdAt: at,
        resolution: null,
      });
    }
  }

  // Already-reconciled sample batches come with their exceptions; the first one is already closed.
  for (const batch of batches.values()) {
    if (batch.remittance.reconciledAt) openExceptions(batch, batch.remittance.reconciledAt);
  }
  const closed = exceptions.find((entry) => entry.variancePaise > 0);
  if (closed) {
    closed.status = 'resolved';
    closed.resolution = { note: 'Courier collected a delivery charge with the COD; refunded to the customer.', at: daysAgo(5) };
  }

  const copy = (remittance: CodRemittance): CodRemittance => ({
    ...remittance,
    bankVerification: remittance.bankVerification ? { ...remittance.bankVerification } : null,
  });

  return {
    remittances: () => [...batches.values()].map((batch) => copy(batch.remittance)),

    async listRemittances() {
      return fromMock(
        [...batches.values()].map((batch) => copy(batch.remittance)).sort((a, b) => b.periodEnd.localeCompare(a.periodEnd)),
      );
    },

    async getRemittance(id, page) {
      const batch = batches.get(id);
      if (!batch) return mockNotFound('Remittance');
      return fromMock({
        remittance: copy(batch.remittance),
        lines: paginate(batch.lines.map((line) => ({ ...line })), page),
        exceptions: exceptions.filter((entry) => entry.batchId === id).map((entry) => ({ ...entry })),
      });
    },

    async reconcileRemittance(id) {
      const batch = batches.get(id);
      if (!batch) return mockNotFound('Remittance');
      const { remittance } = batch;
      if (remittance.reconciledAt) return conflict('This batch is already reconciled.');
      if (remittance.status === 'expected') return conflict('The courier has not paid this batch yet, so there is nothing to match.');

      let matched = 0;
      for (const line of batch.lines) {
        line.match = line.receivedPaise === line.expectedPaise ? 'matched' : 'mismatch';
        if (line.match === 'matched') matched += 1;
      }
      const at = new Date().toISOString();
      remittance.reconciledAt = at;
      remittance.status = remittance.receivedPaise < remittance.expectedPaise ? 'short' : 'reconciled';
      openExceptions(batch, at);
      return fromMock({ remittance: copy(remittance), matched, mismatched: batch.lines.length - matched });
    },

    async verifyBankTransfer(id, bankCreditPaise, utr) {
      const batch = batches.get(id);
      if (!batch) return mockNotFound('Remittance');
      if (batch.remittance.status === 'expected') return conflict('The courier has not paid this batch yet.');
      if (!isPaiseInRange(bankCreditPaise, MAX_BANK_CREDIT_PAISE)) return invalid('The bank credit is outside the allowed range.');
      const result = verification(bankCreditPaise, batch.remittance.receivedPaise, utr ?? batch.remittance.utr, new Date().toISOString());
      batch.remittance.bankVerification = result;
      return fromMock({ ...result });
    },

    async listCodExceptions() {
      const sorted = [...exceptions].sort(
        (a, b) => Number(a.status !== 'open') - Number(b.status !== 'open') || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
      );
      return fromMock(sorted.map((entry) => ({ ...entry })));
    },

    async resolveCodException(id, resolution, note) {
      const entry = exceptions.find((candidate) => candidate.id === id);
      if (!entry) return mockNotFound('Exception');
      if (entry.status !== 'open') return conflict('This exception is already closed.');
      if (resolution !== 'resolved' && resolution !== 'written_off') return invalid('Choose Resolved or Written off.');
      const cleanNote = cleanReason(note);
      if (cleanNote.length < REASON_MIN || cleanNote.length > REASON_MAX) return invalid('The reason is too short or too long.');
      entry.status = resolution;
      entry.resolution = { note: cleanNote, at: new Date().toISOString() };
      return fromMock({ ...entry });
    },

    async listOverdueRemittances() {
      const today = day(0);
      const overdue: OverdueRemittance[] = [...batches.values()]
        .map(({ remittance }) => remittance)
        .filter((remittance) => remittance.status === 'expected' && daysPastDue(remittance.dueDate, today) > 0)
        .map((remittance) => ({
          batchId: remittance.id,
          carrier: remittance.carrier,
          periodEnd: remittance.periodEnd,
          dueDate: remittance.dueDate,
          daysOverdue: daysPastDue(remittance.dueDate, today),
          expectedPaise: remittance.expectedPaise,
        }))
        .sort((a, b) => b.daysOverdue - a.daysOverdue);
      return fromMock(overdue);
    },
  };
}

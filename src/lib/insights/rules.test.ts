import { describe, expect, it } from 'vitest';
import type { Pickup } from '@/lib/data/pickups/types';
import type { DataResult } from '@/lib/data/source';
import { buildInsights, MAX_INSIGHTS, needsYouToday } from './rules';
import type { InsightInput } from './types';

const TODAY = '2026-11-14';
const mock = <T,>(data: T): DataResult<T> => ({ ok: true, source: 'mock', data });
const live = <T,>(data: T): DataResult<T> => ({ ok: true, source: 'gateway', data });
const failed = <T,>(): DataResult<T> => ({
  ok: false,
  source: 'gateway',
  error: { kind: 'unavailable', status: 503, message: 'Not available' },
});

const ids = (input: InsightInput) => buildInsights(input).map((i) => i.id);

describe('buildInsights', () => {
  it('flags open NDRs as an action', () => {
    const [first] = buildInsights({
      today: TODAY,
      ndr: live({ kpis: { openNdr: 14, reattempted: 0, delivered: 0, returned: 0 }, items: [] }),
    });
    expect(first).toMatchObject({ id: 'ndr-open', tone: 'action', href: '/ndr', isSample: false });
    expect(first!.title).toBe('14 NDRs need an answer');
  });

  it('says nothing about NDRs when none are open', () => {
    expect(
      ids({ today: TODAY, ndr: live({ kpis: { openNdr: 0, reattempted: 0, delivered: 0, returned: 0 }, items: [] }) }),
    ).not.toContain('ndr-open');
  });

  it('flags weight discrepancies with the money at stake', () => {
    const insight = buildInsights({
      today: TODAY,
      weight: live({ open: 2, disputed: 1, extraChargePaise: 45_000 }),
    }).find((i) => i.id === 'weight-open');
    expect(insight?.title).toBe('3 weight discrepancies to review');
    expect(insight?.detail).toContain('₹450.00');
  });

  it('points to the first unfinished setup step', () => {
    const insight = buildInsights({
      today: TODAY,
      onboarding: live([
        { id: 'kyc', label: 'Complete KYC', href: '/settings/company', done: true },
        { id: 'wallet', label: 'Recharge your wallet', href: '/finances/wallet', done: false },
      ] as never),
    }).find((i) => i.id === 'onboarding-left');
    expect(insight).toMatchObject({ title: '1 setup step left', href: '/finances/wallet' });
  });

  it('warns when the wallet is below ₹500 and not at ₹500', () => {
    expect(ids({ today: TODAY, wallet: live({ availablePaise: 49_999 }) })).toContain('wallet-low');
    expect(ids({ today: TODAY, wallet: live({ availablePaise: 50_000 }) })).not.toContain('wallet-low');
  });

  it('warns about a high RTO share only with enough shipments', () => {
    const summary = (delivered: number, rto: number) =>
      live({ toBeProcessed: 0, readyToShip: 0, inTransit: 0, outForDelivery: 0, delivered, rto });
    expect(ids({ today: TODAY, summary: summary(80, 20) })).toContain('rto-high');
    expect(ids({ today: TODAY, summary: summary(90, 10) })).not.toContain('rto-high');
    expect(ids({ today: TODAY, summary: summary(5, 5) })).not.toContain('rto-high');
  });

  it('counts only scheduled pickups for today', () => {
    const pickup = (pickupDate: string, status: 'scheduled' | 'picked_up'): Pickup => ({
      id: pickupDate + status,
      pickupDate,
      window: null,
      carrier: 'ekart',
      addressLabel: 'WH',
      awbs: [],
      status,
    });
    const insight = buildInsights({
      today: TODAY,
      pickups: live({ items: [pickup(TODAY, 'scheduled'), pickup(TODAY, 'picked_up'), pickup('2026-11-15', 'scheduled')] }),
    }).find((i) => i.id === 'pickups-today');
    expect(insight?.title).toBe('1 pickup scheduled today');
  });

  it('shows the next COD payout', () => {
    const insight = buildInsights({
      today: TODAY,
      cod: live({
        remittedTillDatePaise: 0,
        settledCount: 0,
        lastRemittancePaise: 0,
        nextBatchPaise: 4_120_000,
        nextBatchCount: 31,
        totalDuePaise: 0,
        dueCount: 0,
      }),
    }).find((i) => i.id === 'cod-next');
    expect(insight?.title).toContain('₹41,200.00');
  });

  it('skips a rule whose source failed', () => {
    expect(ids({ today: TODAY, ndr: failed(), wallet: failed() })).toEqual(['all-clear']);
  });

  it('says all clear when nothing needs action', () => {
    const [only] = buildInsights({ today: TODAY, wallet: live({ availablePaise: 1_000_000 }) });
    expect(only).toMatchObject({ id: 'all-clear', tone: 'good', isSample: false });
  });

  it('orders action, warning, info and keeps at most six', () => {
    const result = buildInsights({
      today: TODAY,
      cod: live({ remittedTillDatePaise: 0, settledCount: 0, lastRemittancePaise: 0, nextBatchPaise: 100, nextBatchCount: 1, totalDuePaise: 0, dueCount: 0 }),
      wallet: live({ availablePaise: 0 }),
      ndr: live({ kpis: { openNdr: 1, reattempted: 0, delivered: 0, returned: 0 }, items: [] }),
      weight: live({ open: 1, disputed: 0, extraChargePaise: 0 }),
      summary: live({ toBeProcessed: 0, readyToShip: 0, inTransit: 0, outForDelivery: 0, delivered: 50, rto: 50 }),
      onboarding: live([{ id: 'kyc', label: 'KYC', href: '/settings/company', done: false }] as never),
      pickups: live({ items: [{ id: 'p', pickupDate: TODAY, window: null, carrier: 'ekart', addressLabel: 'WH', awbs: [], status: 'scheduled' }] }),
    });
    expect(result).toHaveLength(MAX_INSIGHTS);
    expect(result.map((i) => i.tone)).toEqual(['action', 'action', 'action', 'warning', 'warning', 'info']);
  });

  it('marks insights from sample data', () => {
    const [first] = buildInsights({
      today: TODAY,
      ndr: mock({ kpis: { openNdr: 2, reattempted: 0, delivered: 0, returned: 0 }, items: [] }),
    });
    expect(first?.isSample).toBe(true);
  });
});

describe('needsYouToday', () => {
  it('keeps only action and warning insights', () => {
    const result = needsYouToday(
      buildInsights({
        today: TODAY,
        wallet: live({ availablePaise: 0 }),
        cod: live({ remittedTillDatePaise: 0, settledCount: 0, lastRemittancePaise: 0, nextBatchPaise: 100, nextBatchCount: 1, totalDuePaise: 0, dueCount: 0 }),
      }),
    );
    expect(result.map((i) => i.id)).toEqual(['wallet-low']);
  });
});

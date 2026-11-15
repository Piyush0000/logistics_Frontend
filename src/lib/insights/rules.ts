import type { DataResult } from '@/lib/data/source';
import { formatPaise } from '@/lib/format/money';
import type { Insight, InsightInput, InsightTone } from './types';

export const MAX_INSIGHTS = 6;
/** ₹500: below this the wallet may not cover the next few bookings. */
export const WALLET_LOW_PAISE = 50_000;
/** RTO share above 15% (of delivered + returned, with at least 20 shipments) is worth a look. */
export const RTO_HIGH_SHARE = 0.15;
export const RTO_MIN_SAMPLE = 20;

const ORDER: Record<InsightTone, number> = { action: 0, warning: 1, info: 2, good: 3 };

const plural = (n: number, one: string, many: string) =>
  `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;

/** The data when the source answered, else undefined (that rule is skipped). */
function ok<T>(result: DataResult<T> | undefined): { data: T; isSample: boolean } | undefined {
  return result?.ok ? { data: result.data, isSample: result.source === 'mock' } : undefined;
}

/** Every rule in one pass; order: action, warning, info, good; at most six. */
export function buildInsights(input: InsightInput): Insight[] {
  const out: Insight[] = [];

  const ndr = ok(input.ndr);
  if (ndr && ndr.data.kpis.openNdr > 0) {
    const n = ndr.data.kpis.openNdr;
    out.push({
      id: 'ndr-open',
      tone: 'action',
      title: `${plural(n, 'NDR needs', 'NDRs need')} an answer`,
      detail: 'Reattempt, change the address or return them before the courier gives up.',
      href: '/ndr',
      isSample: ndr.isSample,
    });
  }

  const weight = ok(input.weight);
  if (weight && weight.data.open + weight.data.disputed > 0) {
    const n = weight.data.open + weight.data.disputed;
    out.push({
      id: 'weight-open',
      tone: 'action',
      title: `${plural(n, 'weight discrepancy', 'weight discrepancies')} to review`,
      detail: `${formatPaise(weight.data.extraChargePaise)} in extra charges is waiting on a decision.`,
      href: '/reconciliation/weight',
      isSample: weight.isSample,
    });
  }

  const onboarding = ok(input.onboarding);
  const undone = onboarding?.data.filter((item) => !item.done) ?? [];
  if (onboarding && undone.length > 0) {
    out.push({
      id: 'onboarding-left',
      tone: 'action',
      title: `${plural(undone.length, 'setup step', 'setup steps')} left`,
      detail: `Next: ${undone[0]!.label}.`,
      href: undone[0]!.href,
      isSample: onboarding.isSample,
    });
  }

  const wallet = ok(input.wallet);
  if (wallet && wallet.data.availablePaise < WALLET_LOW_PAISE) {
    out.push({
      id: 'wallet-low',
      tone: 'warning',
      title: 'Wallet balance is low',
      detail: `${formatPaise(wallet.data.availablePaise)} left. Recharge so bookings do not stop.`,
      href: '/finances/wallet',
      isSample: wallet.isSample,
    });
  }

  const summary = ok(input.summary);
  if (summary) {
    const { delivered, rto } = summary.data;
    const closed = delivered + rto;
    if (closed >= RTO_MIN_SAMPLE && rto / closed > RTO_HIGH_SHARE) {
      out.push({
        id: 'rto-high',
        tone: 'warning',
        title: `RTO is at ${Math.round((rto / closed) * 100)}%`,
        detail: 'More parcels are coming back than usual. See which couriers and pincodes.',
        href: '/rto',
        isSample: summary.isSample,
      });
    }
  }

  const pickups = ok(input.pickups);
  const today =
    pickups?.data.items.filter((p) => p.status === 'scheduled' && p.pickupDate === input.today) ?? [];
  if (pickups && today.length > 0) {
    out.push({
      id: 'pickups-today',
      tone: 'info',
      title: `${plural(today.length, 'pickup', 'pickups')} scheduled today`,
      detail: 'Keep parcels packed and labelled for the courier.',
      href: '/orders/pickups',
      isSample: pickups.isSample,
    });
  }

  const cod = ok(input.cod);
  if (cod && cod.data.nextBatchPaise > 0) {
    out.push({
      id: 'cod-next',
      tone: 'info',
      title: `${formatPaise(cod.data.nextBatchPaise)} in your next COD payout`,
      detail: `${plural(cod.data.nextBatchCount, 'order', 'orders')} in the next remittance batch.`,
      href: '/finances/cod',
      isSample: cod.isSample,
    });
  }

  if (!out.some((i) => i.tone === 'action' || i.tone === 'warning')) {
    const sources = [ndr, weight, onboarding, wallet, summary, pickups, cod]
      .filter((s) => s !== undefined)
      .map((s) => s.isSample);
    out.push({
      id: 'all-clear',
      tone: 'good',
      title: 'Nothing needs you right now',
      detail: 'Shipments are moving. New issues will show up here.',
      href: '/orders',
      isSample: sources.length === 0 || sources.some(Boolean),
    });
  }

  return out.sort((a, b) => ORDER[a.tone] - ORDER[b.tone]).slice(0, MAX_INSIGHTS);
}

/** The insights that ask for an action: the "Needs you today" list. */
export function needsYouToday(insights: Insight[]): Insight[] {
  return insights.filter((i) => i.tone === 'action' || i.tone === 'warning');
}

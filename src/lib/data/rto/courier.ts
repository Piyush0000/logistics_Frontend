import { carrierLabel } from '@/components/orders/carrier-badge';
import type { OrderListResult, OrderSummary } from '../orders';
import type { DataResult } from '../source';
import { RTO_STAGES, type RtoStage } from './types';

/** RTO shipments counted by courier, most first. Ties keep the order each courier was first seen. */
export function rtoByCourier(
  shipments: readonly { carrier: string }[],
): { label: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const { carrier } of shipments) {
    const label = carrierLabel(carrier);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));
}

export const MAX_PAGES_PER_STAGE = 20;

export interface CollectedRto {
  items: OrderSummary[];
  /** What the lists say exist, which is more than `items` when the page cap was hit. */
  total: number;
  capped: boolean;
}

type ListPage = (query: { stage: RtoStage; page: number }) => Promise<DataResult<OrderListResult>>;

/** Every RTO shipment for each stage, up to 20 pages per stage, the later pages fetched in parallel. */
export async function collectRto(listPage: ListPage): Promise<DataResult<CollectedRto>> {
  const perStage = await Promise.all(
    RTO_STAGES.map(async (stage) => {
      // Page 1 says how many pages exist; the rest (up to the cap) are fetched at once.
      const first = await listPage({ stage, page: 1 });
      if (!first.ok) return first;
      const pageCount = Math.ceil(first.data.total / Math.max(1, first.data.limit));
      const last = Math.min(pageCount, MAX_PAGES_PER_STAGE);
      const rest = await Promise.all(
        Array.from({ length: Math.max(0, last - 1) }, (_, index) => listPage({ stage, page: index + 2 })),
      );
      const failed = rest.find((result) => !result.ok);
      if (failed && !failed.ok) return failed;
      const pages = [first, ...rest].flatMap((result) => (result.ok ? [result] : []));
      const items = pages.flatMap((result) => result.data.items);
      const total = pages[pages.length - 1]!.data.total;
      return {
        ok: true as const,
        source: first.source,
        data: { items, total, capped: pageCount > MAX_PAGES_PER_STAGE },
      };
    }),
  );
  const failed = perStage.find((r) => !r.ok);
  if (failed && !failed.ok) return failed;
  const ok = perStage.flatMap((r) => (r.ok ? [r] : []));
  return {
    ok: true,
    source: ok[0]?.source ?? 'mock',
    data: {
      items: ok.flatMap((r) => r.data.items),
      total: ok.reduce((sum, r) => sum + r.data.total, 0),
      capped: ok.some((r) => r.data.capped),
    },
  };
}

/** The line under the chart when it covers fewer shipments than the counts above it, else null. */
export function rtoChartNote(shown: number, total: number, capped: boolean): string | null {
  if (shown >= total) return null;
  return `Based on ${capped ? 'the latest ' : ''}${shown} of ${total} RTO shipments.`;
}

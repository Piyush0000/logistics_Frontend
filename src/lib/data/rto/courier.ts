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

/** Every RTO shipment, read page by page for each stage, up to 20 pages per stage. */
export async function collectRto(listPage: ListPage): Promise<DataResult<CollectedRto>> {
  const perStage = await Promise.all(
    RTO_STAGES.map(async (stage) => {
      const items: OrderSummary[] = [];
      let total = 0;
      let capped = false;
      let source: 'mock' | 'gateway' = 'mock';
      for (let page = 1; ; page += 1) {
        const result = await listPage({ stage, page });
        if (!result.ok) return result;
        source = result.source;
        items.push(...result.data.items);
        total = result.data.total;
        const pageCount = Math.ceil(result.data.total / Math.max(1, result.data.limit));
        if (page >= pageCount) break;
        if (page >= MAX_PAGES_PER_STAGE) {
          capped = true;
          break;
        }
      }
      return { ok: true as const, source, data: { items, total, capped } };
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

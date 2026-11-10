import { PackageCheck, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { BarChart } from '@/components/charts/bar-chart';
import { DataCard } from '@/components/ui/data-card';
import { StatTile } from '@/components/ui/stat-tile';
import { rtoService, RTO_STAGES, type RtoSummary } from '@/lib/data/rto';
import { rtoByCourier } from '@/lib/data/rto/courier';
import type { DataResult } from '@/lib/data/source';

/**
 * In-progress and delivered counts, and RTO shipments by courier. The chart counts the first page
 * of each stage's list. One card, so a failed source shows one error with Try again.
 */
export async function RtoTab() {
  const service = rtoService();
  const [summary, ...lists] = await Promise.all([
    service.getSummary(),
    ...RTO_STAGES.map((stage) => service.listRto({ stage, page: 1 })),
  ]);

  const failed = !summary.ok ? summary : lists.find((list) => !list.ok);
  const result: DataResult<{ summary: RtoSummary; couriers: ReturnType<typeof rtoByCourier> }> =
    failed && !failed.ok
      ? failed
      : {
          ok: true,
          source: summary.source,
          data: {
            summary: summary.ok ? summary.data : { inProgress: 0, delivered: 0, rtoChargesPaise: null },
            couriers: rtoByCourier(lists.flatMap((list) => (list.ok ? list.data.items : []))),
          },
        };

  return (
    <DataCard
      testId="rto-tab-card"
      title="RTO"
      result={result}
      actions={
        <Link
          href="/rto"
          className="inline-flex h-control items-center rounded-control px-3 text-sm font-medium text-primary hover:bg-primary/10"
        >
          View all RTO
        </Link>
      }
    >
      {({ summary: counts, couriers }) => (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatTile testId="tile-RTO in progress" label="RTO in progress" value={counts.inProgress} icon={Undo2} />
            <StatTile testId="tile-RTO delivered" label="RTO delivered" value={counts.delivered} icon={PackageCheck} />
          </div>
          <BarChart label="RTO by courier" data={couriers} />
        </div>
      )}
    </DataCard>
  );
}

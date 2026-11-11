import { PackageCheck, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { BarChart } from '@/components/charts/bar-chart';
import { DataCard } from '@/components/ui/data-card';
import { StatTile } from '@/components/ui/stat-tile';
import { rtoService, type RtoSummary } from '@/lib/data/rto';
import { collectRto, rtoByCourier, rtoChartNote } from '@/lib/data/rto/courier';
import type { DataResult } from '@/lib/data/source';

/**
 * In-progress and delivered counts, and RTO shipments by courier. The chart counts every page
 * of each stage's list, and says so under the chart when it covers fewer than the counts. One card, so a failed source shows one error with Try again.
 */
export async function RtoTab() {
  const service = rtoService();
  const [summary, collected] = await Promise.all([service.getSummary(), collectRto((q) => service.listRto(q))]);

  const failed = !summary.ok ? summary : !collected.ok ? collected : null;
  const result: DataResult<{
    summary: RtoSummary;
    couriers: ReturnType<typeof rtoByCourier>;
    note: string | null;
  }> =
    failed && !failed.ok
      ? failed
      : summary.ok && collected.ok
        ? {
            ok: true,
            source: summary.source,
            data: {
              summary: summary.data,
              couriers: rtoByCourier(collected.data.items),
              note: rtoChartNote(
                collected.data.items.length,
                Math.max(collected.data.total, summary.data.inProgress + summary.data.delivered),
                collected.data.capped,
              ),
            },
          }
        : (summary as never);

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
      {({ summary: counts, couriers, note }) => (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatTile testId="tile-RTO in progress" label="RTO in progress" value={counts.inProgress} icon={Undo2} />
            <StatTile testId="tile-RTO delivered" label="RTO delivered" value={counts.delivered} icon={PackageCheck} />
          </div>
          <BarChart label="RTO by courier" categoryLabel="Courier" data={couriers} />
          {note ? <p data-testid="rto-chart-note" className="text-sm text-on-surface/70">{note}</p> : null}
        </div>
      )}
    </DataCard>
  );
}

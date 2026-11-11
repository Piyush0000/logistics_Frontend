import { PackageCheck } from 'lucide-react';
import { BarChart } from '@/components/charts/bar-chart';
import { DataCard } from '@/components/ui/data-card';
import { StatTile } from '@/components/ui/stat-tile';
import { analyticsService, type Range } from '@/lib/data/analytics';
import { dayLabel } from '@/lib/data/pickups/summary';
import { shipmentService } from '@/lib/data/shipments';
import { RangeToggle } from './range-toggle';

/**
 * The delivered total comes from the shipment stats, which the backend has. The per-day chart
 * has no backend route, so it is its own card: in gateway mode only the chart says unavailable.
 */
export async function DeliveredTab({ range }: { range: Range }) {
  const [summary, trend] = await Promise.all([
    shipmentService().getSummary(),
    analyticsService().deliveredByDay(range),
  ]);

  return (
    <div className="grid gap-4">
      <DataCard testId="delivered-total-card" title="Delivered" result={summary}>
        {({ delivered }) => (
          <StatTile testId="tile-Delivered" label="Delivered" value={delivered} icon={PackageCheck} />
        )}
      </DataCard>
      <DataCard
        testId="delivered-trend-card"
        title="Delivered per day"
        result={trend}
        actions={<RangeToggle tab="delivered" range={range} />}
      >
        {(points) => (
          <BarChart
            label={`Delivered in the last ${range} days`}
            data={points.map((p) => ({ label: dayLabel(p.day), value: p.value }))}
          />
        )}
      </DataCard>
    </div>
  );
}

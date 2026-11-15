import { Banknote, Truck } from 'lucide-react';
import { BarChart } from '@/components/charts/bar-chart';
import { DataCard } from '@/components/ui/data-card';
import { StatTile } from '@/components/ui/stat-tile';
import { analyticsService, type Range } from '@/lib/data/analytics';
import { sumPoints } from '@/lib/data/analytics/totals';
import { dayLabel } from '@/lib/data/pickups/summary';
import { formatPaise, formatPaiseCompact } from '@/lib/format/money';
import { RangeToggle } from './range-toggle';

/** Freight spend and COD collected per day, with totals. One source, so one card. */
export async function RevenueTab({ range }: { range: Range }) {
  const result = await analyticsService().revenueByDay(range);
  const chart = (label: string, points: { day: string; value: number }[]) => (
    <BarChart
      label={label}
      data={points.map((p) => ({ label: dayLabel(p.day), value: p.value }))}
      format={formatPaise}
      formatLabel={formatPaiseCompact}
    />
  );

  return (
    <DataCard
      testId="revenue-tab-card"
      title="Revenue"
      result={result}
      actions={<RangeToggle tab="revenue" range={range} />}
    >
      {({ freightPaise, codPaise }) => (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatTile
              testId="tile-Freight spend"
              label="Freight spend"
              value={formatPaise(sumPoints(freightPaise))}
              icon={Truck}
            />
            <StatTile
              testId="tile-COD collected"
              label="COD collected"
              value={formatPaise(sumPoints(codPaise))}
              icon={Banknote}
            />
          </div>
          {chart('Freight spend per day', freightPaise)}
          {chart('COD collected per day', codPaise)}
        </div>
      )}
    </DataCard>
  );
}

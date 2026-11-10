import { CircleCheck, PackageMinus, PackageX, RotateCw } from 'lucide-react';
import Link from 'next/link';
import { BarChart } from '@/components/charts/bar-chart';
import { DataCard } from '@/components/ui/data-card';
import { StatTile } from '@/components/ui/stat-tile';
import { ndrService } from '@/lib/data/ndr';
import { ndrReasonCounts } from '@/lib/data/ndr/reasons';

/** The four NDR figures and a chart of reasons. One card, so a failed source shows one error. */
export async function NdrTab() {
  const result = await ndrService().getNdrDashboard();

  return (
    <DataCard
      testId="ndr-tab-card"
      title="NDR"
      result={result}
      actions={
        <Link
          href="/ndr"
          className="inline-flex h-control items-center rounded-control px-3 text-sm font-medium text-primary hover:bg-primary/10"
        >
          View all NDR
        </Link>
      }
    >
      {({ kpis, items }) => (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile testId="tile-NDR Order" label="NDR Order" value={kpis.openNdr} icon={PackageX} />
            <StatTile testId="tile-Re-attempted" label="Re-attempted" value={kpis.reattempted} icon={RotateCw} />
            <StatTile testId="tile-NDR Delivered" label="NDR Delivered" value={kpis.delivered} icon={CircleCheck} />
            <StatTile testId="tile-NDR Returned" label="NDR Returned" value={kpis.returned} icon={PackageMinus} />
          </div>
          <BarChart label="NDR reasons" categoryLabel="Reason" data={ndrReasonCounts(items)} />
        </div>
      )}
    </DataCard>
  );
}

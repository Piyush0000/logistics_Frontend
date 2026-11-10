import { CalendarClock, PackageCheck, Truck } from 'lucide-react';
import { BarChart } from '@/components/charts/bar-chart';
import { DataCard } from '@/components/ui/data-card';
import { StatTile } from '@/components/ui/stat-tile';
import { pickupsService, type Pickup } from '@/lib/data/pickups';
import { summarizePickups } from '@/lib/data/pickups/summary';
import type { DataResult } from '@/lib/data/source';

const MAX_PAGES = 20;

async function allPickups(): Promise<DataResult<Pickup[]>> {
  const service = pickupsService();
  const items: Pickup[] = [];
  let source: 'mock' | 'gateway' = 'mock';
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await service.listPickups({ page });
    if (!result.ok) return result;
    source = result.source;
    items.push(...result.data.items);
    if (result.data.page >= result.data.pageCount) break;
  }
  return { ok: true, source, data: items };
}

/** Tiles and a 7-day chart. One card, so a failed source shows one error with Try again. */
export async function PickupsTab() {
  const [pickups, ready] = await Promise.all([allPickups(), pickupsService().readyToShip()]);
  const result: DataResult<ReturnType<typeof summarizePickups>> = !pickups.ok
    ? pickups
    : !ready.ok
      ? ready
      : {
          ok: true,
          source: pickups.source,
          data: summarizePickups(pickups.data, ready.data.length),
        };

  return (
    <DataCard testId="pickups-card" title="Pickups" result={result}>
      {(summary) => (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              testId="tile-Scheduled today"
              label="Scheduled today"
              value={summary.scheduledToday}
              icon={CalendarClock}
            />
            <StatTile
              testId="tile-Picked up today"
              label="Picked up today"
              value={summary.pickedUpToday}
              icon={Truck}
            />
            <StatTile
              testId="tile-Pending pickup"
              label="Pending pickup"
              value={summary.pending}
              icon={PackageCheck}
            />
          </div>
          <BarChart label="Pickups in the last 7 days" data={summary.days} />
        </div>
      )}
    </DataCard>
  );
}

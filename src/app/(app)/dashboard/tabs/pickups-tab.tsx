import { CalendarClock, PackageCheck, Truck } from 'lucide-react';
import { BarChart } from '@/components/charts/bar-chart';
import { DataCard } from '@/components/ui/data-card';
import { StatTile } from '@/components/ui/stat-tile';
import { pickupsService, type Pickup } from '@/lib/data/pickups';
import { summarizePickups } from '@/lib/data/pickups/summary';
import type { DataResult } from '@/lib/data/source';

const MAX_PAGES = 20;

/** Page 1 first (it says how many pages there are), then the rest at once, capped at MAX_PAGES. */
async function allPickups(): Promise<DataResult<Pickup[]>> {
  const service = pickupsService();
  const first = await service.listPickups({ page: 1 });
  if (!first.ok) return first;
  const last = Math.min(first.data.pageCount, MAX_PAGES);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, last - 1) }, (_, index) => service.listPickups({ page: index + 2 })),
  );
  const failed = rest.find((result) => !result.ok);
  if (failed && !failed.ok) return failed;
  const items = [first, ...rest].flatMap((result) => (result.ok ? result.data.items : []));
  return { ok: true, source: first.source, data: items };
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

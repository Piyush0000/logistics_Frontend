import { CARRIERS } from '@logicore/contracts';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { getDemoSession } from '@/lib/auth/session';
import { ZONES, ZONE_LABELS, ratesService } from '@/lib/data/rates';
import { parseEnum } from '@/lib/url-params';
import { RateFilter } from './rate-filter';
import { RateTable } from './rate-table';

export const metadata: Metadata = { title: 'Rate card | Evoc Ships' };

const PATH = '/tools/rate-card';

interface RateCardPageProps {
  searchParams: Promise<{ carrier?: string }>;
}

export default async function RateCardPage({ searchParams }: RateCardPageProps) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const params = await searchParams;
  // A carrier that is not one of ours is ignored, so every carrier shows.
  const carrier = parseEnum(params.carrier, CARRIERS);

  const rates = await ratesService().getRateCard();

  return (
    <>
      <div className="grid gap-6">
        <PageHeader
          title="Rate card"
          description="What each courier charges to ship a parcel, by zone. The base price covers the first weight band, and every extra 500 g adds the amount shown."
        />

        <RateFilter key={carrier ?? 'all'} carrier={carrier} carriers={CARRIERS} path={PATH} />

        <DataCard testId="rates-card" title="Rates by zone" result={rates}>
          {(data) => {
            const rows = carrier ? data.filter((row) => row.carrier === carrier) : data;
            return rows.length === 0 ? (
              <EmptyState message="No rates to show for this carrier. Clear the filter to see every carrier." />
            ) : (
              <RateTable rows={rows} />
            );
          }}
        </DataCard>

        <section
          data-testid="zone-legend"
          aria-labelledby="zone-legend-title"
          className="motion-rise rounded-card border border-secondary bg-surface p-card"
        >
          <h2 id="zone-legend-title" className="font-heading text-lg leading-7 font-bold tracking-tight lg:text-xl">
            What the zones mean
          </h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Only the zones with prices: sample data has a fifth zone the courier network lacks. */}
            {(rates.ok ? ZONES.filter((zone) => rates.data.some((row) => row.zone === zone)) : ZONES).map((zone) => (
              <div key={zone} data-testid="zone-entry" className="flex min-w-0 items-start gap-3 rounded-control border border-secondary/70 bg-tertiary/50 p-3">
                <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-control bg-muted font-mono text-base font-semibold text-primary">
                  {zone}
                </span>
                <div className="min-w-0">
                <dt className="text-sm">
                  <span className="font-semibold">Zone {zone}</span>
                  <span className="sr-only">: </span>
                  <span className="block font-medium text-on-surface/80">{ZONE_LABELS[zone].name}</span>
                </dt>
                <dd className="text-sm text-on-surface/70">{ZONE_LABELS[zone].description}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </>
  );
}

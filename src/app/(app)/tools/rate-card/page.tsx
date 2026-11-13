import { CARRIERS } from '@logicore/contracts';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { getDemoSession } from '@/lib/auth/session';
import { ZONES, ZONE_LABELS, ratesService } from '@/lib/data/rates';
import { walletService } from '@/lib/data/wallet';
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

  const [wallet, rates] = await Promise.all([walletService().getBalance(), ratesService().getRateCard()]);

  return (
    <AppShell email={session.email} wallet={wallet}>
      <div className="grid gap-6">
        <PageHeader
          title="Rate card"
          description="What each courier charges to ship a parcel, by zone. The base price covers the first weight band, and every extra 500 g adds the amount shown."
        />

        <RateFilter key={carrier ?? 'all'} carrier={carrier} path={PATH} />

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
          className="rounded-card border border-secondary bg-surface p-card"
        >
          <h2 id="zone-legend-title" className="font-heading text-xl leading-7 lg:text-2xl lg:leading-8">
            What the zones mean
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ZONES.map((zone) => (
              <div key={zone} data-testid="zone-entry" className="min-w-0">
                <dt className="text-sm">
                  <span className="font-semibold">Zone {zone}</span>
                  <span className="sr-only">: </span>
                  <span className="block font-medium text-on-surface/80">{ZONE_LABELS[zone].name}</span>
                </dt>
                <dd className="text-sm text-on-surface/70">{ZONE_LABELS[zone].description}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </AppShell>
  );
}

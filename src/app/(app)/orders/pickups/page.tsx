import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { getDemoSession } from '@/lib/auth/session';
import { pickupAddressService } from '@/lib/data/pickup-addresses';
import { pickupsService } from '@/lib/data/pickups';
import { walletService } from '@/lib/data/wallet';
import { indianDay } from '@/lib/format/date';
import { buildPageHref, parsePage } from '@/lib/url-params';
import { PickupCards, PickupTable } from './pickup-list';
import { ReadyToShip } from './ready-to-ship';

export const metadata: Metadata = { title: 'Pickups & Manifests | Evoc Ships' };

interface PickupsPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function PickupsPage({ searchParams }: PickupsPageProps) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const params = await searchParams;
  const page = parsePage(params.page);
  const service = pickupsService();

  const [wallet, ready, pickups, addresses] = await Promise.all([
    walletService().getBalance(),
    service.readyToShip(),
    service.listPickups({ page }),
    pickupAddressService().list(),
  ]);

  // Without a pickup list there is nowhere to put a new pickup, so scheduling is not offered.
  const canSchedule = pickups.ok;
  const buildHref = (next: number) => buildPageHref('/orders/pickups', {}, next);

  return (
    <AppShell email={session.email} wallet={wallet}>
      <div className="grid gap-6">
        <PageHeader
          title="Pickups & Manifests"
          description="Choose shipments that are ready, schedule a courier pickup and print the manifest."
        />

        <DataCard testId="ready-card" title="Ready to ship" result={ready}>
          {(orders) => (
            <ReadyToShip
              orders={orders}
              canSchedule={canSchedule}
              addresses={addresses.ok ? addresses.data : null}
              today={indianDay(new Date())}
            />
          )}
        </DataCard>

        <DataCard testId="pickups-card" title="Scheduled pickups" result={pickups}>
          {(data) =>
            data.items.length === 0 ? (
              <EmptyState message="No pickups yet. Select shipments above and schedule one." />
            ) : (
              <div className="grid gap-4">
                <PickupTable pickups={data.items} />
                <PickupCards pickups={data.items} />
                <Pagination page={data.page} pageCount={data.pageCount} buildHref={buildHref} />
              </div>
            )
          }
        </DataCard>
      </div>
    </AppShell>
  );
}

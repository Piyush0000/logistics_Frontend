import { Search } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { getDemoSession } from '@/lib/auth/session';
import { b2bService } from '@/lib/data/b2b';
import { pickupAddressService } from '@/lib/data/pickup-addresses';
import { walletService } from '@/lib/data/wallet';
import { buildPageHref, parsePage, parseText } from '@/lib/url-params';
import { B2bCards } from './b2b-cards';
import { B2bTable } from './b2b-table';
import { CreateB2bButton } from './create-b2b-dialog';

export const metadata: Metadata = { title: 'B2B Shipments | Evoc Ships' };

interface B2bPageProps {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function B2bShipmentsPage({ searchParams }: B2bPageProps) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const params = await searchParams;
  const search = parseText(params.search, 100);
  const page = parsePage(params.page);

  const [wallet, result, pickups] = await Promise.all([
    walletService().getBalance(),
    b2bService().listShipments({ page, search }),
    pickupAddressService().list(),
  ]);

  const buildHref = (next: number) => buildPageHref('/orders/b2b', { search }, next);

  return (
    <AppShell email={session.email} wallet={wallet}>
      <div className="grid gap-6">
        <PageHeader
          title="B2B Shipments"
          description="Multi-box shipments to businesses."
          actions={
            result.ok ? (
              <CreateB2bButton addresses={pickups.ok ? pickups.data : null} />
            ) : null
          }
        />

        <form method="get" action="/orders/b2b" role="search" className="flex max-w-xl gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-on-surface/50"
            />
            <input
              type="search"
              name="search"
              defaultValue={search}
              maxLength={100}
              aria-label="Search by LR number or consignee"
              placeholder="Search LR number or consignee"
              className="h-control w-full rounded-control border border-secondary bg-surface pr-3 pl-9 text-sm placeholder:text-on-surface/40 focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-control shrink-0 items-center rounded-control border border-secondary bg-surface px-4 text-sm font-medium hover:border-primary hover:text-primary"
          >
            Search
          </button>
        </form>

        <DataCard testId="b2b-card" title="Shipments" result={result}>
          {(data) =>
            data.items.length === 0 ? (
              <EmptyState message="No B2B shipments yet." />
            ) : (
              <div className="grid gap-4">
                <B2bTable shipments={data.items} />
                <B2bCards shipments={data.items} />
                <Pagination page={data.page} pageCount={data.pageCount} buildHref={buildHref} />
              </div>
            )
          }
        </DataCard>
      </div>
    </AppShell>
  );
}

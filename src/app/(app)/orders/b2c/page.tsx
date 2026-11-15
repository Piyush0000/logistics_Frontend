import { CARRIERS } from '@logicore/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { getDemoSession } from '@/lib/auth/session';
import { ordersService } from '@/lib/data/orders';
import { buildPageHref, parseEnum, parsePage, parseText } from '@/lib/url-params';
import { OrderFilters } from '../filters';
import { OrdersCards } from '../orders-cards';
import { OrdersTable } from '../orders-table';

export const metadata: Metadata = { title: 'B2C Shipments | Evoc Ships' };

const STATUSES = [
  'MANIFESTED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'RTO_INITIATED',
  'RTO_DELIVERED',
  'FAILED',
] as const;
const LIMIT = 50;

interface B2cPageProps {
  searchParams: Promise<{ status?: string; carrier?: string; search?: string; page?: string }>;
}

export default async function B2cShipmentsPage({ searchParams }: B2cPageProps) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const params = await searchParams;
  const status = parseEnum(params.status, STATUSES);
  const carrier = parseEnum(params.carrier, CARRIERS);
  const search = parseText(params.search, 100);
  const page = parsePage(params.page);

  // Every shipment the backend holds today is a single-parcel retail shipment, so the B2C list
  // is the order list.
  const [result] = await Promise.all([
    ordersService().listOrders({ status, carrier, search: search || undefined, page, limit: LIMIT }),
  ]);

  const pageCount = result.ok ? Math.max(1, Math.ceil(result.data.total / LIMIT)) : 1;
  const buildHref = (next: number) =>
    buildPageHref('/orders/b2c', { status, carrier, search }, next);

  return (
    <>
      <div className="grid gap-6">
        <PageHeader
          title="B2C Shipments"
          description="Single-parcel shipments to customers."
          actions={
            <Link
              href="/orders/create"
              className="inline-flex h-11 items-center rounded-control bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary/90 lg:h-control"
            >
              Create B2C shipment
            </Link>
          }
        />

        <OrderFilters />

        {result.source === 'gateway' && search ? (
          <p data-testid="search-scope-note" className="text-xs text-on-surface/70">
            Search covers the shipments on this page only.
          </p>
        ) : null}

        <DataCard testId="b2c-card" title="Shipments" result={result}>
          {(data) =>
            data.items.length === 0 ? (
              <EmptyState message="No B2C shipments match these filters." />
            ) : (
              <div className="grid gap-4">
                <OrdersTable orders={data.items} />
                <OrdersCards orders={data.items} />
                <Pagination page={page} pageCount={pageCount} buildHref={buildHref} />
              </div>
            )
          }
        </DataCard>
      </div>
    </>
  );
}

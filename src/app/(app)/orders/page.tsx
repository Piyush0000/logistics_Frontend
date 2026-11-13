import { CARRIERS } from '@logicore/contracts';
import { ChevronLeft, ChevronRight, PackageOpen } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { SampleBadge } from '@/components/sample-badge';
import { getDemoSession } from '@/lib/auth/session';
import { ordersService } from '@/lib/data/orders';
import { walletService } from '@/lib/data/wallet';
import { buildPageHref, parseEnum, parsePage, parseText } from '@/lib/url-params';
import { OrderFilters } from './filters';
import { OrdersCards } from './orders-cards';
import { OrdersTable } from './orders-table';

export const metadata: Metadata = { title: 'Orders | Evoc Ships' };

const STATUSES = [
  'MANIFESTED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'RTO_INITIATED',
  'RTO_DELIVERED',
  'FAILED',
] as const;

interface OrdersPageProps {
  searchParams: Promise<{
    status?: string;
    carrier?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const params = await searchParams;
  const status = parseEnum(params.status, STATUSES);
  const carrier = parseEnum(params.carrier, CARRIERS);
  const search = parseText(params.search, 100);
  const page = parsePage(params.page);
  const limit = 50;

  const [wallet, ordersResult] = await Promise.all([
    walletService().getBalance(),
    ordersService().listOrders({
      status,
      carrier,
      search: search || undefined,
      page,
      limit,
    }),
  ]);

  const totalPages = ordersResult.ok ? Math.ceil(ordersResult.data.total / limit) || 1 : 1;

  const createPaginationLink = (newPage: number) =>
    buildPageHref('/orders', { status, carrier, search }, newPage);

  return (
    <AppShell email={session.email} wallet={wallet}>
      <div className="grid gap-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold lg:text-3xl">Shipments & Orders</h1>
            <p className="text-sm text-on-surface/70">
              Manage, track, and create shipments across all supported carriers.
            </p>
          </div>
          {ordersResult.ok && ordersResult.source === 'mock' ? (
            <SampleBadge />
          ) : null}
        </div>

        {/* Filter Bar */}
        <OrderFilters />

        {ordersResult.source === 'gateway' && search ? (
          <p data-testid="search-scope-note" className="text-xs text-on-surface/70">
            Search covers the shipments on this page only.
          </p>
        ) : null}

        {/* Orders Content */}
        {!ordersResult.ok ? (
          <div
            data-testid="orders-error"
            className="rounded-card border border-error/30 bg-error/10 p-6 text-center text-sm text-error"
          >
            <p className="font-semibold">Failed to load shipments</p>
            <p className="mt-1 text-xs text-on-surface/80">{ordersResult.error.message}</p>
          </div>
        ) : ordersResult.data.items.length === 0 ? (
          <div
            data-testid="orders-empty"
            className="flex flex-col items-center justify-center rounded-card border border-dashed border-secondary bg-surface p-12 text-center"
          >
            <div className="grid size-12 place-items-center rounded-full bg-muted text-primary">
              <PackageOpen className="size-6" />
            </div>
            <h3 className="mt-4 font-heading text-base font-semibold">No shipments found</h3>
            <p className="mt-1 max-w-sm text-sm text-on-surface/70">
              There are no orders matching your selected filters. Try clearing your filters or create a new shipment.
            </p>
            <Link
              href="/orders/create"
              className="mt-4 inline-flex h-control items-center rounded-control bg-primary px-4 text-sm font-medium text-on-primary"
            >
              Create Shipment
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            <OrdersTable orders={ordersResult.data.items} />
            <OrdersCards orders={ordersResult.data.items} />

            {/* Pagination Controls */}
            {totalPages > 1 ? (
              <div
                data-testid="pagination"
                className="flex items-center justify-between border-t border-secondary pt-4 text-xs text-on-surface/70"
              >
                <span>
                  Showing {(page - 1) * limit + 1} -{' '}
                  {Math.min(page * limit, ordersResult.data.total)} of{' '}
                  {ordersResult.data.total} orders
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    href={createPaginationLink(page - 1)}
                    aria-disabled={page <= 1}
                    className={`inline-flex size-9 items-center justify-center rounded-control border border-secondary bg-surface ${
                      page <= 1 ? 'pointer-events-none opacity-40' : 'hover:border-primary'
                    }`}
                  >
                    <ChevronLeft className="size-4" />
                  </Link>
                  <span className="font-medium">
                    Page {page} of {totalPages}
                  </span>
                  <Link
                    href={createPaginationLink(page + 1)}
                    aria-disabled={page >= totalPages}
                    className={`inline-flex size-9 items-center justify-center rounded-control border border-secondary bg-surface ${
                      page >= totalPages ? 'pointer-events-none opacity-40' : 'hover:border-primary'
                    }`}
                  >
                    <ChevronRight className="size-4" />
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </AppShell>
  );
}


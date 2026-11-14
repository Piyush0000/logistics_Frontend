import { CARRIERS } from "@logicore/contracts";
import { ChevronLeft, ChevronRight, PackageOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SampleBadge } from "@/components/sample-badge";
import { PageHeader } from "@/components/ui/page-header";
import { getDemoSession } from "@/lib/auth/session";
import { ordersService } from "@/lib/data/orders";
import {
  buildPageHref,
  parseEnum,
  parsePage,
  parseText,
} from "@/lib/url-params";
import { OrderFilters } from "./filters";
import { OrdersCards } from "./orders-cards";
import { OrdersTable } from "./orders-table";

export const metadata: Metadata = { title: "Orders | Evoc Ships" };

const STATUSES = [
  "MANIFESTED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "RTO_INITIATED",
  "RTO_DELIVERED",
  "FAILED",
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
  if (!session) redirect("/login");

  const params = await searchParams;
  const status = parseEnum(params.status, STATUSES);
  const carrier = parseEnum(params.carrier, CARRIERS);
  const search = parseText(params.search, 100);
  const page = parsePage(params.page);
  const limit = 50;

  const [ordersResult] = await Promise.all([
    ordersService().listOrders({
      status,
      carrier,
      search: search || undefined,
      page,
      limit,
    }),
  ]);

  // Gateway search filters one gateway page, so its total is not the number of matches: page by the
  // gateway's own pages and say how many matched here instead of a total-based count.
  const pageSearch = ordersResult.source === "gateway" && Boolean(search);
  const totalPages = ordersResult.ok
    ? Math.ceil(ordersResult.data.total / limit) || 1
    : 1;

  const createPaginationLink = (newPage: number) =>
    buildPageHref("/orders", { status, carrier, search }, newPage);

  // Shown for search too (even when this page has no matches), so Next/Previous still walk the gateway's pages.
  const pager =
    ordersResult.ok && totalPages > 1 ? (
      <div
        data-testid="pagination"
        className="flex items-center justify-between border-t border-secondary pt-4 text-xs text-on-surface/70"
      >
        <span>
          {pageSearch
            ? `Searching gateway page ${page}`
            : `Showing ${(page - 1) * limit + 1} - ${Math.min(page * limit, ordersResult.data.total)} of ${ordersResult.data.total} orders`}
        </span>
        <div className="flex items-center gap-2">
          <Link
            href={createPaginationLink(page - 1)}
            aria-disabled={page <= 1}
            aria-label="Previous page"
            className={`inline-flex size-11 items-center justify-center rounded-control border border-secondary bg-surface lg:size-9 ${
              page <= 1
                ? "pointer-events-none opacity-40"
                : "hover:border-primary"
            }`}
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Link>
          <span className="font-medium">
            Page {page} of {totalPages}
          </span>
          <Link
            href={createPaginationLink(page + 1)}
            aria-disabled={page >= totalPages}
            aria-label="Next page"
            className={`inline-flex size-11 items-center justify-center rounded-control border border-secondary bg-surface lg:size-9 ${
              page >= totalPages
                ? "pointer-events-none opacity-40"
                : "hover:border-primary"
            }`}
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    ) : null;

  return (
    <>
      <div className="grid gap-6">
        <PageHeader
          title="Shipments & Orders"
          description="Manage, track, and create shipments across all supported carriers."
          actions={
            ordersResult.ok && ordersResult.source === "mock" ? (
              <SampleBadge />
            ) : undefined
          }
        />

        {/* Filter Bar */}
        <OrderFilters />

        {pageSearch ? (
          <p
            data-testid="search-scope-note"
            className="text-xs text-on-surface/70"
          >
            Search covers the shipments on this page only.
            {ordersResult.ok ? (
              <span
                data-testid="search-match-count"
                className="ml-1 font-medium text-on-surface"
              >
                {ordersResult.data.items.length.toLocaleString("en-IN")}{" "}
                {ordersResult.data.items.length === 1 ? "match" : "matches"} on
                this page.
              </span>
            ) : null}
          </p>
        ) : null}

        {/* Orders Content */}
        {!ordersResult.ok ? (
          <div
            data-testid="orders-error"
            className="motion-rise rounded-card border border-error/30 bg-error/10 p-6 text-center text-sm text-error"
          >
            <p className="font-semibold">Failed to load shipments</p>
            <p className="mt-1 text-xs text-on-surface/80">
              {ordersResult.error.message}
            </p>
          </div>
        ) : ordersResult.data.items.length === 0 ? (
          <>
            <div
              data-testid="orders-empty"
              className="motion-rise flex flex-col items-center justify-center rounded-card border border-dashed border-secondary bg-surface p-8 text-center lg:p-12"
            >
              <div className="grid size-14 place-items-center rounded-control bg-muted text-primary">
                <PackageOpen aria-hidden="true" className="size-6" />
              </div>
              <h3 className="mt-4 font-heading text-base font-semibold">
                No shipments found
              </h3>
              <p className="mt-1 max-w-sm text-sm text-on-surface/70">
                There are no orders matching your selected filters. Try clearing
                your filters or create a new shipment.
              </p>
              <Link
                href="/orders/create"
                className="mt-4 inline-flex h-control items-center rounded-control bg-primary px-4 text-sm font-semibold text-on-primary transition-colors duration-150 hover:bg-primary/90"
              >
                Create Shipment
              </Link>
            </div>
            {pageSearch ? pager : null}
          </>
        ) : (
          <div className="grid gap-4">
            <OrdersTable orders={ordersResult.data.items} />
            <OrdersCards orders={ordersResult.data.items} />

            {/* Pagination Controls */}
            {pager}
          </div>
        )}
      </div>
    </>
  );
}

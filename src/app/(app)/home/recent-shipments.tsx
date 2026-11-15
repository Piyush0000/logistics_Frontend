import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { StatusBadge } from '@/components/orders/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import type { OrderSummary } from '@/lib/data/orders';
import { awbLabel, orderHref } from '@/lib/format/awb';
import { formatDate } from '@/lib/format/date';

/** The latest shipments as a list of links, which suits phones and desktop alike. */
export function RecentShipments({ orders }: { orders: OrderSummary[] }) {
  if (orders.length === 0) {
    return (
      <EmptyState
        message="No shipments yet."
        action={{ label: 'Create your first shipment', href: '/orders/create' }}
      />
    );
  }

  return (
    <div>
      <ul className="grid divide-y divide-secondary/60">
        {orders.map((order) => (
          <li key={order.shipment_id}>
            <Link
              href={orderHref(order)}
              data-testid="recent-shipment"
              className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 hover:bg-tertiary"
            >
              <span className="min-w-0">
                <span className="block font-mono text-sm font-bold break-all text-primary">
                  {awbLabel(order.awb)}
                </span>
                <span className="block text-xs break-all text-on-surface/60">
                  Ref: {order.reference_id || 'N/A'}
                </span>
              </span>
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                <CarrierBadge carrier={order.carrier} />
                <StatusBadge status={order.status} />
                <span className="text-xs text-on-surface/70">{formatDate(order.created_at)}</span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-on-surface/40" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/orders"
        className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
      >
        View all shipments
      </Link>
    </div>
  );
}

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { StatusBadge } from '@/components/orders/status-badge';
import type { OrderSummary } from '@/lib/data/orders';
import { formatDateTime } from '@/lib/format/date';
import { NO_COURIER_STATUS } from './rto-table';

export function RtoCards({ orders }: { orders: OrderSummary[] }) {
  return (
    <div className="motion-stagger grid gap-3 lg:hidden">
      {orders.map((order, index) => (
        <Link
          key={order.shipment_id}
          href={`/orders/${order.awb}`}
          data-testid="rto-item"
          style={{ '--i': index } as CSSProperties}
          className="lift flex min-h-11 min-w-0 flex-col gap-3 rounded-card border border-secondary bg-surface p-4 transition-colors duration-150 hover:border-primary/40 active:bg-muted"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="font-mono text-sm font-semibold [overflow-wrap:anywhere] text-primary">
                {order.awb}
              </span>
              <div className="text-xs text-on-surface/60 [overflow-wrap:anywhere]">
                Ref: {order.reference_id || 'N/A'}
              </div>
            </div>
            <StatusBadge status={order.status} />
          </div>

          <p className="rounded-control bg-tertiary px-3 py-2 text-xs text-on-surface/70 [overflow-wrap:anywhere]">
            Courier status: {order.raw_status || NO_COURIER_STATUS}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-secondary/70 pt-3 text-xs text-on-surface/70">
            <CarrierBadge carrier={order.carrier} />
            <div className="flex items-center gap-1">
              <span>{formatDateTime(order.last_status_at)}</span>
              <ChevronRight aria-hidden="true" className="size-4 text-on-surface/40" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

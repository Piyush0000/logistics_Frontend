import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { StatusBadge } from '@/components/orders/status-badge';
import type { OrderSummary } from '@/lib/data/orders';
import { formatDate } from '@/lib/format/date';

interface OrdersCardsProps {
  orders: OrderSummary[];
}

export function OrdersCards({ orders }: OrdersCardsProps) {
  return (
    <div className="grid gap-3 lg:hidden">
      {orders.map((order) => (
        <Link
          key={order.shipment_id}
          href={`/orders/${order.awb}`}
          data-testid="order-card"
          className="flex min-h-[44px] flex-col gap-2.5 rounded-card border border-secondary bg-surface p-4 transition-all hover:border-primary active:bg-tertiary"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-mono text-sm font-bold text-primary">
                {order.awb}
              </span>
              <div className="text-xs text-on-surface/60">
                Ref: {order.reference_id || 'N/A'}
              </div>
            </div>
            <StatusBadge status={order.status} />
          </div>

          <div className="flex items-center justify-between border-t border-secondary/50 pt-2 text-xs text-on-surface/70">
            <CarrierBadge carrier={order.carrier} />
            <div className="flex items-center gap-1">
              <span>{formatDate(order.created_at)}</span>
              <ChevronRight aria-hidden="true" className="size-4 text-on-surface/40" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}


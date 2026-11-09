import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { StatusBadge } from '@/components/orders/status-badge';
import type { OrderSummary } from '@/lib/data/orders';
import { formatDate } from '@/lib/format/date';

interface OrdersTableProps {
  orders: OrderSummary[];
}

export function OrdersTable({ orders }: OrdersTableProps) {
  return (
    <div className="hidden overflow-x-auto rounded-card border border-secondary bg-surface lg:block">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-secondary bg-tertiary/50 text-xs font-semibold text-on-surface/70">
            <th className="py-3.5 pr-4 pl-6">AWB / Reference</th>
            <th className="px-4 py-3.5">Carrier</th>
            <th className="px-4 py-3.5">Status</th>
            <th className="px-4 py-3.5">Created Date</th>
            <th className="px-4 py-3.5">Last Activity</th>
            <th className="py-3.5 pr-6 pl-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-secondary">
          {orders.map((order) => (
            <tr
              key={order.shipment_id}
              data-testid="order-row"
              className="group hover:bg-tertiary/40"
            >
              <td className="py-4 pr-4 pl-6">
                <Link
                  href={`/orders/${order.awb}`}
                  className="font-mono text-sm font-semibold text-primary hover:underline"
                >
                  {order.awb}
                </Link>
                <div className="text-xs text-on-surface/60">
                  Ref: {order.reference_id || 'N/A'}
                </div>
              </td>
              <td className="px-4 py-4">
                <CarrierBadge carrier={order.carrier} />
              </td>
              <td className="px-4 py-4">
                <StatusBadge status={order.status} />
                {order.stuck ? (
                  <span className="ml-2 inline-block rounded-xs bg-warning/20 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                    Stuck
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-4 text-xs text-on-surface/70">
                {formatDate(order.created_at)}
              </td>
              <td className="px-4 py-4 text-xs text-on-surface/70">
                {formatDate(order.last_status_at)}
              </td>
              <td className="py-4 pr-6 pl-4 text-right">
                <Link
                  href={`/orders/${order.awb}`}
                  aria-label={`View details for ${order.awb}`}
                  className="inline-flex h-8 items-center gap-1 rounded-control border border-secondary bg-surface px-2.5 text-xs font-medium text-on-surface hover:border-primary hover:text-primary"
                >
                  <span>Details</span>
                  <ArrowRight aria-hidden="true" className="size-3" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


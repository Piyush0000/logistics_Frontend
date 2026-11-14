import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { StatusBadge } from '@/components/orders/status-badge';
import { tableStyles as t } from '@/components/ui/table-styles';
import type { OrderSummary } from '@/lib/data/orders';
import { awbLabel, orderHref } from '@/lib/format/awb';
import { formatDate } from '@/lib/format/date';

interface OrdersTableProps {
  orders: OrderSummary[];
}

export function OrdersTable({ orders }: OrdersTableProps) {
  return (
    <div className={`${t.wrap} hidden lg:block`}>
      <table className={t.table}>
        <thead>
          <tr>
            <th className={`${t.th} pl-6`}>AWB / Reference</th>
            <th className={t.th}>Carrier</th>
            <th className={t.th}>Status</th>
            <th className={t.th}>Created Date</th>
            <th className={t.th}>Last Activity</th>
            <th className={`${t.th} pr-6 text-right`}>Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const href = orderHref(order);
            const awb = awbLabel(order.awb);
            return (
              <tr key={order.shipment_id} data-testid="order-row" className={`group ${t.rowHover}`}>
                <td className={`${t.td} pl-6`}>
                  <Link
                    href={href}
                    className={`font-mono text-sm font-semibold hover:underline ${
                      order.awb ? 'text-primary' : 'text-on-surface/60'
                    }`}
                  >
                    {awb}
                  </Link>
                  <div className="text-xs text-on-surface/60 [overflow-wrap:anywhere]">
                    Ref: {order.reference_id || 'N/A'}
                  </div>
                </td>
                <td className={t.td}>
                  <CarrierBadge carrier={order.carrier} />
                </td>
                <td className={t.td}>
                  <StatusBadge status={order.status} />
                  {order.stuck ? (
                    <span className="ml-2 inline-block rounded-xs bg-warning/20 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                      Stuck
                    </span>
                  ) : null}
                </td>
                <td className={`${t.td} text-xs text-on-surface/70`}>{formatDate(order.created_at)}</td>
                <td className={`${t.td} text-xs text-on-surface/70`}>{formatDate(order.last_status_at)}</td>
                <td className={`${t.td} pr-6 text-right`}>
                  <Link
                    href={href}
                    aria-label={`View details for ${awb}`}
                    className="inline-flex h-8 items-center gap-1 rounded-control border border-secondary bg-surface px-2.5 text-xs font-medium text-on-surface transition-colors duration-150 hover:border-primary hover:text-primary"
                  >
                    <span>Details</span>
                    <ArrowRight
                      aria-hidden="true"
                      className="size-3 transition-transform duration-150 group-hover:translate-x-0.5"
                    />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

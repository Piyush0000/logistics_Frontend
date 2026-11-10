import Link from 'next/link';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { StatusBadge } from '@/components/orders/status-badge';
import type { OrderSummary } from '@/lib/data/orders';
import { formatDateTime } from '@/lib/format/date';

export const NO_COURIER_STATUS = 'Not reported';

export function RtoTable({ orders }: { orders: OrderSummary[] }) {
  return (
    <div className="hidden overflow-x-auto rounded-card border border-secondary bg-surface lg:block">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-secondary bg-tertiary/50 text-xs font-semibold text-on-surface/70">
            <th className="py-3.5 pr-4 pl-6">AWB</th>
            <th className="px-4 py-3.5">Reference</th>
            <th className="px-4 py-3.5">Carrier</th>
            <th className="px-4 py-3.5">Status</th>
            <th className="px-4 py-3.5">Courier status</th>
            <th className="py-3.5 pr-6 pl-4">Last update</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-secondary">
          {orders.map((order) => (
            <tr key={order.shipment_id} data-testid="rto-row" className="hover:bg-tertiary/40">
              <td className="py-4 pr-4 pl-6">
                <Link
                  href={`/orders/${order.awb}`}
                  className="font-mono text-sm font-semibold text-primary [overflow-wrap:anywhere] hover:underline"
                >
                  {order.awb}
                </Link>
              </td>
              <td className="max-w-56 px-4 py-4 text-xs text-on-surface/70 [overflow-wrap:anywhere]">
                {order.reference_id || 'N/A'}
              </td>
              <td className="px-4 py-4">
                <CarrierBadge carrier={order.carrier} />
              </td>
              <td className="px-4 py-4">
                <StatusBadge status={order.status} />
              </td>
              <td className="max-w-56 px-4 py-4 text-xs text-on-surface/70 [overflow-wrap:anywhere]">
                {order.raw_status || NO_COURIER_STATUS}
              </td>
              <td className="py-4 pr-6 pl-4 text-xs whitespace-nowrap text-on-surface/70">
                {formatDateTime(order.last_status_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

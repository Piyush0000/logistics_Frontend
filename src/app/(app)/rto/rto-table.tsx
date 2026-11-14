import Link from 'next/link';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { StatusBadge } from '@/components/orders/status-badge';
import { tableStyles } from '@/components/ui/table-styles';
import type { OrderSummary } from '@/lib/data/orders';
import { formatDateTime } from '@/lib/format/date';

export const NO_COURIER_STATUS = 'Not reported';

export function RtoTable({ orders }: { orders: OrderSummary[] }) {
  return (
    <div className={`${tableStyles.wrap} hidden lg:block`}>
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th className={tableStyles.th}>AWB</th>
            <th className={tableStyles.th}>Reference</th>
            <th className={tableStyles.th}>Carrier</th>
            <th className={tableStyles.th}>Status</th>
            <th className={tableStyles.th}>Courier status</th>
            <th className={tableStyles.th}>Last update</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.shipment_id} data-testid="rto-row" className={tableStyles.rowHover}>
              <td className={tableStyles.td}>
                <Link
                  href={`/orders/${order.awb}`}
                  className="font-mono text-sm font-semibold text-primary [overflow-wrap:anywhere] hover:underline"
                >
                  {order.awb}
                </Link>
              </td>
              <td className={`${tableStyles.td} max-w-56 text-xs text-on-surface/70 [overflow-wrap:anywhere]`}>
                {order.reference_id || 'N/A'}
              </td>
              <td className={tableStyles.td}>
                <CarrierBadge carrier={order.carrier} />
              </td>
              <td className={tableStyles.td}>
                <StatusBadge status={order.status} />
              </td>
              <td className={`${tableStyles.td} max-w-56 text-xs text-on-surface/70 [overflow-wrap:anywhere]`}>
                {order.raw_status || NO_COURIER_STATUS}
              </td>
              <td className={`${tableStyles.td} text-xs whitespace-nowrap text-on-surface/70`}>
                {formatDateTime(order.last_status_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

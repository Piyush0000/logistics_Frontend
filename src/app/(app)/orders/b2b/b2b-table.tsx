import { CarrierBadge } from '@/components/orders/carrier-badge';
import { StatusBadge } from '@/components/orders/status-badge';
import type { B2bShipment } from '@/lib/data/b2b';
import { formatDate } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';

const HEAD = 'px-4 py-3.5';

export function B2bTable({ shipments }: { shipments: B2bShipment[] }) {
  return (
    <div className="hidden overflow-x-auto rounded-card border border-secondary bg-surface lg:block">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-secondary bg-tertiary/50 text-xs font-semibold text-on-surface/70">
            <th className={`${HEAD} pl-6`}>LR number</th>
            <th className={HEAD}>Consignee</th>
            <th className={HEAD}>Destination</th>
            <th className={`${HEAD} text-right`}>Boxes</th>
            <th className={`${HEAD} text-right`}>Total weight</th>
            <th className={`${HEAD} text-right`}>Invoice value</th>
            <th className={HEAD}>Carrier</th>
            <th className={HEAD}>Status</th>
            <th className={`${HEAD} pr-6`}>Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-secondary">
          {shipments.map((shipment) => (
            <tr key={shipment.id} data-testid="b2b-row" className="align-top hover:bg-tertiary/40">
              <td className="py-4 pr-4 pl-6 font-mono text-sm font-semibold whitespace-nowrap text-primary">
                {shipment.lrNumber}
              </td>
              <td className="max-w-64 min-w-40 px-4 py-4 [overflow-wrap:anywhere]">
                {shipment.consignee}
              </td>
              <td className="max-w-48 px-4 py-4 [overflow-wrap:anywhere]">
                {shipment.destinationCity}
              </td>
              <td className="px-4 py-4 text-right">{shipment.boxes}</td>
              <td className="px-4 py-4 text-right whitespace-nowrap">{shipment.totalWeightKg} kg</td>
              <td className="px-4 py-4 text-right whitespace-nowrap">
                {formatPaise(shipment.invoiceValuePaise)}
              </td>
              <td className="px-4 py-4">
                <CarrierBadge carrier={shipment.carrier} />
              </td>
              <td className="px-4 py-4">
                <StatusBadge status={shipment.status} />
              </td>
              <td className="py-4 pr-6 pl-4 text-xs whitespace-nowrap text-on-surface/70">
                {formatDate(shipment.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { CarrierBadge } from '@/components/orders/carrier-badge';
import { StatusBadge } from '@/components/orders/status-badge';
import type { B2bShipment } from '@/lib/data/b2b';
import { formatDate } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-on-surface/60">{label}</dt>
      <dd className="[overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}

export function B2bCards({ shipments }: { shipments: B2bShipment[] }) {
  return (
    <div className="motion-stagger grid gap-3 lg:hidden">
      {shipments.map((shipment) => (
        <article
          key={shipment.id}
          data-testid="b2b-item"
          className="grid min-h-11 gap-3 rounded-card border border-secondary bg-surface p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-sm font-bold [overflow-wrap:anywhere] text-primary">
                {shipment.lrNumber}
              </p>
              <p className="mt-0.5 text-sm font-medium [overflow-wrap:anywhere]">
                {shipment.consignee}
              </p>
            </div>
            <StatusBadge status={shipment.status} />
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <Fact label="Destination" value={shipment.destinationCity} />
            <Fact label="Boxes" value={String(shipment.boxes)} />
            <Fact label="Total weight" value={`${shipment.totalWeightKg} kg`} />
            <Fact label="Invoice value" value={formatPaise(shipment.invoiceValuePaise)} />
          </dl>
          <div className="flex items-center justify-between gap-2 border-t border-secondary/50 pt-2 text-xs text-on-surface/70">
            <CarrierBadge carrier={shipment.carrier} />
            <span>{formatDate(shipment.createdAt)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

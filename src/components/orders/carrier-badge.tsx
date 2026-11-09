import { Truck } from 'lucide-react';

interface CarrierBadgeProps {
  carrier: string;
}

const CARRIER_LABELS: Record<string, string> = {
  ekart: 'Ekart',
  delhivery: 'Delhivery',
  shadowfax: 'Shadowfax',
  bluedart: 'Blue Dart',
  dhl: 'DHL',
};

export function CarrierBadge({ carrier }: CarrierBadgeProps) {
  const label = CARRIER_LABELS[carrier.toLowerCase()] || carrier.toUpperCase();

  return (
    <span
      data-testid="carrier-badge"
      className="inline-flex items-center gap-1.5 rounded-md border border-secondary bg-surface px-2 py-0.5 text-xs font-medium text-on-surface"
    >
      <Truck aria-hidden="true" className="size-3 text-accent" />
      {label}
    </span>
  );
}


import { NormalizedStatus } from '@logicore/contracts';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  [NormalizedStatus.PICKUP_SCHEDULED]: {
    label: 'Pickup Scheduled',
    className: 'border-primary/40 bg-primary/10 text-primary',
  },
  [NormalizedStatus.MANIFESTED]: {
    label: 'Manifested',
    className: 'border-secondary bg-surface text-on-surface/80',
  },
  [NormalizedStatus.IN_TRANSIT]: {
    label: 'In Transit',
    className: 'border-primary/40 bg-primary/10 text-primary',
  },
  [NormalizedStatus.OUT_FOR_DELIVERY]: {
    label: 'Out for Delivery',
    className: 'border-accent/40 bg-accent/10 text-accent font-semibold',
  },
  [NormalizedStatus.DELIVERED]: {
    label: 'Delivered',
    className: 'border-success/40 bg-success/15 text-success font-semibold',
  },
  [NormalizedStatus.RTO_INITIATED]: {
    label: 'RTO Initiated',
    className: 'border-warning/40 bg-warning/15 text-warning font-semibold',
  },
  [NormalizedStatus.RTO_DELIVERED]: {
    label: 'RTO Delivered',
    className: 'border-warning/40 bg-warning/15 text-warning font-semibold',
  },
  [NormalizedStatus.CANCELLED]: {
    label: 'Cancelled',
    className: 'border-error/40 bg-error/15 text-error font-semibold',
  },
  [NormalizedStatus.FAILED]: {
    label: 'Failed',
    className: 'border-error/40 bg-error/15 text-error font-semibold',
  },
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status.replace(/_/g, ' '),
    className: 'border-secondary bg-surface text-on-surface/70',
  };

  const sizeClasses =
    size === 'md' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[11px]';

  return (
    <span
      data-testid="status-badge"
      className={`inline-flex items-center rounded-full border leading-tight ${sizeClasses} ${config.className}`}
    >
      {config.label}
    </span>
  );
}


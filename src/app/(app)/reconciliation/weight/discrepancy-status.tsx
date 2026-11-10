import type { DiscrepancyStatus } from '@/lib/data/weight';

export const STATUS_LABELS: Record<DiscrepancyStatus, string> = {
  open: 'Open',
  disputed: 'Disputed',
  accepted: 'Accepted',
  resolved: 'Resolved',
};

const STATUS_TONES: Record<DiscrepancyStatus, string> = {
  open: 'bg-warning/15',
  disputed: 'bg-muted text-primary',
  accepted: 'bg-tertiary',
  resolved: 'bg-success/15',
};

export function DiscrepancyStatusBadge({ status }: { status: DiscrepancyStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs leading-4 font-medium ${STATUS_TONES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

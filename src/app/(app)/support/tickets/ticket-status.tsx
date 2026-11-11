import { STATUS_LABELS, type TicketStatus } from '@/lib/data/support';

const TONES: Record<TicketStatus, string> = {
  open: 'bg-muted text-primary',
  awaiting_you: 'bg-warning/15',
  resolved: 'bg-success/15',
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs leading-4 font-medium ${TONES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

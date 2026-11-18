import { CheckCircle2, Clock } from 'lucide-react';
import { StatusBadge } from '@/components/orders/status-badge';
import type { ShipmentTimelineEvent } from '@/lib/admin/data/shipments';
import { formatDateTime } from '@/lib/format/date';

export function AdminTrackingTimeline({ events }: { events: ShipmentTimelineEvent[] }) {
  if (!events || events.length === 0) {
    return <p className="text-sm text-on-surface/70">No tracking events recorded yet.</p>;
  }

  return (
    <ol className="grid gap-0" data-testid="admin-tracking-timeline">
      {events.map((event, index) => {
        const isLatest = index === 0;
        const isLast = index === events.length - 1;

        return (
          <li
            key={`${event.occurredAt}-${index}`}
            data-testid="admin-timeline-event"
            className="flex gap-3"
          >
            {/* Timeline node & vertical connector */}
            <div className="flex flex-col items-center">
              <div
                className={`grid size-7 shrink-0 place-items-center rounded-full border transition-colors ${
                  isLatest
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-secondary bg-tertiary text-on-surface/50'
                }`}
              >
                {isLatest ? (
                  <Clock aria-hidden="true" className="size-3.5" />
                ) : (
                  <CheckCircle2 aria-hidden="true" className="size-3.5" />
                )}
              </div>
              {!isLast ? <div className="w-0.5 grow bg-secondary/80" /> : null}
            </div>

            {/* Event content */}
            <div className="min-w-0 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={event.status} />
                {event.location ? (
                  <span className="text-xs font-medium text-on-surface/70">
                    at {event.location}
                  </span>
                ) : null}
              </div>

              {event.rawStatus ? (
                <p className="mt-1 break-words text-xs text-on-surface/80">
                  {event.rawStatus}
                </p>
              ) : null}

              <time className="mt-1 block font-mono text-[11px] text-on-surface/50">
                {formatDateTime(event.occurredAt)}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

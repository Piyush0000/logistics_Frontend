import { CheckCircle2 } from 'lucide-react';
import type { TrackingEvent } from '@/lib/data/tracking';
import { formatDateTime } from '@/lib/format/date';
import { statusLabel } from '@/lib/format/status';

/** A vertical timeline, newest event first. */
export function TrackingTimeline({ events }: { events: TrackingEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-on-surface/70">No tracking events yet.</p>;
  }
  return (
    <ol className="grid">
      {events.map((event, index) => (
        <li key={`${event.occurredAt}-${index}`} data-testid="timeline-event" className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`grid size-7 shrink-0 place-items-center rounded-full border ${
                index === 0
                  ? 'border-primary bg-primary text-tertiary'
                  : 'border-secondary bg-tertiary text-on-surface/50'
              }`}
            >
              <CheckCircle2 aria-hidden="true" className="size-4" />
            </div>
            {index < events.length - 1 ? <div className="w-0.5 grow bg-secondary" /> : null}
          </div>
          <div className="min-w-0 pb-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-sm font-semibold text-on-surface">{statusLabel(event.status)}</span>
              {event.location ? (
                <span className="break-words text-xs text-on-surface/60">at {event.location}</span>
              ) : null}
            </div>
            {event.rawStatus && event.rawStatus !== statusLabel(event.status) ? (
              <p className="mt-0.5 break-words text-xs text-on-surface/80">{event.rawStatus}</p>
            ) : null}
            <span className="mt-1 block text-[11px] text-on-surface/50">{formatDateTime(event.occurredAt)}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

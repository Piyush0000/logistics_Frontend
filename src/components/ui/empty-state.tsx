import { Inbox } from 'lucide-react';
import Link from 'next/link';

/** What a list shows when it has no rows: a plain message and, when there is one, the next step. */
export function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: { label: string; href: string; prefetch?: boolean };
}) {
  return (
    <div
      data-testid="empty-state"
      className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-secondary bg-surface px-4 py-10 text-center"
    >
      <span className="grid size-12 place-items-center rounded-full bg-muted text-primary">
        <Inbox aria-hidden="true" className="size-6" />
      </span>
      <p className="max-w-sm text-sm text-on-surface/70">{message}</p>
      {action ? (
        <Link
          href={action.href}
          prefetch={action.prefetch}
          className="inline-flex h-11 items-center rounded-control bg-primary px-4 text-sm font-medium text-on-primary lg:h-control"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

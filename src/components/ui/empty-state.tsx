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
      {/* The logo's block and bars, drawn faintly: an empty shelf. */}
      <svg viewBox="0 0 456 280" aria-hidden="true" className="h-10 w-auto text-primary/25">
        <path d="M0 35A35 35 0 0 1 35 0H269A35 35 0 0 1 304 35V280H0Z" fill="currentColor" />
        <rect x="351" y="82" width="105" height="35" rx="6" className="fill-primary/40" />
        <rect x="351" y="164" width="105" height="34" rx="6" className="fill-primary/40" />
      </svg>
      <p className="max-w-sm text-sm text-on-surface/70">{message}</p>
      {action ? (
        <Link
          href={action.href}
          prefetch={action.prefetch}
          className="inline-flex h-11 items-center rounded-control bg-primary px-4 text-sm font-semibold text-on-primary transition-[background-color,transform] duration-150 hover:bg-accent active:scale-[.97] lg:h-control"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

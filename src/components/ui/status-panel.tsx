import { TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

export const PANEL_PRIMARY =
  'inline-flex h-11 items-center justify-center rounded-control bg-primary px-4 text-sm font-semibold text-on-primary transition-[background-color,transform] duration-150 hover:bg-accent active:scale-[.97] lg:h-control';
export const PANEL_SECONDARY =
  'inline-flex h-11 items-center justify-center rounded-control border border-secondary bg-surface px-4 text-sm font-medium text-on-surface transition-colors duration-150 hover:border-primary/40 hover:bg-muted lg:h-control';

/** A centred card for pages that cannot show their content: not found and errors. */
export function StatusPanel({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children: ReactNode;
}) {
  return (
    <section className="motion-rise mx-auto flex w-full max-w-md flex-col items-center gap-3 rounded-card border border-secondary bg-surface px-4 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-muted text-primary">
        <TriangleAlert aria-hidden="true" className="size-6" />
      </span>
      <h1 className="font-heading text-2xl leading-8 font-bold tracking-tight break-words">{title}</h1>
      <p className="text-sm text-on-surface/70">{message}</p>
      <div className="mt-2 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">{children}</div>
    </section>
  );
}

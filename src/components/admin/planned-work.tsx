import { Hammer } from 'lucide-react';

/**
 * The work still to do on an admin section, shown at the bottom of its page during development.
 * The owner deletes items as they ship and removes the card when the section is finished.
 */
export function PlannedWork({ items }: { items: string[] }) {
  return (
    <section
      data-testid="planned-work"
      aria-labelledby="planned-work-title"
      className="rounded-card border border-dashed border-secondary bg-surface p-card"
    >
      <h2 id="planned-work-title" className="flex items-center gap-2 font-heading text-lg leading-7 font-bold tracking-tight">
        <span className="grid size-8 place-items-center rounded-control bg-warning/15 text-warning">
          <Hammer aria-hidden="true" className="size-4" />
        </span>
        Still to build here
      </h2>
      <ul className="mt-3 grid list-disc gap-1.5 pl-5 text-sm text-on-surface/75">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

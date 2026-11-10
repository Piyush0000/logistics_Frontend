import type { LucideIcon } from 'lucide-react';

/** An icon, a label and a value, as in the dashboard's shipment tiles. */
export function StatTile({
  label,
  value,
  icon: Icon,
  testId,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  testId?: string;
}) {
  return (
    <div data-testid={testId} className="flex min-w-0 items-center gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-control bg-muted text-primary">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm leading-5 text-on-surface/70">{label}</span>
        <span className="block font-display text-xl leading-7 font-bold break-words">{value}</span>
      </span>
    </div>
  );
}

import { Truck } from 'lucide-react';

/** Placeholder until the final name and logo are supplied. Change them here only. */
export function BrandMark({ compact = false }: { compact?: boolean }) {
  const logo = (
    <span
      role={compact ? 'img' : undefined}
      aria-label={compact ? 'Evoc Logistics' : undefined}
      className="grid size-11 shrink-0 place-items-center rounded-control border border-dashed border-tertiary/60"
    >
      <Truck aria-hidden="true" className="size-6" />
    </span>
  );

  if (compact) return logo;

  return (
    <div className="flex items-center gap-3 text-left">
      {logo}
      <span>
        <span className="block font-heading text-lg leading-6 font-extrabold">Evoc Logistics</span>
        <span className="block text-xs leading-4 text-tertiary/80">Placeholder logo</span>
      </span>
    </div>
  );
}

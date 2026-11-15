import { safe } from './tone';

/** A round "tank" that fills to a percentage, with a gentle wave on top (the wallet meter). */
export function FillMeter({ percent, label }: { percent: number; label: string }) {
  const pct = Math.min(100, safe(percent));
  const shown = `${Math.round(pct)}%`;
  return (
    <figure className="m-0 flex flex-col items-center gap-2">
      <div
        role="img"
        aria-label={`${label}: ${shown}`}
        className="relative size-24 overflow-hidden rounded-full border-[3px] border-muted bg-tertiary"
      >
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 bg-primary transition-[height] duration-700"
          style={{ height: `${pct}%` }}
        >
          <span className="absolute -top-2 left-0 h-4 w-[200%] rounded-[40%] bg-primary" />
        </span>
        <span className="absolute inset-0 grid place-items-center font-mono text-base font-medium text-on-surface mix-blend-normal">
          <span className={pct > 55 ? 'text-on-primary' : ''}>{shown}</span>
        </span>
      </div>
      <figcaption className="text-xs text-on-surface/60">{label}</figcaption>
    </figure>
  );
}

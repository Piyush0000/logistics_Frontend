import { safe, TONE_BG, type Tone } from './tone';

/** A single stacked percentage bar with a legend (for example spend split). 2px gaps between parts. */
export function SegmentBar({
  title,
  segments,
}: {
  title: string;
  segments: { label: string; value: number; tone: Tone }[];
}) {
  const total = segments.reduce((sum, s) => sum + safe(s.value), 0);
  const parts = segments.map((s) => ({ ...s, pct: total > 0 ? (safe(s.value) / total) * 100 : 0 }));
  const summary = `${title}: ${parts.map((p) => `${p.label} ${Math.round(p.pct)}%`).join(', ')}`;

  return (
    <figure className="m-0 min-w-0">
      <div role="img" aria-label={summary} className="motion-reveal-x flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-secondary">
        {parts
          .filter((p) => p.pct > 0)
          .map((p) => (
            <span
              key={p.label}
              title={`${p.label}: ${Math.round(p.pct)}%`}
              className={`h-full first:rounded-l-full last:rounded-r-full ${TONE_BG[p.tone]}`}
              style={{ width: `${p.pct}%` }}
            />
          ))}
      </div>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface/70">
        {parts.map((p) => (
          <span key={p.label} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={`size-2 rounded-full ${TONE_BG[p.tone]}`} />
            {p.label} <span className="font-mono">{Math.round(p.pct)}%</span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

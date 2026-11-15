import { safe, TONE_BG, TONE_STROKE, type Tone } from './tone';

const W = 320;
const H = 160;
const PAD = { top: 12, right: 8, bottom: 22, left: 8 };

/**
 * One or more lines over the same labels (days). One y-scale only. A legend shows for two or more
 * series; each point has a hover title; a table carries the numbers for screen readers.
 */
export function LineChart({
  title,
  labels,
  series,
  format = (n) => n.toLocaleString('en-IN'),
}: {
  title: string;
  labels: string[];
  series: { name: string; points: number[]; tone: Tone }[];
  format?: (n: number) => string;
}) {
  const count = labels.length;
  if (count < 2 || series.length === 0) return null;
  const max = Math.max(1, ...series.flatMap((s) => s.points.map(safe)));
  const x = (i: number) => PAD.left + (i / (count - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - safe(v) / max) * (H - PAD.top - PAD.bottom);
  const labelEvery = Math.max(1, Math.ceil(count / 6));

  return (
    <figure className="m-0 min-w-0">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} className="block h-auto w-full">
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + f * (H - PAD.top - PAD.bottom)}
            y2={PAD.top + f * (H - PAD.top - PAD.bottom)}
            strokeDasharray="2 4"
            className="stroke-secondary"
          />
        ))}
        <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} className="stroke-secondary" />
        {series.map((s) => (
          <g key={s.name}>
            <path
              d={labels.map((_, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(s.points[i] ?? 0).toFixed(1)}`).join(' ')}
              fill="none"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              className={`${TONE_STROKE[s.tone]} motion-reveal-x`}
            />
            {labels.map((label, i) => (
              <circle key={label} cx={x(i)} cy={y(s.points[i] ?? 0)} r="7" className="fill-transparent">
                <title>{`${s.name}, ${label}: ${format(safe(s.points[i] ?? 0))}`}</title>
              </circle>
            ))}
          </g>
        ))}
        {labels.map((label, i) =>
          i % labelEvery === 0 || i === count - 1 ? (
            <text key={label} x={x(i)} y={H - 6} textAnchor="middle" className="fill-on-surface/60 text-[9px]">
              {label}
            </text>
          ) : null,
        )}
      </svg>
      {series.length > 1 ? (
        <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface/70">
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className={`size-2 rounded-full ${TONE_BG[s.tone]}`} />
              {s.name}
            </span>
          ))}
        </figcaption>
      ) : null}
      <div className="sr-only">
        <table>
          <caption>{title}</caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              {series.map((s) => (
                <th key={s.name} scope="col">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((label, i) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {series.map((s) => (
                  <td key={s.name}>{format(safe(s.points[i] ?? 0))}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

import { safe, TONE_STROKE, type Tone } from './tone';

const R = 45;
const ARC = Math.PI * R; // half circle

/** A half-ring gauge for one percentage (for example delivery success). */
export function Gauge({
  value,
  label,
  testId,
  tone = 'primary',
}: {
  value: number;
  label: string;
  testId?: string;
  tone?: Tone;
}) {
  const pct = Math.min(100, safe(value));
  const shown = `${Math.round(pct)}%`;
  return (
    <figure data-testid={testId} className="m-0 flex flex-col items-center">
      <svg viewBox="0 0 110 64" role="img" aria-label={`${label}: ${shown}`} className="h-auto w-full max-w-44">
        <path d="M10 58 A45 45 0 0 1 100 58" fill="none" strokeWidth="10" strokeLinecap="round" className="stroke-secondary" />
        <path
          d="M10 58 A45 45 0 0 1 100 58"
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * ARC} ${ARC}`}
          className={`${TONE_STROKE[tone]} motion-reveal-x`}
        >
          <title>{`${label}: ${shown}`}</title>
        </path>
        <text x="55" y="54" textAnchor="middle" className="fill-on-surface font-mono text-[15px] font-medium">
          {shown}
        </text>
      </svg>
      <figcaption className="mt-1 text-xs text-on-surface/60">{label}</figcaption>
    </figure>
  );
}

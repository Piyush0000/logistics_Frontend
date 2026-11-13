import { safe, TONE_STROKE, type Tone } from './tone';

/** A tiny trend line with no axes; the label is read out instead. */
export function Sparkline({ points, label, tone = 'primary' }: { points: number[]; label: string; tone?: Tone }) {
  const clean = points.map(safe);
  if (clean.length < 2) return null;
  const max = Math.max(...clean);
  const min = Math.min(...clean);
  const range = max - min || 1;
  const d = clean
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${((i / (clean.length - 1)) * 100).toFixed(1)} ${(26 - ((p - min) / range) * 22).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" role="img" aria-label={label} className="h-7 w-20">
      <path
        d={d}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className={`${TONE_STROKE[tone]} motion-reveal-x`}
      />
    </svg>
  );
}

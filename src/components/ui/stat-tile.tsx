import type { LucideIcon } from 'lucide-react';

export type StatTone = 'primary' | 'success' | 'warning' | 'accent' | 'error';

const TONE: Record<StatTone, { chip: string; dot: string; line: string }> = {
  primary: { chip: 'bg-muted text-primary', dot: 'bg-primary', line: 'stroke-primary' },
  success: { chip: 'bg-success/15 text-success', dot: 'bg-success', line: 'stroke-success' },
  warning: { chip: 'bg-warning/15 text-warning', dot: 'bg-warning', line: 'stroke-warning' },
  accent: { chip: 'bg-accent/15 text-accent dark:text-primary', dot: 'bg-accent', line: 'stroke-accent' },
  error: { chip: 'bg-error/15 text-error', dot: 'bg-error', line: 'stroke-error' },
};

/**
 * Splits "12,384" into "12," and "384" (or "₹4,12,540" into "₹4," and "12,540") for the two-tone
 * number: the leading group in full colour, the rest softer. Values with no separator stay whole.
 */
export function splitTwoTone(value: string): [string, string] {
  const at = value.search(/[,.]/);
  return at <= 0 ? [value, ''] : [value.slice(0, at + 1), value.slice(at + 1)];
}

function Spark({ points, tone }: { points: number[]; tone: StatTone }) {
  const clean = points.map((p) => (Number.isFinite(p) ? p : 0));
  if (clean.length < 2) return null;
  const max = Math.max(...clean);
  const min = Math.min(...clean);
  const range = max - min || 1;
  const d = clean
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${((i / (clean.length - 1)) * 100).toFixed(1)} ${(26 - ((p - min) / range) * 22).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true" className="h-7 w-20 shrink-0">
      <path
        d={d}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        className={`${TONE[tone].line} [stroke-dasharray:1] motion-safe:animate-[evoc-draw_1.2s_var(--ease-evoc)_both]`}
      />
    </svg>
  );
}

/**
 * An icon, a label and a value, as in the dashboard's shipment tiles. Optional: a tone colour, a change
 * chip ("↗ 9% vs last month") and a sparkline. The value uses the two-tone figure style.
 */
export function StatTile({
  label,
  value,
  icon: Icon,
  testId,
  tone = 'primary',
  delta,
  spark,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  testId?: string;
  tone?: StatTone;
  delta?: { text: string; good: boolean; direction: 'up' | 'down' | 'flat' };
  spark?: number[];
}) {
  const [lead, rest] = splitTwoTone(String(value));
  const arrow = delta ? { up: '↗', down: '↘', flat: '→' }[delta.direction] : '';

  return (
    <div data-testid={testId} className="flex min-w-0 items-center gap-3">
      <span className={`grid size-11 shrink-0 place-items-center rounded-control ${TONE[tone].chip}`}>
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-5 text-on-surface/70">{label}</span>
        <span className="block font-mono text-xl leading-7 font-medium break-words">
          {lead}
          {rest ? <span className="text-on-surface/45">{rest}</span> : null}
        </span>
        {delta ? (
          <span
            className={`mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[11px] leading-4 font-medium ${
              delta.good ? 'bg-success/15 text-success' : 'bg-error/15 text-error'
            }`}
          >
            {arrow} {delta.text}
          </span>
        ) : null}
      </span>
      {spark ? <Spark points={spark} tone={tone} /> : null}
    </div>
  );
}

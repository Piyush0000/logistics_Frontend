import { ArrowRight, CircleCheck, Info, Sparkles, TriangleAlert, Zap, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { SampleBadge } from '@/components/sample-badge';
import type { Insight, InsightTone } from '@/lib/insights';

const TONE: Record<InsightTone, { icon: LucideIcon; chip: string }> = {
  action: { icon: Zap, chip: 'bg-muted text-primary' },
  warning: { icon: TriangleAlert, chip: 'bg-warning/15 text-warning' },
  info: { icon: Info, chip: 'bg-series-2/15 text-series-2' },
  good: { icon: CircleCheck, chip: 'bg-success/15 text-success' },
};

function InsightRow({ insight, index }: { insight: Insight; index: number }) {
  const { icon: Icon, chip } = TONE[insight.tone];
  return (
    <li style={{ '--i': index } as CSSProperties}>
      <Link
        href={insight.href}
        className="group flex min-h-14 items-start gap-3 rounded-control p-2.5 transition-colors duration-150 hover:bg-muted/70"
      >
        <span className={`grid size-9 shrink-0 place-items-center rounded-control ${chip}`}>
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm leading-5 font-semibold">{insight.title}</span>
          <span className="mt-0.5 block text-xs leading-5 text-on-surface/65">{insight.detail}</span>
        </span>
        <ArrowRight
          aria-hidden="true"
          className="mt-2 size-4 shrink-0 text-on-surface/40 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </Link>
    </li>
  );
}

/** Smart insights: rule-based notes from the merchant's own data (no AI service involved). */
export function InsightsPanel({ insights }: { insights: Insight[] }) {
  return (
    <section
      data-testid="insights-card"
      aria-labelledby="insights-title"
      className="motion-rise min-w-0 rounded-card border border-secondary bg-surface p-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="insights-title" className="flex items-center gap-2 font-heading text-lg leading-7 font-bold tracking-tight">
          <Sparkles aria-hidden="true" className="size-4 text-primary" />
          Smart insights
        </h2>
        {insights.some((i) => i.isSample) ? <SampleBadge /> : null}
      </div>
      <p className="mt-1 text-xs text-on-surface/60">Spotted in your shipping data. Updated on every visit.</p>
      {insights.length === 0 ? (
        <p className="mt-3 text-sm text-on-surface/60">No new insights right now.</p>
      ) : (
        <ul className="motion-stagger mt-3 grid gap-1">
          {insights.map((insight, index) => (
            <InsightRow key={insight.id} insight={insight} index={index} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** The insights that need an action today, as a short checklist. */
export function NeedsYouToday({ items }: { items: Insight[] }) {
  return (
    <section
      data-testid="needs-you-today"
      aria-labelledby="needs-title"
      className="motion-rise min-w-0 rounded-card border border-secondary bg-surface p-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="needs-title" className="font-heading text-lg leading-7 font-bold tracking-tight">
          Needs you today
        </h2>
        {items.some((i) => i.isSample) ? <SampleBadge /> : null}
      </div>
      {items.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 rounded-control bg-success/10 p-3 text-sm text-success">
          <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
          You are all caught up.
        </p>
      ) : (
        <ul className="motion-stagger mt-3 grid gap-1">
          {items.map((insight, index) => (
            <InsightRow key={insight.id} insight={insight} index={index} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function InsightsSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-4 lg:gap-5">
      <span className="block h-48 animate-pulse rounded-card bg-secondary/40" />
      <span className="block h-64 animate-pulse rounded-card bg-secondary/40" />
    </div>
  );
}

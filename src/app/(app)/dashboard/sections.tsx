import { CalendarDays, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { SampleBadge } from '@/components/sample-badge';
import type { DataResult } from '@/lib/data/source';
import { RetryButton } from './retry-button';

const NOTICE = 'Sample notice:';
const NOTICE_TEXT = 'carrier and service updates will appear here.';

function TickerCopy({ hidden }: { hidden?: boolean }) {
  return (
    <span aria-hidden={hidden} className="pr-16 whitespace-nowrap">
      <strong className="font-bold">{NOTICE}</strong> {NOTICE_TEXT}
    </span>
  );
}

export function AlertTicker() {
  return (
    <div
      data-testid="ticker"
      className="overflow-hidden rounded-control border border-warning/40 bg-warning/15 py-2 text-sm"
    >
      <div className="flex w-max animate-ticker hover:[animation-play-state:paused]">
        <TickerCopy />
        {Array.from({ length: 7 }, (_, index) => (
          <TickerCopy key={index} hidden />
        ))}
      </div>
    </div>
  );
}

export function PageHeading({ dateRange }: { dateRange: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <h1 className="font-heading text-[28px] leading-9 font-bold lg:text-[40px] lg:leading-10">
        Dashboard
      </h1>
      <div className="flex flex-col gap-1 sm:items-end">
        <button
          type="button"
          disabled
          className="flex h-control cursor-not-allowed items-center gap-2 rounded-control border border-secondary bg-surface px-3 text-sm text-on-surface/70"
        >
          <CalendarDays aria-hidden="true" className="size-4" />
          {dateRange}
        </button>
        <p className="text-xs text-on-surface/70">Date filter is not available yet.</p>
      </div>
    </div>
  );
}

const TABS = ['Overview', 'Pickups', 'NDR', 'RTO', 'Delivered', 'Revenue', 'SMS'];

export function OverviewTabs() {
  return (
    <div
      role="tablist"
      aria-label="Dashboard views"
      className="flex overflow-x-auto rounded-full bg-muted [scrollbar-width:none]"
    >
      {TABS.map((tab, index) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={index === 0}
          disabled={index !== 0}
          className={`h-11 min-w-24 flex-1 shrink-0 rounded-full px-4 text-sm ${
            index === 0
              ? 'bg-primary font-medium text-tertiary'
              : 'cursor-not-allowed text-on-surface/70'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

const TONES = {
  primary: { card: 'border-primary/30 bg-primary/5', icon: 'border-primary text-primary' },
  success: { card: 'border-success/40 bg-success/10', icon: 'border-success text-on-surface' },
  warning: { card: 'border-warning/40 bg-warning/10', icon: 'border-warning text-on-surface' },
  accent: { card: 'border-accent/40 bg-accent/10', icon: 'border-accent text-on-surface' },
};

export function KpiCard({
  title,
  value,
  note,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  note: string;
  icon: LucideIcon;
  tone: keyof typeof TONES;
}) {
  return (
    <div className={`rounded-card border p-card ${TONES[tone].card}`}>
      <div className="flex items-start justify-between gap-2">
        {/* Keeps values level when one title wraps to two lines and its neighbour doesn't. */}
        <p className="min-h-10 min-w-0 text-sm leading-5 md:min-h-0 md:text-base md:leading-6">
          {title}
        </p>
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-full border md:size-11 ${TONES[tone].icon}`}
        >
          <Icon aria-hidden="true" className="size-4 md:size-5" />
        </span>
      </div>
      <p className="mt-1 font-display text-xl leading-7 font-bold md:text-2xl md:leading-8">
        {value}
      </p>
      <p className="mt-1 text-xs leading-4 text-on-surface/70 md:text-sm md:leading-5">{note}</p>
    </div>
  );
}

export function DetailCard<T>({
  testId,
  title,
  result,
  children,
}: {
  testId: string;
  title: string;
  result: DataResult<T>;
  children: (data: T) => ReactNode;
}) {
  return (
    <section
      data-testid={testId}
      className="rounded-card border border-secondary bg-surface p-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-xl leading-7 lg:text-2xl lg:leading-8">{title}</h2>
        {result.source === 'mock' ? <SampleBadge /> : null}
      </div>
      {result.ok ? (
        <div className="mt-4">{children(result.data)}</div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-control bg-error/10 p-3">
          <p className="text-sm">
            {result.error.kind === 'unauthorized'
              ? 'Sign in again to see this data.'
              : result.error.message}
          </p>
          <RetryButton />
        </div>
      )}
    </section>
  );
}

export function Tile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <div data-testid={`tile-${label}`} className="flex min-w-0 items-center gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-control bg-muted text-primary">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm leading-5 text-on-surface/70">{label}</span>
        <span className="block font-display text-xl leading-7 font-bold">{value}</span>
      </span>
    </div>
  );
}

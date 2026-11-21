import { CalendarDays, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { SampleBadge } from "@/components/sample-badge";
import { splitTwoTone, StatTile, type StatTone } from "@/components/ui/stat-tile";
import { liveDataOnly, type DataResult } from "@/lib/data/source";
import { parseEnum } from "@/lib/url-params";
import { RetryButton } from "./retry-button";

const NOTICE = "Sample notice:";
const NOTICE_TEXT = "carrier and service updates will appear here.";

/**
 * Carrier and service notices. A static bar with a live dot (no scrolling marquee): the notice is
 * read once, and motion is kept for things that change.
 */
export function AlertTicker() {
  return (
    <div
      data-testid="ticker"
      role="status"
      className="motion-rise flex items-center gap-2.5 rounded-card border border-secondary bg-surface px-4 py-3 text-sm"
    >
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full bg-warning motion-safe:animate-[evoc-pulse_1.8s_infinite]"
      />
      <span className="min-w-0">
        <strong className="font-semibold">{NOTICE}</strong> {NOTICE_TEXT}
      </span>
    </div>
  );
}

export function PageHeading({ dateRange }: { dateRange: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-heading text-[26px] leading-9 font-extrabold tracking-[-0.02em] lg:text-[34px] lg:leading-[42px]">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-on-surface/70">
          Here is how your operations are running.
        </p>
      </div>
      <div className="flex flex-col gap-1 sm:items-end">
        <button
          type="button"
          disabled
          className="flex h-control cursor-not-allowed items-center gap-2 rounded-control border border-secondary bg-surface px-3 text-sm text-on-surface/70"
        >
          <CalendarDays aria-hidden="true" className="size-4" />
          {dateRange}
        </button>
        <p className="text-xs text-on-surface/70">
          Date filter is not available yet.
        </p>
      </div>
    </div>
  );
}

export type DashboardTab =
  "overview" | "pickups" | "ndr" | "rto" | "delivered" | "revenue" | "sms";

/** One entry per tab. A later task flips `enabled` when it builds the tab. */
// `soon`: no backend yet, so the tab is left out when the app runs on real data only.
const ALL_TABS: { id: DashboardTab; label: string; enabled: boolean; soon?: boolean }[] = [
  { id: "overview", label: "Overview", enabled: true },
  { id: "pickups", label: "Pickups", enabled: true, soon: true },
  { id: "ndr", label: "NDR", enabled: true, soon: true },
  { id: "rto", label: "RTO", enabled: true },
  { id: "delivered", label: "Delivered", enabled: true },
  { id: "revenue", label: "Revenue", enabled: true, soon: true },
  { id: "sms", label: "SMS", enabled: true, soon: true },
];

/** The tabs shown: without the unbuilt ones on real data only. */
export function visibleTabs(liveOnly = liveDataOnly()) {
  return liveOnly ? ALL_TABS.filter((tab) => !tab.soon) : ALL_TABS;
}

/** The tab named by `?tab=`, or Overview when it is missing, unknown or not built yet. */
export function parseTab(value: unknown): DashboardTab {
  return resolveTab(value, visibleTabs());
}

/** `parseTab` over any tab list, so the disabled branch can be tested while every real tab is enabled. */
export function resolveTab(
  value: unknown,
  tabs: readonly { id: DashboardTab; enabled: boolean }[],
): DashboardTab {
  const tab = parseEnum(
    value,
    tabs.map((entry) => entry.id),
  );
  return tabs.find((entry) => entry.id === tab)?.enabled ? tab! : "overview";
}

const tabHref = (id: DashboardTab) =>
  id === "overview" ? "/dashboard" : `/dashboard?tab=${id}`;

export function OverviewTabs({
  active = "overview",
}: {
  active?: DashboardTab;
}) {
  return (
    <div
      role="tablist"
      aria-label="Dashboard views"
      // On phones the tabs scroll; the faded right edge hints there is more.
      className="flex gap-1 overflow-x-auto rounded-card border border-secondary bg-surface p-1.5 [scrollbar-width:none] max-sm:pr-6 max-sm:[mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)]"
    >
      {visibleTabs().map((tab) => {
        const selected = tab.id === active;
        const className = `h-11 min-w-24 flex-1 shrink-0 rounded-control px-4 text-sm transition-colors duration-150 lg:h-10 ${
          selected
            ? "bg-muted font-semibold text-primary"
            : tab.enabled
              ? "text-on-surface/75 hover:bg-muted hover:text-primary"
              : "cursor-not-allowed text-on-surface/50"
        }`;
        return tab.enabled ? (
          <Link
            key={tab.id}
            href={tabHref(tab.id)}
            role="tab"
            aria-selected={selected}
            aria-current={selected ? "page" : undefined}
            className={`${className} flex items-center justify-center`}
          >
            {tab.label}
          </Link>
        ) : (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={false}
            disabled
            className={className}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

const TONES: Record<"primary" | "success" | "warning" | "accent", string> = {
  primary: "bg-muted text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  accent: "bg-accent/15 text-accent dark:text-primary",
};

/** A headline figure in the same card as Home's: icon chip, label, two-tone value, then a note chip. */
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
  const [lead, rest] = splitTwoTone(value);
  return (
    <div className="lift min-w-0 rounded-card border border-secondary bg-surface p-3 lg:p-card">
      {/* Icon above the text on narrow phones, as on Home, so long amounts stay on one line. */}
      <div className="flex min-w-0 flex-col items-start gap-3 min-[420px]:flex-row sm:items-center">
        <span className={`grid size-11 shrink-0 place-items-center rounded-control ${TONES[tone]}`}>
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          {/* Two lines reserved on narrow screens keep values level when one label wraps. */}
          <span className="block min-h-10 text-sm leading-5 text-on-surface/70 sm:min-h-0">
            {title}
          </span>
          <span
            className={`block text-base leading-7 tracking-tight tabular-nums min-[420px]:text-lg sm:text-xl ${
              /[a-z]/i.test(value) ? "font-heading font-bold" : "font-mono font-medium"
            }`}
          >
            {lead}
            {rest ? <span className="text-on-surface/45">{rest}</span> : null}
          </span>
        </span>
      </div>
      <p className="mt-2 inline-flex rounded-md bg-tertiary px-1.5 py-0.5 text-xs leading-4 text-on-surface/70">
        {note}
      </p>
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
  if (!result.ok && result.error.kind === "unavailable") return null;
  return (
    <section
      data-testid={testId}
      className="motion-rise min-w-0 rounded-card border border-secondary bg-surface p-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-heading text-lg leading-7 font-bold tracking-tight lg:text-xl">
          {title}
        </h2>
        {result.source === "mock" ? <SampleBadge /> : null}
      </div>
      {result.ok ? (
        <div className="mt-4">{children(result.data)}</div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-control bg-error/10 p-3">
          <p className="text-sm">
            {result.error.kind === "unauthorized"
              ? "Sign in again to see this data."
              : result.error.message}
          </p>
          <RetryButton />
        </div>
      )}
    </section>
  );
}

/** One count in a details card: Home's stat tile, optionally a link. */
export function Tile({
  label,
  value,
  icon,
  tone = "primary",
  href,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: StatTone;
  href?: string;
}) {
  const content = (
    <StatTile testId={`tile-${label}`} label={label} value={value} icon={icon} tone={tone} />
  );
  if (!href) return content;
  return (
    <Link
      href={href}
      className="block min-w-0 rounded-control transition-colors duration-150 hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-primary"
    >
      {content}
    </Link>
  );
}

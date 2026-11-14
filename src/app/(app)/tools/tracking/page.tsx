import { Clock, MapPin, Radio, Truck, type LucideIcon } from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import { RetryButton } from '@/app/(app)/dashboard/retry-button';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { StatusBadge } from '@/components/orders/status-badge';
import { SampleBadge } from '@/components/sample-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { getDemoSession } from '@/lib/auth/session';
import { parseAwbQuery } from '@/lib/awb';
import type { DataResult } from '@/lib/data/source';
import { trackingService, type TrackingDetail } from '@/lib/data/tracking';
import { formatDateTime } from '@/lib/format/date';
import { parseText } from '@/lib/url-params';
import { ShareLink } from './share-link';
import { TrackingForm } from './tracking-form';
import { TrackingTimeline } from './tracking-timeline';

export const metadata: Metadata = { title: 'Order tracking | Evoc Ships' };

// Far longer than ten AWBs ever need, so a pasted wall of text cannot reach the gateway.
const QUERY_MAX = 400;

interface Props {
  searchParams: Promise<{ awb?: string | string[] }>;
}

function ResultError({ result }: { result: Extract<DataResult<TrackingDetail>, { ok: false }> }) {
  const unknown = result.error.kind === 'not_found';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-error/10 p-3">
      <p className="min-w-0 text-sm">
        {result.error.kind === 'unauthorized' ? 'Sign in again to see this data.' : result.error.message}
      </p>
      {unknown ? null : <RetryButton />}
    </div>
  );
}

function Facts({ detail }: { detail: TrackingDetail }) {
  const facts: [string, ReactNode, LucideIcon][] = [
    ['Courier', <CarrierBadge key="courier" carrier={detail.carrier} />, Truck],
    ['Latest location', detail.location ?? 'Not reported yet', MapPin],
    ['Courier status', detail.rawStatus ?? 'Not reported', Radio],
    ['Last update', detail.lastEventAt ? formatDateTime(detail.lastEventAt) : 'No updates yet', Clock],
  ];
  return (
    <dl className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 2xl:grid-cols-4">
      {facts.map(([label, value, Icon]) => (
        <div key={label} className="flex min-w-0 items-center gap-3 rounded-control border border-secondary/70 bg-tertiary/50 p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-control bg-muted text-primary">
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <dt className="text-xs text-on-surface/60">{label}</dt>
            <dd className="mt-0.5 break-words text-sm font-medium">{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

/** The heading over a timeline, styled like Home's card headings one level down. */
function TimelineTitle() {
  return <p className="text-sm font-semibold text-on-surface/70">Timeline</p>;
}

export default async function TrackingPage({ searchParams }: Props) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const params = await searchParams;
  const raw = Array.isArray(params.awb) ? params.awb.join(',') : params.awb;
  const query = parseText(raw, QUERY_MAX);
  const { awbs, truncated } = parseAwbQuery(query);
  const total = new Set(query.split(/[\s,]+/).filter(Boolean)).size;

  const tracking = trackingService();
  const [results] = await Promise.all([
    // Each AWB is its own call and settles on its own, so one failure never hides the others.
    Promise.all(awbs.map(async (awb) => ({ awb, result: await tracking.getTimeline(awb) }))),
  ]);

  const single = results.length === 1;

  return (
    <>
      <div className="grid gap-6">
        <PageHeader
          title="Order tracking"
          description="Look up one or more shipments by AWB to see where each one is and what has happened so far."
        />
        <TrackingForm key={awbs.join(',')} query={awbs.join(', ')} />

        {awbs.length === 0 ? (
          <EmptyState message="Enter an AWB above to see its status and timeline." />
        ) : (
          <div className="motion-stagger grid gap-3 lg:gap-4">
            {truncated ? (
              <p className="text-sm text-on-surface/70">
                Showing the first {awbs.length} of {total} AWBs.
              </p>
            ) : null}
            {results.map(({ awb, result }, index) => {
              const order = { '--i': index } as CSSProperties;
              const heading = (
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="min-w-0 break-all font-heading text-lg leading-7 font-bold tracking-tight lg:text-xl">{awb}</h2>
                  {result.source === 'mock' ? <SampleBadge /> : null}
                  {result.ok ? <StatusBadge status={result.data.status} size="md" /> : null}
                </div>
              );

              if (single) {
                return (
                  <section
                    key={awb}
                    data-testid="tracking-card"
                    style={order}
                    className="min-w-0 rounded-card border border-secondary bg-surface p-card"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {heading}
                      {result.ok ? <ShareLink awb={awb} /> : null}
                    </div>
                    <div className="mt-4 grid gap-5">
                      {result.ok ? (
                        <>
                          <Facts detail={result.data} />
                          <div className="grid gap-3">
                            <TimelineTitle />
                            <TrackingTimeline events={result.data.timeline} />
                          </div>
                        </>
                      ) : (
                        <ResultError result={result} />
                      )}
                    </div>
                  </section>
                );
              }

              if (!result.ok) {
                return (
                  <div
                    key={awb}
                    data-testid="tracking-item"
                    style={order}
                    className="grid min-w-0 gap-3 rounded-card border border-secondary bg-surface p-card"
                  >
                    {heading}
                    <ResultError result={result} />
                  </div>
                );
              }

              return (
                <details
                  key={awb}
                  data-testid="tracking-item"
                  style={order}
                  className="group min-w-0 rounded-card border border-secondary bg-surface p-card transition-colors open:border-primary/40 hover:border-primary/40"
                >
                  <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                    {heading}
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Show timeline
                      <ChevronDown aria-hidden="true" className="size-4 transition group-open:rotate-180" />
                    </span>
                  </summary>
                  <div className="mt-4 grid gap-5">
                    <Facts detail={result.data} />
                    <div className="grid gap-3">
                      <TimelineTitle />
                      <TrackingTimeline events={result.data.timeline} />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <ShareLink awb={awb} />
                      <Link
                        href={`/tools/tracking?awb=${encodeURIComponent(awb)}`}
                        className="inline-flex h-11 items-center text-sm font-medium text-primary hover:text-accent lg:h-control"
                      >
                        Open on its own
                      </Link>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

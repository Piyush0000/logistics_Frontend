import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RetryButton } from '@/app/(app)/dashboard/retry-button';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { StatusBadge } from '@/components/orders/status-badge';
import { SampleBadge } from '@/components/sample-badge';
import { trackingService } from '@/lib/data/tracking';
import { formatDateTime } from '@/lib/format/date';
import { statusLabel } from '@/lib/format/status';
import { StageProgressBar } from './stage-progress';
import { parsePublicAwb, toPublicView } from './view-model';

export const metadata: Metadata = {
  title: 'Track your shipment | Evoc Ships',
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ awb: string }>;
}

export default async function PublicTrackingPage({ params }: Props) {
  const awb = parsePublicAwb((await params).awb);
  if (!awb) notFound();

  // The gateway tracking route has no auth, so this page never reads a merchant credential.
  const result = await trackingService().getTimelinePublic(awb);

  if (!result.ok) {
    if (result.error.kind === 'not_found') notFound();
    return (
      <section className="motion-rise grid gap-3 rounded-card border border-secondary bg-surface p-card">
        <h1 className="font-heading text-xl leading-7">We could not load this shipment</h1>
        <p className="text-sm">
          {result.error.kind === 'unauthorized' ? 'Tracking is unavailable right now.' : result.error.message}
        </p>
        <div>
          <RetryButton />
        </div>
      </section>
    );
  }

  const view = toPublicView(result.data);

  return (
    <section className="motion-rise grid min-w-0 gap-6 rounded-card border border-secondary bg-surface p-card">
      <div className="grid gap-2">
        {view.branding?.displayName ? (
          <p data-testid="tracking-brand" className="font-heading text-lg font-bold">
            {view.branding.displayName}
          </p>
        ) : null}
        <p className="text-xs text-on-surface/60">AWB</p>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="min-w-0 break-all font-mono text-xl leading-7 font-semibold tracking-tight lg:text-2xl">{view.awb}</h1>
          {result.source === 'mock' ? <SampleBadge /> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={view.status} size="md" />
          {/* The live tracking API keeps the courier partner private, so there may be none. */}
          {view.carrier ? <CarrierBadge carrier={view.carrier} /> : null}
        </div>
      </div>

      <StageProgressBar progress={view.progress} />

      {view.branding && (view.branding.supportEmail || view.branding.supportPhone) ? (
        <p data-testid="tracking-support" className="text-sm text-on-surface/70">
          Questions about your order? Contact {view.branding.displayName || 'the seller'}
          {view.branding.supportEmail ? <> at <a className="text-primary underline" href={`mailto:${view.branding.supportEmail}`}>{view.branding.supportEmail}</a></> : null}
          {view.branding.supportEmail && view.branding.supportPhone ? ' or' : null}
          {view.branding.supportPhone ? <> on <a className="text-primary underline" href={`tel:${view.branding.supportPhone}`}>{view.branding.supportPhone}</a></> : null}.
        </p>
      ) : null}

      <div>
        <h2 className="font-heading text-lg leading-7 font-bold tracking-tight">Tracking history</h2>
        {view.timeline.length === 0 ? (
          <p className="mt-2 text-sm text-on-surface/70">No tracking events yet.</p>
        ) : (
          <ol className="mt-3 grid">
            {view.timeline.map((event, index) => (
              <li key={`${event.occurredAt}-${index}`} data-testid="timeline-event" className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`mt-1 size-3 shrink-0 rounded-full ${index === 0 ? 'bg-primary ring-4 ring-primary/20' : 'bg-secondary'}`}
                  />
                  {index < view.timeline.length - 1 ? <span className="w-0.5 grow bg-secondary" /> : null}
                </div>
                <div className="min-w-0 pb-4">
                  <p className="text-sm font-semibold break-words">{statusLabel(event.status)}</p>
                  {event.location ? (
                    <p className="text-xs text-on-surface/70 break-words">{event.location}</p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-on-surface/60">{formatDateTime(event.occurredAt)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

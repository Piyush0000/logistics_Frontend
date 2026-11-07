import Link from 'next/link';
import type { DeliveryStatus, WebhookDelivery, WebhookDeliveryPage } from '@/lib/data/webhooks';
import { formatDateTime } from '@/lib/format/date';
import { SECONDARY_BUTTON } from './dialog';
import { RetryDeliveryButton } from './retry-delivery-button';

const STATUSES: Record<DeliveryStatus, { label: string; tone: string }> = {
  DELIVERED: { label: 'Delivered', tone: 'border-success/40 bg-success/10' },
  PENDING: { label: 'Pending', tone: 'border-warning/40 bg-warning/10' },
  IN_PROGRESS: { label: 'In progress', tone: 'border-primary/30 bg-muted' },
  FAILED: { label: 'Failed', tone: 'border-error/40 bg-error/10' },
};

function attemptSummary({ attemptCount, lastAttempt }: WebhookDelivery): string {
  const attempts = `${attemptCount} ${attemptCount === 1 ? 'attempt' : 'attempts'}`;
  return lastAttempt?.httpStatus ? `${attempts} · HTTP ${lastAttempt.httpStatus}` : attempts;
}

function DeliveryRow({ delivery }: { delivery: WebhookDelivery }) {
  const { label, tone } = STATUSES[delivery.status];
  const canRetry = delivery.status === 'FAILED' && delivery.subscriptionStatus !== 'DELETED';

  return (
    <li
      data-testid="delivery-row"
      className="grid gap-2 border-b border-secondary py-4 first:pt-0 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <code className="text-sm [overflow-wrap:anywhere]">{delivery.topic}</code>
          <span className={`rounded-full border px-2.5 py-0.5 text-xs ${tone}`}>{label}</span>
        </div>
        <p className="mt-1 text-sm leading-5 text-on-surface/70 [overflow-wrap:anywhere]">
          {delivery.targetUrl}
        </p>
        <p className="mt-0.5 text-xs leading-4 text-on-surface/70">
          {formatDateTime(delivery.createdAt)} · {attemptSummary(delivery)}
        </p>
        {delivery.lastAttempt?.error ? (
          <p className="mt-0.5 text-xs leading-4 [overflow-wrap:anywhere]">
            {delivery.lastAttempt.error}
          </p>
        ) : null}
        {delivery.nextAttemptAt ? (
          <p className="mt-0.5 text-xs leading-4 text-on-surface/70">
            Next attempt {formatDateTime(delivery.nextAttemptAt)}
          </p>
        ) : null}
      </div>
      {canRetry ? <RetryDeliveryButton id={delivery.id} /> : null}
    </li>
  );
}

export function DeliveryHistory({
  page,
  isFirstPage,
  basePath,
}: {
  page: WebhookDeliveryPage;
  isFirstPage: boolean;
  basePath: string;
}) {
  if (page.items.length === 0 && isFirstPage) {
    return <p className="text-sm">No deliveries yet. They will appear here once events are sent.</p>;
  }

  return (
    <>
      <ul>
        {page.items.map((delivery) => (
          <DeliveryRow key={delivery.id} delivery={delivery} />
        ))}
      </ul>
      {page.nextCursor || !isFirstPage ? (
        <nav
          aria-label="Delivery pages"
          className="mt-4 flex flex-wrap justify-end gap-3 border-t border-secondary pt-4"
        >
          {isFirstPage ? null : (
            <Link href={basePath} className={SECONDARY_BUTTON}>
              Newest deliveries
            </Link>
          )}
          {page.nextCursor ? (
            <Link href={`${basePath}?cursor=${page.nextCursor}`} className={SECONDARY_BUTTON}>
              Older deliveries
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}

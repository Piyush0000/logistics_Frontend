import type { Metadata } from 'next';
import { StatusChip, type ChipTone } from '@/components/admin/status-chip';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { tableStyles as t } from '@/components/ui/table-styles';
import { adminSystemService, type HealthStatus, type WebhookFailure } from '@/lib/admin/data/system';
import { auditHref, parseAuditFilters } from '@/lib/admin/data/system/audit-filters';
import { requireAdminSession } from '@/lib/admin/session';
import { formatDateTime } from '@/lib/format/date';
import { AuditFiltersForm } from './audit-filters-form';
import { RefreshHealthButton, RetryWebhookButton } from './system-controls';

export const metadata: Metadata = { title: 'System' };

const HEALTH: Record<HealthStatus, [string, ChipTone]> = {
  up: ['Up', 'success'],
  degraded: ['Slow', 'warning'],
  down: ['Down', 'error'],
};

function WEBHOOK_STATUS(delivery: WebhookFailure): [string, ChipTone] {
  if (delivery.status === 'queued') return ['Retry queued', 'info'];
  if (delivery.subscriptionStatus === 'deleted') return ['Webhook deleted', 'neutral'];
  return ['Failed', 'error'];
}

// Owner: Teammate 2. See docs/admin/team-split.md.
export default async function AdminSystemPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession();
  const { filters, notice } = parseAuditFilters(await searchParams);
  const service = adminSystemService();
  // Each loads on its own, so one failing (health timing out, say) leaves the others working.
  const [health, webhooks, audit] = await Promise.all([
    service.getHealth(),
    service.listWebhookFailures(),
    service.listAuditLog(filters),
  ]);

  return (
    <>
      <PageHeader title="System" description="Backend health, failed webhooks and a record of admin changes." />

      <DataCard testId="admin-health" title="Service health" result={health} actions={<RefreshHealthButton />}>
        {(services) => (
          <ul className="motion-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {services.map((entry) => {
              const [label, tone] = HEALTH[entry.status];
              return (
                <li key={entry.service} data-testid="admin-service" className="rounded-control border border-secondary p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold">{entry.service}</span>
                    <StatusChip tone={tone}>{label}</StatusChip>
                  </div>
                  <p className="mt-2 text-xs text-on-surface/65">
                    {entry.latencyMs === null ? (
                      <span data-testid="health-no-answer" className="font-semibold text-error">
                        No answer
                      </span>
                    ) : (
                      `${entry.latencyMs} ms`
                    )}{' '}
                    · checked <span data-testid="health-checked">{formatDateTime(entry.checkedAt)}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </DataCard>

      <DataCard testId="admin-webhooks" title="Failed webhooks" result={webhooks}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState message="No failed webhook deliveries." />
          ) : (
            <>
              <p className="mb-3 text-sm text-on-surface/70">
                Deliveries to merchants that failed every attempt. Retry sends one again with the next batch.
              </p>
              <div className={`${t.wrap} max-lg:hidden`}>
                <table className={t.table}>
                  <thead>
                    <tr>
                      <th className={t.th}>Merchant</th>
                      <th className={t.th}>Event</th>
                      <th className={`${t.th} text-right`}>Attempts</th>
                      <th className={t.th}>Last error</th>
                      <th className={t.th}>Status</th>
                      <th className={t.th}>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((delivery) => {
                      const [label, tone] = WEBHOOK_STATUS(delivery);
                      return (
                        <tr key={delivery.id} data-testid="admin-webhook-row" data-delivery-id={delivery.id} className={t.rowHover}>
                          <td className={t.td}>
                            <span className="block font-semibold">{delivery.merchantName}</span>
                            <span className="block max-w-56 truncate font-mono text-xs text-on-surface/60" title={delivery.targetUrl}>
                              {delivery.targetUrl}
                            </span>
                          </td>
                          <td className={`${t.td} font-mono text-xs`}>{delivery.topic}</td>
                          <td className={t.tdNumeric}>{delivery.attempts}</td>
                          <td className={`${t.td} max-w-64 text-xs`}>
                            <span className="block [overflow-wrap:anywhere]">
                              {delivery.lastHttpStatus ? `${delivery.lastHttpStatus} · ` : ''}
                              {delivery.lastError}
                            </span>
                            <span className="text-on-surface/60">{formatDateTime(delivery.lastAttemptAt)}</span>
                          </td>
                          <td className={t.td}>
                            <span data-testid="webhook-status">
                              <StatusChip tone={tone}>{label}</StatusChip>
                            </span>
                          </td>
                          <td className={`${t.td} text-right`}>
                            <RetryWebhookButton delivery={delivery} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <ul className="grid gap-3 lg:hidden">
                {rows.map((delivery) => {
                  const [label, tone] = WEBHOOK_STATUS(delivery);
                  return (
                    <li key={delivery.id} data-testid="admin-webhook-card" data-delivery-id={delivery.id} className="rounded-control border border-secondary p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 font-semibold [overflow-wrap:anywhere]">{delivery.merchantName}</p>
                        <span data-testid="webhook-status" className="shrink-0">
                          <StatusChip tone={tone}>{label}</StatusChip>
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-xs [overflow-wrap:anywhere]">{delivery.topic}</p>
                      <p className="mt-2 text-xs text-on-surface/70 [overflow-wrap:anywhere]">
                        {delivery.attempts} attempts · {delivery.lastHttpStatus ? `${delivery.lastHttpStatus} · ` : ''}
                        {delivery.lastError} · {formatDateTime(delivery.lastAttemptAt)}
                      </p>
                      <div className="mt-3">
                        <RetryWebhookButton delivery={delivery} wide />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )
        }
      </DataCard>

      <DataCard testId="admin-audit" title="Audit log" result={audit}>
        {({ page, actions, applied }) => (
          <>
            {/* The key resets the form when Clear or the back button changes the URL. */}
            <AuditFiltersForm key={auditHref(applied)} filters={applied} actions={actions} />
            {notice ? (
              <p
                data-testid="audit-notice"
                className="mb-4 rounded-control border border-warning/30 bg-warning/10 p-3 text-sm"
              >
                {notice}
              </p>
            ) : null}

            {page.items.length === 0 ? (
              <EmptyState
                message={
                  applied.action || applied.from || applied.to
                    ? 'No admin changes match these filters.'
                    : 'No admin changes recorded yet.'
                }
              />
            ) : (
              <>
                <p className="text-xs text-on-surface/60">
                  {page.total} {page.total === 1 ? 'change' : 'changes'}
                </p>
                <ol className="grid divide-y divide-secondary/70">
                  {page.items.map((entry) => (
                    <li
                      key={entry.id}
                      data-testid="admin-audit-entry"
                      className="grid gap-0.5 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4"
                    >
                      <span className="text-xs text-on-surface/60">{formatDateTime(entry.at)}</span>
                      <span className="min-w-0 [overflow-wrap:anywhere]">
                        <span className="block text-sm font-semibold">
                          {entry.action} <span className="font-normal text-on-surface/70">· {entry.target}</span>
                        </span>
                        <span className="block text-xs text-on-surface/65">{entry.detail}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                <Pagination
                  page={page.page}
                  pageCount={Math.ceil(page.total / page.pageSize)}
                  buildHref={(next) => auditHref(applied, next)}
                />
              </>
            )}
          </>
        )}
      </DataCard>
    </>
  );
}

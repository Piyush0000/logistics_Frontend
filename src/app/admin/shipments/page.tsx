import type { Metadata } from 'next';
import { PlannedWork } from '@/components/admin/planned-work';
import { StatusChip } from '@/components/admin/status-chip';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { StatusBadge } from '@/components/orders/status-badge';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { tableStyles as t } from '@/components/ui/table-styles';
import { adminShipmentsService } from '@/lib/admin/data/shipments';
import { requireAdminSession } from '@/lib/admin/session';
import { formatDateTime } from '@/lib/format/date';
import { parsePage, parseText } from '@/lib/url-params';

export const metadata: Metadata = { title: 'Shipments' };

// Owner: Teammate 1. See docs/admin/team-split.md.
export default async function AdminShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stuck?: string; page?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const result = await adminShipmentsService().listShipments({
    q: parseText(params.q, 100) || undefined,
    stuck: params.stuck === '1' ? true : undefined,
    page: parsePage(params.page),
  });

  return (
    <>
      <PageHeader title="Shipments" description="Shipments from every merchant." />

      <DataCard testId="admin-shipments" title={params.stuck === '1' ? 'Stuck shipments' : 'All shipments'} result={result}>
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState message="No shipments match these filters." />
          ) : (
            <div className={t.wrap}>
              <table className={t.table}>
                <thead>
                  <tr>
                    <th className={t.th}>AWB</th>
                    <th className={t.th}>Merchant</th>
                    <th className={t.th}>Carrier</th>
                    <th className={t.th}>Status</th>
                    <th className={t.th}>Last update</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((shipment) => (
                    <tr key={shipment.awb} data-testid="admin-shipment-row" className={t.rowHover}>
                      <td className={`${t.td} font-mono font-semibold text-primary`}>{shipment.awb}</td>
                      <td className={t.td}>{shipment.merchantName}</td>
                      <td className={t.td}>
                        <CarrierBadge carrier={shipment.carrier} />
                      </td>
                      <td className={t.td}>
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={shipment.status} />
                          {shipment.stuck ? <StatusChip tone="warning">Stuck</StatusChip> : null}
                        </span>
                      </td>
                      <td className={`${t.td} text-xs text-on-surface/70`}>{formatDateTime(shipment.lastEventAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </DataCard>

      <PlannedWork
        items={[
          'Filters: search by AWB or merchant, status, merchant, stuck only (the service already accepts q, status, merchantId, stuck, page).',
          'Pagination with the shared Pagination component (the service returns 10 per page).',
          'Shipment detail at /admin/shipments/[awb] with the tracking timeline (reuse the merchant tracking components).',
          'NDR and RTO views across all merchants, as tabs on this page.',
          'Phone layout: one card per shipment below 1024px.',
        ]}
      />
    </>
  );
}

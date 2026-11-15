import type { Metadata } from 'next';
import { DataCard } from '@/components/ui/data-card';
import { PageHeader } from '@/components/ui/page-header';
import { adminMerchantsService } from '@/lib/admin/data/merchants';
import { adminShipmentsService } from '@/lib/admin/data/shipments';
import { requireAdminSession } from '@/lib/admin/session';
import { parsePage, parseText } from '@/lib/url-params';
import { ShipmentsView } from './shipments-view';

export const metadata: Metadata = { title: 'Shipments' };

// Owner: Teammate 1. See docs/admin/team-split.md.
export default async function AdminShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    merchantId?: string;
    stuck?: string;
    view?: string;
    page?: string;
  }>;
}) {
  await requireAdminSession();
  const params = await searchParams;

  const query = {
    q: parseText(params.q, 100) || undefined,
    status: parseText(params.status, 50) || undefined,
    merchantId: parseText(params.merchantId, 50) || undefined,
    stuck: params.stuck === '1' ? true : undefined,
    page: parsePage(params.page),
  };

  const initialTab =
    params.view === 'ndr'
      ? 'ndr'
      : params.view === 'rto'
      ? 'rto'
      : params.stuck === '1'
      ? 'stuck'
      : 'all';

  const [shipmentsResult, ndrResult, rtoResult, merchantsResult] = await Promise.all([
    adminShipmentsService().listShipments({ pageSize: 100 }),
    adminShipmentsService().listNdrShipments({ page: 1 }),
    adminShipmentsService().listRtoShipments({ page: 1 }),
    adminMerchantsService().listMerchants({}),
  ]);

  const merchantsList = merchantsResult.ok
    ? merchantsResult.data.items.map((m) => ({ id: m.id, name: m.name }))
    : [];

  return (
    <div className="grid gap-4 lg:gap-5" data-testid="admin-shipments-page">
      <PageHeader title="Shipments" description="Shipments from every merchant." />

      <DataCard testId="admin-shipments" title="All shipments" result={shipmentsResult}>
        {(data) => (
          <ShipmentsView
            allShipments={data.items}
            allNdrShipments={ndrResult.ok ? ndrResult.data.items : []}
            allRtoShipments={rtoResult.ok ? rtoResult.data.items : []}
            merchantsList={merchantsList}
            initialTab={initialTab}
            initialQuery={query}
          />
        )}
      </DataCard>
    </div>
  );
}

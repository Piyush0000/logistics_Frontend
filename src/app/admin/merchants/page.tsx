import type { Metadata } from 'next';
import { DataCard } from '@/components/ui/data-card';
import { PageHeader } from '@/components/ui/page-header';
import { adminMerchantsService, MERCHANT_STATUSES } from '@/lib/admin/data/merchants';
import { requireAdminSession } from '@/lib/admin/session';
import { parseEnum, parsePage, parseText } from '@/lib/url-params';
import { MerchantsView } from './merchants-view';

export const metadata: Metadata = { title: 'Merchants' };

// Owner: Teammate 1. See docs/admin/team-split.md.
export default async function AdminMerchantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const query = {
    q: parseText(params.q, 100) || undefined,
    status: parseEnum(params.status, MERCHANT_STATUSES),
    page: parsePage(params.page),
  };

  const [result, allResult] = await Promise.all([
    adminMerchantsService().listMerchants(query),
    adminMerchantsService().listMerchants({}),
  ]);

  return (
    <div className="grid gap-4 lg:gap-5 min-w-0 max-w-full overflow-hidden">
      <PageHeader title="Merchants" description="Every seller on Evoc Ships." />

      <DataCard testId="admin-merchants" title="All merchants" result={result}>
        {() => (
          // Keyed by the URL, so a pagination link (a real navigation) rebuilds the view on that page.
          <MerchantsView
            key={JSON.stringify(params)}
            allMerchants={allResult.ok ? allResult.data.items : []}
            initialQuery={query}
          />
        )}
      </DataCard>
    </div>
  );
}

import type { Metadata } from 'next';
import { DataCard } from '@/components/ui/data-card';
import { PageHeader } from '@/components/ui/page-header';
import { adminSupportService } from '@/lib/admin/data/support';
import { requireAdminSession } from '@/lib/admin/session';
import { parsePage } from '@/lib/url-params';
import { SupportView, type SupportTab } from './support-view';

export const metadata: Metadata = { title: 'Support' };

export default async function AdminSupportPage(props: {
  searchParams: Promise<{
    status?: string;
    priority?: string;
    q?: string;
    merchant?: string;
    page?: string;
  }>;
}) {
  await requireAdminSession();
  const searchParams = await props.searchParams;

  const initialTab: SupportTab =
    searchParams.status === 'awaiting_merchant' ||
    searchParams.status === 'resolved' ||
    searchParams.status === 'all'
      ? (searchParams.status as SupportTab)
      : 'open';

  const result = await adminSupportService().listTickets();

  return (
    <div className="grid gap-4 lg:gap-5 min-w-0 max-w-full overflow-hidden">
      <PageHeader
        title="Support"
        description="Customer support tickets and disputes across all merchants."
      />

      {/* DataCard shows the Sample badge and, in gateway mode, the error instead of an empty inbox.
          Keyed by the URL, so a pagination link (a real navigation) rebuilds the view on that page. */}
      <DataCard testId="admin-tickets" title="Tickets" result={result}>
        {(allTickets) => (
          <SupportView
            key={JSON.stringify(searchParams)}
            allTickets={allTickets}
            initialTab={initialTab}
            initialPriority={searchParams.priority || ''}
            initialQuery={searchParams.q || ''}
            initialMerchant={searchParams.merchant || ''}
            initialPage={parsePage(searchParams.page)}
          />
        )}
      </DataCard>
    </div>
  );
}

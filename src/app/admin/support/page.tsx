import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { adminSupportService } from '@/lib/admin/data/support';
import { requireAdminSession } from '@/lib/admin/session';
import { SupportView, type SupportTab } from './support-view';

export const metadata: Metadata = { title: 'Support' };

export default async function AdminSupportPage(props: {
  searchParams: Promise<{
    status?: string;
    priority?: string;
    q?: string;
    merchant?: string;
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
  const allTickets = result.ok ? result.data : [];

  return (
    <>
      <PageHeader
        title="Support"
        description="Customer support tickets and disputes across all merchants."
      />

      <SupportView
        allTickets={allTickets}
        initialTab={initialTab}
        initialPriority={searchParams.priority || ''}
        initialQuery={searchParams.q || ''}
        initialMerchant={searchParams.merchant || ''}
      />
    </>
  );
}

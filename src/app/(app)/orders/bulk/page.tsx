import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SampleBadge } from '@/components/sample-badge';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { getDemoSession } from '@/lib/auth/session';
import { resolveDataSource } from '@/lib/data/source';
import { walletService } from '@/lib/data/wallet';
import { UploadForm } from './upload-form';

export const metadata: Metadata = { title: 'Bulk Upload | Evoc Logistics' };

export default async function BulkUploadPage() {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const wallet = await walletService().getBalance();

  return (
    <AppShell email={session.email} wallet={wallet}>
      <div className="grid gap-6">
        <PageHeader
          title="Bulk Upload"
          description="Book many shipments at once from a CSV file."
          actions={resolveDataSource('orders') === 'mock' ? <SampleBadge /> : null}
        />
        <UploadForm />
      </div>
    </AppShell>
  );
}

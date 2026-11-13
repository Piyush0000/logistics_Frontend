import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SampleBadge } from '@/components/sample-badge';
import { PageHeader } from '@/components/ui/page-header';
import { getDemoSession } from '@/lib/auth/session';
import { resolveDataSource } from '@/lib/data/source';
import { UploadForm } from './upload-form';

export const metadata: Metadata = { title: 'Bulk Upload | Evoc Ships' };

export default async function BulkUploadPage() {
  const session = await getDemoSession();
  if (!session) redirect('/login');


  return (
    <>
      <div className="grid gap-6">
        <PageHeader
          title="Bulk Upload"
          description="Book many shipments at once from a CSV file."
          actions={resolveDataSource('orders') === 'mock' ? <SampleBadge /> : null}
        />
        <UploadForm />
      </div>
    </>
  );
}

import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SampleBadge } from '@/components/sample-badge';
import { DataCard } from '@/components/ui/data-card';
import { PageHeader } from '@/components/ui/page-header';
import { getDemoSession } from '@/lib/auth/session';
import { ndrService } from '@/lib/data/ndr';
import { NdrView } from './ndr-view';

export const metadata: Metadata = { title: 'NDR Management | Evoc Ships' };

export default async function NdrPage() {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const [ndrResult] = await Promise.all([
    ndrService().getNdrDashboard(),
  ]);

  return (
    <>
      <Link
        href="/orders"
        className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline lg:min-h-0"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        <span>Back to Orders</span>
      </Link>

      {/* One sample badge for the page: every section below comes from the same NDR result. */}
      <PageHeader
        title="Non-Delivery Reports (NDR)"
        description="Take proactive merchant action on failed delivery attempts to reduce RTO rates."
        actions={ndrResult.source === 'mock' ? <SampleBadge /> : null}
      />

      {!ndrResult.ok ? (
        <>
          <DataCard testId="ndr-kpis" title="Summary" result={ndrResult}>
            {() => null}
          </DataCard>
          <DataCard testId="ndr-list" title="Failed deliveries" result={ndrResult}>
            {() => null}
          </DataCard>
        </>
      ) : (
        <NdrView data={ndrResult.data} />
      )}
    </>
  );
}

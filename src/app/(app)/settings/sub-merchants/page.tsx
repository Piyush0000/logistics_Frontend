import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { getDemoSession } from '@/lib/auth/session';
import { subMerchantService } from '@/lib/data/sub-merchants';
import { walletService } from '@/lib/data/wallet';
import { buildPageHref, parsePage, parseText } from '@/lib/url-params';
import { SettingsNav } from '../settings-nav';
import { SellerRow } from './seller-row';
import { SubMerchantList } from './sub-merchant-list';

export const metadata: Metadata = { title: 'Sub-merchants | Evoc Ships' };

const PATH = '/settings/sub-merchants';

interface SubMerchantsPageProps {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default async function SubMerchantsPage({ searchParams }: SubMerchantsPageProps) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const params = await searchParams;
  const page = parsePage(params.page);
  const q = parseText(params.q);

  const [wallet, sellers] = await Promise.all([
    walletService().getBalance(),
    subMerchantService().list({ page, search: q }),
  ]);
  const buildHref = (next: number) => buildPageHref(PATH, { q }, next);

  return (
    <AppShell email={session.email} wallet={wallet}>
      <div className="grid gap-6">
        <PageHeader title="Sub-merchants" description="Manage the sellers who ship under your account." />

        <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <SettingsNav current={PATH} />

          <DataCard testId="sub-merchants-card" title="Your sellers" result={sellers}>
            {(data) => (
              <SubMerchantList q={q} path={PATH}>
                {data.items.length === 0 ? (
                  <EmptyState message="No sub-merchants yet. Onboard your first seller." />
                ) : (
                  <div className="grid gap-4">
                    <p className="text-sm text-on-surface/70">
                      {data.total} {data.total === 1 ? 'seller' : 'sellers'}
                    </p>
                    <ul className="divide-y divide-secondary">
                      {data.items.map((seller) => (
                        <SellerRow key={seller.id} seller={seller} />
                      ))}
                    </ul>
                    <Pagination page={data.page} pageCount={data.pageCount} buildHref={buildHref} />
                  </div>
                )}
              </SubMerchantList>
            )}
          </DataCard>
        </div>
      </div>
    </AppShell>
  );
}

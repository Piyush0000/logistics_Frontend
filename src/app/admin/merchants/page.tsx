import type { Metadata } from 'next';
import Link from 'next/link';
import { StatusChip, type ChipTone } from '@/components/admin/status-chip';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { tableStyles as t } from '@/components/ui/table-styles';
import { adminMerchantsService, MERCHANT_STATUSES, type KycStatus, type MerchantStatus } from '@/lib/admin/data/merchants';
import { requireAdminSession } from '@/lib/admin/session';
import { formatDate } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';
import { parseEnum, parsePage, parseText } from '@/lib/url-params';
import { MerchantFilters } from './merchant-filters';

export const metadata: Metadata = { title: 'Merchants' };

const STATUS_TONE: Record<MerchantStatus, ChipTone> = { active: 'success', pending: 'warning', suspended: 'error' };
const KYC_LABEL: Record<KycStatus, [string, ChipTone]> = {
  not_started: ['Not started', 'neutral'],
  submitted: ['In review', 'warning'],
  approved: ['Approved', 'success'],
  rejected: ['Rejected', 'error'],
};

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
  const result = await adminMerchantsService().listMerchants(query);

  const buildHref = (targetPage: number) => {
    const p = new URLSearchParams();
    if (query.q) p.set('q', query.q);
    if (query.status) p.set('status', query.status);
    if (targetPage > 1) p.set('page', String(targetPage));
    const qs = p.toString();
    return qs ? `/admin/merchants?${qs}` : '/admin/merchants';
  };

  return (
    <>
      <PageHeader title="Merchants" description="Every seller on Evoc Ships." />

      <MerchantFilters />

      <DataCard testId="admin-merchants" title="All merchants" result={result}>
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState message="No merchants match these filters." />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden lg:block">
                <div className={t.wrap}>
                  <table className={t.table}>
                    <thead>
                      <tr>
                        <th className={t.th}>Merchant</th>
                        <th className={t.th}>City</th>
                        <th className={t.th}>Status</th>
                        <th className={t.th}>KYC</th>
                        <th className={`${t.th} text-right`}>Shipments (30 days)</th>
                        <th className={`${t.th} text-right`}>Wallet</th>
                        <th className={t.th}>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((merchant) => {
                        const [kycLabel, kycTone] = KYC_LABEL[merchant.kyc];
                        return (
                          <tr key={merchant.id} data-testid="admin-merchant-row" className={t.rowHover}>
                            <td className={t.td}>
                              <Link
                                href={`/admin/merchants/${merchant.id}`}
                                className="font-semibold text-primary transition-colors hover:underline"
                              >
                                {merchant.name}
                              </Link>
                              <div className="text-xs text-on-surface/60">{merchant.email}</div>
                            </td>
                            <td className={t.td}>{merchant.city}</td>
                            <td className={t.td}>
                              <StatusChip tone={STATUS_TONE[merchant.status]}>{merchant.status}</StatusChip>
                            </td>
                            <td className={t.td}>
                              <StatusChip tone={kycTone}>{kycLabel}</StatusChip>
                            </td>
                            <td className={t.tdNumeric}>{merchant.shipments30d.toLocaleString('en-IN')}</td>
                            <td className={`${t.tdNumeric} ${merchant.walletPaise < 0 ? 'text-error' : ''}`}>
                              {formatPaise(merchant.walletPaise)}
                            </td>
                            <td className={`${t.td} text-xs text-on-surface/70`}>{formatDate(merchant.joinedAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards (<1024px) */}
              <div className="grid gap-3 lg:hidden" data-testid="admin-merchants-mobile">
                {data.items.map((merchant) => {
                  const [kycLabel, kycTone] = KYC_LABEL[merchant.kyc];
                  return (
                    <div
                      key={merchant.id}
                      data-testid="admin-merchant-card"
                      className="rounded-card border border-secondary bg-surface p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/admin/merchants/${merchant.id}`}
                          className="flex min-h-11 flex-col justify-center font-semibold text-primary transition-colors hover:underline"
                        >
                          <span>{merchant.name}</span>
                          <span className="text-xs font-normal text-on-surface/60">{merchant.email}</span>
                        </Link>
                        <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
                          <StatusChip tone={STATUS_TONE[merchant.status]}>{merchant.status}</StatusChip>
                          <StatusChip tone={kycTone}>{kycLabel}</StatusChip>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-secondary/60 pt-3 text-xs">
                        <div>
                          <span className="text-on-surface/60">City</span>
                          <div className="font-medium text-on-surface">{merchant.city}</div>
                        </div>
                        <div>
                          <span className="text-on-surface/60">Joined</span>
                          <div className="font-medium text-on-surface">{formatDate(merchant.joinedAt)}</div>
                        </div>
                        <div>
                          <span className="text-on-surface/60">Shipments (30d)</span>
                          <div className="font-mono font-medium text-on-surface">
                            {merchant.shipments30d.toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div>
                          <span className="text-on-surface/60">Wallet</span>
                          <div
                            className={`font-mono font-medium ${merchant.walletPaise < 0 ? 'text-error' : 'text-on-surface'}`}
                          >
                            {formatPaise(merchant.walletPaise)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-secondary/60 pt-4">
                <span className="text-xs text-on-surface/60">
                  Showing {data.items.length} of {data.total} merchant{data.total === 1 ? '' : 's'}
                </span>
                <Pagination
                  page={data.page}
                  pageCount={Math.max(1, Math.ceil(data.total / data.pageSize))}
                  buildHref={buildHref}
                />
              </div>
            </>
          )
        }
      </DataCard>
    </>
  );
}

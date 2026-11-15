import { ChevronRight, MapPin } from 'lucide-react';
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
    <div className="grid gap-4 lg:gap-5">
      <PageHeader title="Merchants" description="Every seller on Evoc Ships." />

      <MerchantFilters />

      <DataCard testId="admin-merchants" title="All merchants" result={result}>
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState message="No merchants match these filters." />
          ) : (
            <>
              {/* Desktop table (>=1024px) */}
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
                  const initials = merchant.name
                    .split(' ')
                    .filter(Boolean)
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <Link
                      key={merchant.id}
                      href={`/admin/merchants/${merchant.id}`}
                      data-testid="admin-merchant-card"
                      className="group flex flex-col gap-3 rounded-control border border-secondary/70 bg-tertiary/30 p-3.5 transition-all duration-150 hover:border-primary/50 hover:bg-tertiary/60 active:scale-[0.99]"
                    >
                      {/* Top Header: Avatar + Name/Email + Status Chip + Chevron */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-control bg-primary/10 font-heading text-xs font-bold text-primary transition-colors group-hover:bg-primary/20">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-heading text-sm font-bold text-on-surface transition-colors group-hover:text-primary">
                              {merchant.name}
                            </div>
                            <div className="truncate text-xs text-on-surface/60">{merchant.email}</div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <StatusChip tone={STATUS_TONE[merchant.status]}>{merchant.status}</StatusChip>
                          <ChevronRight
                            aria-hidden="true"
                            className="size-4 text-on-surface/40 transition-colors group-hover:text-primary"
                          />
                        </div>
                      </div>

                      {/* Middle metadata: City & KYC Status & Joined */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 text-on-surface/70">
                          <MapPin aria-hidden="true" className="size-3 text-on-surface/40" />
                          <span>{merchant.city}</span>
                        </span>
                        <span className="text-on-surface/30">·</span>
                        <StatusChip tone={kycTone}>{kycLabel}</StatusChip>
                        <span className="text-on-surface/30">·</span>
                        <span className="text-on-surface/50">Joined {formatDate(merchant.joinedAt)}</span>
                      </div>

                      {/* Bottom stats row */}
                      <div className="grid grid-cols-2 gap-2 rounded-control border border-secondary/50 bg-surface/80 p-2.5 text-xs">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-on-surface/60">Shipments (30d)</span>
                          <span className="mt-0.5 font-mono text-sm font-semibold text-on-surface">
                            {merchant.shipments30d.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] text-on-surface/60">Wallet</span>
                          <span
                            className={`mt-0.5 font-mono text-sm font-semibold ${
                              merchant.walletPaise < 0 ? 'text-error' : 'text-on-surface'
                            }`}
                          >
                            {formatPaise(merchant.walletPaise)}
                          </span>
                        </div>
                      </div>
                    </Link>
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
    </div>
  );
}

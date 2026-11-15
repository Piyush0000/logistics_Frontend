import type { Metadata } from 'next';
import { PlannedWork } from '@/components/admin/planned-work';
import { StatusChip, type ChipTone } from '@/components/admin/status-chip';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { tableStyles as t } from '@/components/ui/table-styles';
import { adminMerchantsService, MERCHANT_STATUSES, type KycStatus, type MerchantStatus } from '@/lib/admin/data/merchants';
import { requireAdminSession } from '@/lib/admin/session';
import { formatDate } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';
import { parseEnum, parsePage, parseText } from '@/lib/url-params';

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

  return (
    <>
      <PageHeader title="Merchants" description="Every seller on Evoc Ships." />

      <DataCard testId="admin-merchants" title="All merchants" result={result}>
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState message="No merchants match these filters." />
          ) : (
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
                          {/* TODO(Teammate 1): link to /admin/merchants/${merchant.id} once the detail page exists. */}
                          <span className="font-semibold">{merchant.name}</span>
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
          )
        }
      </DataCard>

      <PlannedWork
        items={[
          'Search box and status filter (the URL already accepts ?q=, ?status= and ?page=; the service filters on them).',
          'Pagination with the shared Pagination component.',
          'Phone layout: one card per merchant below 1024px instead of the table.',
          'Merchant detail page at /admin/merchants/[id] (service: getMerchant): profile, shipments by status, wallet tile via adminMoneyService().getMerchantWallet(id), notes.',
          'Suspend and reactivate with a reason (add setMerchantStatus to the service; record an audit entry once System has one).',
        ]}
      />
    </>
  );
}

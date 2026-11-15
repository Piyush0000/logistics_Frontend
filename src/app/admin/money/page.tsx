import type { Metadata } from 'next';
import { PlannedWork } from '@/components/admin/planned-work';
import { StatusChip, type ChipTone } from '@/components/admin/status-chip';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { tableStyles as t } from '@/components/ui/table-styles';
import { adminMoneyService, type RemittanceStatus } from '@/lib/admin/data/money';
import { requireAdminSession } from '@/lib/admin/session';
import { formatDate } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';

export const metadata: Metadata = { title: 'Money' };

const REMITTANCE_TONE: Record<RemittanceStatus, ChipTone> = {
  expected: 'neutral',
  received: 'info',
  reconciled: 'success',
  short: 'error',
};

// Owner: Teammate 2. See docs/admin/team-split.md.
export default async function AdminMoneyPage() {
  await requireAdminSession();
  const service = adminMoneyService();
  const [wallets, remittances] = await Promise.all([service.listWallets(), service.listRemittances()]);

  return (
    <>
      <PageHeader title="Money" description="Merchant wallets and the COD that couriers owe." />

      <div className="grid gap-4 lg:gap-5 xl:grid-cols-2 xl:items-start">
        <DataCard testId="admin-wallets" title="Merchant wallets" result={wallets}>
          {(rows) =>
            rows.length === 0 ? (
              <EmptyState message="No wallets yet." />
            ) : (
              <div className={t.wrap}>
                <table className={t.table}>
                  <thead>
                    <tr>
                      <th className={t.th}>Merchant</th>
                      <th className={`${t.th} text-right`}>Balance</th>
                      <th className={`${t.th} text-right`}>On hold</th>
                      <th className={t.th}>Last recharge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((wallet) => (
                      <tr key={wallet.merchantId} data-testid="admin-wallet-row" className={t.rowHover}>
                        <td className={`${t.td} font-semibold`}>{wallet.merchantName}</td>
                        <td className={`${t.tdNumeric} ${wallet.balancePaise < 0 ? 'text-error' : ''}`}>
                          {formatPaise(wallet.balancePaise)}
                        </td>
                        <td className={t.tdNumeric}>{formatPaise(wallet.holdPaise)}</td>
                        <td className={`${t.td} text-xs text-on-surface/70`}>
                          {wallet.lastRechargeAt ? formatDate(wallet.lastRechargeAt) : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </DataCard>

        <DataCard testId="admin-remittances" title="COD remittances" result={remittances}>
          {(rows) =>
            rows.length === 0 ? (
              <EmptyState message="No remittances yet." />
            ) : (
              <div className={t.wrap}>
                <table className={t.table}>
                  <thead>
                    <tr>
                      <th className={t.th}>Courier</th>
                      <th className={t.th}>Period to</th>
                      <th className={`${t.th} text-right`}>Expected</th>
                      <th className={`${t.th} text-right`}>Received</th>
                      <th className={t.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((remittance) => (
                      <tr key={remittance.id} data-testid="admin-remittance-row" className={t.rowHover}>
                        <td className={t.td}>
                          <CarrierBadge carrier={remittance.carrier} />
                        </td>
                        <td className={`${t.td} text-xs text-on-surface/70`}>{formatDate(remittance.periodEnd)}</td>
                        <td className={t.tdNumeric}>{formatPaise(remittance.expectedPaise)}</td>
                        <td className={t.tdNumeric}>{formatPaise(remittance.receivedPaise)}</td>
                        <td className={t.td}>
                          <StatusChip tone={REMITTANCE_TONE[remittance.status]}>{remittance.status}</StatusChip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </DataCard>
      </div>

      <PlannedWork
        items={[
          'Wallet adjustment: credit or debit a merchant with a required reason, confirm in a Dialog (add adjustWallet to the service; audit entry).',
          'Per-merchant ledger: open a wallet to see its transactions.',
          'COD: remittance detail with its lines, reconcile and verify-bank actions, and the exceptions list with resolve (the reconciliation service has these routes; see docs/admin/backend-needs.md).',
          'Overdue COD view (couriers past their payout date).',
          'Summary figures at the top (total float, COD outstanding, short payments) and phone cards below 1024px.',
        ]}
      />
    </>
  );
}

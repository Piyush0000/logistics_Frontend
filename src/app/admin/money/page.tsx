import { AlertTriangle, Clock, TrendingDown, Wallet, type LucideIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { StatusChip } from '@/components/admin/status-chip';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { StatTile, type StatTone } from '@/components/ui/stat-tile';
import { tableStyles as t } from '@/components/ui/table-styles';
import { adminMoneyService } from '@/lib/admin/data/money';
import { requireAdminSession } from '@/lib/admin/session';
import { formatDate } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';
import { AdjustWalletButton } from './adjust-wallet-button';
import { codBatchHref, Difference, LINK_BUTTON, REMITTANCE_STATUS } from './cod/cod-display';
import { ExceptionsList } from './cod/exceptions-list';

export const metadata: Metadata = { title: 'Money' };

const CARD = 'rounded-control border border-secondary p-3';

function Figure({ label, value, icon, tone, testId }: { label: string; value: string; icon: LucideIcon; tone: StatTone; testId: string }) {
  return (
    <div className="lift min-w-0 rounded-card border border-secondary bg-surface p-3 lg:p-card">
      <StatTile label={label} value={value} icon={icon} tone={tone} testId={testId} />
    </div>
  );
}

const ledgerHref = (merchantId: string) => `/admin/money/wallets/${merchantId}`;

// Owner: Teammate 2. See docs/admin/team-split.md.
export default async function AdminMoneyPage() {
  await requireAdminSession();
  const service = adminMoneyService();
  const [summary, wallets, remittances, overdue, exceptions] = await Promise.all([
    service.getSummary(),
    service.listWallets(),
    service.listRemittances(),
    service.listOverdueRemittances(),
    service.listCodExceptions(),
  ]);

  return (
    <>
      <PageHeader title="Money" description="Merchant wallets and the COD that couriers owe." />

      {summary.ok ? (
        <section aria-label="Money figures" className="motion-stagger grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:gap-4 xl:grid-cols-4">
          <Figure testId="money-float" label="Wallet float" value={formatPaise(summary.data.walletFloatPaise)} icon={Wallet} tone="primary" />
          <Figure
            testId="money-negative"
            label="Wallets below zero"
            value={String(summary.data.negativeWallets)}
            icon={AlertTriangle}
            tone={summary.data.negativeWallets > 0 ? 'error' : 'success'}
          />
          <Figure testId="money-cod-outstanding" label="COD owed by couriers" value={formatPaise(summary.data.codOutstandingPaise)} icon={Clock} tone="warning" />
          <Figure
            testId="money-short"
            label={`Short payments (${summary.data.shortBatches} ${summary.data.shortBatches === 1 ? 'batch' : 'batches'})`}
            value={formatPaise(summary.data.shortPaymentsPaise)}
            icon={TrendingDown}
            tone={summary.data.shortBatches > 0 ? 'error' : 'success'}
          />
        </section>
      ) : (
        // Its own card, so a failed summary never hides the wallets below.
        <DataCard testId="admin-money-summary" title="Money figures" result={summary}>
          {() => null}
        </DataCard>
      )}

      <DataCard testId="admin-wallets" title="Merchant wallets" result={wallets}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState message="No wallets yet." />
          ) : (
            <>
              <div className={`${t.wrap} max-lg:hidden`}>
                <table className={t.table}>
                  <thead>
                    <tr>
                      <th className={t.th}>Merchant</th>
                      <th className={`${t.th} text-right`}>Balance</th>
                      <th className={`${t.th} text-right`}>On hold</th>
                      <th className={t.th}>Last recharge</th>
                      <th className={`${t.th} text-right`}>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((wallet) => (
                      <tr key={wallet.merchantId} data-testid="admin-wallet-row" className={t.rowHover}>
                        <td className={`${t.td} font-semibold`}>
                          <Link href={ledgerHref(wallet.merchantId)} className="hover:text-primary hover:underline">
                            {wallet.merchantName}
                          </Link>
                          <span className="block font-mono text-xs font-normal text-on-surface/60">{wallet.merchantId}</span>
                        </td>
                        <td className={`${t.tdNumeric} ${wallet.balancePaise < 0 ? 'text-error' : ''}`}>
                          {formatPaise(wallet.balancePaise)}
                        </td>
                        <td className={t.tdNumeric}>{formatPaise(wallet.holdPaise)}</td>
                        <td className={`${t.td} text-xs text-on-surface/70`}>
                          {wallet.lastRechargeAt ? formatDate(wallet.lastRechargeAt) : 'Never'}
                        </td>
                        <td className={`${t.td} text-right`}>
                          <AdjustWalletButton wallet={wallet} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="grid gap-3 lg:hidden">
                {rows.map((wallet) => (
                  <li key={wallet.merchantId} data-testid="admin-wallet-card" className={CARD}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold [overflow-wrap:anywhere]">{wallet.merchantName}</p>
                        <p className="font-mono text-xs text-on-surface/60">{wallet.merchantId}</p>
                      </div>
                      <p className={`shrink-0 font-mono font-semibold ${wallet.balancePaise < 0 ? 'text-error' : ''}`}>
                        {formatPaise(wallet.balancePaise)}
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-on-surface/70">
                      On hold {formatPaise(wallet.holdPaise)} · Last recharge{' '}
                      {wallet.lastRechargeAt ? formatDate(wallet.lastRechargeAt) : 'never'}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Link href={ledgerHref(wallet.merchantId)} className={`${LINK_BUTTON} flex-1`}>
                        Ledger
                      </Link>
                      <AdjustWalletButton wallet={wallet} wide />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )
        }
      </DataCard>

      <DataCard testId="admin-overdue" title="Overdue payouts" result={overdue}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState message="No courier is past its payout date." />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((row) => (
                <li key={row.batchId} data-testid="admin-overdue-row" className="rounded-control border border-error/30 bg-error/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <CarrierBadge carrier={row.carrier} />
                    <StatusChip tone="error">{`${row.daysOverdue} ${row.daysOverdue === 1 ? 'day' : 'days'} overdue`}</StatusChip>
                  </div>
                  <p className="mt-2 font-mono text-lg font-semibold">{formatPaise(row.expectedPaise)}</p>
                  <p className="text-xs text-on-surface/70">
                    Deliveries to {formatDate(row.periodEnd)} · due {formatDate(row.dueDate)}
                  </p>
                  <Link href={codBatchHref(row.batchId)} className={`${LINK_BUTTON} mt-3 w-full`}>
                    Open {row.batchId}
                  </Link>
                </li>
              ))}
            </ul>
          )
        }
      </DataCard>

      <DataCard testId="admin-remittances" title="COD remittances" result={remittances}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState message="No remittances yet." />
          ) : (
            <>
              <div className={`${t.wrap} max-lg:hidden`}>
                <table className={t.table}>
                  <thead>
                    <tr>
                      <th className={t.th}>Batch</th>
                      <th className={t.th}>Period to</th>
                      <th className={`${t.th} text-right`}>Expected</th>
                      <th className={`${t.th} text-right`}>Received</th>
                      <th className={`${t.th} text-right`}>Difference</th>
                      <th className={t.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((remittance) => {
                      const [label, tone] = REMITTANCE_STATUS[remittance.status];
                      const paid = remittance.status !== 'expected';
                      return (
                        <tr key={remittance.id} data-testid="admin-remittance-row" className={t.rowHover}>
                          <td className={t.td}>
                            <span className="grid justify-items-start gap-1">
                              <CarrierBadge carrier={remittance.carrier} />
                              <Link href={codBatchHref(remittance.id)} className="font-mono text-xs hover:text-primary hover:underline">
                                {remittance.id}
                              </Link>
                            </span>
                          </td>
                          <td className={`${t.td} text-xs text-on-surface/70`}>
                            {formatDate(remittance.periodEnd)}
                            <span className="block">due {formatDate(remittance.dueDate)}</span>
                          </td>
                          <td className={t.tdNumeric}>{formatPaise(remittance.expectedPaise)}</td>
                          <td className={t.tdNumeric}>{paid ? formatPaise(remittance.receivedPaise) : '—'}</td>
                          <td className={t.tdNumeric}>
                            {paid ? <Difference paise={remittance.receivedPaise - remittance.expectedPaise} /> : '—'}
                          </td>
                          <td className={t.td}>
                            <StatusChip tone={tone}>{label}</StatusChip>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="grid gap-3 lg:hidden">
                {rows.map((remittance) => {
                  const [label, tone] = REMITTANCE_STATUS[remittance.status];
                  const paid = remittance.status !== 'expected';
                  return (
                    <li key={remittance.id} data-testid="admin-remittance-card" className={CARD}>
                      <div className="flex items-center justify-between gap-3">
                        <CarrierBadge carrier={remittance.carrier} />
                        <StatusChip tone={tone}>{label}</StatusChip>
                      </div>
                      <p className="mt-2 text-xs text-on-surface/70">
                        <span className="font-mono">{remittance.id}</span> · to {formatDate(remittance.periodEnd)}, due{' '}
                        {formatDate(remittance.dueDate)}
                      </p>
                      <dl className="mt-2 grid grid-cols-1 gap-2 text-sm min-[400px]:grid-cols-3">
                        <div className="min-w-0">
                          <dt className="text-xs text-on-surface/60">Expected</dt>
                          <dd className="font-mono break-words">{formatPaise(remittance.expectedPaise)}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-xs text-on-surface/60">Received</dt>
                          <dd className="font-mono break-words">{paid ? formatPaise(remittance.receivedPaise) : '—'}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-xs text-on-surface/60">Difference</dt>
                          <dd className="font-mono break-words">
                            {paid ? <Difference paise={remittance.receivedPaise - remittance.expectedPaise} /> : '—'}
                          </dd>
                        </div>
                      </dl>
                      <Link href={codBatchHref(remittance.id)} className={`${LINK_BUTTON} mt-3 w-full`}>
                        Open batch
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )
        }
      </DataCard>

      <DataCard testId="admin-cod-exceptions" title="COD exceptions" result={exceptions}>
        {(rows) => <ExceptionsList exceptions={rows} />}
      </DataCard>
    </>
  );
}

import { ArrowLeft, Clock, Lock, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusChip, type ChipTone } from '@/components/admin/status-chip';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { StatTile } from '@/components/ui/stat-tile';
import { tableStyles as t } from '@/components/ui/table-styles';
import { adminMoneyService, type WalletLedgerEntry, type WalletTransactionKind } from '@/lib/admin/data/money';
import { requireAdminSession } from '@/lib/admin/session';
import { formatDate, formatDateTime } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';
import { AdjustWalletButton } from '../../adjust-wallet-button';

export const metadata: Metadata = { title: 'Wallet ledger' };

const KIND: Record<WalletTransactionKind, [string, ChipTone]> = {
  recharge: ['Recharge', 'success'],
  shipping: ['Shipping', 'neutral'],
  adjustment: ['Admin adjustment', 'info'],
};

/** A positive whole page number from the URL, or 1. */
function pageFrom(value: string | string[] | undefined): number {
  const text = Array.isArray(value) ? value[0] : value;
  return text && /^[1-9]\d{0,5}$/.test(text) ? Number(text) : 1;
}

function Amount({ entry }: { entry: WalletLedgerEntry }) {
  const credit = entry.direction === 'credit';
  return (
    <span className={credit ? 'text-success' : ''}>
      {credit ? '+' : '−'}
      {formatPaise(entry.amountPaise)}
    </span>
  );
}

const BACK_LINK =
  'inline-flex h-11 items-center gap-1.5 rounded-control text-sm font-medium text-on-surface/70 hover:text-primary lg:h-control';

// Owner: Teammate 2. See docs/admin/team-split.md.
export default async function AdminWalletLedgerPage({
  params,
  searchParams,
}: {
  params: Promise<{ merchantId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession();
  const { merchantId } = await params;
  const page = pageFrom((await searchParams).page);
  const result = await adminMoneyService().getWalletLedger(merchantId, page);
  if (!result.ok && result.error.kind === 'not_found') notFound();

  const back = (
    <Link href="/admin/money" className={BACK_LINK}>
      <ArrowLeft aria-hidden="true" className="size-4" />
      Money
    </Link>
  );

  if (!result.ok) {
    return (
      <>
        {back}
        <PageHeader title="Wallet ledger" />
        <DataCard testId="admin-ledger" title="Transactions" result={result}>
          {() => null}
        </DataCard>
      </>
    );
  }

  const { wallet, page: entries } = result.data;
  const pageCount = Math.ceil(entries.total / entries.pageSize);

  return (
    <>
      {back}
      <PageHeader
        title={wallet.merchantName}
        description={<span className="font-mono">{wallet.merchantId}</span>}
        actions={<AdjustWalletButton wallet={wallet} />}
      />

      <section aria-label="Wallet figures" className="motion-stagger grid gap-3 sm:grid-cols-3 lg:gap-4">
        <div className="min-w-0 rounded-card border border-secondary bg-surface p-3 lg:p-card">
          <StatTile
            testId="ledger-balance"
            label="Balance"
            value={formatPaise(wallet.balancePaise)}
            icon={Wallet}
            tone={wallet.balancePaise < 0 ? 'error' : 'primary'}
          />
        </div>
        <div className="min-w-0 rounded-card border border-secondary bg-surface p-3 lg:p-card">
          <StatTile label="On hold" value={formatPaise(wallet.holdPaise)} icon={Lock} tone="warning" />
        </div>
        <div className="min-w-0 rounded-card border border-secondary bg-surface p-3 lg:p-card">
          <StatTile
            label="Last recharge"
            value={wallet.lastRechargeAt ? formatDate(wallet.lastRechargeAt) : 'Never'}
            icon={Clock}
            tone="success"
          />
        </div>
      </section>

      <DataCard testId="admin-ledger" title="Transactions" result={result}>
        {() =>
          entries.items.length === 0 ? (
            <EmptyState message="No wallet transactions yet." />
          ) : (
            <>
              <p className="mb-3 text-xs text-on-surface/60">
                {entries.total} {entries.total === 1 ? 'transaction' : 'transactions'}, newest first
              </p>

              <div className={`${t.wrap} max-lg:hidden`}>
                <table className={t.table}>
                  <thead>
                    <tr>
                      <th className={t.th}>Date</th>
                      <th className={t.th}>Type</th>
                      <th className={t.th}>Description</th>
                      <th className={`${t.th} text-right`}>Amount</th>
                      <th className={`${t.th} text-right`}>Balance after</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.items.map((entry) => (
                      <tr key={entry.id} data-testid="admin-ledger-row" className={t.rowHover}>
                        <td className={`${t.td} text-xs whitespace-nowrap text-on-surface/70`}>{formatDateTime(entry.at)}</td>
                        <td className={t.td}>
                          <StatusChip tone={KIND[entry.kind][1]}>{KIND[entry.kind][0]}</StatusChip>
                        </td>
                        <td className={`${t.td} max-w-md [overflow-wrap:anywhere]`}>{entry.description}</td>
                        <td className={t.tdNumeric}>
                          <Amount entry={entry} />
                        </td>
                        <td className={`${t.tdNumeric} ${entry.balanceAfterPaise < 0 ? 'text-error' : ''}`}>
                          {formatPaise(entry.balanceAfterPaise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="grid gap-3 lg:hidden">
                {entries.items.map((entry) => (
                  <li key={entry.id} data-testid="admin-ledger-card" className="rounded-control border border-secondary p-3">
                    <div className="flex items-center justify-between gap-3">
                      <StatusChip tone={KIND[entry.kind][1]}>{KIND[entry.kind][0]}</StatusChip>
                      <span className="font-mono font-semibold">
                        <Amount entry={entry} />
                      </span>
                    </div>
                    <p className="mt-2 text-sm [overflow-wrap:anywhere]">{entry.description}</p>
                    <p className="mt-1 text-xs text-on-surface/70">
                      {formatDateTime(entry.at)} · Balance after{' '}
                      <span className={`font-mono ${entry.balanceAfterPaise < 0 ? 'text-error' : ''}`}>
                        {formatPaise(entry.balanceAfterPaise)}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>

              <Pagination
                page={entries.page}
                pageCount={pageCount}
                buildHref={(next) => (next > 1 ? `/admin/money/wallets/${wallet.merchantId}?page=${next}` : `/admin/money/wallets/${wallet.merchantId}`)}
              />
            </>
          )
        }
      </DataCard>
    </>
  );
}

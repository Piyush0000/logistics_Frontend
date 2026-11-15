import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SegmentBar } from '@/components/charts/segment-bar';
import { DataCard } from '@/components/ui/data-card';
import { PageHeader } from '@/components/ui/page-header';
import { StatTile } from '@/components/ui/stat-tile';
import { getDemoSession } from '@/lib/auth/session';
import { walletService, type WalletTransaction } from '@/lib/data/wallet';
import { parseWalletFilters, walletHref } from '@/lib/data/wallet/filters';
import { formatPaise } from '@/lib/format/money';
import { RechargeDialog } from './recharge-dialog';
import { TransactionFilters } from './transaction-filters';
import { TransactionList } from './transaction-list';

export const metadata: Metadata = { title: 'Wallet Transactions | Evoc Ships' };

/** Money in, money out and the debit charges, added up over the transactions on this page. */
function pageTotals(entries: WalletTransaction[]) {
  const totals = { credit: 0, debit: 0, freight: 0, other: 0, cod: 0 };
  for (const entry of entries) {
    totals[entry.direction] += entry.amountPaise;
    if (entry.breakdown) {
      totals.freight += entry.breakdown.freightPaise;
      totals.other += entry.breakdown.otherPaise;
      totals.cod += entry.breakdown.codPaise;
    }
  }
  return totals;
}

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const { filters, error } = parseWalletFilters(await searchParams);
  const service = walletService();
  const [wallet, transactions] = await Promise.all([
    service.getBalance(),
    error ? null : service.listTransactions(filters),
  ]);

  const showSplit = transactions?.ok === true && transactions.data.entries.length > 0;

  return (
    <>
      <PageHeader title="Wallet Transactions" actions={<RechargeDialog />} />

      {/* Like Home's health row: the balance beside how this page's money moved. */}
      <div
        className={`grid gap-4 lg:gap-5 ${showSplit ? 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]' : ''}`}
      >
        <DataCard testId="wallet-balance" title="Current Wallet Balance" result={wallet}>
          {({ availablePaise }) => (
            <StatTile
              label="Available to spend"
              value={formatPaise(availablePaise)}
              icon={Wallet}
              tone={availablePaise > 0 ? 'primary' : 'warning'}
            />
          )}
        </DataCard>

        {showSplit && transactions ? (
          <DataCard testId="wallet-page-split" title="Money in and out" result={transactions}>
            {({ entries }) => {
              const totals = pageTotals(entries);
              const charged = totals.freight + totals.other + totals.cod;
              return (
                <div className="grid gap-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <StatTile
                      label="Credits on this page"
                      value={formatPaise(totals.credit)}
                      icon={ArrowDownLeft}
                      tone="success"
                    />
                    <StatTile
                      label="Debits on this page"
                      value={formatPaise(totals.debit)}
                      icon={ArrowUpRight}
                      tone="accent"
                    />
                  </div>
                  {charged > 0 ? (
                    <SegmentBar
                      title="Debits by charge"
                      segments={[
                        { label: 'Freight', value: totals.freight, tone: 'primary' },
                        { label: 'Other', value: totals.other, tone: 'series2' },
                        { label: 'COD', value: totals.cod, tone: 'series3' },
                      ]}
                    />
                  ) : null}
                </div>
              );
            }}
          </DataCard>
        ) : null}
      </div>

      {/* The key resets the form's own state when Clear or the back button changes the URL. */}
      <TransactionFilters key={walletHref(filters)} filters={filters} error={error} />

      {transactions ? (
        <DataCard testId="wallet-transactions" title="Transactions" result={transactions}>
          {(page) => <TransactionList result={page} filters={filters} />}
        </DataCard>
      ) : null}
    </>
  );
}

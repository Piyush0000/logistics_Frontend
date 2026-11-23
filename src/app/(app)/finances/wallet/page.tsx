import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SegmentBar } from '@/components/charts/segment-bar';
import { DataCard } from '@/components/ui/data-card';
import { PageHeader } from '@/components/ui/page-header';
import { StatTile } from '@/components/ui/stat-tile';
import { getDemoSession } from '@/lib/auth/session';
import type { DataResult } from '@/lib/data/source';
import { walletService, type WalletTransaction } from '@/lib/data/wallet';
import type { RechargeStatus } from '@/lib/data/wallet/types';
import { parseWalletFilters, walletHref } from '@/lib/data/wallet/filters';
import { formatPaise } from '@/lib/format/money';
import { RechargeDialog } from './recharge-dialog';
import { TransactionFilters } from './transaction-filters';
import { TransactionList } from './transaction-list';

export const metadata: Metadata = { title: 'Wallet Transactions | Evoc Ships' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What happened to the recharge the merchant just paid (or didn't) on Razorpay. */
function RechargeNotice({ result }: { result: DataResult<RechargeStatus> }) {
  const tone = {
    good: 'border-success/40 bg-success/10',
    wait: 'border-warning/40 bg-warning/10',
    bad: 'border-error/40 bg-error/10',
  };
  let message: { tone: keyof typeof tone; text: string };
  if (!result.ok) {
    message = {
      tone: 'wait',
      text: 'We could not check your payment just now. If you paid, it will be added to your wallet within a few minutes.',
    };
  } else if (result.data.status === 'PAID') {
    message = {
      tone: 'good',
      text: `${formatPaise(result.data.creditedPaise ?? result.data.amountPaise)} was added to your wallet.`,
    };
  } else if (result.data.status === 'CREATED') {
    message = {
      tone: 'wait',
      text: 'Your payment is not confirmed yet. If you paid, it will be added to your wallet within a few minutes. Nothing is added for an unfinished payment.',
    };
  } else {
    message = {
      tone: 'bad',
      text: 'That payment page has closed and nothing was charged. Start a new recharge to add money.',
    };
  }
  return (
    <p
      role="status"
      data-testid="recharge-notice"
      className={`rounded-xl border px-4 py-3 text-sm ${tone[message.tone]}`}
    >
      {message.text}
    </p>
  );
}

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

  const params = await searchParams;
  const { filters, error } = parseWalletFilters(params);
  const service = walletService();
  // Back from Razorpay: confirm first, so the balance below already includes the money.
  const rechargeId = typeof params.recharge_id === 'string' ? params.recharge_id : null;
  const recharge =
    rechargeId && UUID.test(rechargeId) ? await service.confirmRecharge(rechargeId) : null;
  const [wallet, transactions] = await Promise.all([
    service.getBalance(),
    error ? null : service.listTransactions(filters),
  ]);

  const showSplit = transactions?.ok === true && transactions.data.entries.length > 0;

  return (
    <>
      <PageHeader title="Wallet Transactions" actions={<RechargeDialog />} />

      {recharge ? <RechargeNotice result={recharge} /> : null}

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

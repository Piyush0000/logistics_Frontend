import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { getDemoSession } from '@/lib/auth/session';
import { walletService } from '@/lib/data/wallet';
import { parseWalletFilters, walletHref } from '@/lib/data/wallet/filters';
import { formatPaise } from '@/lib/format/money';
import { DetailCard } from '../../dashboard/sections';
import { TransactionFilters } from './transaction-filters';
import { TransactionList } from './transaction-list';

export const metadata: Metadata = { title: 'Wallet Transactions | Evoc Logistics' };

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

  return (
    <AppShell email={session.email} wallet={wallet}>
      <h1 className="font-heading text-[28px] leading-9 font-bold lg:text-[40px] lg:leading-10">
        Wallet Transactions
      </h1>

      <DetailCard testId="wallet-balance" title="Current Wallet Balance" result={wallet}>
        {({ availablePaise }) => (
          <p className="font-display text-2xl leading-8 font-bold md:text-3xl md:leading-9">
            {formatPaise(availablePaise)}
          </p>
        )}
      </DetailCard>

      {/* The key resets the form's own state when Clear or the back button changes the URL. */}
      <TransactionFilters key={walletHref(filters)} filters={filters} error={error} />

      {transactions ? (
        <DetailCard testId="wallet-transactions" title="Transactions" result={transactions}>
          {(page) => <TransactionList result={page} filters={filters} />}
        </DetailCard>
      ) : null}
    </AppShell>
  );
}

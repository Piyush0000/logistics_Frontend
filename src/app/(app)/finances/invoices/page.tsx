import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { getDemoSession } from '@/lib/auth/session';
import { INVOICE_YEARS, invoiceService } from '@/lib/data/invoices';
import { walletService } from '@/lib/data/wallet';
import { buildPageHref, parseEnum, parsePage } from '@/lib/url-params';
import { InvoiceCards, InvoiceTable } from './invoice-table';
import { YearFilter } from './year-filter';

export const metadata: Metadata = { title: 'Invoices | Evoc Logistics' };

const PATH = '/finances/invoices';
const YEAR_VALUES = INVOICE_YEARS.map(String);

interface InvoicesPageProps {
  searchParams: Promise<{ page?: string; year?: string }>;
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const params = await searchParams;
  const page = parsePage(params.page);
  // A year that is not one of the offered years is ignored, so every year shows.
  const yearText = parseEnum(params.year, YEAR_VALUES);
  const year = yearText ? Number(yearText) : undefined;

  const [wallet, invoices] = await Promise.all([
    walletService().getBalance(),
    invoiceService().listInvoices({ page, year }),
  ]);
  const buildHref = (next: number) => buildPageHref(PATH, { year: yearText }, next);

  return (
    <AppShell email={session.email} wallet={wallet}>
      <div className="grid gap-6">
        <PageHeader title="Invoices" description="Monthly shipping invoices with GST." />

        <YearFilter key={yearText ?? 'all'} years={INVOICE_YEARS} year={year} path={PATH} />

        <DataCard testId="invoices-card" title="Monthly invoices" result={invoices}>
          {(data) =>
            data.items.length === 0 ? (
              <EmptyState message="No invoices for this year." />
            ) : (
              <div className="grid gap-4">
                <InvoiceTable invoices={data.items} />
                <InvoiceCards invoices={data.items} />
                <Pagination page={data.page} pageCount={data.pageCount} buildHref={buildHref} />
              </div>
            )
          }
        </DataCard>
      </div>
    </AppShell>
  );
}

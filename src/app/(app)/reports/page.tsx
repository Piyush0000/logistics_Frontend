import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { getDemoSession } from '@/lib/auth/session';
import { isValidIsoDay } from '@/lib/format/calendar';
import { defaultReportRange } from '@/lib/reports';
import { ReportForm } from './report-form';

export const metadata: Metadata = { title: 'Reports | Evoc Ships' };

const day = (value: string | string[] | undefined) =>
  typeof value === 'string' && isValidIsoDay(value) ? value : undefined;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const params = await searchParams;
  const defaults = defaultReportRange();

  return (
    <>
      <div className="grid gap-6">
        <PageHeader
          title="Reports"
          description="Choose a date range and download a report as a CSV file."
        />
        <ReportForm
          initialFrom={day(params.from) ?? defaults.from}
          initialTo={day(params.to) ?? defaults.to}
        />
      </div>
    </>
  );
}

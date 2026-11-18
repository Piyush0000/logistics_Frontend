import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Clock,
  Info,
  Package,
  ShieldCheck,
  Wallet,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart } from '@/components/charts/bar-chart';
import { SegmentBar } from '@/components/charts/segment-bar';
import { DataCard } from '@/components/ui/data-card';
import { PageHeader } from '@/components/ui/page-header';
import { StatTile, type StatTone } from '@/components/ui/stat-tile';
import { adminOverviewService, type AttentionTone } from '@/lib/admin/data/overview';
import { requireAdminSession } from '@/lib/admin/session';
import { formatPaise, formatPaiseCompact } from '@/lib/format/money';

export const metadata: Metadata = { title: 'Overview' };

/*
 * REFERENCE PAGE. Every admin page follows this shape:
 *   1. requireAdminSession() first (redirects to /admin/login when signed out).
 *   2. Load data through the module's service (src/lib/admin/data/<module>), never from mock files directly.
 *   3. PageHeader, then cards: DataCard for each data result (it shows the Sample badge and errors).
 *   4. Figures with StatTile, charts from src/components/charts, tables with tableStyles.
 */

const ATTENTION: Record<AttentionTone, { icon: LucideIcon; chip: string }> = {
  error: { icon: XCircle, chip: 'bg-error/15 text-error' },
  warning: { icon: AlertTriangle, chip: 'bg-warning/15 text-warning' },
  info: { icon: Info, chip: 'bg-muted text-primary' },
};

function Figure({
  label,
  value,
  icon,
  tone,
  href,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: StatTone;
  href?: string;
}) {
  const content = <StatTile label={label} value={value} icon={icon} tone={tone} />;

  if (href) {
    return (
      <Link
        href={href}
        className="lift block min-w-0 rounded-card border border-secondary bg-surface p-3 transition-colors hover:border-primary/60 lg:p-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="lift min-w-0 rounded-card border border-secondary bg-surface p-3 lg:p-card">
      {content}
    </div>
  );
}

const shortDay = (iso: string) =>
  new Date(`${iso}T00:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

export default async function AdminOverviewPage() {
  await requireAdminSession();
  const result = await adminOverviewService().getOverview();

  return (
    <>
      <PageHeader title="Overview" description="Everything across Evoc Ships today, and what needs you." />

      {result.ok ? (
        <>
          <section aria-label="Platform figures" className="motion-stagger grid grid-cols-2 gap-3 lg:gap-4 xl:grid-cols-4">
            <Figure
              label="Active merchants"
              value={`${result.data.merchants.active} of ${result.data.merchants.total}`}
              icon={Building2}
              tone="primary"
              href="/admin/merchants?status=active"
            />
            <Figure
              label="KYC waiting"
              value={String(result.data.merchants.pendingKyc)}
              icon={ShieldCheck}
              tone="warning"
              href="/admin/onboarding?status=pending"
            />
            <Figure
              label="Shipments today"
              value={result.data.shipments.today.toLocaleString('en-IN')}
              icon={Package}
              tone="success"
              href="/admin/shipments"
            />
            <Figure
              label="Stuck shipments"
              value={String(result.data.shipments.stuck)}
              icon={Clock}
              tone="error"
              href="/admin/shipments?stuck=1"
            />
          </section>
          <section aria-label="Money" className="motion-stagger grid gap-3 sm:grid-cols-3 lg:gap-4">
            <Figure
              label="Wallet float"
              value={formatPaise(result.data.money.walletFloatPaise)}
              icon={Wallet}
              tone="primary"
              href="/admin/money"
            />
            <Figure
              label="COD owed by couriers"
              value={formatPaise(result.data.money.codOutstandingPaise)}
              icon={Wallet}
              tone="warning"
              href="/admin/money"
            />
            <Figure
              label="Revenue, last 30 days"
              value={formatPaise(result.data.money.revenue30dPaise)}
              icon={Wallet}
              tone="success"
              href="/admin/money"
            />
          </section>
        </>
      ) : null}

      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:items-start">
        <div className="grid min-w-0 gap-4 lg:gap-5">
          <DataCard testId="admin-shipments-chart" title="Shipments booked, last 14 days" result={result}>
            {(data) => (
              <BarChart
                label="Shipments booked per day"
                data={data.shipmentsByDay.map((day) => ({ label: shortDay(day.date), value: day.count }))}
                format={(n) => n.toLocaleString('en-IN')}
              />
            )}
          </DataCard>
          <DataCard testId="admin-pipeline" title="Where shipments are now" result={result}>
            {(data) => (
              <SegmentBar
                title="Shipments by stage"
                segments={[
                  { label: 'To process', value: data.pipeline.toProcess, tone: 'series3' },
                  { label: 'In transit', value: data.pipeline.inTransit, tone: 'primary' },
                  { label: 'Out for delivery', value: data.pipeline.outForDelivery, tone: 'series2' },
                  { label: 'Returning', value: data.pipeline.returning, tone: 'error' },
                ]}
              />
            )}
          </DataCard>
        </div>

        <DataCard testId="admin-attention" title="Needs you" result={result}>
          {(data) => (
            <ul className="motion-stagger grid gap-1">
              {data.attention.map((item) => {
                const { icon: Icon, chip } = ATTENTION[item.tone];
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="group flex min-h-14 items-start gap-3 rounded-control p-2.5 transition-colors duration-150 hover:bg-muted/70"
                    >
                      <span className={`grid size-9 shrink-0 place-items-center rounded-control ${chip}`}>
                        <Icon aria-hidden="true" className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm leading-5 font-semibold">{item.title}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-on-surface/65">{item.detail}</span>
                      </span>
                      <ArrowRight
                        aria-hidden="true"
                        className="mt-2 size-4 shrink-0 text-on-surface/40 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </DataCard>
      </div>

      {result.ok ? (
        <p className="text-xs text-on-surface/55">
          30-day totals:{' '}
          <Link href="/admin/shipments?status=DELIVERED" className="hover:text-primary underline-offset-2 hover:underline">
            {result.data.shipments.delivered30d.toLocaleString('en-IN')} delivered
          </Link>
          ,{' '}
          <Link href="/admin/shipments?view=rto" className="hover:text-primary underline-offset-2 hover:underline">
            {result.data.shipments.rto30d.toLocaleString('en-IN')} returned
          </Link>
          , revenue{' '}
          <Link href="/admin/money" className="hover:text-primary underline-offset-2 hover:underline">
            {formatPaiseCompact(result.data.money.revenue30dPaise)}
          </Link>
          .
        </p>
      ) : null}
    </>
  );
}

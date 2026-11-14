import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { RetryButton } from '@/app/(app)/dashboard/retry-button';
import { carrierLabel } from '@/components/orders/carrier-badge';
import { getDemoSession } from '@/lib/auth/session';
import { pickupsService } from '@/lib/data/pickups';
import {
  PICKUP_STATUS_LABELS,
  formatPickupWindow,
  shipmentCount,
} from '@/lib/data/pickups/format';
import { formatDate } from '@/lib/format/date';
import { PrintButton } from './print-button';

export const metadata: Metadata = { title: 'Pickup manifest | Evoc Ships' };

interface ManifestPageProps {
  params: Promise<{ id: string }>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-on-surface/60">{label}</dt>
      <dd className="text-sm font-medium [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}

/**
 * A page for printing. It sits inside the signed-in app, so it checks the session, but it has no
 * sidebar or top bar, so nothing needs hiding from the printout except its own buttons.
 */
export default async function ManifestPrintPage({ params }: ManifestPageProps) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const result = await pickupsService().getPickup(id);
  if (!result.ok && result.error.kind === 'not_found') notFound();

  const back = (
    <Link
      href="/orders/pickups"
      // Written out here: a string exported from a client module is not a string in server code.
      className="inline-flex h-control items-center justify-center gap-2 rounded-control border border-secondary px-4 text-sm font-medium hover:bg-muted max-lg:h-11 print:hidden"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Back to pickups
    </Link>
  );

  if (!result.ok) {
    return (
      <main className="mx-auto grid w-full max-w-3xl gap-4 p-4 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-error/10 p-3">
          <p className="text-sm">
            {result.error.kind === 'unauthorized'
              ? 'Sign in again to see this data.'
              : result.error.message}
          </p>
          <RetryButton />
        </div>
        <div>{back}</div>
      </main>
    );
  }

  const pickup = result.data;

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 p-4 lg:p-8 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        {back}
        <PrintButton />
      </div>

      {/* The sheet is always light, so a dark-mode printout is not pale text on white paper. It avoids
          `rounded-card`, which turns cards to glass in dark mode, and it has no entrance motion. */}
      <article
        data-theme="light"
        className="grid gap-6 rounded-(--radius-card) border border-secondary bg-surface p-card text-on-surface print:rounded-none print:border-0 print:p-0"
      >
        {result.source === 'mock' ? (
          <p
            data-testid="sample-manifest"
            className="rounded-control border border-primary bg-muted px-3 py-2 text-sm"
          >
            <strong className="font-semibold">Sample manifest</strong>
            {' '}
            <span>This uses sample data and is not for a courier.</span>
          </p>
        ) : null}

        <header className="grid gap-1">
          <h1 className="font-heading text-[28px] leading-9 font-extrabold tracking-[-0.02em] break-words">Pickup manifest</h1>
          <p className="text-sm text-on-surface/70 [overflow-wrap:anywhere]">Pickup {pickup.id}</p>
        </header>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Fact label="Pickup date" value={formatDate(pickup.pickupDate)} />
          <Fact label="Window" value={formatPickupWindow(pickup.window)} />
          <Fact label="Courier" value={carrierLabel(pickup.carrier)} />
          <Fact label="Pickup address" value={pickup.addressLabel} />
          <Fact label="Shipments" value={shipmentCount(pickup.awbs.length)} />
          <Fact label="Status" value={PICKUP_STATUS_LABELS[pickup.status]} />
        </dl>

        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-on-surface text-xs font-semibold tracking-wide text-on-surface/70 uppercase">
              <th className="w-12 py-2 pr-2">No.</th>
              <th className="py-2">AWB</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary">
            {pickup.awbs.map((awb, index) => (
              <tr key={awb} className="break-inside-avoid">
                <td className="py-2 pr-2 font-mono text-on-surface/70 tabular-nums">{index + 1}</td>
                <td
                  data-testid="manifest-awb"
                  className="py-2 font-mono font-semibold [overflow-wrap:anywhere]"
                >
                  {awb}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 grid gap-8 break-inside-avoid sm:grid-cols-2">
          <p className="border-t border-on-surface pt-2 text-xs">Merchant signature</p>
          <p className="border-t border-on-surface pt-2 text-xs">Courier executive name and signature</p>
        </div>
      </article>
    </main>
  );
}

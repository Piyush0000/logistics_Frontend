import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { RetryButton } from '@/app/(app)/dashboard/retry-button';
import { Barcode } from '@/components/label/barcode';
import { getDemoSession } from '@/lib/auth/session';
import { LABEL_COMPANY, shipmentLabel, type ShipmentLabel } from '@/lib/label/data';
import { formatDate } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';
import { PrintLabelButton } from './print-label-button';

export const metadata: Metadata = { title: 'Shipping label | Evoc Ships' };

const rupees = (amount: number) => formatPaise(Math.round(amount * 100), { decimals: 0 });

function address(a: ShipmentLabel['origin']) {
  return [a.line1, a.line2, `${a.city}, ${a.state} ${a.pincode}`].filter(Boolean).join(', ');
}

/**
 * Evoc's own 4×6 inch shipping label: Evoc Labs Pvt Ltd at the top, our invoice number, the buyer,
 * what is inside, and two barcodes. The courier AWB barcode is what the courier scans at pickup and
 * at every hub, so it is printed large; the courier's name and logo are not printed.
 */
export default async function PrintLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const result = await shipmentLabel(id);
  if (!result.ok && result.error.kind === 'not_found') notFound();

  const back = (
    <Link
      href={`/orders/${encodeURIComponent(id)}`}
      className="inline-flex h-control items-center justify-center gap-2 rounded-control border border-secondary px-4 text-sm font-medium hover:bg-muted max-lg:h-11 print:hidden"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Back to shipment
    </Link>
  );

  if (!result.ok) {
    return (
      <div className="mx-auto grid w-full max-w-3xl gap-4 p-4 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-error/10 p-3">
          <p className="text-sm">
            {result.error.kind === 'unauthorized' ? 'Sign in again to print this label.' : result.error.message}
          </p>
          <RetryButton />
        </div>
        <div>{back}</div>
      </div>
    );
  }

  const label = result.data;
  const value = label.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const cod = label.payment_type === 'COD';

  return (
    <div className="mx-auto grid w-full max-w-3xl justify-items-center gap-6 p-4 lg:p-8 print:block print:p-0">
      {/* Prints only the label, at the corner of a 4×6 inch sheet, whatever surrounds it on screen. */}
      <style>{`
        @page { size: 4in 6in; margin: 0; }
        @media print {
          body * { visibility: hidden !important; }
          #evoc-label, #evoc-label * { visibility: visible !important; }
          #evoc-label { position: fixed; left: 0; top: 0; margin: 0; border: 0; }
        }
      `}</style>
      <div className="flex w-full flex-wrap items-center justify-between gap-3 print:hidden">
        {back}
        <PrintLabelButton />
      </div>

      <article
        id="evoc-label"
        data-testid="shipping-label"
        className="flex h-[6in] w-[4in] flex-col overflow-hidden border border-black bg-white font-body text-[10px] leading-tight text-black"
      >
        <header className="flex items-center justify-between gap-2 border-b-2 border-black px-2 py-1.5">
          <div className="min-w-0">
            <p className="text-[14px] font-extrabold tracking-tight">{LABEL_COMPANY}</p>
            <p className="text-[9px]">Shipped via Evoc Ships</p>
          </div>
          <div
            data-testid="label-payment"
            className={`shrink-0 border-2 border-black px-2 py-1 text-center font-extrabold ${cod ? 'bg-black text-white' : ''}`}
          >
            <p className="text-[12px]">{cod ? 'COD' : 'PREPAID'}</p>
            {cod ? <p className="text-[13px]">{rupees(label.cod_amount)}</p> : null}
          </div>
        </header>

        <section className="border-b border-black px-3 pt-2 pb-1">
          <Barcode value={label.carrier_awb} height={62} label="Courier AWB" testId="label-courier-barcode" />
          <p className="mt-0.5 text-center font-mono text-[12px] font-bold tracking-widest">{label.carrier_awb}</p>
        </section>

        <section className="border-b border-black px-2 py-1.5">
          <p className="text-[9px] font-bold uppercase">Deliver to</p>
          <p className="text-[13px] font-extrabold [overflow-wrap:anywhere]">{label.destination.name}</p>
          <p className="[overflow-wrap:anywhere]">{address(label.destination)}</p>
          <p className="mt-0.5 flex justify-between gap-2 font-bold">
            <span>Phone {label.destination.phone}</span>
            <span className="text-[14px]">PIN {label.destination.pincode}</span>
          </p>
        </section>

        <section className="grid grid-cols-2 gap-x-2 gap-y-0.5 border-b border-black px-2 py-1.5">
          <p>
            <span className="font-bold">Invoice no.</span> {label.invoice_number}
          </p>
          <p>
            <span className="font-bold">Invoice date</span> {formatDate(label.invoice_date)}
          </p>
          <p className="[overflow-wrap:anywhere]">
            <span className="font-bold">Order</span> {label.reference_id ?? label.awb}
          </p>
          <p>
            <span className="font-bold">Weight</span> {label.weight_kg} kg
          </p>
          {label.dimensions ? (
            <p className="col-span-2">
              <span className="font-bold">Size</span> {label.dimensions.length_cm} × {label.dimensions.width_cm} ×{' '}
              {label.dimensions.height_cm} cm
            </p>
          ) : null}
        </section>

        <section className="min-h-0 flex-1 overflow-hidden border-b border-black px-2 py-1">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-black text-left text-[9px] uppercase">
                <th className="py-0.5 font-bold">Item</th>
                <th className="w-8 py-0.5 text-right font-bold">Qty</th>
                <th className="w-16 py-0.5 text-right font-bold">Value</th>
              </tr>
            </thead>
            <tbody>
              {label.items.slice(0, 4).map((item, index) => (
                <tr key={`${item.name}-${index}`}>
                  <td className="py-0.5 [overflow-wrap:anywhere]">{item.name}</td>
                  <td className="py-0.5 text-right">{item.quantity}</td>
                  <td className="py-0.5 text-right">{rupees(item.unit_price * item.quantity)}</td>
                </tr>
              ))}
              {label.items.length > 4 ? (
                <tr>
                  <td colSpan={3} className="py-0.5 italic">
                    and {label.items.length - 4} more
                  </td>
                </tr>
              ) : null}
            </tbody>
            <tfoot>
              <tr className="border-t border-black font-bold">
                <td className="py-0.5">Total value</td>
                <td />
                <td className="py-0.5 text-right">{rupees(value)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section className="border-b border-black px-2 py-1">
          <p className="text-[9px] font-bold uppercase">If undelivered, return to</p>
          <p className="font-bold [overflow-wrap:anywhere]">{label.origin.name}</p>
          <p className="[overflow-wrap:anywhere]">
            {address(label.origin)} · {label.origin.phone}
          </p>
        </section>

        <footer className="px-3 pt-1 pb-1.5">
          <Barcode value={label.awb} height={30} label="Evoc AWB" testId="label-evoc-barcode" />
          <p className="flex justify-between font-mono text-[10px] font-bold">
            <span>{label.awb}</span>
            <span>Sold by {label.merchant_name}</span>
          </p>
        </footer>
      </article>
    </div>
  );
}

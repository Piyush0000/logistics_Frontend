import { BadgeIndianRupee, Clock, Truck } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { CarrierBadge, carrierLabel } from '@/components/orders/carrier-badge';
import { SampleBadge } from '@/components/sample-badge';
import { PRIMARY_BUTTON } from '@/components/ui/dialog';
import { splitTwoTone, StatTile } from '@/components/ui/stat-tile';
import { formatPaise } from '@/lib/format/money';
import type { RateQuote } from '@/lib/data/rates/types';
import type { QuoteActionResult } from './actions';

const formatKg = (value: number) => `${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg`;
const formatDays = (days: number) => `Delivers in about ${days} ${days === 1 ? 'day' : 'days'}`;

/** A charge in the two-tone figure style: rupees strong, paise softer. */
function Price({ paise }: { paise: number }) {
  const [lead, rest] = splitTwoTone(formatPaise(paise));
  return (
    <p className="font-mono text-xl leading-7 font-medium tracking-tight break-words">
      {lead}
      {rest ? <span className="text-on-surface/45">{rest}</span> : null}
    </p>
  );
}

/** The courier quotes, cheapest first, or what to do next when there are none. */
/** Why a courier can't take this parcel, in words. */
function unavailableReason(quote: RateQuote, paymentType: string): string {
  const name = carrierLabel(quote.carrier);
  switch (quote.reason) {
    case 'NO_RATE_CARD':
      return `No price is set for ${name} on this route yet.`;
    case 'WEIGHT_LIMIT':
      return `Too heavy for ${name}.`;
    case 'COD_NOT_OFFERED':
    case 'COD_NOT_SERVICEABLE':
      return `${name} does not offer cash on delivery here.`;
    default:
      return paymentType === 'COD' && !quote.codAvailable
        ? `${name} does not offer cash on delivery.`
        : `${name} does not deliver to this pincode.`;
  }
}

export function QuoteList({
  result,
  paymentType,
  pending,
  onRetry,
}: {
  result: QuoteActionResult | null;
  paymentType: 'PREPAID' | 'COD';
  pending: boolean;
  onRetry: () => void;
}) {
  const quotes = result?.ok ? result.quotes : [];
  // Field mistakes are shown beside the fields. Anything else is a problem with getting quotes.
  const failure = result && !result.ok && !result.errors ? result.message : null;
  const priced = quotes.filter((quote) => quote.serviceable && quote.chargePaise !== null);
  const cheapest = priced.length > 0 ? Math.min(...priced.map((quote) => quote.chargePaise ?? 0)) : null;
  const days = priced.flatMap((quote) => (quote.estimatedDays ? [quote.estimatedDays] : []));
  const fastest = days.length > 0 ? Math.min(...days) : null;

  return (
    <section
      data-testid="quotes-card"
      aria-label="Courier quotes"
      aria-busy={pending}
      className="motion-rise min-w-0 rounded-card border border-secondary bg-surface p-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-heading text-lg leading-7 font-bold tracking-tight lg:text-xl">Courier quotes</h2>
        {result?.ok && result.source === 'mock' ? <SampleBadge /> : null}
      </div>

      {result?.ok ? (
        <>
          {quotes.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              <div className="min-w-0 rounded-control border border-secondary/70 bg-tertiary/50 p-3">
                <StatTile
                  label="Cheapest quote"
                  value={cheapest === null ? 'None' : formatPaise(cheapest)}
                  icon={BadgeIndianRupee}
                  tone="success"
                />
              </div>
              <div className="min-w-0 rounded-control border border-secondary/70 bg-tertiary/50 p-3">
                <StatTile
                  label="Couriers that deliver"
                  value={`${priced.length} of ${quotes.length}`}
                  icon={Truck}
                  tone={priced.length > 0 ? 'primary' : 'warning'}
                />
              </div>
              <div className="min-w-0 rounded-control border border-secondary/70 bg-tertiary/50 p-3 min-[420px]:col-span-2 lg:col-span-1 xl:col-span-1">
                <StatTile
                  label="Fastest delivery"
                  value={fastest === null ? 'Not given' : `${fastest} ${fastest === 1 ? 'day' : 'days'}`}
                  icon={Clock}
                  tone="accent"
                />
              </div>
            </div>
          ) : null}
          <ul className="motion-stagger mt-4 grid gap-3">
          {quotes.map((quote, index) => (
            <li
              key={quote.carrier}
              data-testid="quote-item"
              style={{ '--i': index } as CSSProperties}
              className={`grid min-w-0 gap-3 rounded-control border p-3 transition-colors duration-150 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center lg:p-4 ${
                quote.serviceable
                  ? 'border-secondary hover:border-primary/40 hover:bg-muted/40'
                  : 'border-secondary/70 bg-tertiary/40'
              }`}
            >
              <div className="min-w-0">
                <CarrierBadge carrier={quote.carrier} />
                {quote.serviceable ? (
                  <p className="mt-2 text-sm text-on-surface/70">
                    {quote.estimatedDays ? `${formatDays(quote.estimatedDays)}. ` : ''}
                    Chargeable weight {formatKg(quote.chargeableWeightKg)}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-on-surface/70">
                    {unavailableReason(quote, paymentType)}{' '}
                    Chargeable weight {formatKg(quote.chargeableWeightKg)}
                  </p>
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-3 sm:items-end">
                {quote.serviceable && quote.chargePaise !== null ? (
                  <>
                    <Price paise={quote.chargePaise} />
                    <Link
                      href={`/orders/create?carrier=${quote.carrier}`}
                      className="inline-flex h-11 items-center justify-center rounded-control bg-primary px-4 text-sm font-semibold text-on-primary transition-[background-color,transform] duration-150 hover:bg-accent active:scale-[.97] lg:h-control"
                    >
                      Ship with this
                    </Link>
                  </>
                ) : (
                  <p className="inline-flex rounded-md bg-warning/15 px-2 py-0.5 text-sm font-semibold">
                    Not serviceable
                  </p>
                )}
              </div>
            </li>
          ))}
          </ul>
        </>
      ) : failure ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-control bg-error/10 p-3">
          <p className="text-sm">{failure}</p>
          <button
            type="button"
            onClick={onRetry}
            disabled={pending}
            className={`${PRIMARY_BUTTON} h-11 lg:h-control`}
          >
            Try again
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-on-surface/70">
          Enter the details above and choose Get quotes to compare couriers, cheapest first.
        </p>
      )}
    </section>
  );
}

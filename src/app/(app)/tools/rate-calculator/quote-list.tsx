import Link from 'next/link';
import { CarrierBadge, carrierLabel } from '@/components/orders/carrier-badge';
import { SampleBadge } from '@/components/sample-badge';
import { formatPaise } from '@/lib/format/money';
import type { QuoteActionResult } from './actions';

const formatKg = (value: number) => `${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg`;
const formatDays = (days: number) => `Delivers in about ${days} ${days === 1 ? 'day' : 'days'}`;

/** The courier quotes, cheapest first, or what to do next when there are none. */
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

  return (
    <section
      data-testid="quotes-card"
      aria-label="Courier quotes"
      aria-busy={pending}
      className="min-w-0 rounded-card border border-secondary bg-surface p-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-heading text-xl leading-7 lg:text-2xl lg:leading-8">Courier quotes</h2>
        {result?.ok && result.source === 'mock' ? <SampleBadge /> : null}
      </div>

      {result?.ok ? (
        <ul className="mt-4 grid gap-3">
          {quotes.map((quote) => (
            <li
              key={quote.carrier}
              data-testid="quote-item"
              className="grid min-w-0 gap-3 rounded-control border border-secondary p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
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
                    {paymentType === 'COD' && !quote.codAvailable
                      ? `${carrierLabel(quote.carrier)} does not offer cash on delivery. `
                      : 'This courier does not deliver to this pincode. '}
                    Chargeable weight {formatKg(quote.chargeableWeightKg)}
                  </p>
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-3 sm:items-end">
                {quote.serviceable && quote.chargePaise !== null ? (
                  <>
                    <p className="text-xl font-semibold break-words">{formatPaise(quote.chargePaise)}</p>
                    <Link
                      href={`/orders/create?carrier=${quote.carrier}`}
                      className="inline-flex h-11 items-center justify-center rounded-control bg-primary px-4 text-sm font-medium text-on-primary lg:h-control"
                    >
                      Ship with this
                    </Link>
                  </>
                ) : (
                  <p className="text-sm font-semibold">Not serviceable</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : failure ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-control bg-error/10 p-3">
          <p className="text-sm">{failure}</p>
          <button
            type="button"
            onClick={onRetry}
            disabled={pending}
            className="h-control rounded-control bg-primary px-4 text-sm font-medium text-on-primary disabled:bg-primary/50"
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

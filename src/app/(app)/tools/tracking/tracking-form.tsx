import Form from 'next/form';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { FIELD_LABEL } from '@/components/ui/field-styles';

/** A plain GET form, so the AWBs live in the URL and a result can be shared or reloaded. */
export function TrackingForm({ query }: { query: string }) {
  return (
    <section aria-label="Track shipments" className="motion-rise rounded-card border border-secondary bg-surface p-card">
      <Form
        action="/tools/tracking"
        className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
      >
        <div className="min-w-0">
          <label htmlFor="awb" className={FIELD_LABEL}>
            AWB numbers
          </label>
          <input
            id="awb"
            name="awb"
            type="text"
            autoComplete="off"
            defaultValue={query}
            placeholder="For example DEMOEK001, DEMODL002"
            className="h-11 w-full rounded-control border border-secondary bg-surface px-3 text-base transition-[border-color,box-shadow] duration-150 hover:border-on-surface/30 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 lg:h-control lg:text-sm"
          />
          <p className="mt-1 text-xs text-on-surface/70">
            Separate several AWBs with commas or spaces. Up to 10 are tracked at once.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            className={`${PRIMARY_BUTTON} h-11 flex-1 px-6 sm:flex-none lg:h-control`}
          >
            <Search aria-hidden="true" className="size-4" />
            Track
          </button>
          <Link
            href="/tools/tracking"
            className={`${SECONDARY_BUTTON} h-11 flex-1 hover:border-primary/40 hover:bg-muted sm:flex-none lg:h-control`}
          >
            Clear
          </Link>
        </div>
      </Form>
    </section>
  );
}

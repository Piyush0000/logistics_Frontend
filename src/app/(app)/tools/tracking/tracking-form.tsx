import Form from 'next/form';
import Link from 'next/link';

/** A plain GET form, so the AWBs live in the URL and a result can be shared or reloaded. */
export function TrackingForm({ query }: { query: string }) {
  return (
    <section aria-label="Track shipments" className="rounded-card border border-secondary bg-surface p-card">
      <Form
        action="/tools/tracking"
        className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
      >
        <div className="min-w-0">
          <label htmlFor="awb" className="mb-1 block text-sm leading-5 font-medium">
            AWB numbers
          </label>
          <input
            id="awb"
            name="awb"
            type="text"
            autoComplete="off"
            defaultValue={query}
            placeholder="For example DEMOEK001, DEMODL002"
            className="h-control w-full rounded-control border border-secondary bg-surface px-3 text-base lg:text-sm"
          />
          <p className="mt-1 text-xs text-on-surface/70">
            Separate several AWBs with commas or spaces. Up to 10 are tracked at once.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            className="h-control flex-1 rounded-control bg-primary px-6 text-sm font-medium text-tertiary sm:flex-none"
          >
            Track
          </button>
          <Link
            href="/tools/tracking"
            className="inline-flex h-control flex-1 items-center justify-center rounded-control border border-secondary px-4 text-sm font-medium sm:flex-none"
          >
            Clear
          </Link>
        </div>
      </Form>
    </section>
  );
}

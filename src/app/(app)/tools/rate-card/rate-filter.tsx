'use client';

import { CARRIERS, type CarrierName } from '@logicore/contracts';
import Form from 'next/form';
import Link from 'next/link';
import { useState } from 'react';
import { carrierLabel } from '@/components/orders/carrier-badge';
import { SelectField } from '@/components/ui/select-field';

type CarrierValue = CarrierName | 'all';

const OPTIONS = [
  { value: 'all' as CarrierValue, label: 'All carriers' },
  ...CARRIERS.map((value) => ({ value: value as CarrierValue, label: carrierLabel(value) })),
];

/** A carrier picker that submits to the same page, so the filter lives in the URL. */
export function RateFilter({ carrier, path }: { carrier: CarrierName | undefined; path: string }) {
  const [value, setValue] = useState<CarrierValue>(carrier ?? 'all');

  return (
    <section aria-label="Filter the rate card" className="rounded-card border border-secondary bg-surface p-card">
      <Form
        action={path}
        className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[minmax(0,16rem)_auto] sm:items-end"
      >
        <SelectField label="Carrier" name="carrier" value={value} options={OPTIONS} onChange={setValue} />
        <div className="flex gap-3">
          <button
            type="submit"
            className="h-control flex-1 rounded-control bg-primary px-6 text-sm font-medium text-on-primary sm:flex-none"
          >
            Apply
          </button>
          <Link
            href={path}
            className="inline-flex h-control flex-1 items-center justify-center rounded-control border border-secondary px-4 text-sm font-medium sm:flex-none"
          >
            Clear
          </Link>
        </div>
      </Form>
    </section>
  );
}

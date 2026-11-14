'use client';

import type { CarrierName } from '@logicore/contracts';
import Form from 'next/form';
import Link from 'next/link';
import { useState } from 'react';
import { carrierLabel } from '@/components/orders/carrier-badge';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { SelectField } from '@/components/ui/select-field';

type CarrierValue = CarrierName | 'all';

/**
 * A carrier picker that submits to the same page, so the filter lives in the URL. The carrier list
 * comes from the server page, so the contracts package (and zod) stay out of the browser bundle.
 */
export function RateFilter({
  carrier,
  carriers,
  path,
}: {
  carrier: CarrierName | undefined;
  carriers: readonly CarrierName[];
  path: string;
}) {
  const [value, setValue] = useState<CarrierValue>(carrier ?? 'all');
  const options = [
    { value: 'all' as CarrierValue, label: 'All carriers' },
    ...carriers.map((name) => ({ value: name as CarrierValue, label: carrierLabel(name) })),
  ];

  return (
    <section aria-label="Filter the rate card" className="motion-rise rounded-card border border-secondary bg-surface p-card">
      <Form
        action={path}
        className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[minmax(0,16rem)_auto] sm:items-end"
      >
        <SelectField label="Carrier" name="carrier" value={value} options={options} onChange={setValue} />
        <div className="flex gap-3">
          <button
            type="submit"
            className={`${PRIMARY_BUTTON} h-11 flex-1 px-6 sm:flex-none lg:h-control`}
          >
            Apply
          </button>
          <Link
            href={path}
            className={`${SECONDARY_BUTTON} h-11 flex-1 hover:border-primary/40 hover:bg-muted sm:flex-none lg:h-control`}
          >
            Clear
          </Link>
        </div>
      </Form>
    </section>
  );
}

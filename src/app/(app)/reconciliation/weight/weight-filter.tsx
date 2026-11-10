'use client';

import Form from 'next/form';
import Link from 'next/link';
import { useId, useState } from 'react';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import { SelectField } from '@/components/ui/select-field';
import { DISCREPANCY_STATUSES, type DiscrepancyStatus } from '@/lib/data/weight';
import { STATUS_LABELS } from './discrepancy-status';

type StatusValue = DiscrepancyStatus | 'all';

const OPTIONS = [
  { value: 'all' as StatusValue, label: 'All statuses' },
  ...DISCREPANCY_STATUSES.map((value) => ({ value: value as StatusValue, label: STATUS_LABELS[value] })),
];

/** A status picker and AWB search that submit to the same page, so the filters live in the URL. */
export function WeightFilter({
  status,
  q,
  path,
}: {
  status: DiscrepancyStatus | undefined;
  q: string;
  path: string;
}) {
  const searchId = useId();
  const [value, setValue] = useState<StatusValue>(status ?? 'all');

  return (
    <section
      aria-label="Filter weight discrepancies"
      className="rounded-card border border-secondary bg-surface p-card"
    >
      <Form
        action={path}
        className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,18rem)_auto] sm:items-end"
      >
        <SelectField label="Status" name="status" value={value} options={OPTIONS} onChange={setValue} />
        <div className="min-w-0">
          <label htmlFor={searchId} className={FIELD_LABEL}>
            AWB
          </label>
          <input
            id={searchId}
            name="q"
            type="search"
            defaultValue={q}
            maxLength={100}
            placeholder="Start typing an AWB"
            className="h-control w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            className="h-control flex-1 rounded-control bg-primary px-6 text-sm font-medium text-tertiary sm:flex-none"
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

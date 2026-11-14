'use client';

import Form from 'next/form';
import Link from 'next/link';
import { useId, useState } from 'react';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { SelectField } from '@/components/ui/select-field';
import { DISCREPANCY_STATUSES, type DiscrepancyStatus } from '@/lib/data/weight/types';
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
      className="motion-rise rounded-card border border-secondary bg-surface p-card"
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
            className="h-control w-full rounded-control border border-secondary bg-surface px-3 text-sm transition-[border-color,box-shadow] duration-150 hover:border-on-surface/30 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            className={`${PRIMARY_BUTTON} flex-1 sm:flex-none`}
          >
            Apply
          </button>
          <Link
            href={path}
            className={`${SECONDARY_BUTTON} flex-1 hover:border-primary/40 hover:bg-muted sm:flex-none`}
          >
            Clear
          </Link>
        </div>
      </Form>
    </section>
  );
}

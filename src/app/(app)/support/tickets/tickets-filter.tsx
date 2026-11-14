'use client';

import Form from 'next/form';
import Link from 'next/link';
import { useState } from 'react';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { SelectField } from '@/components/ui/select-field';
import { STATUS_LABELS, TICKET_STATUSES, type TicketStatus } from '@/lib/data/support/types';

type StatusValue = TicketStatus | 'all';

const OPTIONS = [
  { value: 'all' as StatusValue, label: 'All statuses' },
  ...TICKET_STATUSES.map((value) => ({ value: value as StatusValue, label: STATUS_LABELS[value] })),
];

/** A status picker that submits to the same page, so the filter lives in the URL. */
export function TicketsFilter({ status, path }: { status: TicketStatus | undefined; path: string }) {
  const [value, setValue] = useState<StatusValue>(status ?? 'all');

  return (
    <section
      aria-label="Filter support tickets"
      className="motion-rise min-w-0 rounded-card border border-secondary bg-surface p-card"
    >
      <Form
        action={path}
        className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[minmax(0,14rem)_auto] sm:items-end"
      >
        <SelectField label="Status" name="status" value={value} options={OPTIONS} onChange={setValue} />
        <div className="flex gap-3">
          <button type="submit" className={`${PRIMARY_BUTTON} flex-1 sm:flex-none`}>
            Apply
          </button>
          <Link
            href={path}
            className={`${SECONDARY_BUTTON} flex-1 sm:flex-none`}
          >
            Clear
          </Link>
        </div>
      </Form>
    </section>
  );
}

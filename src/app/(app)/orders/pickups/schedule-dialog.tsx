'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { Dialog, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { DateField } from '@/components/ui/date-field';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import { SelectField } from '@/components/ui/select-field';
import type { PickupAddress } from '@/lib/data/pickup-addresses/types';
import { checkPickupDate, checkWindow } from '@/lib/data/pickups/input';
import { shipmentCount } from '@/lib/data/pickups/format';
import { schedulePickupAction } from './actions';

const TIME_INPUT =
  'h-11 w-full rounded-control border border-secondary bg-surface px-3 text-sm transition-[border-color,box-shadow] duration-150 outline-none hover:border-on-surface/30 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 lg:h-control';

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <input
        id={id}
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={TIME_INPUT}
      />
    </div>
  );
}

/** Asks for a date, an optional window and an address, then schedules one pickup for the chosen shipments. */
export function ScheduleDialog({
  awbs,
  carrierLabel,
  today,
  addresses,
  onClose,
  onScheduled,
}: {
  awbs: string[];
  carrierLabel: string;
  /** Today in Indian time, as YYYY-MM-DD. */
  today: string;
  /** Saved pickup addresses, or null when they cannot be loaded. */
  addresses: PickupAddress[] | null;
  onClose: () => void;
  onScheduled: (pickupId: string) => void;
}) {
  const [date, setDate] = useState(today);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [addressId, setAddressId] = useState(
    addresses?.find((entry) => entry.isDefault)?.id ?? addresses?.[0]?.id ?? '',
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const options = (addresses ?? []).map((entry) => ({
    value: entry.id,
    label: `${entry.label}, ${entry.address.city}`,
  }));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    // The server checks all of this again. Checking here answers without a round trip.
    if ((start === '') !== (end === '')) {
      setMessage('Enter both the start and end time, or leave both empty.');
      return;
    }
    const window = start && end ? { start, end } : null;
    const problem = checkPickupDate(date) ?? checkWindow(window);
    if (problem) {
      setMessage(problem);
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const result = await schedulePickupAction({
        pickupDate: date,
        window,
        awbs,
        pickupAddressId: addressId,
      });
      if (result.ok) onScheduled(result.pickupId);
      else setMessage(result.message);
    });
  }

  return (
    <Dialog title="Schedule pickup" onClose={onClose}>
      <form noValidate onSubmit={handleSubmit} className="grid gap-5">
        <p className="inline-flex w-fit rounded-md bg-tertiary px-2 py-1 text-sm text-on-surface/70">
          {shipmentCount(awbs.length)}, {carrierLabel}
        </p>

        <DateField label="Pickup date" name="pickupDate" value={date} onChange={setDate} />

        <fieldset className="grid gap-3">
          <legend className="mb-1 text-sm font-medium">Pickup window (optional)</legend>
          <div className="grid grid-cols-2 gap-3">
            <TimeField label="Window start" value={start} onChange={setStart} />
            <TimeField label="Window end" value={end} onChange={setEnd} />
          </div>
        </fieldset>

        {options.length > 0 ? (
          <SelectField
            label="Pickup address"
            name="pickupAddressId"
            value={addressId}
            options={options}
            onChange={setAddressId}
          />
        ) : (
          <p className="rounded-control bg-muted p-3 text-sm">
            {addresses === null
              ? 'Saved pickup addresses are not available yet. Try again later.'
              : 'You have no saved pickup address. Add one in Settings, then try again.'}
          </p>
        )}

        {message ? (
          <p role="alert" className="rounded-control bg-error/10 p-3 text-sm">
            {message}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} className={`${SECONDARY_BUTTON} max-lg:h-11`}>
            Cancel
          </button>
          <button type="submit" disabled={pending || options.length === 0} className={`${PRIMARY_BUTTON} max-lg:h-11`}>
            Confirm pickup
          </button>
        </div>
      </form>
    </Dialog>
  );
}

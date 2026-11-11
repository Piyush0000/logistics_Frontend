'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { Dialog, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import { MAX_LABEL_LENGTH, type PickupAddress } from '@/lib/data/pickup-addresses/types';
import { savePickupAddressAction, type AddressField, type AddressFieldErrors } from './actions';

const INPUT = 'h-control w-full min-w-0 rounded-control border bg-surface px-3 text-base lg:text-sm';

function Field({
  label,
  value,
  error,
  onChange,
  type = 'text',
  maxLength,
  inputMode,
  autoComplete,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type?: 'text' | 'tel';
  maxLength?: number;
  inputMode?: 'numeric' | 'tel';
  autoComplete?: string;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete ?? 'off'}
        maxLength={maxLength}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`${INPUT} ${error ? 'border-error' : 'border-secondary'}`}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Adds a pickup address, or edits `entry`. The server checks everything again and answers per field. */
export function AddressForm({
  entry,
  isOnlyAddress,
  onClose,
  onSaved,
}: {
  entry?: PickupAddress;
  /** The first address is always the default, so there is nothing to choose. */
  isOnlyAddress: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [values, setValues] = useState({
    label: entry?.label ?? '',
    name: entry?.address.name ?? '',
    phone: entry?.address.phone ?? '',
    line1: entry?.address.line1 ?? '',
    line2: entry?.address.line2 ?? '',
    city: entry?.address.city ?? '',
    state: entry?.address.state ?? '',
    pincode: entry?.address.pincode ?? '',
  });
  // An edit starts unticked, so saving it never claims the default unless it is ticked here. The
  // default itself is kept by the server, which stops the only default from losing the flag.
  const [isDefault, setIsDefault] = useState(false);
  const [errors, setErrors] = useState<AddressFieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const checkboxId = useId();

  const bind = (field: AddressField) => ({
    value: values[field],
    error: errors[field],
    onChange: (value: string) => setValues((current) => ({ ...current, [field]: value })),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setMessage(null);
    startTransition(async () => {
      const result = await savePickupAddressAction({ ...values, id: entry?.id, isDefault });
      if (result.ok) {
        onSaved(result.message);
      } else {
        setErrors(result.errors ?? {});
        setMessage(result.message);
      }
    });
  }

  return (
    <Dialog title={entry ? 'Edit pickup address' : 'Add pickup address'} onClose={onClose}>
      <form noValidate onSubmit={handleSubmit} className="grid gap-4">
        {/* Ten extra characters, so that a too-long label can be typed and the server explains the limit. */}
        <Field label="Label" maxLength={MAX_LABEL_LENGTH + 10} {...bind('label')} />
        <Field label="Contact name" autoComplete="name" {...bind('name')} />
        <Field label="Phone" type="tel" inputMode="tel" autoComplete="tel" {...bind('phone')} />
        <Field label="Address line 1" {...bind('line1')} />
        <Field label="Address line 2" {...bind('line2')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" {...bind('city')} />
          <Field label="State" {...bind('state')} />
        </div>
        <Field label="Pincode" inputMode="numeric" maxLength={6} {...bind('pincode')} />

        {isOnlyAddress || entry?.isDefault ? (
          <p className="text-sm text-on-surface/70">
            This is your default address. Choose another address as the default to change it.
          </p>
        ) : (
          <label htmlFor={checkboxId} className="flex min-h-11 items-center gap-3 text-sm">
            <input
              id={checkboxId}
              type="checkbox"
              checked={isDefault}
              onChange={(event) => setIsDefault(event.target.checked)}
              className="size-5"
            />
            Make this my default address
          </label>
        )}

        {message ? (
          <p role="alert" className="rounded-control bg-error/10 p-3 text-sm">
            {message}
          </p>
        ) : null}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className={`${SECONDARY_BUTTON} min-h-11`}>
            Cancel
          </button>
          <button type="submit" disabled={pending} className={`${PRIMARY_BUTTON} min-h-11`}>
            Save address
          </button>
        </div>
      </form>
    </Dialog>
  );
}

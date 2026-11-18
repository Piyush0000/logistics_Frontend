'use client';

import Form from 'next/form';
import Link from 'next/link';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { startTransition, useActionState, useId, useState } from 'react';
import { Dialog, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import { SelectField } from '@/components/ui/select-field';
import { cleanText, rateFiltersHref, type RateFilters } from '@/lib/admin/data/pricing/pricing-rules';
import { formatPaise } from '@/lib/format/money';
import {
  addOverrideAction,
  removeOverrideAction,
  setCourierAction,
  updateRateAction,
  type PricingActionState,
} from './actions';
import { SwitchTrack } from './switch-track';

const IDLE: PricingActionState = { status: 'idle' };
const SIZE = 'max-lg:h-11';
const FIELD =
  'w-full rounded-control border border-secondary bg-surface px-3 text-sm transition-[border-color,box-shadow] duration-150 outline-none hover:border-on-surface/30 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 aria-invalid:border-error';

const errorsOf = (state: PricingActionState) => (state.status === 'invalid' ? state.errors : {});

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} role="alert" className="mt-1 text-sm text-error">
      {message}
    </p>
  ) : null;
}

function FormMessage({ state }: { state: PricingActionState }) {
  return state.status === 'invalid' && state.message ? (
    <p role="alert" data-testid="pricing-error" className="rounded-control border border-error/30 bg-error/10 p-3 text-sm">
      {state.message}
    </p>
  ) : null;
}

function Saved({ message, onDone }: { message: string; onDone: () => void }) {
  return (
    <div className="grid gap-4">
      <p role="status" data-testid="pricing-saved" className="rounded-control bg-success/15 p-3 text-sm font-medium">
        {message}
      </p>
      <div className="flex justify-end">
        <button type="button" onClick={onDone} className={`${PRIMARY_BUTTON} ${SIZE} max-lg:flex-1`}>
          Done
        </button>
      </div>
    </div>
  );
}

function Buttons({ pending, onCancel, submit, cancel = 'Cancel' }: { pending: boolean; onCancel: () => void; submit: string; cancel?: string }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button type="button" onClick={onCancel} disabled={pending} className={`${SECONDARY_BUTTON} ${SIZE} max-lg:flex-1`}>
        {cancel}
      </button>
      <button type="submit" disabled={pending} className={`${PRIMARY_BUTTON} ${SIZE} max-lg:flex-1`}>
        {pending ? 'Saving…' : submit}
      </button>
    </div>
  );
}

function TextField({
  label,
  name,
  defaultValue,
  error,
  mono = true,
  inputMode = 'decimal',
}: {
  label: string;
  name: string;
  defaultValue?: string;
  error?: string;
  mono?: boolean;
  inputMode?: 'decimal' | 'text';
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        defaultValue={defaultValue}
        inputMode={inputMode}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${FIELD} h-11 lg:h-control ${mono ? 'font-mono' : ''}`}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

/* ----------------------------------------------------------------- Courier switch */

/** An on/off switch. Turning off asks first; the server keeps at least one courier on. */
export function CourierSwitch({ courier }: { courier: { carrier: string; name: string; enabled: boolean } }) {
  const [state, action, pending] = useActionState(setCourierAction, IDLE);
  const [confirming, setConfirming] = useState(false);

  function send(enabled: boolean) {
    const form = new FormData();
    form.set('carrier', courier.carrier);
    form.set('enabled', String(enabled));
    startTransition(() => action(form));
  }

  return (
    <div>
      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 lg:min-h-control">
        <span className="text-sm font-medium">{courier.enabled ? 'On' : 'Off'}</span>
        <input
          type="checkbox"
          role="switch"
          aria-label={`${courier.name} on for new bookings`}
          checked={courier.enabled}
          disabled={pending}
          onChange={(event) => (event.target.checked ? send(true) : setConfirming(true))}
          className="peer sr-only"
        />
        <SwitchTrack />
      </label>
      {state.status === 'invalid' && state.message ? (
        <p role="alert" data-testid="courier-error" className="mt-2 rounded-control border border-error/30 bg-error/10 p-2 text-xs">
          {state.message}
        </p>
      ) : null}
      {confirming ? (
        <Dialog title={`Turn off ${courier.name}?`} onClose={() => setConfirming(false)}>
          <div className="grid gap-4">
            <p className="text-sm text-on-surface/70">
              Merchants will not be able to book new shipments with {courier.name}. Shipments already booked are not affected.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setConfirming(false)} className={`${SECONDARY_BUTTON} ${SIZE} max-lg:flex-1`}>
                Keep on
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  send(false);
                }}
                className={`${PRIMARY_BUTTON} ${SIZE} max-lg:flex-1`}
              >
                Turn off
              </button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------- Rate edit */

interface Row {
  carrier: string;
  zone: string;
  basePaise: number;
  extraPer500gPaise: number;
  codPercent: number;
  codMinimumPaise: number;
}

const rupees = (paise: number) => (paise / 100).toFixed(2);

export function EditRateButton({ row, carrierName, wide = false }: { row: Row; carrierName: string; wide?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Edit ${carrierName} zone ${row.zone}`}
        className={`${SECONDARY_BUTTON} ${SIZE} ${wide ? 'w-full' : ''}`}
      >
        <Pencil aria-hidden="true" className="size-4" />
        Edit
      </button>
      {open ? (
        <Dialog title={`${carrierName}, zone ${row.zone}`} onClose={() => setOpen(false)}>
          <EditRateForm row={row} onDone={() => setOpen(false)} />
        </Dialog>
      ) : null}
    </>
  );
}

function EditRateForm({ row, onDone }: { row: Row; onDone: () => void }) {
  const [state, action, pending] = useActionState(updateRateAction, IDLE);
  const [dismissed, setDismissed] = useState<PricingActionState | null>(null);
  // Typed values survive the review step and Back.
  const [values, setValues] = useState({
    base: rupees(row.basePaise),
    extra: rupees(row.extraPer500gPaise),
    codPercent: String(row.codPercent),
    codMinimum: rupees(row.codMinimumPaise),
  });

  if (state.status === 'saved') return <Saved message={state.message} onDone={onDone} />;

  const hidden = (
    <>
      <input type="hidden" name="carrier" value={row.carrier} />
      <input type="hidden" name="zone" value={row.zone} />
    </>
  );

  if (state.status === 'review' && state !== dismissed) {
    const { before, after } = state;
    const lines: [string, string, string][] = [
      ['First 500 g', formatPaise(before.basePaise), formatPaise(after.basePaise)],
      ['Each extra 500 g', formatPaise(before.extraPer500gPaise), formatPaise(after.extraPer500gPaise)],
      ['COD percent', `${before.codPercent}%`, `${after.codPercent}%`],
      ['COD minimum', formatPaise(before.codMinimumPaise), formatPaise(after.codMinimumPaise)],
    ];
    return (
      <form action={action} className="grid gap-4" aria-label="Confirm the new prices">
        {hidden}
        <input type="hidden" name="step" value="confirm" />
        <input type="hidden" name="base" value={values.base} />
        <input type="hidden" name="extra" value={values.extra} />
        <input type="hidden" name="codPercent" value={values.codPercent} />
        <input type="hidden" name="codMinimum" value={values.codMinimum} />
        <p className="text-sm text-on-surface/70">New bookings use the new prices as soon as you save.</p>
        <table data-testid="rate-review" className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-on-surface/60">
              <th className="py-1 font-medium">Price</th>
              <th className="py-1 text-right font-medium">Now</th>
              <th className="py-1 text-right font-medium">New</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(([label, now, next]) => (
              <tr key={label} className="border-t border-secondary">
                <td className="py-2">{label}</td>
                <td className="py-2 text-right font-mono text-on-surface/70">{now}</td>
                <td className={`py-2 text-right font-mono ${now !== next ? 'font-semibold text-primary' : ''}`}>{next}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Buttons pending={pending} onCancel={() => setDismissed(state)} submit="Save prices" cancel="Back" />
      </form>
    );
  }

  const errors = errorsOf(state);
  const set = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));
  const field = (key: keyof typeof values, label: string, hint: string) => {
    const id = `rate-${key}`;
    return (
      <div>
        <label htmlFor={id} className={FIELD_LABEL}>
          {label}
        </label>
        <input
          id={id}
          name={key}
          value={values[key]}
          onChange={set(key)}
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={errors[key] ? true : undefined}
          aria-describedby={`${id}-hint${errors[key] ? ` ${id}-error` : ''}`}
          className={`${FIELD} h-11 font-mono lg:h-control`}
        />
        <p id={`${id}-hint`} className="mt-1 text-xs text-on-surface/60">
          {hint}
        </p>
        <FieldError id={`${id}-error`} message={errors[key]} />
      </div>
    );
  };

  return (
    <form action={action} className="grid gap-4" aria-label="Edit prices" noValidate>
      {hidden}
      <input type="hidden" name="step" value="review" />
      <div className="grid gap-4 sm:grid-cols-2">
        {field('base', 'First 500 g (₹)', 'Above ₹0, at most ₹10,000.')}
        {field('extra', 'Each extra 500 g (₹)', 'Above ₹0, at most ₹10,000.')}
        {field('codPercent', 'COD percent', 'From 0 to 10, up to 2 decimals.')}
        {field('codMinimum', 'COD minimum (₹)', 'From ₹0 to ₹10,000.')}
      </div>
      <FormMessage state={state} />
      <Buttons pending={pending} onCancel={onDone} submit="Review" />
    </form>
  );
}

/* ----------------------------------------------------------------- Overrides */

export function AddOverrideButton({
  merchants,
  couriers,
}: {
  merchants: { id: string; name: string }[];
  couriers: { carrier: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${PRIMARY_BUTTON} ${SIZE}`}>
        <Plus aria-hidden="true" className="size-4" />
        Add custom price
      </button>
      {open ? (
        <Dialog title="Add custom price" onClose={() => setOpen(false)}>
          <AddOverrideForm merchants={merchants} couriers={couriers} onDone={() => setOpen(false)} />
        </Dialog>
      ) : null}
    </>
  );
}

function AddOverrideForm({
  merchants,
  couriers,
  onDone,
}: {
  merchants: { id: string; name: string }[];
  couriers: { carrier: string; name: string }[];
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(addOverrideAction, IDLE);
  const [merchantId, setMerchantId] = useState('');
  const [carrier, setCarrier] = useState('all');
  const [reason, setReason] = useState('');
  if (state.status === 'saved') return <Saved message={state.message} onDone={onDone} />;
  const errors = errorsOf(state);

  return (
    <form action={action} className="grid gap-4" aria-label="Add a custom price" noValidate>
      <div>
        <SelectField
          label="Merchant"
          name="merchantId"
          value={merchantId}
          onChange={setMerchantId}
          options={[{ value: '', label: 'Choose a merchant' }, ...merchants.map((merchant) => ({ value: merchant.id, label: merchant.name }))]}
        />
        <FieldError id="override-merchant-error" message={errors.merchant} />
      </div>
      <div>
        <SelectField
          label="Courier"
          name="carrier"
          value={carrier}
          onChange={setCarrier}
          options={[{ value: 'all', label: 'All couriers' }, ...couriers.map((entry) => ({ value: entry.carrier, label: entry.name }))]}
        />
        <FieldError id="override-carrier-error" message={errors.carrier} />
      </div>
      <TextField label="Discount (%)" name="discount" error={errors.discount} />
      <div>
        <label htmlFor="override-reason" className={FIELD_LABEL}>
          Reason
        </label>
        <textarea
          id="override-reason"
          name="reason"
          rows={2}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          aria-invalid={errors.reason ? true : undefined}
          className={`${FIELD} py-2.5`}
        />
        <p className="mt-1 text-xs text-on-surface/60">{cleanText(reason).length} of 300 characters. Saved in the audit log.</p>
        <FieldError id="override-reason-error" message={errors.reason} />
      </div>
      <FormMessage state={state} />
      <Buttons pending={pending} onCancel={onDone} submit="Add" />
    </form>
  );
}

export function RemoveOverrideButton({ override, wide = false }: { override: { id: string; merchantName: string }; wide?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Remove custom price for ${override.merchantName}`}
        className={`${SECONDARY_BUTTON} ${SIZE} ${wide ? 'w-full' : ''}`}
      >
        <Trash2 aria-hidden="true" className="size-4" />
        Remove
      </button>
      {open ? (
        <Dialog title="Remove custom price?" onClose={() => setOpen(false)}>
          <RemoveOverrideForm override={override} onDone={() => setOpen(false)} />
        </Dialog>
      ) : null}
    </>
  );
}

function RemoveOverrideForm({ override, onDone }: { override: { id: string; merchantName: string }; onDone: () => void }) {
  const [state, action, pending] = useActionState(removeOverrideAction, IDLE);
  // The row, and this popup with it, goes away once the page refreshes after removing.
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="id" value={override.id} />
      <p className="text-sm text-on-surface/70">{override.merchantName} goes back to the rate card prices for new bookings.</p>
      <FormMessage state={state} />
      <Buttons pending={pending} onCancel={onDone} submit="Remove" />
    </form>
  );
}

/* ----------------------------------------------------------------- Filters */

export function RateFiltersForm({ filters, couriers }: { filters: RateFilters; couriers: { carrier: string; name: string }[] }) {
  const [carrier, setCarrier] = useState(filters.carrier);
  const [zone, setZone] = useState(filters.zone);
  return (
    <Form
      action="/admin/pricing"
      aria-label="Filter the rate card"
      className="mb-4 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
    >
      <SelectField
        label="Courier"
        name="carrier"
        value={carrier}
        onChange={setCarrier}
        options={[{ value: '', label: 'All couriers' }, ...couriers.map((entry) => ({ value: entry.carrier, label: entry.name }))]}
      />
      <SelectField
        label="Zone"
        name="zone"
        value={zone}
        onChange={setZone}
        options={[{ value: '', label: 'All zones' }, ...['A', 'B', 'C', 'D', 'E'].map((value) => ({ value, label: `Zone ${value}` }))]}
      />
      <div className="flex gap-3 self-end">
        <button type="submit" className={`${PRIMARY_BUTTON} ${SIZE} flex-1 md:flex-none`}>
          Apply
        </button>
        <Link href={rateFiltersHref({ carrier: '', zone: '' })} className={`${SECONDARY_BUTTON} ${SIZE} flex-1 md:flex-none`}>
          Clear
        </Link>
      </div>
    </Form>
  );
}


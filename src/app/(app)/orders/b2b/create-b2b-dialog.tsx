'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useId, useState, useTransition, type FormEvent } from 'react';
import { Dialog, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { SelectField } from '@/components/ui/select-field';
import { E_WAY_BILL_THRESHOLD_PAISE } from '@/lib/data/b2b/types';
import { totalWeightKg } from '@/lib/data/b2b/totals';
import type { PickupAddress } from '@/lib/data/pickup-addresses/types';
import { createB2bShipmentAction } from './actions';

const INPUT =
  'h-control w-full rounded-control border bg-surface px-3 text-sm placeholder:text-on-surface/40';
const MAX_BOXES = 50;

interface BoxDraft {
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  weightKg: string;
  count: string;
}

const EMPTY_BOX: BoxDraft = { lengthCm: '', widthCm: '', heightCm: '', weightKg: '', count: '1' };

const EMPTY_CONSIGNEE = {
  name: '',
  phone: '',
  email: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
};

function Field({
  label,
  value,
  error,
  onChange,
  type = 'text',
  inputMode,
  autoComplete,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: 'decimal' | 'numeric' | 'tel';
  autoComplete?: string;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-sm leading-5 font-medium">
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete ?? 'off'}
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

function toNumber(value: string): number {
  return value.trim() === '' ? Number.NaN : Number(value);
}

function CreateB2bForm({
  addresses,
  onClose,
  onCreated,
}: {
  addresses: PickupAddress[] | null;
  onClose: () => void;
  onCreated: (lrNumber: string) => void;
}) {
  const [consignee, setConsignee] = useState(EMPTY_CONSIGNEE);
  const [pickupId, setPickupId] = useState(
    addresses?.find((entry) => entry.isDefault)?.id ?? addresses?.[0]?.id ?? '',
  );
  const [boxes, setBoxes] = useState<BoxDraft[]>([{ ...EMPTY_BOX }]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceValue, setInvoiceValue] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const numericBoxes = boxes.map((box) => ({
    lengthCm: toNumber(box.lengthCm),
    widthCm: toNumber(box.widthCm),
    heightCm: toNumber(box.heightCm),
    weightKg: toNumber(box.weightKg),
    count: toNumber(box.count),
  }));
  const invoicePaise = Math.round(toNumber(invoiceValue) * 100);
  // A row still being typed (empty or not a number) is left out of the total.
  const total = totalWeightKg(
    numericBoxes.filter((box) => Number.isFinite(box.weightKg) && Number.isFinite(box.count)),
  );

  const setBox = (index: number, field: keyof BoxDraft, value: string) =>
    setBoxes((current) =>
      current.map((box, position) => (position === index ? { ...box, [field]: value } : box)),
    );
  const setPerson = (field: keyof typeof EMPTY_CONSIGNEE) => (value: string) =>
    setConsignee((current) => ({ ...current, [field]: value }));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createB2bShipmentAction({
        consignee: {
          name: consignee.name.trim(),
          phone: consignee.phone.trim(),
          email: consignee.email.trim() || undefined,
          line1: consignee.line1.trim(),
          line2: consignee.line2.trim() || undefined,
          city: consignee.city.trim(),
          state: consignee.state.trim(),
          country: 'IN',
          pincode: consignee.pincode.trim(),
        },
        pickupAddressId: pickupId,
        boxes: numericBoxes,
        invoiceNumber,
        invoiceValuePaise: invoicePaise,
      });
      if (result.ok) {
        onCreated(result.lrNumber);
      } else {
        setMessage(result.message);
        setErrors(result.fieldErrors ?? {});
      }
    });
  }

  const pickupOptions = (addresses ?? []).map((entry) => ({
    value: entry.id,
    label: `${entry.label}, ${entry.address.city}`,
  }));
  const err = (path: string) => errors[path];

  return (
    <Dialog title="Create B2B shipment" wide onClose={onClose}>
      <form noValidate onSubmit={handleSubmit} className="grid gap-6">
        <fieldset className="grid gap-3">
          <legend className="mb-2 text-sm font-semibold">Consignee</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Consignee name" value={consignee.name} error={err('consignee.name')} onChange={setPerson('name')} autoComplete="organization" />
            <Field label="Phone" type="tel" inputMode="tel" value={consignee.phone} error={err('consignee.phone')} onChange={setPerson('phone')} autoComplete="tel" />
            <Field label="Email (optional)" type="email" value={consignee.email} error={err('consignee.email')} onChange={setPerson('email')} autoComplete="email" />
            <Field label="Address line 1" value={consignee.line1} error={err('consignee.line1')} onChange={setPerson('line1')} />
            <Field label="Address line 2 (optional)" value={consignee.line2} error={err('consignee.line2')} onChange={setPerson('line2')} />
            <Field label="City" value={consignee.city} error={err('consignee.city')} onChange={setPerson('city')} />
            <Field label="State" value={consignee.state} error={err('consignee.state')} onChange={setPerson('state')} />
            <Field label="Pincode" inputMode="numeric" value={consignee.pincode} error={err('consignee.pincode')} onChange={setPerson('pincode')} />
          </div>
        </fieldset>

        <div>
          {pickupOptions.length > 0 ? (
            <SelectField
              label="Pickup address"
              name="pickupAddressId"
              value={pickupId}
              options={pickupOptions}
              onChange={setPickupId}
            />
          ) : (
            <p className="rounded-control bg-muted p-3 text-sm">
              {addresses === null
                ? 'Saved pickup addresses are not available yet. Try again later.'
                : 'You have no saved pickup address. Add one in Settings, then try again.'}
            </p>
          )}
          {err('pickupAddressId') ? <p className="mt-1 text-sm">{err('pickupAddressId')}</p> : null}
        </div>

        <fieldset className="grid gap-3">
          <legend className="mb-2 text-sm font-semibold">Boxes</legend>
          {boxes.map((box, index) => (
            <div
              key={index}
              data-testid="box-row"
              className="grid gap-3 rounded-control border border-secondary p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Box {index + 1}</p>
                <button
                  type="button"
                  aria-label={`Remove box ${index + 1}`}
                  disabled={boxes.length === 1}
                  onClick={() => setBoxes((current) => current.filter((_, i) => i !== index))}
                  className="grid size-11 place-items-center rounded-control hover:bg-muted disabled:text-on-surface/30 lg:size-9"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <Field label="Length (cm)" inputMode="decimal" value={box.lengthCm} error={err(`boxes.${index}.lengthCm`)} onChange={(v) => setBox(index, 'lengthCm', v)} />
                <Field label="Width (cm)" inputMode="decimal" value={box.widthCm} error={err(`boxes.${index}.widthCm`)} onChange={(v) => setBox(index, 'widthCm', v)} />
                <Field label="Height (cm)" inputMode="decimal" value={box.heightCm} error={err(`boxes.${index}.heightCm`)} onChange={(v) => setBox(index, 'heightCm', v)} />
                <Field label="Weight (kg)" inputMode="decimal" value={box.weightKg} error={err(`boxes.${index}.weightKg`)} onChange={(v) => setBox(index, 'weightKg', v)} />
                <Field label="Count" inputMode="numeric" value={box.count} error={err(`boxes.${index}.count`)} onChange={(v) => setBox(index, 'count', v)} />
              </div>
            </div>
          ))}
          {err('boxes') ? <p className="text-sm">{err('boxes')}</p> : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={boxes.length >= MAX_BOXES}
              onClick={() => setBoxes((current) => [...current, { ...EMPTY_BOX }])}
              className={SECONDARY_BUTTON}
            >
              <Plus aria-hidden="true" className="size-4" />
              Add box
            </button>
            <p data-testid="total-weight" className="text-sm font-medium">
              Total weight: {total} kg
            </p>
          </div>
        </fieldset>

        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold">Invoice</legend>
          <Field label="Invoice number" value={invoiceNumber} error={err('invoiceNumber')} onChange={setInvoiceNumber} />
          <Field label="Invoice value (₹)" inputMode="decimal" value={invoiceValue} error={err('invoiceValuePaise')} onChange={setInvoiceValue} />
          {invoicePaise > E_WAY_BILL_THRESHOLD_PAISE ? (
            <p className="rounded-control bg-warning/15 p-3 text-sm sm:col-span-2">
              An e-way bill is needed for invoices over ₹50,000.
            </p>
          ) : null}
        </fieldset>

        {message ? (
          <p role="alert" className="rounded-control bg-error/10 p-3 text-sm">
            {message}
          </p>
        ) : null}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
            Cancel
          </button>
          <button type="submit" disabled={pending || pickupOptions.length === 0} className={PRIMARY_BUTTON}>
            Create shipment
          </button>
        </div>
      </form>
    </Dialog>
  );
}

/** The Create B2B shipment button and its dialog, with a short notice once a shipment is made. */
export function CreateB2bButton({ addresses }: { addresses: PickupAddress[] | null }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <>
      {notice ? (
        <p role="status" className="rounded-control bg-success/15 px-3 py-2 text-sm">
          {notice}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => {
          setNotice(null);
          setOpen(true);
        }}
        className="inline-flex h-11 items-center rounded-control bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary/90 lg:h-control"
      >
        Create B2B shipment
      </button>
      {open ? (
        <CreateB2bForm
          addresses={addresses}
          onClose={() => setOpen(false)}
          onCreated={(lrNumber) => {
            setOpen(false);
            setNotice(`Shipment ${lrNumber} created.`);
          }}
        />
      ) : null}
    </>
  );
}

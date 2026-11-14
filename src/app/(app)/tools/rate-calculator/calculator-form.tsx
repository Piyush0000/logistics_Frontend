'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { PRIMARY_BUTTON } from '@/components/ui/dialog';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import type { QuoteField, QuoteFieldErrors } from '@/lib/data/rates/input';
import { quoteAction, type QuoteActionResult } from './actions';
import { QuoteList } from './quote-list';

const INPUT =
  'h-11 w-full rounded-control border bg-surface px-3 text-base transition-[border-color,box-shadow] duration-150 hover:border-on-surface/30 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 lg:h-control lg:text-sm';

/** A typed number, or null when the box is empty or not a number. */
function toNumber(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

function Field({
  label,
  value,
  error,
  onChange,
  inputMode = 'decimal',
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  inputMode?: 'decimal' | 'numeric';
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
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

type PaymentType = 'PREPAID' | 'COD';

/** The calculator: the form, and under it the quotes the server sent back. */
export function CalculatorForm() {
  const [values, setValues] = useState<Record<QuoteField, string>>({
    originPincode: '',
    destinationPincode: '',
    weightKg: '',
    lengthCm: '',
    widthCm: '',
    heightCm: '',
    codAmount: '',
  });
  const [paymentType, setPaymentType] = useState<PaymentType>('PREPAID');
  const [errors, setErrors] = useState<QuoteFieldErrors>({});
  const [result, setResult] = useState<QuoteActionResult | null>(null);
  // The payment type the quotes were asked for, so a later change in the form does not relabel them.
  const [asked, setAsked] = useState<PaymentType>('PREPAID');
  const [pending, startTransition] = useTransition();
  const prepaidId = useId();
  const codId = useId();

  const set = (field: QuoteField) => (value: string) => setValues((current) => ({ ...current, [field]: value }));

  function ask() {
    setErrors({});
    setAsked(paymentType);
    startTransition(async () => {
      const answer = await quoteAction({
        originPincode: values.originPincode.trim(),
        destinationPincode: values.destinationPincode.trim(),
        weightKg: toNumber(values.weightKg),
        lengthCm: toNumber(values.lengthCm),
        widthCm: toNumber(values.widthCm),
        heightCm: toNumber(values.heightCm),
        paymentType,
        codAmount: paymentType === 'COD' ? toNumber(values.codAmount) : undefined,
      });
      setResult(answer);
      if (!answer.ok) setErrors(answer.errors ?? {});
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    ask();
  }

  const radio =
    'flex min-h-11 flex-1 cursor-pointer items-center gap-3 rounded-control border border-secondary px-3 text-sm font-medium transition-colors duration-150 hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-muted';

  return (
    <div className="grid items-start gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section aria-label="Parcel details" className="motion-rise min-w-0 rounded-card border border-secondary bg-surface p-card">
        <form noValidate onSubmit={handleSubmit} className="grid gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Pickup pincode" value={values.originPincode} error={errors.originPincode} onChange={set('originPincode')} inputMode="numeric" />
            <Field label="Delivery pincode" value={values.destinationPincode} error={errors.destinationPincode} onChange={set('destinationPincode')} inputMode="numeric" />
          </div>

          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
            <Field label="Weight (kg)" value={values.weightKg} error={errors.weightKg} onChange={set('weightKg')} />
            <Field label="Length (cm)" value={values.lengthCm} error={errors.lengthCm} onChange={set('lengthCm')} />
            <Field label="Width (cm)" value={values.widthCm} error={errors.widthCm} onChange={set('widthCm')} />
            <Field label="Height (cm)" value={values.heightCm} error={errors.heightCm} onChange={set('heightCm')} />
          </div>

          <fieldset className="min-w-0">
            <legend className={FIELD_LABEL}>Payment type</legend>
            <div className="flex flex-col gap-3 min-[420px]:flex-row">
              <label htmlFor={prepaidId} className={radio}>
                <input
                  id={prepaidId}
                  type="radio"
                  name="paymentType"
                  checked={paymentType === 'PREPAID'}
                  onChange={() => setPaymentType('PREPAID')}
                  className="size-5 shrink-0 accent-primary"
                />
                Prepaid
              </label>
              <label htmlFor={codId} className={radio}>
                <input
                  id={codId}
                  type="radio"
                  name="paymentType"
                  checked={paymentType === 'COD'}
                  onChange={() => setPaymentType('COD')}
                  className="size-5 shrink-0 accent-primary"
                />
                Cash on delivery
              </label>
            </div>
          </fieldset>

          {paymentType === 'COD' ? (
            <div className="sm:max-w-xs">
              <Field label="COD amount (₹)" value={values.codAmount} error={errors.codAmount} onChange={set('codAmount')} />
            </div>
          ) : null}

          {result && !result.ok && Object.keys(errors).length > 0 ? (
            <p role="alert" className="rounded-control bg-error/10 p-3 text-sm">
              {result.message}
            </p>
          ) : null}

          <div>
            <button
              type="submit"
              disabled={pending}
              className={`${PRIMARY_BUTTON} h-11 w-full px-6 sm:w-auto lg:h-control`}
            >
              Get quotes
            </button>
          </div>
        </form>
      </section>

      <QuoteList result={result} paymentType={asked} pending={pending} onRetry={ask} />
    </div>
  );
}

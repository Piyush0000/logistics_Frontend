'use client';

import { Gavel, Upload } from 'lucide-react';
import { useId, useState } from 'react';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import { RESOLUTION_NOTE_MAX, WEIGHT_CARRIERS } from '@/lib/admin/data/weight-rules';
import { formatPaise } from '@/lib/format/money';
import { ActionDialog, Buttons, CHOICE, errorsOf, Facts, FIELD, FieldError } from '../cod/cod-dialogs';
import { recordWeightsAction, resolveWeightAction } from './actions';

const kg = (grams: number) => `${(grams / 1000).toLocaleString('en-IN', { maximumFractionDigits: 3 })} kg`;

/** Upload a courier's weight file. Each heavier shipment becomes a charge its merchant answers. */
export function RecordWeightsButton() {
  const id = useId();
  return (
    <ActionDialog
      label="Upload courier weights"
      ariaLabel="Upload a courier weight file"
      title="Upload courier weights"
      icon={<Upload aria-hidden="true" className="size-4" />}
      primary
      action={recordWeightsAction}
    >
      {(state, pending, close) => {
        const errors = errorsOf(state);
        return (
          <>
            <p className="text-sm text-on-surface/70">
              Upload the courier&apos;s weight file as CSV with an AWB column, a charged weight column (kg, or grams when the
              header says so) and an extra charge column in rupees. Only shipments heavier than declared are raised; each
              merchant gets 7 days to accept or dispute.
            </p>
            <div>
              <label htmlFor={`${id}-carrier`} className={FIELD_LABEL}>
                Courier
              </label>
              <select
                id={`${id}-carrier`}
                name="carrier"
                defaultValue=""
                aria-invalid={errors.carrier ? true : undefined}
                aria-describedby={errors.carrier ? `${id}-carrier-error` : undefined}
                className={`${FIELD} h-11 lg:h-control`}
              >
                <option value="" disabled>
                  Choose
                </option>
                {WEIGHT_CARRIERS.map((carrier) => (
                  <option key={carrier.value} value={carrier.value}>
                    {carrier.label}
                  </option>
                ))}
              </select>
              <FieldError id={`${id}-carrier-error`} message={errors.carrier} />
            </div>
            <div>
              <label htmlFor={`${id}-file`} className={FIELD_LABEL}>
                Weight file (CSV)
              </label>
              <input
                id={`${id}-file`}
                name="file"
                type="file"
                accept=".csv,text/csv"
                aria-invalid={errors.file ? true : undefined}
                aria-describedby={errors.file ? `${id}-file-error` : undefined}
                className={`${FIELD} py-2`}
              />
              <FieldError id={`${id}-file-error`} message={errors.file} />
            </div>
            <Buttons pending={pending} close={close} submit="Upload" />
          </>
        );
      }}
    </ActionDialog>
  );
}

/** Decide a disputed weight charge. */
export function ResolveWeightButton({
  discrepancy,
}: {
  discrepancy: {
    id: string;
    awb: string;
    merchantName: string;
    declaredGrams: number;
    chargedGrams: number;
    extraChargePaise: number;
  };
}) {
  const id = useId();
  const [decision, setDecision] = useState<'courier' | 'merchant' | ''>('');
  const [note, setNote] = useState('');
  return (
    <ActionDialog
      label="Decide"
      ariaLabel={`Decide the weight dispute for ${discrepancy.awb}`}
      title={`Decide ${discrepancy.awb}`}
      icon={<Gavel aria-hidden="true" className="size-4" />}
      action={resolveWeightAction}
    >
      {(state, pending, close) => {
        const errors = errorsOf(state);
        return (
          <>
            <input type="hidden" name="id" value={discrepancy.id} />
            <input type="hidden" name="awb" value={discrepancy.awb} />
            <input type="hidden" name="merchant" value={discrepancy.merchantName} />
            <Facts
              rows={[
                ['Merchant', discrepancy.merchantName],
                ['Declared', kg(discrepancy.declaredGrams)],
                ['Courier charged', kg(discrepancy.chargedGrams)],
                ['Extra charge', formatPaise(discrepancy.extraChargePaise)],
              ]}
            />
            <fieldset>
              <legend className={FIELD_LABEL}>Who is right?</legend>
              <div className="flex gap-2">
                {(
                  [
                    ['courier', 'The courier: charge the merchant'],
                    ['merchant', 'The merchant: charge nothing'],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={`${CHOICE} px-2 text-center ${decision === value ? 'border-primary bg-primary/10' : 'border-secondary'}`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value={value}
                      checked={decision === value}
                      onChange={() => setDecision(value)}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>
              <FieldError id={`${id}-decision-error`} message={errors.decision} />
            </fieldset>
            <div>
              <label htmlFor={`${id}-note`} className={FIELD_LABEL}>
                Reason
              </label>
              <textarea
                id={`${id}-note`}
                name="note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="For example: the courier's scan photo shows 1.4 kg"
                aria-invalid={errors.note ? true : undefined}
                aria-describedby={`${id}-note-count${errors.note ? ` ${id}-note-error` : ''}`}
                className={`${FIELD} py-2.5`}
              />
              <p
                id={`${id}-note-count`}
                className={`mt-1 text-xs ${note.length > RESOLUTION_NOTE_MAX ? 'text-error' : 'text-on-surface/60'}`}
              >
                {note.length} of {RESOLUTION_NOTE_MAX} characters. The merchant sees this.
              </p>
              <FieldError id={`${id}-note-error`} message={errors.note} />
            </div>
            <Buttons pending={pending} close={close} submit="Save decision" />
          </>
        );
      }}
    </ActionDialog>
  );
}

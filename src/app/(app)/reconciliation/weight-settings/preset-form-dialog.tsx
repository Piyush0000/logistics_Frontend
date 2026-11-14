'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { Dialog, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import { MAX_NAME_LENGTH, type PresetFieldErrors } from '@/lib/data/weight-settings/input';
import type { PackagePreset } from '@/lib/data/weight-settings/types';
import { chargeableWeightKg, volumetricWeightKg } from '@/lib/volumetric';
import { savePresetAction } from './actions';

const INPUT =
  'h-control w-full rounded-control border bg-surface px-3 text-base transition-[border-color,box-shadow] duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none lg:text-sm';

export const formatKg = (value: number) =>
  `${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg`;

/** A typed number, or NaN when the box is empty or not a number. */
const toNumber = (text: string) => (text.trim() === '' ? Number.NaN : Number(text.trim()));

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
  inputMode?: 'decimal' | 'text';
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

/** Adds a preset or edits one, with the chargeable weight worked out as the numbers change. */
export function PresetFormDialog({
  preset,
  presetCount,
  onClose,
  onSaved,
}: {
  /** The preset being edited, or null for a new one. */
  preset: PackagePreset | null;
  presetCount: number;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const defaultId = useId();
  const [name, setName] = useState(preset?.name ?? '');
  const [length, setLength] = useState(preset ? String(preset.lengthCm) : '');
  const [width, setWidth] = useState(preset ? String(preset.widthCm) : '');
  const [height, setHeight] = useState(preset ? String(preset.heightCm) : '');
  const [weight, setWeight] = useState(preset ? String(preset.weightKg) : '');
  const [isDefault, setIsDefault] = useState(preset?.isDefault ?? false);
  const [errors, setErrors] = useState<PresetFieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // The first preset, and the current default, stay the default until another one takes over.
  const locked = preset ? preset.isDefault : presetCount === 0;
  const dimensions = {
    lengthCm: toNumber(length),
    widthCm: toNumber(width),
    heightCm: toNumber(height),
  };
  const actualKg = toNumber(weight);
  const ready = [...Object.values(dimensions), actualKg].every((n) => Number.isFinite(n) && n > 0);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setMessage(null);

    startTransition(async () => {
      const result = await savePresetAction({
        ...(preset ? { id: preset.id } : {}),
        name,
        ...dimensions,
        weightKg: actualKg,
        isDefault: locked || isDefault,
      });
      if (result.ok) {
        onSaved(result.message);
      } else {
        setErrors(result.errors ?? {});
        setMessage(result.message);
      }
    });
  }

  return (
    <Dialog title={preset ? 'Edit package preset' : 'Add package preset'} onClose={onClose}>
      <form noValidate onSubmit={handleSubmit} className="grid gap-5">
        <div>
          <Field label="Name" value={name} error={errors.name} onChange={setName} inputMode="text" />
          <p className="mt-1 text-xs text-on-surface/60">
            Up to {MAX_NAME_LENGTH} characters. {name.trim().length} used.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-3">
          <Field label="Length (cm)" value={length} error={errors.lengthCm} onChange={setLength} />
          <Field label="Width (cm)" value={width} error={errors.widthCm} onChange={setWidth} />
          <Field label="Height (cm)" value={height} error={errors.heightCm} onChange={setHeight} />
        </div>
        <Field label="Weight (kg)" value={weight} error={errors.weightKg} onChange={setWeight} />

        <div data-testid="chargeable-preview" className="rounded-control border border-primary/20 bg-muted p-3 text-sm">
          {ready ? (
            <>
              <p className="font-semibold text-primary">
                {`Chargeable weight ${formatKg(chargeableWeightKg(actualKg, dimensions))}`}
              </p>
              <p className="text-on-surface/70">
                {`Volumetric ${formatKg(volumetricWeightKg(dimensions))}, Actual ${formatKg(actualKg)}`}
              </p>
              <p className="mt-1 text-xs text-on-surface/60">
                Couriers charge the larger of the two. Volumetric is length × width × height ÷ 5,000.
              </p>
            </>
          ) : (
            <p className="text-on-surface/70">Enter the size and weight to see the chargeable weight.</p>
          )}
        </div>

        <div>
          <label htmlFor={defaultId} className="flex min-h-11 items-center gap-3 text-sm font-medium">
            <input
              id={defaultId}
              type="checkbox"
              checked={locked || isDefault}
              disabled={locked}
              onChange={(event) => setIsDefault(event.target.checked)}
              className="size-5 shrink-0 accent-primary"
            />
            Make this the default preset
          </label>
          {locked ? (
            <p className="text-xs text-on-surface/60">
              {preset
                ? 'This is your default. To change it, make another preset the default.'
                : 'Your first preset is the default.'}
            </p>
          ) : null}
        </div>

        {message ? (
          <p role="alert" className="rounded-control bg-error/10 p-3 text-sm">
            {message}
          </p>
        ) : null}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
            Cancel
          </button>
          <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>
            Save preset
          </button>
        </div>
      </form>
    </Dialog>
  );
}

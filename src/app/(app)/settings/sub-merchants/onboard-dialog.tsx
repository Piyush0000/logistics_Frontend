'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { Dialog, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import { parseSubMerchantInput, type SubMerchantFieldErrors } from '@/lib/data/sub-merchants/input';
import { onboardSubMerchantAction } from './actions';

const CONTROL = 'h-control w-full min-w-0 rounded-control border bg-surface px-3 text-base lg:text-sm';

interface FieldProps {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type?: string;
  autoCapitalize?: string;
  inputMode?: 'numeric';
  hint?: string;
}

function Field({ label, value, error, onChange, type = 'text', autoCapitalize, inputMode, hint }: FieldProps) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete="off"
        autoCapitalize={autoCapitalize}
        inputMode={inputMode}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`${CONTROL} ${error ? 'border-error' : 'border-secondary'}`}
      />
      {hint && !error ? <p className="mt-1 text-xs text-on-surface/60">{hint}</p> : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm [overflow-wrap:anywhere]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Collects a seller's details and bank account. The server action checks them again. */
export function OnboardDialog({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [holder, setHolder] = useState('');
  const [account, setAccount] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [errors, setErrors] = useState<SubMerchantFieldErrors>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    setProblem(null);
    const input = { name, email, gstin, bank: { holder, account, ifsc } };
    const parsed = parseSubMerchantInput(input);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    start(async () => {
      const result = await onboardSubMerchantAction(input);
      if (result.ok) {
        onDone(result.message);
        onClose();
      } else if (result.errors && Object.keys(result.errors).length > 0) {
        setErrors(result.errors);
      } else {
        setProblem(result.message);
      }
    });
  }

  return (
    <Dialog title="Onboard a seller" onClose={onClose}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <Field label="Business name" value={name} error={errors.name} onChange={setName} />
        <Field label="Email" type="email" value={email} error={errors.email} onChange={setEmail} />
        <Field
          label="GSTIN (optional)"
          value={gstin}
          error={errors.gstin}
          onChange={setGstin}
          autoCapitalize="characters"
        />
        <Field label="Account holder" value={holder} error={errors['bank.holder']} onChange={setHolder} />
        <Field
          label="Account number"
          value={account}
          error={errors['bank.account']}
          onChange={setAccount}
          inputMode="numeric"
          hint="Only the last 4 digits are shown after this."
        />
        <Field
          label="IFSC"
          value={ifsc}
          error={errors['bank.ifsc']}
          onChange={setIfsc}
          autoCapitalize="characters"
        />

        {problem ? (
          <p role="alert" className="rounded-control bg-error/10 p-3 text-sm [overflow-wrap:anywhere]">
            {problem}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className={`${SECONDARY_BUTTON} max-sm:h-11`}>
            Cancel
          </button>
          <button type="submit" disabled={pending} className={`${PRIMARY_BUTTON} max-sm:h-11`}>
            {pending ? 'Onboarding...' : 'Onboard seller'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

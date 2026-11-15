'use client';

import { Building2, Eye, EyeOff, Lock, Phone, UserRound, type LucideIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { FieldLabel } from '../login/fields';

const INPUT =
  'h-control w-full rounded-control border border-secondary bg-surface pl-11 pr-3.5 text-on-surface outline-none placeholder:text-on-surface/50 focus:border-primary focus:ring-1 focus:ring-primary aria-[invalid=true]:border-error';
const ICON = 'pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-on-surface/60';

interface Shared {
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
}

interface TextFieldProps extends Shared {
  label: string;
  name: string;
  error: string;
  icon: LucideIcon;
  autoComplete: string;
  maxLength: number;
  type?: 'text' | 'tel';
}

function TextField({
  label,
  name,
  value,
  onChange,
  invalid,
  error,
  icon: Icon,
  autoComplete,
  maxLength,
  type = 'text',
}: TextFieldProps) {
  const id = useId();
  const [touched, setTouched] = useState(false);
  const showError = touched && value !== '' && invalid;

  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <Icon aria-hidden="true" className={ICON} />
        <input
          id={id}
          name={name}
          type={type}
          inputMode={type === 'tel' ? 'tel' : undefined}
          autoComplete={autoComplete}
          maxLength={maxLength}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={showError}
          aria-describedby={showError ? `${id}-error` : undefined}
          className={INPUT}
        />
      </div>
      {showError ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm break-words">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CompanyField(props: Shared) {
  return (
    <TextField
      {...props}
      label="Company name"
      name="company"
      icon={Building2}
      autoComplete="organization"
      maxLength={80}
      error="Enter your company name (2 to 80 characters)."
    />
  );
}

export function NameField(props: Shared) {
  return (
    <TextField
      {...props}
      label="Your name"
      name="name"
      icon={UserRound}
      autoComplete="name"
      maxLength={80}
      error="Enter your name."
    />
  );
}

export function PhoneField(props: Shared) {
  return (
    <TextField
      {...props}
      label="Phone number"
      name="phone"
      type="tel"
      icon={Phone}
      autoComplete="tel"
      maxLength={16}
      error="Enter a phone number of 10 to 15 digits."
    />
  );
}

export function NewPasswordField({ value, onChange, invalid }: Shared) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [touched, setTouched] = useState(false);
  const showError = touched && value !== '' && invalid;

  return (
    <div>
      <FieldLabel htmlFor={id}>Password</FieldLabel>
      <div className="relative">
        <Lock aria-hidden="true" className={ICON} />
        <input
          id={id}
          name="password"
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          maxLength={128}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={showError}
          aria-describedby={`${id}-hint`}
          className={`${INPUT} pr-12`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute top-1/2 right-0.5 grid size-11 -translate-y-1/2 place-items-center rounded-control text-on-surface/70 hover:text-primary"
        >
          {visible ? (
            <EyeOff aria-hidden="true" className="size-5" />
          ) : (
            <Eye aria-hidden="true" className="size-5" />
          )}
        </button>
      </div>
      <p id={`${id}-hint`} className="mt-1.5 text-[13px] leading-5 text-on-surface/70">
        {showError ? 'Use at least 8 characters.' : 'Use 8 or more characters.'}
      </p>
    </div>
  );
}

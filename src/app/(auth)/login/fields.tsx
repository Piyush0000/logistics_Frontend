'use client';

import { CircleAlert, Eye, EyeOff, LoaderCircle, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useId, useState, type ReactNode, type Ref } from 'react';
import { emailSchema } from '@/lib/auth/login-schema';

const INPUT =
  'h-control w-full rounded-control border border-secondary bg-surface pl-11 text-on-surface outline-none placeholder:text-on-surface/50 focus:border-primary focus:ring-1 focus:ring-primary aria-[invalid=true]:border-error';
const ICON = 'pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-on-surface/60';

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-bold">
      {children}
      <span aria-hidden="true" className="ml-1 text-error">
        *
      </span>
    </label>
  );
}

export function EmailField({
  value,
  onChange,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const id = useId();
  const [touched, setTouched] = useState(false);
  const check = emailSchema.safeParse(value);
  const showError = touched && value !== '' && !check.success;

  return (
    <div>
      <FieldLabel htmlFor={id}>Work email</FieldLabel>
      <div className="relative">
        <Mail aria-hidden="true" className={ICON} />
        <input
          ref={inputRef}
          id={id}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={showError}
          aria-describedby={showError ? `${id}-error` : undefined}
          className={`${INPUT} pr-3.5`}
        />
      </div>
      {showError ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm">
          Enter a valid work email.
        </p>
      ) : null}
    </div>
  );
}

export function PasswordField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <FieldLabel htmlFor={id}>Password</FieldLabel>
      <div className="relative">
        <Lock aria-hidden="true" className={ICON} />
        <input
          id={id}
          name="password"
          type={visible ? 'text' : 'password'}
          autoComplete="current-password"
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
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
        Demo mode: any password of 8 or more characters works.
      </p>
    </div>
  );
}

export function TermsField({
  checked,
  onChange,
  inputRef,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const id = useId();

  return (
    <div className="flex min-h-11 items-center gap-3 text-sm">
      <input
        ref={inputRef}
        id={id}
        name="terms"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-5 shrink-0 accent-primary"
      />
      <span>
        <label htmlFor={id}>I agree to the</label>{' '}
        <Link
          href="/terms"
          target="_blank"
          className="font-extrabold text-primary underline-offset-2 hover:underline"
        >
          Terms and Conditions
        </Link>
      </span>
    </div>
  );
}

export function FormError({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-control bg-error/10 p-3 text-sm">
      <CircleAlert aria-hidden="true" className="mt-px size-[18px] shrink-0 text-error" />
      {message}
    </p>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
  pending,
  disabled,
}: {
  children: ReactNode;
  pendingLabel: string;
  pending: boolean;
  disabled: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className="flex h-control w-full items-center justify-center gap-2 rounded-control bg-primary px-4 font-extrabold text-tertiary transition-colors enabled:hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/50"
    >
      {pending ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin" /> : null}
      {pending ? pendingLabel : children}
    </button>
  );
}

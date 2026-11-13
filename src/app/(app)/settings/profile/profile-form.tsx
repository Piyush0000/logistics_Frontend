'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { PRIMARY_BUTTON } from '@/components/ui/dialog';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import { MAX_NAME_LENGTH, type PasswordFieldErrors, type ProfileFieldErrors } from '@/lib/data/profile/input';
import type { Profile } from '@/lib/data/profile/types';
import { changePasswordAction, saveProfileAction } from './actions';

const INPUT = 'h-control w-full min-w-0 rounded-control border bg-surface px-3 text-base lg:text-sm';

function Field({
  label,
  value,
  error,
  hint,
  onChange,
  type = 'text',
  readOnly,
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  error?: string;
  hint?: string;
  onChange?: (value: string) => void;
  type?: 'text' | 'tel' | 'password';
  readOnly?: boolean;
  autoComplete?: string;
  inputMode?: 'tel' | 'text';
}) {
  const id = useId();
  const describedBy = [error ? `${id}-error` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ');
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
        value={value}
        readOnly={readOnly}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className={`${INPUT} ${error ? 'border-error' : 'border-secondary'} ${
          readOnly ? 'bg-muted text-on-surface/70' : ''
        }`}
      />
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-on-surface/60">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Feedback({ ok, message }: { ok: boolean | null; message: string | null }) {
  if (!message) return null;
  return ok ? (
    <p role="status" className="rounded-control bg-success/15 p-3 text-sm">
      {message}
    </p>
  ) : (
    <p role="alert" className="rounded-control bg-error/10 p-3 text-sm">
      {message}
    </p>
  );
}

/** Name and phone can change. The email comes from the session and is shown read-only. */
export function ProfileForm({ profile, email }: { profile: Profile; email: string }) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setFeedback(null);

    startTransition(async () => {
      const result = await saveProfileAction({ name, phone });
      setErrors(result.ok ? {} : (result.errors ?? {}));
      setFeedback({ ok: result.ok, message: result.message });
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid max-w-xl gap-5">
      <Field
        label="Full name"
        value={name}
        error={errors.name}
        onChange={setName}
        autoComplete="name"
        hint={`Up to ${MAX_NAME_LENGTH} characters. ${name.trim().length} used.`}
      />
      <Field
        label="Email"
        value={email}
        readOnly
        hint="This is your sign-in email. It can't be changed here."
      />
      <Field
        label="Phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={phone}
        error={errors.phone}
        onChange={setPhone}
        hint="10 to 15 digits, with an optional + at the start."
      />

      <Feedback ok={feedback?.ok ?? null} message={feedback?.message ?? null} />

      <div>
        <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>
          Save profile
        </button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<PasswordFieldErrors>({});
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setFeedback(null);

    startTransition(async () => {
      const result = await changePasswordAction({ current, next, confirm });
      if (result.ok) {
        setCurrent('');
        setNext('');
        setConfirm('');
      }
      setErrors(result.ok ? {} : (result.errors ?? {}));
      // Field errors sit under their boxes, so only a message with no field errors shows here.
      setFeedback(
        result.ok || !result.errors ? { ok: result.ok, message: result.message } : null,
      );
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid max-w-xl gap-5">
      <Field
        label="Current password"
        type="password"
        autoComplete="current-password"
        value={current}
        error={errors.current}
        onChange={setCurrent}
      />
      <Field
        label="New password"
        type="password"
        autoComplete="new-password"
        value={next}
        error={errors.next}
        onChange={setNext}
        hint="Use at least 8 characters, different from your current password."
      />
      <Field
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        value={confirm}
        error={errors.confirm}
        onChange={setConfirm}
      />

      <Feedback ok={feedback?.ok ?? null} message={feedback?.message ?? null} />

      <div>
        <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>
          Change password
        </button>
      </div>
    </form>
  );
}

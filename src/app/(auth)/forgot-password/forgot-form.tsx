'use client';

import { ArrowLeft, CircleCheck } from 'lucide-react';
import Link from 'next/link';
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from 'react';
import { emailSchema } from '@/lib/auth/login-schema';
import { EmailField, FormError, SubmitButton } from '../login/fields';
import { requestPasswordResetAction } from './actions';
import { DEMO_NOTE, IDLE } from './forgot-state';

export function ForgotForm() {
  const [email, setEmail] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState(requestPasswordResetAction, IDLE);

  // A slow phone can show the form before scripts load, so pick up anything already entered.
  useEffect(() => {
    if (emailRef.current?.value) setEmail(emailRef.current.value);
  }, []);

  // Submits without the `action` prop, because React resets the form after an action.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={handleSubmit} noValidate className="grid gap-4">
        <EmailField value={email} onChange={setEmail} inputRef={emailRef} />
        {state.status === 'error' ? <FormError message={state.message} /> : null}
        {state.status === 'sent' ? (
          <div
            role="status"
            className="flex items-start gap-2 rounded-control bg-muted p-3 text-sm break-words"
          >
            <CircleCheck aria-hidden="true" className="mt-px size-[18px] shrink-0 text-primary" />
            <p className="min-w-0">
              {state.message}
              {state.demo ? <span className="mt-1 block font-extrabold">{DEMO_NOTE}</span> : null}
            </p>
          </div>
        ) : null}
        <SubmitButton
          pending={pending}
          pendingLabel="Sending link"
          disabled={!emailSchema.safeParse(email).success}
        >
          Send reset link
        </SubmitButton>
      </form>
      <Link
        href="/login"
        className="flex h-control items-center justify-center gap-2 rounded-control border border-secondary px-4 text-sm font-extrabold transition-colors hover:border-primary hover:text-primary"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to sign in
      </Link>
    </div>
  );
}

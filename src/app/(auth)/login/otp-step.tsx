'use client';

import { ArrowLeft } from 'lucide-react';
import { useActionState, useId, useState } from 'react';
import { otpSchema } from '@/lib/auth/login-schema';
import { requestOtpAction, verifyOtpAction } from './actions';
import { FieldLabel, FormError, SubmitButton } from './fields';
import { IDLE } from './login-state';

export function OtpStep({
  email,
  demoCode,
  onBack,
}: {
  email: string;
  demoCode?: string;
  onBack: () => void;
}) {
  const id = useId();
  const [code, setCode] = useState('');
  const [verifyState, verify, verifying] = useActionState(verifyOtpAction, IDLE);
  const [resendState, resend, resending] = useActionState(requestOtpAction, IDLE);

  return (
    <div className="grid gap-4">
      <div className="text-center sm:text-start">
        <h2 className="font-heading text-[21px] leading-[25px] font-extrabold text-primary">
          Enter your code
        </h2>
        <p className="mt-2 text-sm text-on-surface/70">
          Enter the 6-digit code for <span className="break-all text-on-surface">{email}</span>
        </p>
      </div>

      {demoCode ? (
        <p className="rounded-control bg-muted p-3 text-sm">
          No email was sent. Use demo code {demoCode}.
        </p>
      ) : null}

      <form action={verify} className="grid gap-4">
        <input type="hidden" name="email" value={email} />
        <div>
          <FieldLabel htmlFor={id}>Verification code</FieldLabel>
          <input
            id={id}
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            required
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            className="h-control w-full rounded-control border border-secondary bg-surface px-3.5 text-center text-xl font-extrabold tracking-[0.4em] text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        {verifyState.status === 'error' ? <FormError message={verifyState.message} /> : null}
        <SubmitButton
          pending={verifying}
          pendingLabel="Verifying"
          disabled={!otpSchema.safeParse(code).success}
        >
          Verify and sign in
        </SubmitButton>
      </form>

      <div className="flex items-center justify-between gap-3 text-sm">
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 font-extrabold text-primary"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back
        </button>
        <form action={resend}>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="terms" value="on" />
          <button
            type="submit"
            disabled={resending}
            className="-mr-2 min-h-11 rounded-control px-2 font-extrabold text-primary disabled:opacity-50"
          >
            Resend code
          </button>
        </form>
      </div>

      <p role="status" className="min-h-5 text-center text-sm empty:hidden">
        {resendState.status === 'code_sent' ? 'New demo code ready.' : null}
        {resendState.status === 'error' ? resendState.message : null}
      </p>
    </div>
  );
}

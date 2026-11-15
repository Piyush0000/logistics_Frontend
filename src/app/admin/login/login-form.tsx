'use client';

import { useActionState } from 'react';
import { PRIMARY_BUTTON } from '@/components/ui/dialog';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import { adminSignInAction, type AdminSignInState } from '../actions';

const INPUT =
  'h-11 w-full rounded-control border border-secondary bg-surface px-3 text-sm text-on-surface placeholder:text-on-surface/40 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 lg:h-control';

const IDLE: AdminSignInState = { error: null };

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminSignInAction, IDLE);

  return (
    <form action={action} className="mt-5 grid gap-4">
      <div>
        <label htmlFor="admin-email" className={FIELD_LABEL}>
          Email
        </label>
        <input id="admin-email" name="email" type="email" autoComplete="username" required className={INPUT} />
      </div>
      <div>
        <label htmlFor="admin-password" className={FIELD_LABEL}>
          Password
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={INPUT}
        />
      </div>
      {state.error ? (
        <p role="alert" className="rounded-control bg-error/10 p-3 text-sm text-error">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={`${PRIMARY_BUTTON} w-full`}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

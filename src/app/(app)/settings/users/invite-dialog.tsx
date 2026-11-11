'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { Dialog, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLES,
  isRole,
  type InviteFieldErrors,
  type Role,
} from '@/lib/data/team';
import { inviteAction } from './actions';

export const CONTROL = 'h-control w-full min-w-0 rounded-control border bg-surface px-3 text-base lg:text-sm';

export function InviteDialog({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const emailId = useId();
  const roleId = useId();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('viewer');
  const [errors, setErrors] = useState<InviteFieldErrors>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setProblem(null);
    start(async () => {
      const result = await inviteAction({ email, role });
      if (result.ok) {
        onDone(result.message);
        onClose();
      } else if (result.errors && (result.errors.email || result.errors.role)) {
        setErrors(result.errors);
      } else {
        setProblem(result.message);
      }
    });
  }

  return (
    <Dialog title="Invite a teammate" onClose={onClose}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <div className="min-w-0">
          <label htmlFor={emailId} className={FIELD_LABEL}>
            Email
          </label>
          <input
            id={emailId}
            type="email"
            autoComplete="off"
            value={email}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? `${emailId}-error` : undefined}
            onChange={(e) => setEmail(e.target.value)}
            className={`${CONTROL} ${errors.email ? 'border-error' : 'border-secondary'}`}
          />
          {errors.email ? (
            <p id={`${emailId}-error`} className="mt-1 text-sm">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className="min-w-0">
          <label htmlFor={roleId} className={FIELD_LABEL}>
            Role
          </label>
          <select
            id={roleId}
            value={role}
            onChange={(e) => isRole(e.target.value) && setRole(e.target.value)}
            className={`${CONTROL} border-secondary`}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-on-surface/60">{ROLE_DESCRIPTIONS[role]}</p>
          {errors.role ? <p className="mt-1 text-sm">{errors.role}</p> : null}
        </div>

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
            {pending ? 'Sending...' : 'Send invite'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

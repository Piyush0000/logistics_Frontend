'use client';

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/lib/data/team/types';
import { FormError, SubmitButton } from '../login/fields';
import { NameField, NewPasswordField } from '../signup/signup-fields';
import { joinAction, previewInviteAction, type PreviewResult } from './actions';

/**
 * Reads the invite token from the link's # part (it never reaches a server log), shows who the
 * invite is for, and creates the account.
 */
export function JoinForm() {
  // Never shown, so it lives in a ref rather than state.
  const token = useRef<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const value = decodeURIComponent(window.location.hash.slice(1));
    token.current = value;
    // Drop the token from the address bar, so it is not left in history or shared by mistake.
    window.history.replaceState(null, '', window.location.pathname);
    previewInviteAction(value).then(setPreview);
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    setProblem(null);
    start(async () => {
      const result = await joinAction({ token: token.current, name, password });
      // Success redirects; only a failure comes back.
      if (result && !result.ok) setProblem(result.message);
    });
  }

  if (!preview) return <p className="text-sm text-on-surface/70">Checking your invite…</p>;
  if (!preview.ok) return <FormError message={preview.message} />;

  const { invite } = preview;
  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <div className="grid gap-1 rounded-control bg-tertiary p-3 text-sm">
        <p>
          <span className="font-semibold">{invite.merchantName}</span> invited{' '}
          <span className="font-mono [overflow-wrap:anywhere]">{invite.email}</span> as{' '}
          <span className="font-semibold">{ROLE_LABELS[invite.role]}</span>.
        </p>
        <p className="text-on-surface/70">{ROLE_DESCRIPTIONS[invite.role]}</p>
      </div>
      <NameField value={name} onChange={setName} invalid={name.trim() === ''} />
      <NewPasswordField value={password} onChange={setPassword} invalid={password.length < 8} />
      {problem ? <FormError message={problem} /> : null}
      <SubmitButton pending={pending} pendingLabel="Creating your account…" disabled={pending}>
        Join {invite.merchantName}
      </SubmitButton>
    </form>
  );
}

'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { PRIMARY_BUTTON } from '@/components/ui/dialog';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import { BODY_MAX, checkReply } from '@/lib/data/support/input';
import { replyAction } from '../actions';

/** Adds a reply to a ticket. Replying to a resolved ticket reopens it. */
export function ReplyForm({ id, resolved }: { id: string; resolved: boolean }) {
  const fieldId = useId();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setNotice(null);

    const checked = checkReply(body);
    if (!checked.ok) {
      setError(checked.message);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await replyAction(id, body);
      if (result.ok) {
        setBody('');
        setNotice(result.message);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-3">
      {resolved ? (
        <p className="rounded-control bg-muted p-3 text-sm">This ticket is resolved. Reply to reopen it.</p>
      ) : null}
      <div>
        <label htmlFor={fieldId} className={FIELD_LABEL}>
          Reply
        </label>
        <textarea
          id={fieldId}
          rows={4}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="w-full rounded-control border border-secondary bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
        />
        <p className="mt-1 text-xs text-on-surface/60">
          Up to {BODY_MAX.toLocaleString('en-IN')} characters.
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-control bg-error/10 p-3 text-sm">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-control bg-success/15 p-3 text-sm">
          {notice}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className={`${PRIMARY_BUTTON} min-h-11 w-full sm:w-auto lg:min-h-0`}>
          Send reply
        </button>
      </div>
    </form>
  );
}

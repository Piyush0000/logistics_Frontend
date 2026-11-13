'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, useTransition, type FormEvent } from 'react';
import { Dialog, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import { SelectField } from '@/components/ui/select-field';
import { AWB_MAX, BODY_MAX, checkTicket, SUBJECT_MAX } from '@/lib/data/support/input';
import { CATEGORY_LABELS, TICKET_CATEGORIES, type TicketCategory } from '@/lib/data/support/types';
import { createTicketAction } from './actions';

const FIELD =
  'w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none';

const CATEGORY_OPTIONS = TICKET_CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] }));

/** Asks for a subject, category, optional AWB and message, then raises the ticket and opens it. */
/**
 * `fromLink` is true when `?new=1` opened it. The ticket page then replaces that address, so Back
 * does not return to the list with the form open again.
 */
export function NewTicketDialog({ onClose, fromLink = false }: { onClose: () => void; fromLink?: boolean }) {
  const router = useRouter();
  const subjectId = useId();
  const awbId = useId();
  const bodyId = useId();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('shipment');
  const [awb, setAwb] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const input = { subject, category, awb, body };
    // The server checks all of this again. Checking here answers without a round trip.
    const checked = checkTicket(input);
    if (!checked.ok) {
      setMessage(checked.message);
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const result = await createTicketAction(input);
      if (result.ok) {
        const href = `/support/tickets/${result.id}`;
        if (fromLink) router.replace(href);
        else router.push(href);
      }
      else setMessage(result.message);
    });
  }

  return (
    <Dialog title="New ticket" onClose={onClose}>
      <form noValidate onSubmit={handleSubmit} className="grid gap-5">
        <div>
          <label htmlFor={subjectId} className={FIELD_LABEL}>
            Subject
          </label>
          <input
            id={subjectId}
            value={subject}
            maxLength={SUBJECT_MAX + 50}
            onChange={(event) => setSubject(event.target.value)}
            className={`${FIELD} h-control`}
          />
          <p className="mt-1 text-xs text-on-surface/60">5 to {SUBJECT_MAX} characters.</p>
        </div>

        <SelectField
          label="Category"
          name="category"
          value={category}
          options={CATEGORY_OPTIONS}
          onChange={setCategory}
        />

        <div>
          <label htmlFor={awbId} className={FIELD_LABEL}>
            AWB (optional)
          </label>
          <input
            id={awbId}
            value={awb}
            maxLength={200}
            onChange={(event) => setAwb(event.target.value)}
            className={`${FIELD} h-control`}
          />
          <p className="mt-1 text-xs text-on-surface/60">
            One shipment only, if the problem is about one. Up to {AWB_MAX} characters.
          </p>
        </div>

        <div>
          <label htmlFor={bodyId} className={FIELD_LABEL}>
            Message
          </label>
          <textarea
            id={bodyId}
            rows={5}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className={`${FIELD} py-2.5`}
          />
          <p className="mt-1 text-xs text-on-surface/60">
            20 to {BODY_MAX.toLocaleString('en-IN')} characters. {body.trim().length.toLocaleString('en-IN')} used.
          </p>
        </div>

        {message ? (
          <p role="alert" className="rounded-control bg-error/10 p-3 text-sm">
            {message}
          </p>
        ) : null}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
            Cancel
          </button>
          <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>
            Raise ticket
          </button>
        </div>
      </form>
    </Dialog>
  );
}

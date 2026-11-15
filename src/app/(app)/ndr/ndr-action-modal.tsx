'use client';

import { RotateCw, Undo2, X } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import type { NdrRecord } from '@/lib/data/ndr/types';
import { submitNdrAction, type NdrFormState } from './actions';

interface NdrActionModalProps {
  item: NdrRecord;
  initialAction: 'REATTEMPT' | 'RTO';
  onClose: () => void;
}

const FIELD =
  'w-full rounded-control border border-secondary bg-surface px-3 text-sm transition-[border-color,box-shadow] duration-150 outline-none hover:border-on-surface/30 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20';

const CHOICE =
  'min-h-11 flex-1 rounded-control border px-3 py-2 text-sm font-medium transition-colors duration-150 lg:min-h-control';

const INITIAL_STATE: NdrFormState = {
  ok: false,
};

export function NdrActionModal({ item, initialAction, onClose }: NdrActionModalProps) {
  const [action, setAction] = useState<'REATTEMPT' | 'RTO'>(initialAction);
  const [state, formAction, pending] = useActionState(submitNdrAction, INITIAL_STATE);

  useEffect(() => {
    if (state.ok) {
      const timer = setTimeout(() => {
        onClose();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [state.ok, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ndr-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-4 backdrop-blur-xs"
    >
      {/* Not `rounded-card`: the dark-mode glass rule would make the panel see-through over the page. */}
      <div className="motion-rise max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-(--radius-card) border border-secondary bg-surface p-card shadow-(--shadow-lift)">
        <div className="flex items-center justify-between gap-3 border-b border-secondary pb-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {action === 'REATTEMPT' ? (
              <span className="grid size-9 shrink-0 place-items-center rounded-control bg-muted text-primary">
                <RotateCw aria-hidden="true" className="size-4" />
              </span>
            ) : (
              <span className="grid size-9 shrink-0 place-items-center rounded-control bg-warning/15 text-warning">
                <Undo2 aria-hidden="true" className="size-4" />
              </span>
            )}
            <h3 id="ndr-modal-title" className="font-heading text-lg leading-7 font-bold tracking-tight">
              {action === 'REATTEMPT' ? 'Request Re-attempt' : 'Initiate Return to Origin'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="grid size-11 shrink-0 place-items-center rounded-control transition-colors duration-150 hover:bg-muted lg:size-9"
          >
            <X aria-hidden="true" className="size-5 text-on-surface/60" />
          </button>
        </div>

        {state.ok ? (
          <div className="motion-rise my-6 rounded-control bg-success/15 p-4 text-center text-sm font-semibold text-success">
            {state.message}
          </div>
        ) : (
          <form action={formAction} className="mt-4 grid gap-4 text-sm">
            <input type="hidden" name="ndr_id" value={item.id} />
            <input type="hidden" name="action" value={action} />

            <div className="rounded-control bg-tertiary p-3 text-sm leading-relaxed text-on-surface/80">
              <p className="[overflow-wrap:anywhere]">
                Shipment AWB: <strong className="font-mono text-primary">{item.awb}</strong>
              </p>
              <p className="mt-1">
                Recipient: <strong>{item.recipient_name}</strong> ({item.destination_city})
              </p>
              <p className="mt-1 text-on-surface/60">Reason: {item.reason}</p>
            </div>

            {/* Action selector */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAction('REATTEMPT')}
                className={`${CHOICE} ${
                  action === 'REATTEMPT'
                    ? 'border-primary bg-muted font-semibold text-primary'
                    : 'border-secondary bg-surface text-on-surface/70 hover:bg-muted'
                }`}
              >
                Re-attempt
              </button>
              <button
                type="button"
                onClick={() => setAction('RTO')}
                className={`${CHOICE} ${
                  action === 'RTO'
                    ? 'border-warning bg-warning/15 font-semibold text-on-surface'
                    : 'border-secondary bg-surface text-on-surface/70 hover:bg-muted'
                }`}
              >
                Return to Origin (RTO)
              </button>
            </div>

            {action === 'REATTEMPT' ? (
              <div>
                <label htmlFor="preferred_date" className={FIELD_LABEL}>
                  Preferred Delivery Date
                </label>
                <input
                  id="preferred_date"
                  name="preferred_date"
                  type="date"
                  className={`${FIELD} h-11 lg:h-control`}
                />
              </div>
            ) : null}

            <div>
              <label htmlFor="instructions" className={FIELD_LABEL}>
                Courier Instructions / Special Notes
              </label>
              <textarea
                id="instructions"
                name="instructions"
                rows={3}
                placeholder={
                  action === 'REATTEMPT'
                    ? 'e.g. Call customer at 9876543210 before attempting'
                    : 'Reason for return confirmation'
                }
                className={`${FIELD} py-2.5`}
              />
            </div>

            {state.message ? (
              <p className="rounded-control bg-error/10 p-3 text-sm">{state.message}</p>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className={`${SECONDARY_BUTTON} max-lg:h-11`}>
                Cancel
              </button>
              <button type="submit" disabled={pending} className={`${PRIMARY_BUTTON} max-lg:h-11`}>
                {pending ? 'Submitting...' : 'Confirm Action'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

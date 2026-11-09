'use client';

import { RotateCw, Undo2, X } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import type { NdrRecord } from '@/lib/data/ndr';
import { submitNdrAction, type NdrFormState } from './actions';

interface NdrActionModalProps {
  item: NdrRecord;
  initialAction: 'REATTEMPT' | 'RTO';
  onClose: () => void;
}

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
      <div className="w-full max-w-md rounded-card border border-secondary bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-secondary pb-3">
          <div className="flex items-center gap-2">
            {action === 'REATTEMPT' ? (
              <RotateCw className="size-5 text-primary" />
            ) : (
              <Undo2 className="size-5 text-warning" />
            )}
            <h3 id="ndr-modal-title" className="font-heading text-base font-bold">
              {action === 'REATTEMPT' ? 'Request Re-attempt' : 'Initiate Return to Origin'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="grid size-9 place-items-center rounded-control hover:bg-tertiary"
          >
            <X className="size-5 text-on-surface/60" />
          </button>
        </div>

        {state.ok ? (
          <div className="my-6 rounded-control bg-success/15 p-4 text-center text-sm font-semibold text-success">
            {state.message}
          </div>
        ) : (
          <form action={formAction} className="mt-4 grid gap-4 text-sm">
            <input type="hidden" name="ndr_id" value={item.id} />
            <input type="hidden" name="action" value={action} />

            <div className="rounded-control bg-tertiary p-3 text-xs leading-relaxed text-on-surface/80">
              <p>
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
                className={`flex-1 min-h-[44px] rounded-control border px-3 py-2 text-xs font-semibold ${
                  action === 'REATTEMPT'
                    ? 'border-primary bg-primary text-tertiary'
                    : 'border-secondary bg-surface text-on-surface/70'
                }`}
              >
                Re-attempt
              </button>
              <button
                type="button"
                onClick={() => setAction('RTO')}
                className={`flex-1 min-h-[44px] rounded-control border px-3 py-2 text-xs font-semibold ${
                  action === 'RTO'
                    ? 'border-warning bg-warning text-on-surface font-bold'
                    : 'border-secondary bg-surface text-on-surface/70'
                }`}
              >
                Return to Origin (RTO)
              </button>
            </div>

            {action === 'REATTEMPT' ? (
              <div>
                <label htmlFor="preferred_date" className="block text-xs font-medium text-on-surface/70">
                  Preferred Delivery Date
                </label>
                <input
                  id="preferred_date"
                  name="preferred_date"
                  type="date"
                  className="mt-1 h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            ) : null}

            <div>
              <label htmlFor="instructions" className="block text-xs font-medium text-on-surface/70">
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
                className="mt-1 w-full rounded-control border border-secondary bg-surface p-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            {state.message ? (
              <p className="text-xs text-error">{state.message}</p>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] rounded-control border border-secondary bg-surface px-4 text-xs font-medium hover:bg-tertiary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className={`min-h-[44px] rounded-control px-5 text-xs font-semibold ${
                  action === 'REATTEMPT'
                    ? 'bg-primary text-tertiary hover:bg-primary/90'
                    : 'bg-warning text-on-surface hover:bg-warning/90'
                } disabled:opacity-50`}
              >
                {pending ? 'Submitting...' : 'Confirm Action'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
